import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiLayers,
  FiPackage,
  FiPrinter,
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
} from "react-icons/fi";
import { exportStyledPdfReport } from "../pdfExport";

interface AnalyticsData {
  monthly_revenue: Array<{ month: string; revenue: number | string }>;
  order_trends: Array<{ date: string; orders: number | string }>;
  category_distribution?: Array<{ category: string; count: number | string; value: number | string }>;
  status_distribution: Array<{ status: string; count: number | string; color: string }>;
  priority_distribution: Array<{ priority: string; count: number | string; color: string }>;
}

interface AnalyticsTabProps {
  analyticsData: AnalyticsData | null;
  loading: boolean;
  onRefresh: () => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
}

const num = (v: unknown) => {
  if (Array.isArray(v)) return Number(v[0] || 0);
  return Number(v || 0);
};
const title = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
const money = (v: number) => `Rs. ${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const compact = (v: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v);
const monthLabel = (value: string) => {
  const [y, m] = String(value || "").split("-");
  if (!y || !m) return value;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};
const dayLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};
const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const shell: CSSProperties = { overflow: "hidden" };
const panel: CSSProperties = {
  borderRadius: 26,
  padding: 22,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  border: "1px solid rgba(148,163,184,0.14)",
  boxShadow: "0 18px 38px rgba(15,23,42,0.08)",
};
const smallPanel: CSSProperties = { ...panel, padding: 18, borderRadius: 22 };
const tipStyle = {
  background: "rgba(15, 23, 42, 0.96)",
  border: "1px solid rgba(148,163,184,0.18)",
  borderRadius: "14px",
  boxShadow: "0 18px 42px rgba(2, 6, 23, 0.28)",
};

const AnalyticsTab = ({ analyticsData, loading, onRefresh, getStatusColor, getPriorityColor }: AnalyticsTabProps) => {
  const revenue = useMemo(
    () => (analyticsData?.monthly_revenue || []).map((i) => ({ month: monthLabel(i.month), revenue: num(i.revenue) })),
    [analyticsData],
  );
  const trends = useMemo(
    () => (analyticsData?.order_trends || []).map((i) => ({ date: dayLabel(i.date), orders: num(i.orders) })),
    [analyticsData],
  );
  const statuses = useMemo(
    () =>
      (analyticsData?.status_distribution || []).map((i) => ({
        status: i.status,
        label: title(i.status),
        count: num(i.count),
        color: i.color || getStatusColor(i.status),
      })),
    [analyticsData, getStatusColor],
  );
  const priorities = useMemo(
    () =>
      (analyticsData?.priority_distribution || []).map((i) => ({
        priority: i.priority,
        label: title(i.priority),
        count: num(i.count),
        color: i.color || getPriorityColor(i.priority),
      })),
    [analyticsData, getPriorityColor],
  );
  const categories = useMemo(
    () =>
      (analyticsData?.category_distribution || []).map((i) => ({
        category: i.category,
        label: title(i.category),
        count: num(i.count),
        value: num(i.value),
      })),
    [analyticsData],
  );

  const totalRevenue = revenue.reduce((a, b) => a + b.revenue, 0);
  const totalOrders = statuses.reduce((a, b) => a + b.count, 0);
  const delivered = statuses.find((i) => i.status === "delivered")?.count || 0;
  const completed = statuses.find((i) => i.status === "completed")?.count || 0;
  const closedRate = totalOrders ? ((delivered + completed) / totalOrders) * 100 : 0;
  const urgent = priorities.find((i) => i.priority === "urgent")?.count || 0;
  const urgentRate = totalOrders ? (urgent / totalOrders) * 100 : 0;
  const avgDailyOrders = trends.length ? trends.reduce((a, b) => a + b.orders, 0) / trends.length : 0;
  const topStatus = statuses[0];
  const topCategory = categories[0];
  const bestMonth = revenue.length ? revenue.reduce((a, b) => (b.revenue > a.revenue ? b : a), revenue[0]) : null;
  const revenueDelta =
    revenue.length > 1 && revenue[revenue.length - 2].revenue > 0
      ? ((revenue[revenue.length - 1].revenue - revenue[revenue.length - 2].revenue) / revenue[revenue.length - 2].revenue) * 100
      : null;
  const healthScore = Math.min(100, Math.round(closedRate * 0.7 + Math.max(0, 100 - urgentRate * 2) * 0.3));
  const categoryPeak = topCategory?.count || 0;
  const hasData = revenue.length || trends.length || statuses.length || priorities.length || categories.length;
  const updatedAt = new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const statCards = [
    { label: "Tracked Revenue", value: totalRevenue ? money(totalRevenue) : "Rs. 0", hint: revenueDelta !== null ? `${revenueDelta >= 0 ? "+" : ""}${revenueDelta.toFixed(1)}% vs previous month` : "Latest revenue periods", icon: <FiTrendingUp />, bg: "linear-gradient(135deg,#0f766e,#14b8a6)" },
    { label: "Orders In Scope", value: totalOrders.toLocaleString(), hint: `${trends.reduce((a, b) => a + b.orders, 0).toLocaleString()} in trend window`, icon: <FiPackage />, bg: "linear-gradient(135deg,#2563eb,#38bdf8)" },
    { label: "Closure Rate", value: `${closedRate.toFixed(1)}%`, hint: `${(delivered + completed).toLocaleString()} closed orders`, icon: <FiCheckCircle />, bg: "linear-gradient(135deg,#ea580c,#f59e0b)" },
    { label: "Urgent Pressure", value: `${urgentRate.toFixed(1)}%`, hint: `${urgent.toLocaleString()} urgent orders`, icon: <FiAlertTriangle />, bg: "linear-gradient(135deg,#be123c,#fb7185)" },
  ];

  const exportAnalyticsCsv = () => {
    if (!analyticsData || !hasData) return;

    const lines: Array<Array<string | number>> = [
      ["Tracked Revenue", totalRevenue],
      ["Total Orders", totalOrders],
      ["Closure Rate", `${closedRate.toFixed(1)}%`],
      ["Urgent Pressure", `${urgentRate.toFixed(1)}%`],
      ["Average Daily Orders", avgDailyOrders.toFixed(1)],
      ["Health Score", healthScore],
      [],
      ["Monthly Revenue"],
      ["Month", "Revenue"],
      ...revenue.map((item) => [item.month, item.revenue]),
      [],
      ["Order Trends"],
      ["Date", "Orders"],
      ...trends.map((item) => [item.date, item.orders]),
      [],
      ["Status Distribution"],
      ["Status", "Orders"],
      ...statuses.map((item) => [item.label, item.count]),
      [],
      ["Priority Distribution"],
      ["Priority", "Orders"],
      ...priorities.map((item) => [item.label, item.count]),
      [],
      ["Category Distribution"],
      ["Category", "Orders", "Value"],
      ...categories.map((item) => [item.label, item.count, item.value]),
    ];

    const csv = lines
      .map((row) =>
        row
          .map((cell) => {
            if (cell === undefined || cell === null) return "";
            const value = String(cell);
            return value.includes(",") ? `"${value.replace(/"/g, "\"\"")}"` : value;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAnalyticsPdf = () => {
    if (!analyticsData || !hasData) return;

    const tableTitle = revenue.length ? "Monthly Revenue" : trends.length ? "Order Trends" : "Status Distribution";
    const head =
      revenue.length
        ? ["Month", "Revenue"]
        : trends.length
          ? ["Date", "Orders"]
          : ["Status", "Orders"];
    const body =
      revenue.length
        ? revenue.map((item) => [item.month, money(item.revenue)])
        : trends.length
          ? trends.map((item) => [item.date, item.orders])
          : statuses.map((item) => [item.label, item.count]);

    exportStyledPdfReport({
      filename: `analytics-report-${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Analytics & Performance",
      subtitle: tableTitle,
      scopeLabel: `${totalOrders.toLocaleString()} orders in scope`,
      metrics: [
        { label: "Tracked Revenue", value: money(totalRevenue) },
        { label: "Closure Rate", value: `${closedRate.toFixed(1)}%` },
        { label: "Urgent Pressure", value: `${urgentRate.toFixed(1)}%` },
        { label: "Health Score", value: `${healthScore}` },
      ],
      head: [head],
      body,
      accentColor: "#2563eb",
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40, halign: "right" },
      },
    });
  };

  const printAnalytics = () => {
    if (!analyticsData || !hasData) return;

    const revenueRows = revenue
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.month)}</td>
            <td>${escapeHtml(money(item.revenue))}</td>
          </tr>`,
      )
      .join("");
    const trendRows = trends
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.date)}</td>
            <td>${escapeHtml(item.orders)}</td>
          </tr>`,
      )
      .join("");
    const statusRows = statuses
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.label)}</td>
            <td>${escapeHtml(item.count)}</td>
          </tr>`,
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Analytics & Performance Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; color: #2563eb; }
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
          <h1>Analytics & Performance</h1>
          <p>Printed on ${escapeHtml(updatedAt)}</p>
          <div class="summary">
            <div class="card"><span>Tracked Revenue</span><strong>${escapeHtml(money(totalRevenue))}</strong></div>
            <div class="card"><span>Total Orders</span><strong>${escapeHtml(totalOrders)}</strong></div>
            <div class="card"><span>Closure Rate</span><strong>${escapeHtml(closedRate.toFixed(1))}%</strong></div>
            <div class="card"><span>Urgent Pressure</span><strong>${escapeHtml(urgentRate.toFixed(1))}%</strong></div>
          </div>
          <h3>Monthly Revenue</h3>
          <table>
            <thead><tr><th>Month</th><th>Revenue</th></tr></thead>
            <tbody>${revenueRows || "<tr><td colspan='2'>No data</td></tr>"}</tbody>
          </table>
          <h3>Order Trends</h3>
          <table>
            <thead><tr><th>Date</th><th>Orders</th></tr></thead>
            <tbody>${trendRows || "<tr><td colspan='2'>No data</td></tr>"}</tbody>
          </table>
          <h3>Status Distribution</h3>
          <table>
            <thead><tr><th>Status</th><th>Orders</th></tr></thead>
            <tbody>${statusRows || "<tr><td colspan='2'>No data</td></tr>"}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="analytics-tab">
      <div className="data-table-wrapper" style={shell}>
        <div className="table-header-section" style={{ alignItems: "stretch", gap: 20, paddingBottom: 22, borderBottom: "1px solid rgba(148,163,184,0.16)" }}>
          <div className="table-title-wrapper" style={{ maxWidth: 780 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, background: "linear-gradient(135deg, rgba(15,118,110,0.1), rgba(37,99,235,0.1))", color: "#0f766e", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 14 }}>
              <FiBarChart2 />
              Operations Intelligence
            </div>
            <h3 style={{ fontSize: 30, lineHeight: 1.08, marginBottom: 10, color: "#0f172a" }}>Analytics & Performance</h3>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "#64748b", margin: 0 }}>
              Read service momentum, revenue, queue pressure, and category demand from one cleaner analytics workspace.
            </p>
          </div>
          <div className="table-controls" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div style={{ padding: "12px 14px", borderRadius: 16, background: "linear-gradient(180deg, rgba(248,250,252,0.96), rgba(241,245,249,0.9))", border: "1px solid rgba(148,163,184,0.14)", color: "#475569", fontSize: 12, minWidth: 190 }}>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Snapshot readiness</div>
              <div>{loading ? "Refreshing analytics..." : `${totalOrders.toLocaleString()} orders in scope`}</div>
              <div style={{ marginTop: 4, color: "#64748b" }}>Updated {updatedAt}</div>
            </div>
            <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
              <FiRefreshCw className={loading ? "spinning" : ""} /> Refresh Analytics
            </button>
            <button className="btn btn-secondary" onClick={exportAnalyticsCsv} disabled={!hasData}>
              <FiDownload /> Export CSV
            </button>
            <button className="btn btn-secondary" onClick={exportAnalyticsPdf} disabled={!hasData}>
              <FiFileText /> Export PDF
            </button>
            <button className="btn btn-secondary" onClick={printAnalytics} disabled={!hasData}>
              <FiPrinter /> Print
            </button>
          </div>
        </div>

        {analyticsData && hasData ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 22, marginBottom: 22 }}>
              {statCards.map((card) => (
                <div key={card.label} style={smallPanel}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: card.bg, color: "#fff", marginBottom: 14 }}>{card.icon}</div>
                  <div style={{ fontSize: 25, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{card.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>{card.label}</div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{card.hint}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.8fr) minmax(280px, 0.9fr)", gap: 18, marginBottom: 18 }}>
              <div style={panel}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: "0 0 6px 0", fontSize: 22, color: "#0f172a" }}>Revenue Momentum</h4>
                    <p style={{ margin: 0, color: "#64748b", lineHeight: 1.7 }}>Follow month-over-month earnings and identify the strongest billing period quickly.</p>
                  </div>
                  <div style={{ padding: "14px 16px", borderRadius: 18, background: "linear-gradient(135deg, rgba(15,118,110,0.08), rgba(20,184,166,0.14))", minWidth: 190 }}>
                    <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0f766e", marginBottom: 6 }}>Best Month</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{bestMonth ? bestMonth.month : "No data"}</div>
                    <div style={{ fontSize: 13, color: "#0f766e", fontWeight: 700 }}>{bestMonth ? money(bestMonth.revenue) : "Revenue unavailable"}</div>
                  </div>
                </div>
                <div style={{ height: 320 }}>
                  {revenue.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenue} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="analyticsRevenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `Rs. ${compact(Number(v))}`} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <Tooltip contentStyle={tipStyle} labelStyle={{ color: "#e2e8f0", fontWeight: 700 }} itemStyle={{ color: "#f8fafc" }} formatter={(v) => [money(num(v)), "Revenue"]} />
                        <Area type="monotone" dataKey="revenue" stroke="#0f766e" strokeWidth={3} fill="url(#analyticsRevenueFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="no-chart-data" style={{ height: "100%", borderRadius: 22, border: "1px dashed rgba(148,163,184,0.45)", background: "linear-gradient(180deg, rgba(248,250,252,0.95), rgba(241,245,249,0.9))" }}>No revenue trend available yet.</div>}
                </div>
              </div>

              <div style={{ ...panel, background: "linear-gradient(145deg, #082f49 0%, #0f766e 100%)", color: "#e0f2fe", boxShadow: "0 24px 48px rgba(8,47,73,0.24)" }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, fontSize: 22 }}><FiTarget /></div>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.8, marginBottom: 8 }}>Service Health</div>
                <div style={{ fontSize: 54, lineHeight: 1, fontWeight: 900, marginBottom: 10 }}>{healthScore}</div>
                <p style={{ margin: "0 0 18px 0", lineHeight: 1.8, color: "rgba(224,242,254,0.86)" }}>{healthScore >= 75 ? "Delivery and completion performance looks healthy with manageable queue pressure." : healthScore >= 50 ? "Operations are steady, but throughput can improve." : "Queue pressure is outweighing closure performance."}</p>
                <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                  {[{ icon: <FiLayers />, label: "Dominant Status", value: topStatus ? `${topStatus.label} (${topStatus.count})` : "No status data" }, { icon: <FiPackage />, label: "Top Category", value: topCategory ? `${topCategory.label} (${topCategory.count})` : "No category data" }, { icon: <FiAlertTriangle />, label: "Urgent Pressure", value: `${urgentRate.toFixed(1)}%` }, { icon: <FiActivity />, label: "Average Daily Orders", value: avgDailyOrders.toFixed(1) }].map((item) => (
                    <div key={item.label} style={{ display: "grid", gridTemplateColumns: "40px minmax(0, 1fr)", gap: 12, padding: "12px 14px", borderRadius: 18, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 14, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</div>
                      <div><div style={{ fontSize: 12, opacity: 0.78, marginBottom: 4 }}>{item.label}</div><div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>{item.value}</div></div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}><div style={{ width: `${healthScore}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #f59e0b, #facc15, #86efac)" }} /></div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
              <div style={panel}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: 20, color: "#0f172a" }}>Order Velocity</h4>
                <p style={{ margin: "0 0 14px 0", color: "#64748b", lineHeight: 1.7 }}>Follow the daily order rhythm and spot intake spikes quickly.</p>
                <div style={{ height: 280 }}>
                  {trends.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <Tooltip contentStyle={tipStyle} labelStyle={{ color: "#e2e8f0", fontWeight: 700 }} itemStyle={{ color: "#f8fafc" }} formatter={(v) => [`${num(v)} orders`, "Orders"]} />
                        <Line type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#2563eb" }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <div className="no-chart-data" style={{ height: "100%", borderRadius: 22, border: "1px dashed rgba(148,163,184,0.45)" }}>No order trend data available.</div>}
                </div>
              </div>

              <div style={panel}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: 20, color: "#0f172a" }}>Status Mix</h4>
                <p style={{ margin: "0 0 14px 0", color: "#64748b", lineHeight: 1.7 }}>See how the current workload is split across service stages.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignItems: "center" }}>
                  <div style={{ height: 260 }}>
                    {statuses.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip contentStyle={tipStyle} labelStyle={{ color: "#e2e8f0", fontWeight: 700 }} itemStyle={{ color: "#f8fafc" }} formatter={(v) => [`${num(v)} orders`, "Orders"]} />
                          <Pie data={statuses} dataKey="count" innerRadius={58} outerRadius={92} paddingAngle={3}>
                            {statuses.map((e, i) => <Cell key={`${e.status}-${i}`} fill={e.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="no-chart-data" style={{ height: "100%", borderRadius: 20, border: "1px dashed rgba(148,163,184,0.45)" }}>Status distribution unavailable.</div>}
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {statuses.map((item) => {
                      const share = totalOrders ? (item.count / totalOrders) * 100 : 0;
                      return (
                        <div key={item.status} style={{ padding: "12px 14px", borderRadius: 18, background: "#fff", border: "1px solid rgba(226,232,240,0.95)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: item.color }} /><span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.label}</span></div>
                            <span style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>{item.count}</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 999, background: "rgba(226,232,240,0.9)", overflow: "hidden" }}><div style={{ height: "100%", width: `${share}%`, borderRadius: 999, background: item.color }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={panel}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: 20, color: "#0f172a" }}>Priority & Category Insights</h4>
                <p style={{ margin: "0 0 14px 0", color: "#64748b", lineHeight: 1.7 }}>Balance priority pressure and see which categories are taking the most service attention.</p>
                <div style={{ height: 200, marginBottom: 16 }}>
                  {priorities.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorities} layout="vertical" margin={{ top: 8, right: 10, left: 8, bottom: 8 }}>
                        <CartesianGrid stroke="rgba(148,163,184,0.16)" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis dataKey="label" type="category" width={72} tickLine={false} axisLine={false} tick={{ fill: "#334155", fontSize: 12, fontWeight: 700 }} />
                        <Tooltip contentStyle={tipStyle} labelStyle={{ color: "#e2e8f0", fontWeight: 700 }} itemStyle={{ color: "#f8fafc" }} formatter={(v) => [`${num(v)} orders`, "Orders"]} />
                        <Bar dataKey="count" radius={[0, 10, 10, 0]}>{priorities.map((e, i) => <Cell key={`${e.priority}-${i}`} fill={e.color} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="no-chart-data" style={{ height: "100%", borderRadius: 20, border: "1px dashed rgba(148,163,184,0.45)" }}>Priority distribution unavailable.</div>}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {categories.slice(0, 4).map((item) => (
                    <div key={item.category} style={{ padding: "12px 14px", borderRadius: 18, background: "#fff", border: "1px solid rgba(226,232,240,0.95)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{item.label}</div><div style={{ fontSize: 12, color: "#64748b" }}>{item.count} service orders</div></div>
                        <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Tracked value</div><div style={{ fontSize: 14, fontWeight: 800, color: "#0f766e" }}>{money(item.value)}</div></div>
                      </div>
                      <div style={{ height: 9, borderRadius: 999, background: "rgba(226,232,240,0.9)", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.max(8, categoryPeak ? (item.count / categoryPeak) * 100 : 0)}%`, borderRadius: 999, background: "linear-gradient(90deg, #2563eb, #0ea5e9, #14b8a6)" }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="no-data" style={{ marginTop: 24, padding: "54px 24px", borderRadius: 26, border: "1px dashed rgba(148,163,184,0.42)", background: "linear-gradient(180deg, rgba(248,250,252,0.95), rgba(241,245,249,0.9))", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: 24, margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(15,118,110,0.12), rgba(37,99,235,0.14))", color: "#0f766e", fontSize: 30 }}><FiBarChart2 /></div>
            <h3 style={{ fontSize: 26, color: "#0f172a", marginBottom: 10 }}>{loading ? "Loading analytics..." : "No analytics data available"}</h3>
            <p style={{ maxWidth: 620, margin: "0 auto 22px", lineHeight: 1.8, color: "#64748b" }}>{loading ? "Pulling the latest operational insights from the analytics API." : "Revenue, status, trend, and category insights will appear here as soon as your live service data is available."}</p>
            {!loading ? <button className="btn btn-secondary" onClick={onRefresh}><FiRefreshCw /> Refresh Analytics</button> : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsTab;
