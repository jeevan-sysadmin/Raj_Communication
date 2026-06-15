import * as XLSX from "xlsx";

export type ImportedSpreadsheetRow = Record<string, string>;

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-./]+/g, "_")
    .replace(/[^\w]/g, "")
    .replace(/^_+|_+$/g, "");

const normalizeCellValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const detectDelimiter = (text: string) => {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return ",";

  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestScore = -1;

  for (const delimiter of candidates) {
    const score = firstLine.split(delimiter).length;
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  }

  return best;
};

const parseDelimitedLine = (line: string, delimiter: string) => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => normalizeCellValue(cell));
};

const parseCsvTextRows = (text: string): ImportedSpreadsheetRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedText.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(normalizedText);
  const headerCells = parseDelimitedLine(lines[0], delimiter);
  const normalizedHeaders = headerCells.map((header, index) => normalizeHeader(header) || `column_${index + 1}`);

  return lines
    .slice(1)
    .map((line) => {
      const cells = parseDelimitedLine(line, delimiter);
      return normalizedHeaders.reduce<ImportedSpreadsheetRow>((acc, header, index) => {
        acc[header] = normalizeCellValue(cells[index] ?? "");
        return acc;
      }, {});
    })
    .filter((row) => Object.values(row).some((value) => value !== ""));
};

const normalizeImportedRows = (rows: Array<Record<string, unknown>>) =>
  rows
    .map((row) =>
      Object.entries(row).reduce<ImportedSpreadsheetRow>((acc, [key, value]) => {
        const normalizedKey = normalizeHeader(key);
        if (normalizedKey) {
          acc[normalizedKey] = normalizeCellValue(value);
        }
        return acc;
      }, {}),
    )
    .filter((row) => Object.values(row).some((value) => value !== ""));

const parseWorkbookRows = (source: ArrayBuffer | string, type: "array" | "string") => {
  const workbook = XLSX.read(source, {
    type,
    cellDates: false,
    raw: false,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return normalizeImportedRows(rawRows);
};

const scoreImportedRows = (rows: ImportedSpreadsheetRow[]) =>
  rows.reduce((score, row) => {
    const keys = Object.keys(row);
    const populatedValues = Object.values(row).filter((value) => value !== "").length;
    const namedColumns = keys.filter((key) => !/^column_\d+$/i.test(key)).length;

    return score + populatedValues + namedColumns * 5;
  }, 0);

export const readSpreadsheetRows = async (file: File): Promise<ImportedSpreadsheetRow[]> => {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".csv") || file.type.includes("csv") || file.type.startsWith("text/")) {
    const text = await file.text();
    const csvRows = parseCsvTextRows(text);
    const workbookRows = parseWorkbookRows(text, "string");

    if (csvRows.length === 0) {
      return workbookRows;
    }

    if (workbookRows.length === 0) {
      return csvRows;
    }

    return scoreImportedRows(workbookRows) >= scoreImportedRows(csvRows) ? workbookRows : csvRows;
  }

  const buffer = await file.arrayBuffer();
  return parseWorkbookRows(buffer, "array");
};

export const getImportValue = (row: ImportedSpreadsheetRow, keys: string[]) => {
  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);
    const value = row[normalizedKey];
    if (value && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
};

export const downloadCsvTemplate = (
  filename: string,
  headers: string[],
  sampleRows: Array<Record<string, string | number>>,
) => {
  const csvRows = [
    headers.join(","),
    ...sampleRows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];

  const blob = new Blob([`\uFEFF${csvRows.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
