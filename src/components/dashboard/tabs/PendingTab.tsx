import { useEffect, useMemo, useState } from "react";
import { FiAlertCircle, FiCheckSquare, FiClock, FiFileText, FiPrinter } from "react-icons/fi";
import { formatDisplayDate, parseAppDate } from "../utils";

interface PendingOrder {
  id: number;
  order_id?: number;
  rajtocom_product_ids?: unknown;
  company_id?: number | string | null;
  company_ids?: unknown;
  company_name?: string;
  company_names?: unknown;
  company_names_text?: string;
  company_product_map?: unknown;
  companies_products?: unknown;
  company_product_name_map?: unknown;
  product_id?: number | string | null;
  product_ids?: unknown;
  product_names?: unknown;
  product_models?: unknown;
  product_serial_numbers?: unknown;
  product_status_map?: unknown;
  repairing_status_map?: unknown;
  issue_description?: string;
  issue_description_map?: unknown;
  status?: string;
  created_at?: string;
}

interface PendingCompany {
  id: number | string;
  company_name?: string;
}

interface PendingProduct {
  id: number | string;
  product_name?: string;
  model?: string;
  serial_number?: string;
}

interface PendingTabProps {
  loading?: boolean;
  orders?: PendingOrder[];
  companies?: PendingCompany[];
  products?: PendingProduct[];
}

interface PendingRow {
  key: string;
  orderId: number;
  company: string;
  serviceDate: string;
  productId: number;
  productName: string;
  quantity: number;
  model: string;
  serial: string;
  faultDescription: string;
  pendingDays: number;
  flowStatus: string;
}

const escapeHtml = (value: string | number) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getPresetRange = (preset: "today" | "thisWeek" | "thisMonth" | "lastMonth") => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === "today") {
    return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
  }

  if (preset === "thisWeek") {
    const day = now.getDay();
    const offset = day === 0 ? 6 : day - 1;
    start.setDate(now.getDate() - offset);
    return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
  }

  if (preset === "thisMonth") {
    start.setDate(1);
    return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
  }

  start.setMonth(now.getMonth() - 1, 1);
  end.setMonth(now.getMonth(), 0);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
};

const parseRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string") return {};
  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

const parseStringList = (value: unknown): string[] => {
  if (value === null || value === undefined) return [];

  let raw: unknown[] = [];

  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      raw = Array.isArray(parsed) ? parsed : trimmed.split(/\s*\|\|\s*|\s*,\s*/);
    } catch {
      raw = trimmed.split(/\s*\|\|\s*|\s*,\s*/);
    }
  } else {
    raw = [value];
  }

  return raw.map((entry) => String(entry ?? "").trim()).filter(Boolean);
};

const parsePositionedStringList = (value: unknown): string[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry ?? "").trim());
  return parseStringList(value);
};

const parseNumberList = (value: unknown): number[] =>
  Array.from(
    new Set(
      parseStringList(value)
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry > 0),
    ),
  );

const parseKeyedStringMap = (value: unknown): Record<string, string> => {
  const parsed = parseRecord(value);
  const normalized: Record<string, string> = {};

  Object.entries(parsed).forEach(([key, entry]) => {
    normalized[String(key).trim()] = String(entry ?? "").trim();
  });

  return normalized;
};

const normalizeFlowStatus = (value: unknown) => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\-\s]/g, "");

  if (raw === "rajtocom" || raw === "rajtocompany") return "rajtocom";
  if (raw === "comtoraj") return "comtoraj";
  if (raw === "deliveryed" || raw === "delivered") return "deliveryed";
  if (raw === "pending") return "pending";
  return "";
};

const normalizeFlowStatusMap = (value: unknown): Record<string, string> => {
  const parsed = parseRecord(value);
  const normalized: Record<string, string> = {};

  Object.entries(parsed).forEach(([productId, status]) => {
    const id = Number(productId);
    if (Number.isInteger(id) && id > 0) {
      normalized[String(id)] = normalizeFlowStatus(status);
    }
  });

  return normalized;
};

const normalizeRepairingStatusMap = (value: unknown): Record<string, string> => {
  const parsed = parseRecord(value);
  const normalized: Record<string, string> = {};

  Object.entries(parsed).forEach(([productId, status]) => {
    const id = Number(productId);
    if (!Number.isInteger(id) || id <= 0) return;

    const raw = String(status ?? "").trim().toLowerCase();
    if (raw === "ready") normalized[String(id)] = "ready";
    else if (raw === "replacement") normalized[String(id)] = "replacement";
    else if (raw === "not_ready" || raw === "not ready" || raw === "notready") {
      normalized[String(id)] = "not ready";
    }
  });

  return normalized;
};

const normalizeCompanyProductMap = (value: unknown): Record<string, number[]> => {
  const parsed = parseRecord(value);
  const normalized: Record<string, number[]> = {};

  Object.entries(parsed).forEach(([companyId, productIds]) => {
    const key = String(companyId).trim();
    if (!key) return;
    normalized[key] = parseNumberList(productIds);
  });

  return normalized;
};

const normalizeNameKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const normalizeDateValue = (value: string) => {
  const parsed = parseAppDate(value);
  return parsed ? toIsoDate(parsed) : "";
};

const isWithinDateRange = (serviceDate: string, startDate: string, endDate: string) => {
  const serviceDay = normalizeDateValue(serviceDate);
  if (!serviceDay) return false;
  if (startDate && serviceDay < startDate) return false;
  if (endDate && serviceDay > endDate) return false;
  return true;
};

const getPendingDays = (serviceDate: string) => {
  const parsed = parseAppDate(serviceDate);
  if (!parsed) return 0;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const createdStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return Math.max(0, Math.floor((todayStart.getTime() - createdStart.getTime()) / 86400000));
};

const PendingTab = ({ loading = false, orders = [], companies = [], products = [] }: PendingTabProps) => {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const companyNameById = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((company) => {
      const id = Number(company.id);
      const name = String(company.company_name || "").trim();
      if (id > 0 && name) map.set(String(id), name);
    });
    return map;
  }, [companies]);

  const productLookup = useMemo(() => {
    const map = new Map<number, PendingProduct>();
    products.forEach((product) => {
      if (Number(product.id) > 0) map.set(Number(product.id), product);
    });
    return map;
  }, [products]);

  const allRows = useMemo<PendingRow[]>(() => {
    const rows: PendingRow[] = [];

    orders.forEach((order) => {
      const rajToComProductIds = parseNumberList(order.rajtocom_product_ids);
      const companyIds = parseStringList(order.company_ids);
      if (companyIds.length === 0 && order.company_id) {
        companyIds.push(String(order.company_id).trim());
      }

      const companyNames = parseStringList(order.company_names).length
        ? parseStringList(order.company_names)
        : parseStringList(order.company_names_text || order.company_name);

      const companyProductNameMap = parseRecord(order.company_product_name_map);
      const companyProductMap = normalizeCompanyProductMap(order.company_product_map || order.companies_products);

      const companyEntries =
        companyIds.length > 0
          ? companyIds.map((companyId, index) => {
              const mapped = parseRecord(companyProductNameMap[companyId]);
              const fallbackName = companyNames[index] || companyNameById.get(companyId) || "";
              const companyName = String(mapped.company_name ?? fallbackName).trim() || `Company #${companyId}`;
              return { id: companyId, name: companyName };
            })
          : companyNames.map((name) => ({ id: "", name: String(name).trim() })).filter((entry) => entry.name);

      const allProductIds = parseNumberList(order.product_ids).length
        ? parseNumberList(order.product_ids)
        : Number(order.product_id) > 0
          ? [Number(order.product_id)]
          : [];

      const productNames = parsePositionedStringList(order.product_names);
      const productModels = parsePositionedStringList(order.product_models);
      const productSerials = parsePositionedStringList(order.product_serial_numbers);
      const productNameMapById = parseKeyedStringMap(order.product_names);
      const productModelMapById = parseKeyedStringMap(order.product_models);
      const productSerialMapById = parseKeyedStringMap(order.product_serial_numbers);
      const flowStatusMap = normalizeFlowStatusMap(order.product_status_map);
      const repairingStatusMap = normalizeRepairingStatusMap(order.repairing_status_map);
      const issueDescriptionMap = parseRecord(order.issue_description_map);
      const quantityMap = parseRecord((order as PendingOrder & { product_quantity_map?: unknown }).product_quantity_map);
      const statusScopedRajToComIds = Object.entries(flowStatusMap)
        .filter(([, status]) => status === "rajtocom")
        .map(([productId]) => Number(productId))
        .filter((productId) => Number.isInteger(productId) && productId > 0);
      const scopedRajToComProductIds = Array.from(
        new Set((rajToComProductIds.length > 0 ? rajToComProductIds : statusScopedRajToComIds).filter((productId) => productId > 0)),
      );

      if (scopedRajToComProductIds.length === 0) {
        return;
      }

      const metaByProductId = new Map<number, { productName: string; model: string; serial: string }>();
      allProductIds.forEach((productId, index) => {
        metaByProductId.set(productId, {
          productName: productNameMapById[String(productId)] || productNames[index] || "",
          model: productModelMapById[String(productId)] || productModels[index] || "",
          serial: productSerialMapById[String(productId)] || productSerials[index] || "",
        });
      });

      const resolveProductMeta = (productId: number) => {
        const inlineMeta = metaByProductId.get(productId);
        const matchedProduct = productLookup.get(productId);
        return {
          productName:
            String(inlineMeta?.productName || "").trim() ||
            String(matchedProduct?.product_name || "").trim() ||
            `Product #${productId}`,
          model: String(inlineMeta?.model || matchedProduct?.model || "").trim() || "N/A",
          serial: String(inlineMeta?.serial || matchedProduct?.serial_number || "").trim() || "N/A",
        };
      };

      companyEntries.forEach((companyEntry) => {
        const mappedCompanyProductNames =
          companyEntry.id && companyProductNameMap[companyEntry.id]
            ? parsePositionedStringList((companyProductNameMap[companyEntry.id] as Record<string, unknown>).product_names)
            : [];

        let scopedProductIds: number[] = [];
        if (companyEntry.id && companyProductMap[companyEntry.id]?.length) {
          scopedProductIds = scopedRajToComProductIds.filter((productId) => companyProductMap[companyEntry.id].includes(productId));
        } else if (mappedCompanyProductNames.length > 0) {
          const allowedNameKeys = new Set(mappedCompanyProductNames.map((name) => normalizeNameKey(name)).filter(Boolean));
          scopedProductIds = scopedRajToComProductIds.filter((productId) => {
            const meta = resolveProductMeta(productId);
            return allowedNameKeys.has(normalizeNameKey(meta.productName));
          });
        } else if (companyEntries.length === 1) {
          scopedProductIds = scopedRajToComProductIds;
        } else {
          return;
        }

        scopedProductIds.forEach((productId, scopedIndex) => {
          const flowStatus = normalizeFlowStatus(flowStatusMap[String(productId)] || "rajtocom");
          const repairingStatus = String(repairingStatusMap[String(productId)] || "").trim().toLowerCase();
          if (flowStatus !== "rajtocom") return;

          const resolvedMeta = resolveProductMeta(productId);
          const issueDescription = String(issueDescriptionMap[String(productId)] ?? order.issue_description ?? "").trim();
          const productName =
            String(resolvedMeta.productName || "").trim() ||
            String(mappedCompanyProductNames[scopedIndex] || "").trim() ||
            `Product #${productId}`;

          rows.push({
            key: `${order.id}-${productId}-${companyEntry.name}`,
            orderId: Number(order.id) || 0,
            company: companyEntry.name,
            serviceDate: String(order.created_at || ""),
            productId,
            productName,
            quantity: Math.max(1, Number(quantityMap[String(productId)] || 1) || 1),
            model: resolvedMeta.model,
            serial: resolvedMeta.serial,
            faultDescription: issueDescription || "N/A",
            pendingDays: getPendingDays(String(order.created_at || "")),
            flowStatus: repairingStatus || flowStatus,
          });
        });
      });
    });

    return rows.sort((a, b) => {
      const dayCompare = b.pendingDays - a.pendingDays;
      if (dayCompare !== 0) return dayCompare;
      return String(b.serviceDate).localeCompare(String(a.serviceDate));
    });
  }, [companyNameById, orders, productLookup]);

  const companyOptions = useMemo(
    () =>
      Array.from(new Set(allRows.map((row) => row.company).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
      ),
    [allRows],
  );

  const pendingRows = useMemo(
    () =>
      allRows
        .filter((row) => !selectedCompany || row.company.toLowerCase() === selectedCompany.toLowerCase())
        .filter((row) => isWithinDateRange(row.serviceDate, dateRange.startDate, dateRange.endDate))
        .map((row) => ({
          ...row,
          serviceDate: formatDisplayDate(row.serviceDate),
        })),
    [allRows, dateRange.endDate, dateRange.startDate, selectedCompany],
  );

  const pendingProductCount = useMemo(
    () =>
      pendingRows.reduce((sum, row) => {
        const quantity = Math.max(1, Number(row.quantity || 1) || 1);
        return sum + quantity;
      }, 0),
    [pendingRows],
  );

  useEffect(() => {
    setSelectedKeys((previous) => previous.filter((key) => pendingRows.some((row) => row.key === key)));
  }, [pendingRows]);

  useEffect(() => {
    if (selectedCompany && !companyOptions.includes(selectedCompany)) {
      setSelectedCompany("");
      setSelectedKeys([]);
    }
  }, [companyOptions, selectedCompany]);

  const isLoading = loading;
  const allSelected = pendingRows.length > 0 && pendingRows.every((row) => selectedKeys.includes(row.key));
  const selectedRows = pendingRows.filter((row) => selectedKeys.includes(row.key));
  const printRows = selectedRows.length > 0 ? selectedRows : pendingRows;

  const toggleRow = (key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys([]);
      return;
    }
    setSelectedKeys(pendingRows.map((row) => row.key));
  };

  const handlePrint = () => {
    if (!selectedCompany || printRows.length === 0) return;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    const rowsMarkup = printRows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.company)}</td>
            <td>${escapeHtml(row.serviceDate)}</td>
            <td>${escapeHtml(row.productName)}</td>
            <td>${escapeHtml(row.quantity)}</td>
            <td>${escapeHtml(row.model)}</td>
            <td>${escapeHtml(row.serial)}</td>
            <td>${escapeHtml(row.faultDescription)}</td>
            <td>${escapeHtml(row.pendingDays)}</td>
          </tr>
        `,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Pending Product List - ${escapeHtml(selectedCompany)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            .head { margin-bottom: 16px; }
            h1 { margin: 0 0 6px; color: #0f172a; font-size: 24px; }
            p { margin: 0; color: #334155; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th, td { border: 1px solid #cbd5e1; padding: 9px 10px; font-size: 12px; text-align: left; vertical-align: top; }
            th { background: #e2e8f0; color: #0f172a; font-weight: 700; }
            tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="head">
            <h1>Pending Product Status Report</h1>
            <p><strong>Company:</strong> ${escapeHtml(selectedCompany)}</p>
            <p><strong>Date:</strong> ${escapeHtml(formatDisplayDate(new Date().toISOString()))}</p>
            <p><strong>Total Items:</strong> ${escapeHtml(printRows.length)}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>S.No</th>
                <th>Company</th>
                <th>Service Order Date</th>
                <th>Product Name</th>
                <th>Qty</th>
                <th>Model</th>
                <th>Serial</th>
                <th>Fault Description</th>
                <th>Pending Days</th>
              </tr>
            </thead>
            <tbody>${rowsMarkup}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportPdf = async () => {
    if (!selectedCompany || printRows.length === 0) return;

    const totalQuantity = printRows.reduce((sum, row) => sum + Math.max(1, Number(row.quantity || 1) || 1), 0);
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Pending Products Report", pageWidth / 2, 18, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Company: ${selectedCompany}`, margin, 28);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pageWidth - margin, 28, { align: "right" });
    doc.text(`Rows: ${printRows.length}`, margin, 35);
    doc.text(`Qty Total: ${totalQuantity}`, pageWidth - margin, 35, { align: "right" });

    autoTable(doc, {
      startY: 42,
      head: [["S.No", "Company", "Service Order Date", "Product Name", "Qty", "Model", "Serial", "Fault Description", "Pending Days"]],
      body: printRows.map((row, index) => [
        `${index + 1}.`,
        row.company,
        row.serviceDate,
        row.productName,
        row.quantity,
        row.model,
        row.serial,
        row.faultDescription,
        `${row.pendingDays} days`,
      ]),
      theme: "grid",
      margin: { left: margin, right: margin, bottom: 16 },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        fillColor: [255, 255, 255],
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 16, halign: "center" },
        1: { cellWidth: 44 },
        2: { cellWidth: 28 },
        3: { cellWidth: 40 },
        4: { cellWidth: 14, halign: "center" },
        5: { cellWidth: 28 },
        6: { cellWidth: 34 },
        7: { cellWidth: 58 },
        8: { cellWidth: 22, halign: "center" },
      },
      didDrawPage: ({ pageNumber }) => {
        doc.setDrawColor(0, 0, 0);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.text("Raj Communication Pending Report", margin, pageHeight - 5);
        doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 5, { align: "right" });
      },
    });

    doc.save(`pending_products_${selectedCompany.toLowerCase().replace(/[^a-z0-9]+/gi, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handleClearFilters = () => {
    setSelectedCompany("");
    setDateRange({ startDate: "", endDate: "" });
    setSelectedKeys([]);
  };

  return (
    <div className="pending-tab-section">
      <div className="pending-hero">
        <div>
          <h2>Pending Product Desk</h2>
          <p>Choose a company to review only RajToCom not ready products, then select and print a clean service report.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => void handleExportPdf()} disabled={!selectedCompany || printRows.length === 0}>
            <FiFileText />
            <span>Export PDF</span>
          </button>
          <button className="btn btn-primary" onClick={handlePrint} disabled={!selectedCompany || printRows.length === 0}>
            <FiPrinter />
            <span>Print Selected</span>
          </button>
        </div>
      </div>

      <div className="pending-toolbar">
        <label htmlFor="pending-company-select">Company</label>
        <select
          id="pending-company-select"
          className="pending-company-select"
          value={selectedCompany}
          disabled={isLoading}
          onChange={(event) => {
            setSelectedCompany(event.target.value);
            setSelectedKeys([]);
          }}
        >
          <option value="">{isLoading ? "Loading companies..." : "Select company"}</option>
          {companyOptions.map((company) => (
            <option key={company} value={company}>
              {company}
            </option>
          ))}
        </select>
      </div>

      <div className="pending-filter-bar">
        <div className="pending-filter-group">
          <label htmlFor="pending-from-date">From</label>
          <input
            id="pending-from-date"
            type="date"
            value={dateRange.startDate}
            onChange={(event) => setDateRange((prev) => ({ ...prev, startDate: event.target.value }))}
          />
        </div>
        <div className="pending-filter-group">
          <label htmlFor="pending-to-date">To</label>
          <input
            id="pending-to-date"
            type="date"
            value={dateRange.endDate}
            onChange={(event) => setDateRange((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </div>
        <div className="pending-preset-group">
          <span className="pending-status-select" aria-label="Fixed flow filter">
            RajToCom / Not Ready
          </span>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("today"))}>Today</button>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("thisWeek"))}>This Week</button>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("thisMonth"))}>This Month</button>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("lastMonth"))}>Last Month</button>
          <button type="button" className="btn btn-outline" onClick={handleClearFilters}>Clear</button>
        </div>
      </div>

      {selectedCompany ? (
        <>
          <div className="pending-summary-row">
            <div className="pending-summary-card">
              <FiClock />
              <div>
                <strong>{pendingProductCount}</strong>
                <span>Pending Products</span>
              </div>
            </div>
            <div className="pending-summary-card">
              <FiCheckSquare />
              <div>
                <strong>{selectedRows.length}</strong>
                <span>Selected For Print</span>
              </div>
            </div>
          </div>

          <div className="pending-table-shell">
            {isLoading ? (
              <div className="pending-empty-state">Loading pending products...</div>
            ) : pendingRows.length > 0 ? (
              <>
                <div className="desktop-table-view">
                  <table className="pending-table">
                    <thead>
                      <tr>
                        <th>
                          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                        </th>
                        <th>S.No</th>
                        <th>Company</th>
                        <th>Service Order Date</th>
                        <th>Product Name</th>
                        <th>Qty</th>
                        <th>Model</th>
                        <th>Serial</th>
                        <th>Fault Description</th>
                        <th>Pending Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRows.map((row) => (
                        <tr key={row.key}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedKeys.includes(row.key)}
                              onChange={() => toggleRow(row.key)}
                            />
                          </td>
                          <td>{`${pendingRows.findIndex((item) => item.key === row.key) + 1}.`}</td>
                          <td>{row.company}</td>
                          <td>{row.serviceDate}</td>
                          <td>{row.productName}</td>
                          <td>{row.quantity}</td>
                          <td>{row.model}</td>
                          <td>{row.serial}</td>
                          <td>{row.faultDescription}</td>
                          <td>
                            <span className="pending-day-pill">{row.pendingDays} days</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mobile-record-list">
                  {pendingRows.map((row) => (
                    <div key={`mobile-${row.key}`} className="mobile-record-card">
                      <div className="mobile-record-header">
                        <div className="mobile-record-header-main">
                          <span className="mobile-record-kicker">{`${pendingRows.findIndex((item) => item.key === row.key) + 1}. Pending Product`}</span>
                          <strong className="mobile-record-title">{row.productName}</strong>
                          <span className="mobile-record-subtitle">{row.company}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedKeys.includes(row.key)}
                          onChange={() => toggleRow(row.key)}
                        />
                      </div>

                      <div className="mobile-record-grid">
                        <div className="mobile-record-field">
                          <span className="mobile-record-label">Service Date</span>
                          <span>{row.serviceDate}</span>
                        </div>
                        <div className="mobile-record-field">
                          <span className="mobile-record-label">Pending Days</span>
                          <span className="pending-day-pill">{row.pendingDays} days</span>
                        </div>
                        <div className="mobile-record-field">
                          <span className="mobile-record-label">Qty</span>
                          <span>{row.quantity}</span>
                        </div>
                        <div className="mobile-record-field">
                          <span className="mobile-record-label">Model</span>
                          <span>{row.model || "N/A"}</span>
                        </div>
                        <div className="mobile-record-field">
                          <span className="mobile-record-label">Serial</span>
                          <span>{row.serial || "N/A"}</span>
                        </div>
                        <div className="mobile-record-field full">
                          <span className="mobile-record-label">Fault Description</span>
                          <span>{row.faultDescription || "Not added"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="pending-empty-state">
                <FiAlertCircle />
                <span>No RajToCom not ready products found for this company.</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="pending-empty-state">
          <FiAlertCircle />
          <span>Select a company to view pending product list.</span>
        </div>
      )}
    </div>
  );
};

export default PendingTab;
