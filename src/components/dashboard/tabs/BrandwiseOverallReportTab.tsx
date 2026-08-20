import { useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiClock,
  FiDownload,
  FiPackage,
  FiPrinter,
  FiRefreshCw,
  FiShoppingBag,
  FiTruck,
  FiX,
} from "react-icons/fi";
import { exportStyledPdfReport } from "../pdfExport";

interface ReportOrder {
  id?: number;
  status?: string;
  created_at?: string;
  company_id?: number | string | null;
  company_ids?: number[] | string[] | string;
  company_name?: string;
  company_names?: string[] | string;
  company_names_text?: string;
  company_product_map?: Record<string, number[] | string[]> | string;
  companies_products?: Record<string, number[] | string[]> | string;
  company_product_name_map?: Record<string, { company_name?: string; product_names?: string[] | string }> | string;
  product_id?: number | string | null;
  product_ids?: number[] | string[] | string;
  product_status_map?: Record<string, string> | string;
  repairing_status_map?: Record<string, string> | string;
}

interface ReportProduct {
  brand?: string;
  is_spare_product?: boolean | number | string;
}

interface ReportDelivery {
  order_id?: number;
  status?: string;
}

interface BrandwiseOverallReportTabProps {
  orders: ReportOrder[];
  products: ReportProduct[];
  deliveries: ReportDelivery[];
  loading?: boolean;
}

interface CompanyReportRow {
  company: string;
  totalOrders: number;
  pendingOrders: number;
  rajtocomCount: number;
  readyCount: number;
  notReadyCount: number;
  replacementCount: number;
  comtorajCount: number;
  deliveryedCount: number;
}

const parseStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parseStringList(parsed);
    } catch {
      return trimmed
        .split("||")
        .flatMap((entry) => entry.split(","))
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  if (value === null || value === undefined) return [];
  return [String(value).trim()].filter(Boolean);
};

const parseNumberList = (value: unknown): number[] =>
  parseStringList(value)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);

const parseRecord = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

const normalizeCompanyProductMap = (value: unknown): Record<string, number[]> => {
  const parsed = parseRecord(value);
  const normalized: Record<string, number[]> = {};
  Object.entries(parsed).forEach(([companyId, productIds]) => {
    const key = String(companyId ?? "").trim();
    if (!key) return;
    normalized[key] = parseNumberList(productIds);
  });
  return normalized;
};

const normalizeFlowStatus = (value: unknown) => {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll("-", "")
    .replaceAll(" ", "");

  if (raw === "rajtocom") return "rajtocom";
  if (raw === "comtoraj") return "comtoraj";
  if (raw === "deliveryed" || raw === "delivered") return "deliveryed";
  if (raw === "pending") return "pending";
  return "";
};

const normalizeFlowStatusMap = (value: unknown): Record<string, string> => {
  const parsed = parseRecord(value);
  const normalized: Record<string, string> = {};
  Object.entries(parsed).forEach(([productId, status]) => {
    const key = String(productId || "").trim();
    if (!key) return;
    const normalizedStatus = normalizeFlowStatus(status);
    if (normalizedStatus) normalized[key] = normalizedStatus;
  });
  return normalized;
};

const normalizeRepairingStatusMap = (value: unknown): Record<string, string> => {
  let parsed: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  const normalized: Record<string, string> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, status]) => {
    const key = String(productId || "").trim();
    if (!key) return;
    const raw = String(status || "").trim().toLowerCase();
    if (raw === "ready") normalized[key] = "ready";
    else if (raw === "replacement") normalized[key] = "replacement";
    else if (raw === "not_ready" || raw === "not ready" || raw === "notready") normalized[key] = "not ready";
  });
  return normalized;
};

const toIsoDate = (date: Date) => date.toISOString().split("T")[0];

const normalizeDateForRange = (value: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return toIsoDate(parsed);
};

const getPresetRange = (preset: "today" | "thisWeek" | "thisMonth" | "lastMonth") => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === "today") return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
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

const BrandwiseOverallReportTab = ({ orders, loading = false }: BrandwiseOverallReportTabProps) => {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const companyOptions = useMemo(() => {
    const names = orders.flatMap((order) => {
      const companyNames = parseStringList((order as any).company_names);
      const companyTextNames = parseStringList((order as any).company_names_text || order.company_name);
      const mapNames = Object.values(parseRecord((order as any).company_product_name_map))
        .map((entry) => String(parseRecord(entry).company_name ?? "").trim())
        .filter(Boolean);
      return [...companyNames, ...companyTextNames, ...mapNames];
    });
    return Array.from(new Set(names.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (!dateRange.startDate || !dateRange.endDate) return true;
        const orderDate = normalizeDateForRange(String(order.created_at || ""));
        return Boolean(orderDate) && orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
      }),
    [orders, dateRange.endDate, dateRange.startDate],
  );

  const rows = useMemo(() => {
    const companyMap = new Map<string, CompanyReportRow>();
    const selectedCompanyName = selectedCompany.trim().toLowerCase();

    const ensureCompany = (company: string) => {
      const existing = companyMap.get(company);
      if (existing) return existing;
      const next: CompanyReportRow = {
        company,
        totalOrders: 0,
        pendingOrders: 0,
        rajtocomCount: 0,
        readyCount: 0,
        notReadyCount: 0,
        replacementCount: 0,
        comtorajCount: 0,
        deliveryedCount: 0,
      };
      companyMap.set(company, next);
      return next;
    };

    filteredOrders.forEach((order) => {
      const companyIds = parseStringList((order as any).company_ids);
      if (companyIds.length === 0 && (order as any).company_id) {
        companyIds.push(String((order as any).company_id));
      }

      const companyNames = parseStringList((order as any).company_names);
      if (companyNames.length === 0) {
        companyNames.push(...parseStringList((order as any).company_names_text || order.company_name));
      }

      const companyProductNameMap = parseRecord((order as any).company_product_name_map);
      const companyProductMap = normalizeCompanyProductMap((order as any).company_product_map || (order as any).companies_products);
      const allProductIds = (() => {
        const parsed = parseNumberList((order as any).product_ids);
        const fallback = Number((order as any).product_id);
        return parsed.length > 0
          ? parsed
          : Number.isInteger(fallback) && fallback > 0
            ? [fallback]
            : [];
      })();
      const flowStatusMap = normalizeFlowStatusMap((order as any).product_status_map);
      const repairingStatusMap = normalizeRepairingStatusMap((order as any).repairing_status_map);

      const companyEntries =
        companyIds.length > 0
          ? companyIds.map((companyId, index) => {
              const mapped = parseRecord(companyProductNameMap[companyId]);
              return {
                id: companyId,
                name: String(mapped.company_name ?? companyNames[index] ?? "").trim() || `Company #${companyId}`,
              };
            })
          : companyNames.map((companyName) => ({
              id: "",
              name: companyName,
            }));

      companyEntries.forEach((companyEntry, companyIndex) => {
        const normalizedCompany = companyEntry.name.trim();
        if (!normalizedCompany) return;
        if (selectedCompanyName && normalizedCompany.toLowerCase() !== selectedCompanyName) return;

        const scopedProductIds = (() => {
          if (companyEntry.id && companyProductMap[companyEntry.id]?.length) {
            return allProductIds.filter((productId) => companyProductMap[companyEntry.id].includes(productId));
          }
          if (companyEntries.length <= 1) return allProductIds;
          if (companyIds.length > companyIndex && companyEntry.id && !companyProductMap[companyEntry.id]?.length) return [];
          return allProductIds;
        })();

        const row = ensureCompany(normalizedCompany);
        row.totalOrders += 1;

        if (String(order.status || "").trim().toLowerCase() === "pending") {
          row.pendingOrders += 1;
        }

        scopedProductIds.forEach((productId) => {
          const flowStatus = normalizeFlowStatus(flowStatusMap[String(productId)] || "");
          const repairingStatus = String(repairingStatusMap[String(productId)] || "").trim().toLowerCase();

          if (flowStatus === "rajtocom") row.rajtocomCount += 1;
          else if (flowStatus === "comtoraj") row.comtorajCount += 1;
          else if (flowStatus === "deliveryed") row.deliveryedCount += 1;

          if (repairingStatus === "ready") row.readyCount += 1;
          else if (repairingStatus === "not ready") row.notReadyCount += 1;
          else if (repairingStatus === "replacement") row.replacementCount += 1;
        });
      });
    });

    return Array.from(companyMap.values()).sort((a, b) => b.totalOrders - a.totalOrders || a.company.localeCompare(b.company));
  }, [filteredOrders, selectedCompany]);

  useEffect(() => {
    if (!selectedCompany) return;
    if (companyOptions.includes(selectedCompany)) return;
    setSelectedCompany("");
  }, [companyOptions, selectedCompany]);

  const summary = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          totalOrders: acc.totalOrders + row.totalOrders,
          pendingOrders: acc.pendingOrders + row.pendingOrders,
          rajtocomCount: acc.rajtocomCount + row.rajtocomCount,
          readyCount: acc.readyCount + row.readyCount,
          notReadyCount: acc.notReadyCount + row.notReadyCount,
          replacementCount: acc.replacementCount + row.replacementCount,
          comtorajCount: acc.comtorajCount + row.comtorajCount,
          deliveryedCount: acc.deliveryedCount + row.deliveryedCount,
        }),
        {
          totalOrders: 0,
          pendingOrders: 0,
          rajtocomCount: 0,
          readyCount: 0,
          notReadyCount: 0,
          replacementCount: 0,
          comtorajCount: 0,
          deliveryedCount: 0,
        },
      ),
    [rows],
  );

  const today = new Date().toISOString().split("T")[0];
  const scopeLabel = selectedCompany || "All Companies";

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header = [
      "company",
      "total_orders",
      "pending_orders",
      "rajtocom",
      "ready",
      "not_ready",
      "replacement",
      "comtoraj",
      "deliveryed",
    ];

    const csvRows = rows.map((row) =>
      [
        row.company,
        row.totalOrders,
        row.pendingOrders,
        row.rajtocomCount,
        row.readyCount,
        row.notReadyCount,
        row.replacementCount,
        row.comtorajCount,
        row.deliveryedCount,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );

    downloadFile(`\uFEFF${header.join(",")}\n${csvRows.join("\n")}`, `company_overall_report_${today}.csv`, "text/csv;charset=utf-8;");
  };

  const exportPdf = () => {
    if (rows.length === 0) return;
    exportStyledPdfReport({
      filename: `company_overall_report_${today}.pdf`,
      title: "Company Overall Report",
      subtitle: "Filtered company order and product-status summary.",
      scopeLabel: scopeLabel,
      accentColor: "#0f766e",
      orientation: "landscape",
      metrics: [
        { label: "Orders", value: `${summary.totalOrders}` },
        { label: "Pending", value: `${summary.pendingOrders}` },
        { label: "RajToCom", value: `${summary.rajtocomCount}` },
        { label: "Deliveryed", value: `${summary.deliveryedCount}` },
      ],
      head: [[
        "Company",
        "Total Orders",
        "Pending Orders",
        "RajToCom",
        "Ready",
        "Not Ready",
        "Replacement",
        "ComToRaj",
        "Deliveryed",
      ]],
      body: rows.map((row) => [
        row.company,
        row.totalOrders.toLocaleString(),
        row.pendingOrders.toLocaleString(),
        row.rajtocomCount.toLocaleString(),
        row.readyCount.toLocaleString(),
        row.notReadyCount.toLocaleString(),
        row.replacementCount.toLocaleString(),
        row.comtorajCount.toLocaleString(),
        row.deliveryedCount.toLocaleString(),
      ]),
    });
  };

  const printReport = () => {
    if (rows.length === 0) return;
    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    const bodyRows = rows
      .map(
        (row) => `
          <tr>
            <td>${row.company}</td>
            <td>${row.totalOrders.toLocaleString()}</td>
            <td>${row.pendingOrders.toLocaleString()}</td>
            <td>${row.rajtocomCount.toLocaleString()}</td>
            <td>${row.readyCount.toLocaleString()}</td>
            <td>${row.notReadyCount.toLocaleString()}</td>
            <td>${row.replacementCount.toLocaleString()}</td>
            <td>${row.comtorajCount.toLocaleString()}</td>
            <td>${row.deliveryedCount.toLocaleString()}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Company Overall Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            p { margin: 0 0 16px; color: #475569; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>Company Overall Report</h1>
          <p>Generated on ${new Date().toLocaleString("en-IN")} - ${scopeLabel}</p>
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Total Orders</th>
                <th>Pending Orders</th>
                <th>RajToCom</th>
                <th>Ready</th>
                <th>Not Ready</th>
                <th>Replacement</th>
                <th>ComToRaj</th>
                <th>Deliveryed</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const clearFilters = () => {
    setSelectedCompany("");
    setDateRange({ startDate: "", endDate: "" });
  };

  const statItems = [
    { label: "Total Orders", value: summary.totalOrders, icon: <FiPackage /> },
    { label: "Pending Orders", value: summary.pendingOrders, icon: <FiClock /> },
    { label: "RajToCom", value: summary.rajtocomCount, icon: <FiShoppingBag /> },
    { label: "Ready", value: summary.readyCount, icon: <FiRefreshCw /> },
    { label: "Not Ready", value: summary.notReadyCount, icon: <FiX /> },
    { label: "Replacement", value: summary.replacementCount, icon: <FiRefreshCw /> },
    { label: "ComToRaj", value: summary.comtorajCount, icon: <FiShoppingBag /> },
    { label: "Deliveryed", value: summary.deliveryedCount, icon: <FiTruck /> },
  ];

  return (
    <div className="data-table-wrapper brand-report-wrapper">
      <div className="table-header-section brand-report-header">
        <div className="table-title-wrapper">
          <h2 className="table-title">
            <FiBarChart2 /> Company Overall Report
          </h2>
          <p className="table-subtitle">Choose a company and review exact order, flow, and repairing status counts.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" className="btn secondary" onClick={exportCsv} disabled={rows.length === 0}>
            <FiDownload /> CSV
          </button>
          <button type="button" className="btn secondary" onClick={exportPdf} disabled={rows.length === 0}>
            <FiDownload /> PDF
          </button>
          <button type="button" className="btn secondary" onClick={printReport} disabled={rows.length === 0}>
            <FiPrinter /> Print
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 700, color: "#0f172a" }}>Company</label>
          <select
            className="pending-company-select"
            value={selectedCompany}
            disabled={loading}
            onChange={(event) => setSelectedCompany(event.target.value)}
          >
            <option value="">{loading ? "Loading companies..." : "All companies"}</option>
            {companyOptions.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 700, color: "#0f172a" }}>From</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(event) => setDateRange((prev) => ({ ...prev, startDate: event.target.value }))}
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 700, color: "#0f172a" }}>To</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(event) => setDateRange((prev) => ({ ...prev, endDate: event.target.value }))}
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("today"))}>Today</button>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("thisWeek"))}>This Week</button>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("thisMonth"))}>This Month</button>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("lastMonth"))}>Last Month</button>
          <button type="button" className="btn btn-outline" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      <div style={{ marginBottom: 10, color: "#475569", fontSize: 13 }}>
        Current scope: <strong>{scopeLabel}</strong>{dateRange.startDate && dateRange.endDate ? ` | ${dateRange.startDate} to ${dateRange.endDate}` : ""}.
      </div>

      <div className="stats-grid-small brand-stats-grid">
        {statItems.map((item) => (
          <div key={item.label} className="stat-item brand-stat-item">
            <div className="stat-label">
              {item.icon} {item.label}
            </div>
            <span className="stat-value-small">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="table-responsive brand-table-responsive">
        <div className="desktop-table-view">
          <table className="data-table brand-report-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Total Orders</th>
                <th>Pending Orders</th>
                <th>RajToCom</th>
                <th>Ready</th>
                <th>Not Ready</th>
                <th>Replacement</th>
                <th>ComToRaj</th>
                <th>Deliveryed</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "20px" }}>
                    No company report data available for this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.company}>
                    <td>
                      <div className="brand-name-cell">
                        <span className="brand-name">{row.company}</span>
                      </div>
                    </td>
                    <td>{row.totalOrders.toLocaleString()}</td>
                    <td>{row.pendingOrders.toLocaleString()}</td>
                    <td>{row.rajtocomCount.toLocaleString()}</td>
                    <td>{row.readyCount.toLocaleString()}</td>
                    <td>{row.notReadyCount.toLocaleString()}</td>
                    <td>{row.replacementCount.toLocaleString()}</td>
                    <td>{row.comtorajCount.toLocaleString()}</td>
                    <td>{row.deliveryedCount.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-record-list">
          {rows.map((row) => (
            <div key={`mobile-${row.company}`} className="mobile-record-card">
              <div className="mobile-record-header">
                <div className="mobile-record-header-main">
                  <span className="mobile-record-kicker">Company Report</span>
                  <strong className="mobile-record-title">{row.company}</strong>
                  <span className="mobile-record-subtitle">{row.totalOrders.toLocaleString()} total orders</span>
                </div>
              </div>
              <div className="mobile-record-grid">
                <div className="mobile-record-field"><span className="mobile-record-label">Pending Orders</span><span>{row.pendingOrders.toLocaleString()}</span></div>
                <div className="mobile-record-field"><span className="mobile-record-label">RajToCom</span><span>{row.rajtocomCount.toLocaleString()}</span></div>
                <div className="mobile-record-field"><span className="mobile-record-label">Ready</span><span>{row.readyCount.toLocaleString()}</span></div>
                <div className="mobile-record-field"><span className="mobile-record-label">Not Ready</span><span>{row.notReadyCount.toLocaleString()}</span></div>
                <div className="mobile-record-field"><span className="mobile-record-label">Replacement</span><span>{row.replacementCount.toLocaleString()}</span></div>
                <div className="mobile-record-field"><span className="mobile-record-label">ComToRaj</span><span>{row.comtorajCount.toLocaleString()}</span></div>
                <div className="mobile-record-field"><span className="mobile-record-label">Deliveryed</span><span>{row.deliveryedCount.toLocaleString()}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrandwiseOverallReportTab;
