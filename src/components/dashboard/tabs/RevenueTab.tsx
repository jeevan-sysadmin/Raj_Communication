import { type FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiBarChart2,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiFilter,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiTrendingDown,
  FiTrendingUp,
} from "react-icons/fi";
import { exportStyledPdfReport } from "../pdfExport";

interface ServiceSummary {
  service_type: string;
  income: number;
  expenses: number;
  salaries: number;
  total_costs: number;
  net_profit: number;
  order_count: number;
  customer_count: number;
}

interface MonthlyRow {
  month: string;
  label: string;
  income: number;
  expenses: number;
  salaries: number;
  total_costs: number;
  net_profit: number;
}

interface TopCustomer {
  client_id: number;
  client_name: string;
  phone: string;
  order_count: number;
  total_paid: number;
}

interface RecentIncomeEntry {
  id: number;
  service_type: string;
  income_source: string;
  amount: number;
  income_date: string;
  description: string;
  payment_method: string;
  reference_number: string;
  notes: string;
  created_by_name: string;
}

interface RevenueResponse {
  success: boolean;
  filters: {
    year: number | null;
    month: number | null;
    service_type: string;
    from_date: string;
    to_date: string;
  };
  summary: {
    period_label: string;
    date_range: { from: string; to: string };
    total_income: number;
    payment_income: number;
    manual_income_total: number;
    manual_income_count: number;
    total_expenses: number;
    total_salaries: number;
    total_costs: number;
    net_profit: number;
    payment_count: number;
    order_count: number;
    unique_customers: number;
    average_payment: number;
    by_service: ServiceSummary[];
  };
  monthly_data: MonthlyRow[];
  top_customers: TopCustomer[];
  recent_income: RecentIncomeEntry[];
  message?: string;
}

const API_BASE_URL = "http://162.141.0.9/sun_computers/api";
const serviceTypeOptions = ["all", "general", "repair", "sales", "water", "inverter"];

const todayString = () => new Date().toISOString().split("T")[0];

const formatCurrency = (value: number | string | undefined) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: "12px",
  border: "1px solid rgba(203, 213, 225, 0.9)",
  fontSize: "14px",
  background: "#fff",
  color: "#0f172a",
} as const;

const RevenueTab = () => {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number | "">("");
  const [serviceType, setServiceType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [submittingIncome, setSubmittingIncome] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    service_type: "general",
    income_source: "manual",
    amount: "",
    income_date: todayString(),
    payment_method: "cash",
    reference_number: "",
    description: "",
    notes: "",
  });

  const buildHeaders = (withJson = false) => {
    const token = localStorage.getItem("authToken");
    return {
      Accept: "application/json",
      ...(withJson ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadRevenue = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        year: String(year),
        service_type: serviceType,
      });

      if (month) {
        params.set("month", String(month));
      }

      const response = await fetch(`${API_BASE_URL}/revenue.php?${params.toString()}`, {
        headers: buildHeaders(),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load revenue data");
      }

      setData(result);
    } catch (requestError: any) {
      setError(requestError.message || "Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRevenue();
  }, [year, month, serviceType]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => currentYear - 3 + index);
  }, []);

  const manualIncomeServices = serviceTypeOptions.filter((option) => option !== "all");

  const exportCsv = () => {
    if (!data) return;

    const lines: Array<Array<string | number>> = [
      ["Period", data.summary.period_label],
      ["Date From", data.summary.date_range.from],
      ["Date To", data.summary.date_range.to],
      ["Total Income", data.summary.total_income],
      ["Payment Income", data.summary.payment_income],
      ["Manual Income", data.summary.manual_income_total],
      ["Manual Income Entries", data.summary.manual_income_count],
      ["Total Expenses", data.summary.total_expenses],
      ["Total Salaries", data.summary.total_salaries],
      ["Total Costs", data.summary.total_costs],
      ["Net Profit", data.summary.net_profit],
      [],
      ["Service Type", "Income", "Expenses", "Salaries", "Total Costs", "Net Profit", "Orders", "Customers"],
      ...data.summary.by_service.map((item) => [
        item.service_type,
        item.income,
        item.expenses,
        item.salaries,
        item.total_costs,
        item.net_profit,
        item.order_count,
        item.customer_count,
      ]),
    ];

    if (data.recent_income.length > 0) {
      lines.push([]);
      lines.push(["Recent Manual Income"]);
      lines.push(["Date", "Service", "Source", "Description", "Amount", "Method"]);
      data.recent_income.forEach((item) => {
        lines.push([
          item.income_date,
          item.service_type,
          item.income_source,
          item.description,
          item.amount,
          item.payment_method,
        ]);
      });
    }

    const csv = lines
      .map((row) =>
        row
          .map((cell) => {
            if (cell === undefined || cell === null) return "";
            const value = String(cell);
            return value.includes(",") ? `"${value.replace(/"/g, "\"\"")}"` : value;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `revenue-report-${year}${month ? `-${month}` : ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!data) return;

    const scopeParts = [
      serviceType === "all" ? "All services" : `${serviceType} service`,
      month ? new Date(year, Number(month) - 1, 1).toLocaleDateString("en-IN", { month: "long" }) : "All months",
      String(year),
    ];

    exportStyledPdfReport({
      filename: `revenue-report-${year}${month ? `-${month}` : ""}.pdf`,
      title: "Revenue Dashboard",
      subtitle: data.summary.period_label,
      scopeLabel: scopeParts.join(" · "),
      metrics: [
        { label: "Total Income", value: formatCurrency(data.summary.total_income) },
        { label: "Total Expenses", value: formatCurrency(data.summary.total_expenses) },
        { label: "Total Salaries", value: formatCurrency(data.summary.total_salaries) },
        { label: "Net Profit", value: formatCurrency(data.summary.net_profit) },
      ],
      head: [["Service", "Income", "Expenses", "Salaries", "Total Costs", "Net Profit", "Orders", "Customers"]],
      body: data.summary.by_service.map((item) => [
        item.service_type,
        formatCurrency(item.income),
        formatCurrency(item.expenses),
        formatCurrency(item.salaries),
        formatCurrency(item.total_costs),
        formatCurrency(item.net_profit),
        item.order_count,
        item.customer_count,
      ]),
      accentColor: "#0ea5e9",
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 26, halign: "right" },
        2: { cellWidth: 26, halign: "right" },
        3: { cellWidth: 26, halign: "right" },
        4: { cellWidth: 26, halign: "right" },
        5: { cellWidth: 26, halign: "right" },
        6: { cellWidth: 18, halign: "right" },
        7: { cellWidth: 18, halign: "right" },
      },
    });
  };

  const printRevenue = () => {
    if (!data) return;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    const serviceRows = data.summary.by_service
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.service_type)}</td>
            <td>${escapeHtml(formatCurrency(item.income))}</td>
            <td>${escapeHtml(formatCurrency(item.expenses))}</td>
            <td>${escapeHtml(formatCurrency(item.salaries))}</td>
            <td>${escapeHtml(formatCurrency(item.total_costs))}</td>
            <td>${escapeHtml(formatCurrency(item.net_profit))}</td>
            <td>${escapeHtml(item.order_count)}</td>
            <td>${escapeHtml(item.customer_count)}</td>
          </tr>`,
      )
      .join("");

    const monthlyRows = data.monthly_data
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.label)}</td>
            <td>${escapeHtml(formatCurrency(item.income))}</td>
            <td>${escapeHtml(formatCurrency(item.total_costs))}</td>
            <td>${escapeHtml(formatCurrency(item.net_profit))}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Revenue Dashboard Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; color: #0ea5e9; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 16px 0; }
            .card { padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
            .card span { display: block; color: #64748b; font-size: 12px; margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #eff6ff; color: #1e3a8a; }
            tr:nth-child(even) { background: #f8fafc; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Revenue Dashboard</h1>
          <p>${escapeHtml(data.summary.period_label)}</p>
          <p>Printed on ${escapeHtml(new Date().toLocaleString("en-IN"))}</p>
          <div class="summary">
            <div class="card"><span>Total Income</span><strong>${escapeHtml(formatCurrency(data.summary.total_income))}</strong></div>
            <div class="card"><span>Total Expenses</span><strong>${escapeHtml(formatCurrency(data.summary.total_expenses))}</strong></div>
            <div class="card"><span>Total Salaries</span><strong>${escapeHtml(formatCurrency(data.summary.total_salaries))}</strong></div>
            <div class="card"><span>Net Profit</span><strong>${escapeHtml(formatCurrency(data.summary.net_profit))}</strong></div>
          </div>
          <h3>Service Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Income</th>
                <th>Expenses</th>
                <th>Salaries</th>
                <th>Costs</th>
                <th>Profit</th>
                <th>Orders</th>
                <th>Customers</th>
              </tr>
            </thead>
            <tbody>${serviceRows}</tbody>
          </table>
          <h3>Monthly Trend</h3>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Costs</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>${monthlyRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const submitIncome = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingIncome(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/income.php`, {
        method: "POST",
        headers: buildHeaders(true),
        body: JSON.stringify({
          service_type: incomeForm.service_type,
          income_source: incomeForm.income_source,
          amount: Number(incomeForm.amount || 0),
          income_date: incomeForm.income_date,
          payment_method: incomeForm.payment_method,
          reference_number: incomeForm.reference_number,
          description: incomeForm.description,
          notes: incomeForm.notes,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save income entry");
      }

      setIncomeForm({
        service_type: serviceType !== "all" ? serviceType : "general",
        income_source: "manual",
        amount: "",
        income_date: todayString(),
        payment_method: "cash",
        reference_number: "",
        description: "",
        notes: "",
      });
      setShowIncomeForm(false);
      setNotice("Income saved successfully.");
      await loadRevenue();
    } catch (saveError: any) {
      setError(saveError.message || "Failed to save income entry");
    } finally {
      setSubmittingIncome(false);
    }
  };

  const summaryCards = data
    ? [
        ["Total Income", formatCurrency(data.summary.total_income), <FiDollarSign />, "linear-gradient(135deg, #10b981, #34d399)"],
        ["Manual Income", formatCurrency(data.summary.manual_income_total), <FiPlus />, "linear-gradient(135deg, #0ea5e9, #38bdf8)"],
        ["Expenses", formatCurrency(data.summary.total_expenses), <FiTrendingDown />, "linear-gradient(135deg, #ef4444, #fb7185)"],
        ["Salaries", formatCurrency(data.summary.total_salaries), <FiCreditCard />, "linear-gradient(135deg, #3b82f6, #60a5fa)"],
        ["Net Profit", formatCurrency(data.summary.net_profit), <FiTrendingUp />, "linear-gradient(135deg, #7c3aed, #a855f7)"],
      ]
    : [];

  return (
    <div className="data-table-wrapper" style={{ overflow: "hidden" }}>
      <div className="table-header-section" style={{ alignItems: "stretch", gap: "18px", paddingBottom: "22px" }}>
        <div className="table-title-wrapper" style={{ maxWidth: "760px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(59,130,246,0.12))",
              color: "#047857",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: "14px",
            }}
          >
            <FiBarChart2 />
            Income And Costs
          </div>
          <h3 style={{ fontSize: "30px", lineHeight: 1.1, marginBottom: "10px", color: "#0f172a" }}>
            Revenue Dashboard
          </h3>
          <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#64748b", margin: 0 }}>
            Review paid-order revenue together with manual income, staff salaries, and operating expenses across each service type.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "0 12px", minHeight: "48px", borderRadius: "16px", background: "#fff", border: "1px solid rgba(203,213,225,0.9)" }}>
            <FiFilter style={{ color: "#64748b" }} />
            <select value={year} onChange={(event) => setYear(Number(event.target.value))} style={{ border: "none", outline: "none", background: "transparent", fontSize: "14px" }}>
              {years.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "0 12px", minHeight: "48px", borderRadius: "16px", background: "#fff", border: "1px solid rgba(203,213,225,0.9)" }}>
            <select value={month} onChange={(event) => setMonth(event.target.value ? Number(event.target.value) : "")} style={{ border: "none", outline: "none", background: "transparent", fontSize: "14px" }}>
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((option) => (
                <option key={option} value={option}>
                  {new Date(2000, option - 1, 1).toLocaleDateString("en-IN", { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "0 12px", minHeight: "48px", borderRadius: "16px", background: "#fff", border: "1px solid rgba(203,213,225,0.9)" }}>
            <select value={serviceType} onChange={(event) => setServiceType(event.target.value)} style={{ border: "none", outline: "none", background: "transparent", fontSize: "14px", textTransform: "capitalize" }}>
              {serviceTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Services" : option}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-secondary" onClick={() => void loadRevenue()} disabled={loading}>
            <FiRefreshCw className={loading ? "spinning" : ""} /> Refresh
          </button>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={!data}>
            <FiDollarSign /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={exportPdf} disabled={!data}>
            <FiFileText /> Export PDF
          </button>
          <button className="btn btn-secondary" onClick={printRevenue} disabled={!data}>
            <FiPrinter /> Print
          </button>
        </div>
      </div>

      {notice ? (
        <div style={{ marginBottom: "16px", padding: "14px 16px", borderRadius: "18px", background: "rgba(16,185,129,0.12)", color: "#047857", fontWeight: 700 }}>
          {notice}
        </div>
      ) : null}

      {error ? (
        <div style={{ marginBottom: "16px", padding: "14px 16px", borderRadius: "18px", background: "rgba(239,68,68,0.12)", color: "#dc2626", fontWeight: 700 }}>
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>Loading revenue data...</div>
      ) : null}

      {data ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "18px" }}>
            {summaryCards.map(([label, value, icon, accent], index) => (
              <motion.div
                key={String(label)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                style={{
                  padding: "18px",
                  borderRadius: "22px",
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                  border: "1px solid rgba(148,163,184,0.14)",
                  boxShadow: "0 16px 34px rgba(15,23,42,0.06)",
                }}
              >
                <div style={{ width: "44px", height: "44px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", background: String(accent), color: "#fff", marginBottom: "14px" }}>
                  {icon}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{label}</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>{value}</div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px", marginBottom: "18px" }}>
            <div style={{ padding: "18px", borderRadius: "22px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <h4 style={{ margin: "0 0 6px 0", color: "#0f172a" }}>Manual Income</h4>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: 1.6 }}>
                    Add extra income that does not come from the payments table, like service charges, direct collections, or one-off sales.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowIncomeForm((prev) => !prev);
                    setIncomeForm((prev) => ({
                      ...prev,
                      service_type: serviceType !== "all" ? serviceType : prev.service_type,
                    }));
                  }}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
                    color: "#fff",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  <FiPlus /> {showIncomeForm ? "Close Form" : "Add Income"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: showIncomeForm ? "16px" : 0 }}>
                <div style={{ padding: "12px", borderRadius: "14px", background: "#f8fafc" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Manual Income</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{formatCurrency(data.summary.manual_income_total)}</div>
                </div>
                <div style={{ padding: "12px", borderRadius: "14px", background: "#f8fafc" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Entries</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{data.summary.manual_income_count}</div>
                </div>
                <div style={{ padding: "12px", borderRadius: "14px", background: "#f8fafc" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Paid Order Income</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{formatCurrency(data.summary.payment_income)}</div>
                </div>
              </div>

              {showIncomeForm ? (
                <form onSubmit={submitIncome} style={{ display: "grid", gap: "12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                    <select value={incomeForm.service_type} onChange={(event) => setIncomeForm((prev) => ({ ...prev, service_type: event.target.value }))} style={inputStyle}>
                      {manualIncomeServices.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <input value={incomeForm.amount} onChange={(event) => setIncomeForm((prev) => ({ ...prev, amount: event.target.value }))} type="number" min="0" step="0.01" required placeholder="Amount" style={inputStyle} />

                    <input value={incomeForm.income_date} onChange={(event) => setIncomeForm((prev) => ({ ...prev, income_date: event.target.value }))} type="date" required style={inputStyle} />

                    <input value={incomeForm.income_source} onChange={(event) => setIncomeForm((prev) => ({ ...prev, income_source: event.target.value }))} placeholder="Source" style={inputStyle} />

                    <select value={incomeForm.payment_method} onChange={(event) => setIncomeForm((prev) => ({ ...prev, payment_method: event.target.value }))} style={inputStyle}>
                      <option value="cash">cash</option>
                      <option value="upi">upi</option>
                      <option value="card">card</option>
                      <option value="bank_transfer">bank_transfer</option>
                      <option value="cheque">cheque</option>
                    </select>

                    <input value={incomeForm.reference_number} onChange={(event) => setIncomeForm((prev) => ({ ...prev, reference_number: event.target.value }))} placeholder="Reference no." style={inputStyle} />
                  </div>

                  <input value={incomeForm.description} onChange={(event) => setIncomeForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" required style={inputStyle} />
                  <textarea value={incomeForm.notes} onChange={(event) => setIncomeForm((prev) => ({ ...prev, notes: event.target.value }))} rows={3} placeholder="Notes" style={{ ...inputStyle, resize: "vertical" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <strong style={{ color: "#0f172a" }}>New entry: {formatCurrency(incomeForm.amount)}</strong>
                    <button type="submit" disabled={submittingIncome} style={{ border: "none", background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}>
                      {submittingIncome ? "Saving..." : "Save Income"}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>

            <div style={{ padding: "18px", borderRadius: "22px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#0f172a" }}>Recent Manual Income</h4>
              <div style={{ display: "grid", gap: "10px" }}>
                {data.recent_income.length > 0 ? (
                  data.recent_income.map((item) => (
                    <div key={item.id} style={{ padding: "12px 14px", borderRadius: "14px", background: "#f8fafc", display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{item.description}</div>
                        <div style={{ fontSize: "13px", color: "#64748b", textTransform: "capitalize" }}>
                          {formatDate(item.income_date)} - {item.service_type} - {item.income_source}
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                          {item.payment_method.replace(/_/g, " ")}
                          {item.reference_number ? ` - ${item.reference_number}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{formatCurrency(item.amount)}</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>{item.created_by_name || "Manual entry"}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "#64748b" }}>No manual income entries in this period.</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px" }}>
            <div style={{ display: "grid", gap: "18px" }}>
              <div style={{ padding: "18px", borderRadius: "22px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)" }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#0f172a" }}>Period Summary</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                  {[
                    ["Period", data.summary.period_label],
                    ["Date Range", `${formatDate(data.summary.date_range.from)} to ${formatDate(data.summary.date_range.to)}`],
                    ["Paid Transactions", String(data.summary.payment_count)],
                    ["Orders Count", String(data.summary.order_count)],
                    ["Unique Customers", String(data.summary.unique_customers)],
                    ["Average Payment", formatCurrency(data.summary.average_payment)],
                    ["Manual Entries", String(data.summary.manual_income_count)],
                    ["Total Costs", formatCurrency(data.summary.total_costs)],
                  ].map(([label, value]) => (
                    <div key={String(label)} style={{ padding: "12px", borderRadius: "14px", background: "#f8fafc" }}>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{label}</div>
                      <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: "18px", borderRadius: "22px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)", overflowX: "auto" }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#0f172a" }}>Service Breakdown</h4>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Service", "Income", "Expenses", "Salaries", "Costs", "Profit"].map((heading) => (
                        <th key={heading} style={{ textAlign: heading === "Service" ? "left" : "right", padding: "10px", background: "#f8fafc", fontSize: "12px", color: "#475569" }}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.summary.by_service.length > 0 ? (
                      data.summary.by_service.map((item) => (
                        <tr key={item.service_type} style={{ borderTop: "1px solid rgba(226,232,240,0.9)" }}>
                          <td style={{ padding: "10px", fontWeight: 700, textTransform: "capitalize" }}>{item.service_type}</td>
                          <td style={{ padding: "10px", textAlign: "right" }}>{formatCurrency(item.income)}</td>
                          <td style={{ padding: "10px", textAlign: "right", color: "#ef4444" }}>{formatCurrency(item.expenses)}</td>
                          <td style={{ padding: "10px", textAlign: "right", color: "#3b82f6" }}>{formatCurrency(item.salaries)}</td>
                          <td style={{ padding: "10px", textAlign: "right" }}>{formatCurrency(item.total_costs)}</td>
                          <td style={{ padding: "10px", textAlign: "right", fontWeight: 800, color: item.net_profit >= 0 ? "#10b981" : "#ef4444" }}>{formatCurrency(item.net_profit)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#64748b" }}>
                          No service breakdown available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "grid", gap: "18px" }}>
              <div style={{ padding: "18px", borderRadius: "22px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)", overflowX: "auto" }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#0f172a" }}>Monthly Trend</h4>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Month", "Income", "Costs", "Profit"].map((heading) => (
                        <th key={heading} style={{ textAlign: heading === "Month" ? "left" : "right", padding: "10px", background: "#f8fafc", fontSize: "12px", color: "#475569" }}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly_data.length > 0 ? (
                      data.monthly_data.map((item) => (
                        <tr key={item.month} style={{ borderTop: "1px solid rgba(226,232,240,0.9)" }}>
                          <td style={{ padding: "10px", fontWeight: 700 }}>{item.label}</td>
                          <td style={{ padding: "10px", textAlign: "right" }}>{formatCurrency(item.income)}</td>
                          <td style={{ padding: "10px", textAlign: "right" }}>{formatCurrency(item.total_costs)}</td>
                          <td style={{ padding: "10px", textAlign: "right", fontWeight: 800, color: item.net_profit >= 0 ? "#10b981" : "#ef4444" }}>{formatCurrency(item.net_profit)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ padding: "16px", textAlign: "center", color: "#64748b" }}>
                          No monthly data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: "18px", borderRadius: "22px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)" }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#0f172a" }}>Top Customers</h4>
                <div style={{ display: "grid", gap: "10px" }}>
                  {data.top_customers.length > 0 ? (
                    data.top_customers.map((item) => (
                      <div key={item.client_id} style={{ padding: "12px 14px", borderRadius: "14px", background: "#f8fafc", display: "flex", justifyContent: "space-between", gap: "12px" }}>
                        <div>
                          <div style={{ fontWeight: 800, color: "#0f172a" }}>{item.client_name}</div>
                          <div style={{ fontSize: "13px", color: "#64748b" }}>
                            {item.phone || "No phone"} - {item.order_count} orders
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{formatCurrency(item.total_paid)}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#64748b" }}>No customer payment data available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default RevenueTab;
