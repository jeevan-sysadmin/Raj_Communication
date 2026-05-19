import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type PdfAccent = string | [number, number, number];

interface ReportMetric {
  label: string;
  value: string;
}

interface ReportColumnStyle {
  cellWidth?: number | "auto" | "wrap";
  halign?: "left" | "center" | "right";
}

interface StyledPdfReportOptions {
  filename: string;
  title: string;
  subtitle: string;
  scopeLabel: string;
  head: string[][];
  body: Array<Array<string | number>>;
  metrics?: ReportMetric[];
  accentColor?: PdfAccent;
  orientation?: "portrait" | "landscape";
  columnStyles?: Record<number, ReportColumnStyle>;
}

const resolveRgb = (accentColor: PdfAccent = "#2563eb"): [number, number, number] => {
  if (Array.isArray(accentColor)) return accentColor;

  const normalized = accentColor.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
};

const mixWithWhite = ([r, g, b]: [number, number, number], ratio: number): [number, number, number] => [
  Math.round(r + (255 - r) * ratio),
  Math.round(g + (255 - g) * ratio),
  Math.round(b + (255 - b) * ratio),
];

const darken = ([r, g, b]: [number, number, number], ratio: number): [number, number, number] => [
  Math.round(r * ratio),
  Math.round(g * ratio),
  Math.round(b * ratio),
];

const drawMetricCard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  accent: [number, number, number],
) => {
  const softAccent = mixWithWhite(accent, 0.88);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...softAccent);
  doc.roundedRect(x, y, width, 20, 4, 4, "FD");

  doc.setFillColor(...accent);
  doc.roundedRect(x, y, width, 3, 4, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x + 4, y + 8);

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(value, x + 4, y + 15);
};

export const exportStyledPdfReport = ({
  filename,
  title,
  subtitle,
  scopeLabel,
  head,
  body,
  metrics = [],
  accentColor = "#2563eb",
  orientation = "landscape",
  columnStyles,
}: StyledPdfReportOptions) => {
  const accent = resolveRgb(accentColor);
  const accentDark = darken(accent, 0.72);
  const accentSoft = mixWithWhite(accent, 0.86);

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;

  doc.setFillColor(...accent);
  doc.roundedRect(margin, 12, usableWidth, 30, 8, 8, "F");

  doc.setFillColor(...accentDark);
  doc.roundedRect(pageWidth - 78, 12, 64, 30, 8, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(title, margin + 6, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(subtitle, margin + 6, 32);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Raj Communication", pageWidth - 20, 23, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(scopeLabel, pageWidth - 20, 30, { align: "right" });
  doc.text(`Generated ${new Date().toLocaleString("en-IN")}`, pageWidth - 20, 36, { align: "right" });

  const visibleMetrics = metrics.slice(0, 4);
  let tableStartY = 58;

  if (visibleMetrics.length > 0) {
    const gap = 6;
    const cardWidth = (usableWidth - gap * (visibleMetrics.length - 1)) / visibleMetrics.length;
    let cursorX = margin;

    visibleMetrics.forEach((metric) => {
      drawMetricCard(doc, cursorX, 50, cardWidth, metric.label, metric.value, accent);
      cursorX += cardWidth + gap;
    });

    tableStartY = 78;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...accentDark);
  doc.text("Detailed Report", margin, tableStartY - 5);

  doc.setDrawColor(...accentSoft);
  doc.line(margin, tableStartY - 2, pageWidth - margin, tableStartY - 2);

  autoTable(doc, {
    startY: tableStartY,
    head,
    body,
    theme: "grid",
    margin: { left: margin, right: margin, bottom: 18 },
    styles: {
      fontSize: 8.5,
      cellPadding: 3.4,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: accent,
      textColor: [255, 255, 255],
      lineColor: accent,
      fontStyle: "bold",
      fontSize: 9.2,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    didDrawPage: ({ pageNumber }) => {
      doc.setDrawColor(...accentSoft);
      doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Raj Communication Report", margin, pageHeight - 6);
      doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 6, { align: "right" });
    },
  });

  doc.save(filename);
};

