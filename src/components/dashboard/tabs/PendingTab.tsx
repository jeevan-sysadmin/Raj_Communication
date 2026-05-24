import { useEffect, useMemo, useState } from "react";
import { FiCheckSquare, FiClock, FiPrinter } from "react-icons/fi";
import type { Order, Product } from "../types";
import { formatDisplayDate } from "../utils";

interface PendingTabProps {
  products: Product[];
}

interface PendingRow {
  key: string;
  orderId: number;
  company: string;
  serviceDate: string;
  productName: string;
  model: string;
  serial: string;
  faultDescription: string;
  pendingDays: number;
  flowStatus: string;
}

const parseStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parseStringList(parsed);
    } catch {
      return trimmed
        .split(/[,|]/)
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

const normalizeStatus = (value: unknown) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "delivered") return "deliveryed";
  return raw;
};

const getPendingDays = (createdAt: string) => {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  const diffMs = Date.now() - created.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

const escapeHtml = (value: string | number) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const COMPANY_API_URL = "http://162.141.0.9/raj_communication/api/companys.php";
const ORDER_API_URL = "http://162.141.0.9/raj_communication/api/Order.php";

const toIsoDate = (date: Date) => date.toISOString().split("T")[0];

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

const PendingTab = ({ products }: PendingTabProps) => {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [flowStatusFilter, setFlowStatusFilter] = useState<"pending" | "rajtocom" | "comtoraj" | "deliveryed">("pending");

  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    products.forEach((product) => map.set(Number(product.id), product));
    return map;
  }, [products]);

  useEffect(() => {
    const loadCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const response = await fetch(COMPANY_API_URL, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || "Failed to load companies");
        }
        const names = Array.isArray(payload.companys)
          ? payload.companys
              .map((row: any) => String(row?.company_name ?? "").trim())
              .filter(Boolean)
          : [];
        const uniqueNames: string[] = Array.from(new Set(names as string[]));
        uniqueNames.sort((a, b) => a.localeCompare(b));
        setCompanyOptions(uniqueNames);
      } catch {
        setCompanyOptions([]);
      } finally {
        setLoadingCompanies(false);
      }
    };
    void loadCompanies();
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      setLoadingOrders(true);
      setOrderError("");
      try {
        const params = new URLSearchParams();
        if (dateRange.startDate && dateRange.endDate) {
          params.append("start_date", dateRange.startDate);
          params.append("end_date", dateRange.endDate);
        }
        const token = localStorage.getItem("authToken") || "";
        const response = await fetch(`${ORDER_API_URL}${params.toString() ? `?${params.toString()}` : ""}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || "Failed to load service orders");
        }
        setOrders(Array.isArray(payload.orders) ? (payload.orders as Order[]) : []);
      } catch (error: any) {
        setOrders([]);
        setOrderError(error?.message || "Failed to load service orders");
      } finally {
        setLoadingOrders(false);
      }
    };
    void loadOrders();
  }, [dateRange.endDate, dateRange.startDate]);

  const pendingRows = useMemo(() => {
    if (!selectedCompany) return [] as PendingRow[];

    const rows: PendingRow[] = [];

    orders.forEach((order) => {
      const companyNames = parseStringList((order as any).company_names);
      if (companyNames.length === 0) companyNames.push(...parseStringList(order.company_name));
      if (!companyNames.some((name) => name.toLowerCase() === selectedCompany.toLowerCase())) return;

      const productIds = parseNumberList((order as any).product_ids);
      const fallbackProductId = Number(order.product_id);
      const primaryIds =
        productIds.length > 0
          ? productIds
          : Number.isInteger(fallbackProductId) && fallbackProductId > 0
            ? [fallbackProductId]
            : [];

      const productNames = parseStringList((order as any).product_names);
      const serialNumbers = parseStringList((order as any).product_serial_numbers);
      const statusMap = parseRecord((order as any).product_status_map);
      const issueMap = parseRecord((order as any).issue_description_map);

      primaryIds.forEach((productId, index) => {
        const product = productById.get(productId);
        const perProductStatus = normalizeStatus(statusMap[String(productId)]);
        const orderStatus = normalizeStatus(order.status);
        const flowStatus = (perProductStatus || orderStatus || "pending") as string;
        if (flowStatus !== flowStatusFilter) return;

        const row: PendingRow = {
          key: `${order.id}-${productId}-${selectedCompany}`,
          orderId: Number(order.id),
          company: selectedCompany,
          serviceDate: formatDisplayDate(order.created_at),
          productName: product?.product_name || productNames[index] || order.product_name || `Product #${productId}`,
          model: product?.model || order.product_model || "N/A",
          serial: serialNumbers[index] || product?.serial_number || order.serial_number || "N/A",
          faultDescription:
            String(issueMap[String(productId)] || "").trim() || String(order.issue_description || "").trim() || "N/A",
          pendingDays: getPendingDays(order.created_at),
          flowStatus,
        };

        rows.push(row);
      });
    });

    return rows.sort((a, b) => b.pendingDays - a.pendingDays);
  }, [flowStatusFilter, orders, productById, selectedCompany]);

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
                <th>Company</th>
                <th>Service Order Date</th>
                <th>Product Name</th>
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

  const handleClearFilters = () => {
    setSelectedCompany("");
    setDateRange({ startDate: "", endDate: "" });
    setFlowStatusFilter("pending");
    setSelectedKeys([]);
  };

  return (
    <div className="pending-tab-section">
      <div className="pending-hero">
        <div>
          <h2>Pending Product Desk</h2>
          <p>Choose a company, review all pending products, then select and print a clean service report.</p>
        </div>
        <button className="btn btn-primary" onClick={handlePrint} disabled={!selectedCompany || printRows.length === 0}>
          <FiPrinter />
          <span>Print Selected</span>
        </button>
      </div>

      <div className="pending-toolbar">
        <label htmlFor="pending-company-select">Company</label>
        <select
          id="pending-company-select"
          className="pending-company-select"
          value={selectedCompany}
          disabled={loadingCompanies}
          onChange={(event) => {
            setSelectedCompany(event.target.value);
            setSelectedKeys([]);
          }}
        >
          <option value="">{loadingCompanies ? "Loading companies..." : "Select company"}</option>
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
          <select
            className="pending-status-select"
            value={flowStatusFilter}
            onChange={(event) =>
              setFlowStatusFilter(event.target.value as "pending" | "rajtocom" | "comtoraj" | "deliveryed")
            }
          >
            <option value="pending">pending</option>
            <option value="rajtocom">rajtocom</option>
            <option value="comtoraj">comtoraj</option>
            <option value="deliveryed">deliveryed</option>
          </select>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("today"))}>Today</button>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("thisWeek"))}>This Week</button>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("thisMonth"))}>This Month</button>
          <button type="button" className="btn btn-secondary" onClick={() => setDateRange(getPresetRange("lastMonth"))}>Last Month</button>
          <button type="button" className="btn btn-outline" onClick={handleClearFilters}>Clear</button>
        </div>
      </div>

      {orderError && <div className="pending-empty-state">{orderError}</div>}

      {selectedCompany ? (
        <>
          <div className="pending-summary-row">
            <div className="pending-summary-card">
              <FiClock />
              <div>
                <strong>{pendingRows.length}</strong>
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
            {loadingOrders ? (
              <div className="pending-empty-state">Loading pending products...</div>
            ) : pendingRows.length > 0 ? (
              <table className="pending-table">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                    </th>
                    <th>Company</th>
                    <th>Service Order Date</th>
                    <th>Product Name</th>
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
                      <td>{row.company}</td>
                      <td>{row.serviceDate}</td>
                      <td>{row.productName}</td>
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
            ) : (
              <div className="pending-empty-state">No pending products found for this company.</div>
            )}
          </div>
        </>
      ) : (
        <div className="pending-empty-state">Select a company to view pending product list.</div>
      )}
    </div>
  );
};

export default PendingTab;
