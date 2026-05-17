import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBriefcase,
  FiChevronsRight,
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiEye,
  FiRefreshCw,
  FiSearch,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import BulkActionPanel from "../BulkActionPanel";
import { exportStyledPdfReport } from "../pdfExport";

interface StaffRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  department?: string;
  profile_image?: string;
  performance_score?: number;
  avg_rating?: number;
  is_active?: boolean;
  total_orders: number;
  completed_orders: number;
  active_orders: number;
  total_revenue: number;
  avg_order_value: number;
  completion_rate: number;
  last_login_formatted: string;
}

interface StaffTabProps {
  staffPerformance: StaffRecord[];
  loading: boolean;
  onRefresh: () => void;
  onCreateStaff: () => void;
  onViewStaff: (staff: StaffRecord) => void;
  onEditStaff: (staff: StaffRecord) => void;
  onGoToOrders: (staff: StaffRecord) => void;
}

const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const scoreLabel = (score: number) => {
  if (score >= 85) return "Elite performance";
  if (score >= 70) return "Strong momentum";
  if (score >= 50) return "Steady output";
  return "Needs support";
};

const ITEMS_PER_PAGE = 20;

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const StaffTab = ({
  staffPerformance,
  loading,
  onRefresh,
  onCreateStaff,
  onViewStaff,
  onEditStaff,
  onGoToOrders,
}: StaffTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("performance_score");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);

  const searchValue = searchTerm.trim().toLowerCase();
  const filteredStaff = [...staffPerformance]
    .filter((staff) => {
      if (!searchValue) return true;
      return [staff.name, staff.email, staff.phone, staff.department, staff.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchValue));
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      const aValue =
        sortBy === "total_revenue"
          ? a.total_revenue
          : sortBy === "total_orders"
            ? a.total_orders
            : sortBy === "completion_rate"
              ? a.completion_rate
              : sortBy === "avg_rating"
                ? a.avg_rating || 0
                : a.performance_score || 0;

      const bValue =
        sortBy === "total_revenue"
          ? b.total_revenue
          : sortBy === "total_orders"
            ? b.total_orders
            : sortBy === "completion_rate"
              ? b.completion_rate
              : sortBy === "avg_rating"
                ? b.avg_rating || 0
                : b.performance_score || 0;

      return bValue - aValue;
    });

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / ITEMS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedStaff = filteredStaff.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);
  const selectedStaff = filteredStaff.filter((staff) => selectedStaffIds.includes(staff.id));
  const bulkStaff = selectedStaff.length > 0 ? selectedStaff : filteredStaff;
  const allPageSelected =
    paginatedStaff.length > 0 && paginatedStaff.every((staff) => selectedStaffIds.includes(staff.id));

  const totalRevenue = filteredStaff.reduce((sum, staff) => sum + Number(staff.total_revenue || 0), 0);
  const totalOrders = filteredStaff.reduce((sum, staff) => sum + Number(staff.total_orders || 0), 0);
  const activeQueue = filteredStaff.reduce((sum, staff) => sum + Number(staff.active_orders || 0), 0);
  const avgCompletion = filteredStaff.length
    ? filteredStaff.reduce((sum, staff) => sum + Number(staff.completion_rate || 0), 0) / filteredStaff.length
    : 0;
  const topPerformer = [...filteredStaff].sort(
    (a, b) =>
      Number(b.performance_score || b.completion_rate || 0) -
      Number(a.performance_score || a.completion_rate || 0),
  )[0];

  const summaryCards = [
    {
      label: "Visible Staff",
      value: filteredStaff.length,
      hint: `${staffPerformance.length} total team members`,
      icon: <FiUsers />,
      accent: "linear-gradient(135deg, #2563eb, #38bdf8)",
    },
    {
      label: "Orders In Scope",
      value: totalOrders.toLocaleString(),
      hint: `${activeQueue.toLocaleString()} still active`,
      icon: <FiActivity />,
      accent: "linear-gradient(135deg, #0f766e, #2dd4bf)",
    },
    {
      label: "Tracked Revenue",
      value: formatCurrency(totalRevenue),
      hint: filteredStaff.length ? `${formatCurrency(totalRevenue / filteredStaff.length)} per staff avg` : "No revenue data",
      icon: <FiTrendingUp />,
      accent: "linear-gradient(135deg, #ea580c, #f59e0b)",
    },
    {
      label: "Avg Completion",
      value: `${avgCompletion.toFixed(1)}%`,
      hint: topPerformer ? `${topPerformer.name} leads this view` : "Waiting for staff data",
      icon: <FiTarget />,
      accent: "linear-gradient(135deg, #7c3aed, #ec4899)",
    },
  ];

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedStaffIds((prev) => prev.filter((id) => filteredStaff.some((staff) => staff.id === id)));
  }, [filteredStaff]);

  const toggleStaffSelection = (staffId: number) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId],
    );
  };

  const togglePageSelection = () => {
    const pageIds = paginatedStaff.map((staff) => staff.id);
    if (allPageSelected) {
      setSelectedStaffIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const selectAllFilteredStaff = () => {
    setSelectedStaffIds(filteredStaff.map((staff) => staff.id));
  };

  const clearStaffSelection = () => {
    setSelectedStaffIds([]);
  };

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

  const exportStaffToCSV = () => {
    if (bulkStaff.length === 0) return;

    const header = [
      "Name",
      "Role",
      "Department",
      "Email",
      "Phone",
      "Status",
      "Performance Score",
      "Completion Rate",
      "Total Orders",
      "Completed Orders",
      "Active Orders",
      "Total Revenue",
      "Avg Ticket",
      "Last Login",
    ];

    const rows = bulkStaff.map((staff) =>
      [
        staff.name,
        staff.role,
        staff.department || "Service",
        staff.email,
        staff.phone || "N/A",
        staff.is_active === false ? "Inactive" : "Active",
        Number(staff.performance_score || 0).toFixed(0),
        `${Number(staff.completion_rate || 0).toFixed(1)}%`,
        staff.total_orders,
        staff.completed_orders,
        staff.active_orders,
        formatCurrency(staff.total_revenue),
        formatCurrency(staff.avg_order_value),
        staff.last_login_formatted || "Never",
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );

    downloadFile(
      `\uFEFF${header.join(",")}\n${rows.join("\n")}`,
      `staff_performance_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const exportStaffToPDF = () => {
    if (bulkStaff.length === 0) return;

    const totalRevenueBulk = bulkStaff.reduce((sum, staff) => sum + Number(staff.total_revenue || 0), 0);
    const avgCompletionBulk = bulkStaff.length
      ? bulkStaff.reduce((sum, staff) => sum + Number(staff.completion_rate || 0), 0) / bulkStaff.length
      : 0;
    const avgRatingBulk = bulkStaff.length
      ? bulkStaff.reduce((sum, staff) => sum + Number(staff.avg_rating || 0), 0) / bulkStaff.length
      : 0;
    const activeStaffCount = bulkStaff.filter((staff) => staff.is_active !== false).length;

    exportStyledPdfReport({
      filename: `staff_performance_${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Service Team Performance",
      subtitle: "Staff performance metrics and workload summary",
      scopeLabel:
        selectedStaffIds.length > 0
          ? `${selectedStaffIds.length} selected staff`
          : `${filteredStaff.length} filtered staff`,
      metrics: [
        { label: "Active Staff", value: `${activeStaffCount}` },
        { label: "Total Revenue", value: formatCurrency(totalRevenueBulk) },
        { label: "Avg Completion", value: `${avgCompletionBulk.toFixed(1)}%` },
        { label: "Avg Rating", value: avgRatingBulk ? avgRatingBulk.toFixed(1) : "N/A" },
      ],
      head: [
        [
          "Name",
          "Role",
          "Department",
          "Status",
          "Completion",
          "Orders",
          "Revenue",
          "Avg Ticket",
        ],
      ],
      body: bulkStaff.map((staff) => [
        staff.name,
        staff.role,
        staff.department || "Service",
        staff.is_active === false ? "Inactive" : "Active",
        `${Number(staff.completion_rate || 0).toFixed(1)}%`,
        staff.total_orders,
        formatCurrency(staff.total_revenue),
        formatCurrency(staff.avg_order_value),
      ]),
      accentColor: "#0f766e",
      columnStyles: {
        0: { cellWidth: 36 },
        1: { cellWidth: 18 },
        2: { cellWidth: 28 },
        3: { cellWidth: 18 },
        4: { cellWidth: 22 },
        5: { cellWidth: 18 },
        6: { cellWidth: 28 },
        7: { cellWidth: 24 },
      },
    });
  };

  const printStaff = () => {
    if (bulkStaff.length === 0) return;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    const rows = bulkStaff
      .map(
        (staff) => `
          <tr>
            <td>${escapeHtml(staff.name)}</td>
            <td>${escapeHtml(staff.role)}</td>
            <td>${escapeHtml(staff.department || "Service")}</td>
            <td>${escapeHtml(staff.is_active === false ? "Inactive" : "Active")}</td>
            <td>${escapeHtml(Number(staff.completion_rate || 0).toFixed(1))}%</td>
            <td>${escapeHtml(staff.total_orders)}</td>
            <td>${escapeHtml(formatCurrency(staff.total_revenue))}</td>
            <td>${escapeHtml(formatCurrency(staff.avg_order_value))}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Staff Performance Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            .header { margin-bottom: 20px; }
            .header h1 { margin: 0 0 6px; color: #0f766e; }
            .header p { margin: 0; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f0fdfa; color: #0f766e; }
            tr:nth-child(even) { background: #f8fafc; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Sun Computers Service Team Performance</h1>
            <p>${escapeHtml(
              selectedStaffIds.length > 0
                ? `${selectedStaffIds.length} selected staff`
                : `${filteredStaff.length} filtered staff`,
            )}</p>
            <p>Printed on ${escapeHtml(new Date().toLocaleString("en-IN"))}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Completion</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Avg Ticket</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
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
    <div className="staff-tab">
      <div className="data-table-wrapper" style={{ overflow: "hidden" }}>
        <div
          className="table-header-section"
          style={{
            alignItems: "stretch",
            gap: "20px",
            paddingBottom: "22px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
          }}
        >
          <div className="table-title-wrapper" style={{ maxWidth: "760px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(16,185,129,0.14))",
                color: "#0369a1",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: "14px",
              }}
            >
              <FiBarChart2 />
              Staff Monitoring
            </div>
            <h3 style={{ fontSize: "30px", lineHeight: 1.1, marginBottom: "10px", color: "#0f172a" }}>
              Service Team Performance
            </h3>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#64748b", margin: 0 }}>
              Review live staff workload, completion quality, and revenue contribution from your database-backed service orders.
            </p>
          </div>

          <div className="table-controls" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <button className="btn btn-primary" onClick={onCreateStaff}>
              <FiUserPlus /> Add Staff
            </button>
            <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
              <FiRefreshCw className={loading ? "spinning" : ""} /> Refresh Data
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginTop: "22px",
            marginBottom: "22px",
          }}
        >
          {summaryCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              style={{
                borderRadius: "22px",
                padding: "18px",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                border: "1px solid rgba(148, 163, 184, 0.14)",
                boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: stat.accent,
                  color: "#fff",
                  marginBottom: "14px",
                }}
              >
                {stat.icon}
              </div>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>{stat.value}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>{stat.label}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>{stat.hint}</div>
            </motion.div>
          ))}
        </div>

        <BulkActionPanel
          itemLabelSingular="staff member"
          itemLabelPlural="staff members"
          selectedCount={selectedStaffIds.length}
          filteredCount={filteredStaff.length}
          totalPages={totalPages}
          itemsPerPage={ITEMS_PER_PAGE}
          helperText="Export and print use selected staff first. If nothing is selected, all filtered staff are used."
          onSelectAll={selectAllFilteredStaff}
          onClearSelection={clearStaffSelection}
          onExportCSV={exportStaffToCSV}
          onExportPDF={exportStaffToPDF}
          onPrint={printStaff}
          disableSelectAll={filteredStaff.length === 0}
          disableClearSelection={selectedStaffIds.length === 0}
          disableActions={bulkStaff.length === 0}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            alignItems: "stretch",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              padding: "16px 18px",
              borderRadius: "20px",
              background: "linear-gradient(180deg, rgba(248,250,252,0.95), rgba(241,245,249,0.9))",
              border: "1px solid rgba(148, 163, 184, 0.14)",
            }}
          >
            <div
              style={{
                flex: "1 1 260px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "0 14px",
                minHeight: "50px",
                borderRadius: "16px",
                background: "#fff",
                border: "1px solid rgba(203, 213, 225, 0.85)",
              }}
            >
              <FiSearch style={{ color: "#64748b", flexShrink: 0 }} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, email, phone, or department"
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#0f172a",
                  fontSize: "14px",
                }}
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <FiX />
                </button>
              ) : null}
            </div>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="filter-select"
              style={{ flex: "0 1 220px", minHeight: "50px", borderRadius: "16px" }}
            >
              <option value="performance_score">Sort: Performance Score</option>
              <option value="completion_rate">Sort: Completion Rate</option>
              <option value="total_revenue">Sort: Revenue</option>
              <option value="total_orders">Sort: Total Orders</option>
              <option value="avg_rating">Sort: Average Rating</option>
              <option value="name">Sort: Name A-Z</option>
            </select>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "12px",
                background: "#fff",
                border: "1px solid rgba(203, 213, 225, 0.85)",
                fontSize: "12px",
                fontWeight: 700,
                color: "#334155",
              }}
            >
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={togglePageSelection}
                className="selection-checkbox"
              />
              Select page
            </label>
          </div>

          <div
            style={{
              padding: "18px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #082f49, #0f766e)",
              color: "#e2f8f5",
              boxShadow: "0 18px 32px rgba(8, 47, 73, 0.22)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiAward />
              </div>
              <div>
                <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.8 }}>
                  Team highlight
                </div>
                <strong style={{ fontSize: "18px" }}>{topPerformer?.name || "No data yet"}</strong>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.7, color: "rgba(226,248,245,0.86)" }}>
              {topPerformer
                ? `${scoreLabel(topPerformer.performance_score || topPerformer.completion_rate)} with ${topPerformer.completion_rate.toFixed(1)}% completion and ${formatCurrency(topPerformer.total_revenue)} tracked revenue.`
                : "Once staff performance data is available, the strongest contributor in the current view will appear here."}
            </p>
          </div>
        </div>

        <div
          className="staff-performance-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "18px",
          }}
        >
          {filteredStaff.length > 0 ? (
            paginatedStaff.map((staff) => {
              const performanceScore = Math.min(100, Number(staff.performance_score || staff.completion_rate || 0));
              const rating = Number(staff.avg_rating || 0);
              const closedOrders = Number(staff.completed_orders || 0);
              const isSelected = selectedStaffIds.includes(staff.id);

              return (
                <motion.div
                  key={staff.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24 }}
                  className="staff-performance-card"
                  style={{
                    padding: "22px",
                    borderRadius: "24px",
                    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                    border: isSelected ? "1px solid rgba(13, 148, 136, 0.55)" : "1px solid rgba(148, 163, 184, 0.14)",
                    boxShadow: isSelected
                      ? "0 18px 36px rgba(13, 148, 136, 0.18)"
                      : "0 18px 36px rgba(15, 23, 42, 0.08)",
                    position: "relative",
                  }}
                >
                  <div style={{ position: "absolute", top: "14px", right: "14px" }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStaffSelection(staff.id)}
                      className="selection-checkbox"
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "18px" }}>
                    <div style={{ display: "flex", gap: "14px" }}>
                      <div
                        className="staff-avatar"
                        style={{
                          width: "68px",
                          height: "68px",
                          borderRadius: "22px",
                          background: "linear-gradient(135deg, #0f766e, #38bdf8)",
                          marginRight: 0,
                          flexShrink: 0,
                        }}
                      >
                        {staff.profile_image ? (
                          <img src={staff.profile_image} alt={staff.name} className="staff-profile-image" />
                        ) : (
                          <div className="avatar-initial-staff" style={{ fontSize: "22px" }}>
                            {staff.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "6px" }}>
                          <h4 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>{staff.name}</h4>
                          {staff.id === topPerformer?.id ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 10px",
                                borderRadius: "999px",
                                background: "rgba(245, 158, 11, 0.14)",
                                color: "#b45309",
                                fontSize: "11px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              <FiAward />
                              Top View
                            </span>
                          ) : null}
                        </div>
                        <p style={{ margin: "0 0 6px 0", color: "#475569", fontSize: "14px" }}>{staff.email}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "7px 10px",
                              borderRadius: "999px",
                              background: "rgba(37, 99, 235, 0.1)",
                              color: "#1d4ed8",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            <FiBriefcase />
                            {(staff.department || "Service").replace(/_/g, " ")}
                          </span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "7px 10px",
                              borderRadius: "999px",
                              background: staff.is_active === false ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                              color: staff.is_active === false ? "#dc2626" : "#047857",
                              fontSize: "12px",
                              fontWeight: 700,
                              textTransform: "capitalize",
                            }}
                          >
                            {staff.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        minWidth: "88px",
                        padding: "12px 14px",
                        borderRadius: "18px",
                        background: "linear-gradient(135deg, rgba(15,118,110,0.08), rgba(56,189,248,0.12))",
                        textAlign: "right",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#0f766e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                        Score
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                        {performanceScore.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "18px",
                      background: "linear-gradient(180deg, rgba(248,250,252,0.92), rgba(241,245,249,0.88))",
                      border: "1px solid rgba(148, 163, 184, 0.12)",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "10px" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{scoreLabel(performanceScore)}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>Performance score blends completion and delivery value.</div>
                      </div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#b45309", fontSize: "13px", fontWeight: 700 }}>
                        <FiStar />
                        {rating.toFixed(1)}
                      </div>
                    </div>
                    <div style={{ height: "10px", borderRadius: "999px", background: "rgba(148,163,184,0.18)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${performanceScore}%`,
                          borderRadius: "999px",
                          background: "linear-gradient(90deg, #0f766e, #22c55e, #38bdf8)",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    {[
                      { label: "Total Orders", value: staff.total_orders },
                      { label: "Closed Orders", value: closedOrders },
                      { label: "Active Queue", value: staff.active_orders },
                      { label: "Completion", value: `${staff.completion_rate.toFixed(1)}%` },
                      { label: "Revenue", value: formatCurrency(staff.total_revenue) },
                      { label: "Avg Ticket", value: formatCurrency(staff.avg_order_value) },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          padding: "14px",
                          borderRadius: "16px",
                          background: "#fff",
                          border: "1px solid rgba(226, 232, 240, 0.9)",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{item.label}</div>
                        <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "center",
                      flexWrap: "wrap",
                      padding: "14px 16px",
                      borderRadius: "18px",
                      background: "rgba(248,250,252,0.86)",
                      border: "1px solid rgba(226, 232, 240, 0.9)",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Last login</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{staff.last_login_formatted || "Never"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Contact</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{staff.phone || "No phone saved"}</div>
                    </div>
                  </div>

                  <div className="staff-card-actions" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    <button className="btn btn-primary btn-sm" onClick={() => onViewStaff(staff)}>
                      <FiEye /> View
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => onEditStaff(staff)}>
                      <FiEdit /> Edit
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => onGoToOrders(staff)}>
                      <FiChevronsRight /> Orders
                    </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div
              className="no-data"
              style={{
                gridColumn: "1 / -1",
                padding: "38px 24px",
                borderRadius: "24px",
                border: "1px dashed rgba(148, 163, 184, 0.5)",
                background: "linear-gradient(180deg, rgba(248,250,252,0.95), rgba(241,245,249,0.9))",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "18px",
                  background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(14,165,233,0.14))",
                  color: "#2563eb",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "14px",
                  fontSize: "22px",
                }}
              >
                <FiUsers />
              </div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "20px", color: "#0f172a" }}>
                {loading ? "Loading staff performance data..." : "No staff matched this view"}
              </h4>
              <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "14px" }}>
                {loading
                  ? "Please wait while the latest staff metrics are loaded from the API."
                  : searchTerm
                    ? "Try clearing the search to see the full team again."
                    : "Create a staff account or assign service orders to start tracking performance."}
              </p>
              {!loading && searchTerm ? (
                <button className="btn btn-secondary" onClick={() => setSearchTerm("")}>
                  <FiX /> Clear Search
                </button>
              ) : null}
            </div>
          )}
        </div>

        {filteredStaff.length > 0 && (
          <div className="orders-pagination">
            <div className="orders-pagination-info">
              Showing {pageStartIndex + 1} to {Math.min(pageStartIndex + ITEMS_PER_PAGE, filteredStaff.length)} of{" "}
              {filteredStaff.length} staff members
            </div>
            <div className="orders-pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                <FiChevronLeft />
                <span>Previous</span>
              </button>
              <span className="pagination-page-chip">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                <span>Next</span>
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffTab;
