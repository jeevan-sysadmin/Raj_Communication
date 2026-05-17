import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiChevronLeft,
  FiChevronRight,
  FiActivity,
  FiDownload,
  FiEdit,
  FiEye,
  FiFileText,
  FiFilter,
  FiLock,
  FiMail,
  FiShield,
  FiTrash2,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";

interface UserRecord {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profile_image?: string;
  last_login?: string;
  is_active: boolean;
}

interface SortConfig {
  key: string;
  direction: string;
}

interface UserTabProps {
  users: UserRecord[];
  loading: boolean;
  selectedUserIds: number[];
  filteredUsers: UserRecord[];
  filterRole: string;
  filterStatus: string;
  sortConfig: SortConfig;
  onCreateUser: () => void;
  onCreateStaff: () => void;
  onClearFilters: () => void;
  onFilterRoleChange: (value: string) => void;
  onFilterStatusChange: (value: string) => void;
  onViewUser: (user: UserRecord) => void;
  onEditUser: (user: UserRecord) => void;
  onResetPassword: (user: UserRecord) => void;
  onDeleteUser: (id: number) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onToggleSelectAll: () => void;
  onToggleSelectUser: (id: number) => void;
  onSort: (key: string) => void;
}

const formatLastSeen = (value?: string) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const sortIndicator = (sortConfig: SortConfig, key: string) => {
  if (sortConfig.key !== key) return "<>";
  return sortConfig.direction === "asc" ? "^" : "v";
};

const getRoleLabel = (role: string) => (role === "admin" ? "Admin" : "Staff");

const getRoleDescription = (role: string) => (role === "admin" ? "Full access" : "Operational access");

const ITEMS_PER_PAGE = 20;

const UserTab = ({
  users,
  loading,
  selectedUserIds,
  filteredUsers,
  filterRole,
  filterStatus,
  sortConfig,
  onCreateUser,
  onCreateStaff,
  onClearFilters,
  onFilterRoleChange,
  onFilterStatusChange,
  onViewUser,
  onEditUser,
  onResetPassword,
  onDeleteUser,
  onExportCSV,
  onExportPDF,
  onToggleSelectAll: _onToggleSelectAll,
  onToggleSelectUser,
  onSort,
}: UserTabProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(() => {
    const activeCount = filteredUsers.filter((user) => user.is_active).length;
    const adminCount = filteredUsers.filter((user) => user.role === "admin").length;
    const staffCount = filteredUsers.filter((user) => user.role !== "admin").length;
    const activeStaffCount = filteredUsers.filter((user) => user.role !== "admin" && user.is_active).length;
    const inactiveStaffCount = staffCount - activeStaffCount;
    const inactiveCount = filteredUsers.length - activeCount;

    return [
      {
        label: "Visible Accounts",
        value: filteredUsers.length,
        hint: `${users.length} total accounts`,
        icon: <FiUsers />,
      },
      {
        label: "Active Accounts",
        value: activeCount,
        hint: `${inactiveCount} inactive`,
        icon: <FiUserCheck />,
      },
      {
        label: "Admins",
        value: adminCount,
        hint: `${staffCount} staff accounts`,
        icon: <FiShield />,
      },
      {
        label: "Staff Accounts",
        value: staffCount,
        hint: `${inactiveStaffCount} inactive staff`,
        icon: <FiActivity />,
      },
    ];
  }, [filteredUsers, users.length]);

  const hasFilters = Boolean(filterRole || filterStatus);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);
  const allPageSelected =
    paginatedUsers.length > 0 && paginatedUsers.every((user) => selectedUserIds.includes(user.id));

  useEffect(() => {
    setCurrentPage(1);
  }, [filterRole, filterStatus, sortConfig.key, sortConfig.direction, filteredUsers.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const togglePageSelection = () => {
    if (allPageSelected) {
      paginatedUsers.forEach((user) => {
        if (selectedUserIds.includes(user.id)) {
          onToggleSelectUser(user.id);
        }
      });
      return;
    }

    paginatedUsers.forEach((user) => {
      if (!selectedUserIds.includes(user.id)) {
        onToggleSelectUser(user.id);
      }
    });
  };

  return (
    <div className="users-tab">
      <div className="data-table-wrapper" style={{ overflow: "hidden" }}>
        <div
          className="table-header-section"
          style={{
            alignItems: "stretch",
            gap: "20px",
            paddingBottom: "20px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
          }}
        >
          <div className="table-title-wrapper" style={{ maxWidth: "720px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(14,165,233,0.14))",
                color: "#1d4ed8",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: "14px",
              }}
            >
              <FiUsers />
              Team Access Control
            </div>
            <h3 style={{ fontSize: "30px", lineHeight: 1.1, marginBottom: "10px", color: "#0f172a" }}>User & Staff Management</h3>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#64748b", margin: 0 }}>
              Review admin and staff accounts together, manage access, and keep your team directory clean and secure.
            </p>
          </div>

          <div className="table-controls" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <button className="btn btn-primary" onClick={onCreateUser}>
              <FiUserPlus /> Add Admin
            </button>
            <button className="btn btn-secondary" onClick={onCreateStaff}>
              <FiUserPlus /> Add Staff
            </button>
            <button className="btn btn-secondary" onClick={onClearFilters}>
              <FiFilter /> Clear Filters
            </button>
            <div className="export-buttons" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button className="btn btn-export" onClick={onExportCSV}>
                <FiDownload /> Export CSV
              </button>
              <button className="btn btn-export" onClick={onExportPDF}>
                <FiFileText /> Export PDF
              </button>
            </div>
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
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              style={{
                borderRadius: "20px",
                padding: "18px",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                border: "1px solid rgba(148, 163, 184, 0.14)",
                boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                  color: "#fff",
                  marginBottom: "14px",
                }}
              >
                {stat.icon}
              </div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>{stat.value}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>{stat.label}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>{stat.hint}</div>
            </motion.div>
          ))}
        </div>

        <div
          className="table-filters"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            padding: "18px",
            borderRadius: "18px",
            background: "linear-gradient(180deg, rgba(248,250,252,0.95), rgba(241,245,249,0.9))",
            border: "1px solid rgba(148, 163, 184, 0.14)",
            marginBottom: "20px",
          }}
        >
          <div className="filter-controls" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <select className="filter-select" value={filterRole} onChange={(e) => onFilterRoleChange(e.target.value)}>
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">Staff</option>
            </select>
            <select className="filter-select" value={filterStatus} onChange={(e) => onFilterStatusChange(e.target.value)}>
              <option value="">All Status</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              fontSize: "13px",
              color: "#475569",
            }}
          >
            <span
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                background: "rgba(37, 99, 235, 0.08)",
                color: "#1d4ed8",
                fontWeight: 700,
              }}
            >
              {selectedUserIds.length} selected
            </span>
            <span
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                background: hasFilters ? "rgba(14, 165, 233, 0.08)" : "rgba(100, 116, 139, 0.08)",
                color: hasFilters ? "#0369a1" : "#475569",
                fontWeight: 700,
              }}
            >
              {hasFilters ? "Filters active" : "No filters applied"}
            </span>
          </div>
        </div>

        <div className="table-content">
          {filteredUsers.length > 0 ? (
            <div className="table-wrapper">
              <div className="table-responsive">
                <table className="data-table" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={togglePageSelection}
                          className="selection-checkbox"
                        />
                      </th>
                      <th>#</th>
                      <th onClick={() => onSort("name")} className="sortable-header">
                        Account Details {sortIndicator(sortConfig, "name")}
                      </th>
                      <th>Contact</th>
                      <th onClick={() => onSort("role")} className="sortable-header">
                        Access {sortIndicator(sortConfig, "role")}
                      </th>
                      <th onClick={() => onSort("last_login")} className="sortable-header">
                        Last Active {sortIndicator(sortConfig, "last_login")}
                      </th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={selectedUserIds.includes(user.id) ? "selected" : ""}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => onToggleSelectUser(user.id)}
                            className="selection-checkbox"
                          />
                        </td>
                        <td style={{ fontWeight: 700, color: "#64748b" }}>{pageStartIndex + index + 1}</td>
                        <td>
                          <div className="user-cell" style={{ gap: "14px" }}>
                            <div className="user-avatar" style={{ width: "46px", height: "46px", borderRadius: "16px" }}>
                              {user.profile_image ? (
                                <img src={user.profile_image} alt={user.name} className="user-profile-image" />
                              ) : (
                                <div className="avatar-initial-small" style={{ fontSize: "16px", fontWeight: 800 }}>
                                  {user.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="user-name" style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                                {user.name}
                              </div>
                              <div style={{ marginTop: "4px", fontSize: "12px", fontWeight: 700, color: user.role === "admin" ? "#7c3aed" : "#0369a1" }}>
                                {getRoleLabel(user.role)}
                              </div>
                              <div
                                className="user-email"
                                style={{
                                  marginTop: "4px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: "transparent",
                                  padding: 0,
                                  color: "#64748b",
                                }}
                              >
                                <FiMail size={12} />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: "#334155" }}>{user.phone || "Not set"}</div>
                          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Primary contact</div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <span className={`role-badge ${user.role}`}>{getRoleLabel(user.role)}</span>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              {getRoleDescription(user.role)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: "#334155" }}>{formatLastSeen(user.last_login)}</div>
                          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                            {user.last_login ? "Recent activity available" : "No login recorded"}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div className={`status-badge ${user.is_active ? "active" : "inactive"}`}>
                              {user.is_active ? "Active" : "Inactive"}
                            </div>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              {user.is_active ? "Can access dashboard" : "Login disabled"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons" style={{ gap: "8px" }}>
                            <button className="action-button btn-sm" title="View" onClick={() => onViewUser(user)}>
                              <FiEye />
                            </button>
                            <button className="action-button btn-sm" title="Edit" onClick={() => onEditUser(user)}>
                              <FiEdit />
                            </button>
                            <button className="action-button btn-sm" title="Reset Password" onClick={() => onResetPassword(user)}>
                              <FiLock />
                            </button>
                            <button className="action-button btn-sm danger" title="Delete" onClick={() => onDeleteUser(user.id)}>
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div
              className="no-data"
              style={{
                padding: "56px 24px",
                borderRadius: "20px",
                background: "linear-gradient(180deg, rgba(248,250,252,0.95), rgba(241,245,249,0.88))",
                border: "1px dashed rgba(148, 163, 184, 0.35)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "70px",
                  height: "70px",
                  borderRadius: "22px",
                  margin: "0 auto 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, rgba(37,99,235,0.16), rgba(56,189,248,0.16))",
                  color: "#2563eb",
                  fontSize: "28px",
                }}
              >
                <FiUsers />
              </div>
              <h3 style={{ fontSize: "24px", color: "#0f172a", marginBottom: "10px" }}>
                {loading ? "Loading accounts..." : "No accounts found"}
              </h3>
              <p style={{ maxWidth: "520px", margin: "0 auto 22px", lineHeight: 1.7, color: "#64748b" }}>
                {loading
                  ? "Please wait while we fetch admin and staff accounts."
                  : "No admin or staff accounts match the current filters. Clear filters or create a new account to get started."}
              </p>
              {!loading && (
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                  <button className="btn btn-primary" onClick={onCreateUser}>
                    <FiUserPlus /> Add Admin
                  </button>
                  <button className="btn btn-secondary" onClick={onCreateStaff}>
                    <FiUserPlus /> Add Staff
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {filteredUsers.length > 0 && (
          <div className="orders-pagination">
            <div className="orders-pagination-info">
              Showing {pageStartIndex + 1} to {Math.min(pageStartIndex + ITEMS_PER_PAGE, filteredUsers.length)} of{" "}
              {filteredUsers.length} accounts
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

export default UserTab;

