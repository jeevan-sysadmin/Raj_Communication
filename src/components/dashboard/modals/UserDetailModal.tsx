import { motion } from "framer-motion";
import {
  FiCalendar,
  FiEdit,
  FiLock,
  FiMail,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
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
  created_at?: string;
}

interface UserDetailModalProps {
  show: boolean;
  user: UserRecord | null;
  onClose: () => void;
  onEdit: (user: UserRecord) => void;
  onResetPassword: (user: UserRecord) => void;
  onDelete: (id: number) => void;
}

const formatDate = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const UserDetailModal = ({ show, user, onClose, onEdit, onResetPassword, onDelete }: UserDetailModalProps) => {
  if (!show || !user) return null;

  const roleTone = user.role === "admin" ? "#7c3aed" : "#2563eb";
  const initials =
    user.name
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content order-detail-modal product-detail-modal"
        initial={{ opacity: 0, scale: 0.94, y: 36 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header order-detail-header product-detail-header">
          <div className="order-detail-title-wrap">
            <div className="order-detail-kicker product-detail-kicker">User Profile</div>
            <div className="modal-title">
              <h2>{user.name}</h2>
              <p>
                {user.email} - #{user.id}
              </p>
            </div>
          </div>
          <div className="order-detail-header-actions">
            <span className="order-inline-badge" style={{ backgroundColor: `${roleTone}18`, color: roleTone }}>
              {user.role === "admin" ? "Administrator" : "User"}
            </span>
            <span className={`order-inline-badge status-badge ${user.is_active ? "active" : "inactive"}`}>
              {user.is_active ? "Active" : "Inactive"}
            </span>
            <motion.button className="close-btn" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
              <FiX />
            </motion.button>
          </div>
        </div>

        <div className="order-detail-content">
          <div className="order-detail-hero">
            <div className="order-detail-hero-card">
              <div
                className="order-detail-hero-icon product-detail-hero-icon"
                style={{
                  background: user.profile_image ? "transparent" : `linear-gradient(135deg, ${roleTone}, #38bdf8)`,
                  color: "#fff",
                  overflow: "hidden",
                }}
              >
                {user.profile_image ? (
                  <img src={user.profile_image} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  initials
                )}
              </div>
              <div>
                <span className="order-detail-hero-label">Identity</span>
                <strong>{user.name}</strong>
                <p>{user.phone || "No phone added"}</p>
              </div>
            </div>

            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon product-detail-hero-icon">
                <FiShield />
              </div>
              <div>
                <span className="order-detail-hero-label">Access Role</span>
                <strong>{user.role === "admin" ? "Administrator" : "Operational User"}</strong>
                <p>{user.is_active ? "Allowed to sign in" : "Login currently disabled"}</p>
              </div>
            </div>

            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon product-detail-hero-icon">
                <FiCalendar />
              </div>
              <div>
                <span className="order-detail-hero-label">Last Activity</span>
                <strong>{user.last_login ? formatDate(user.last_login) : "Never logged in"}</strong>
                <p>{user.created_at ? `Created ${formatDate(user.created_at)}` : "Created date not available"}</p>
              </div>
            </div>
          </div>

          <div className="order-detail-grid">
            <div className="detail-section">
              <h3>
                <FiMail /> Contact & Login
              </h3>
              <div className="detail-item"><span className="detail-label">Email</span><span className="detail-value">{user.email}</span></div>
              <div className="detail-item"><span className="detail-label">Phone</span><span className="detail-value">{user.phone || "Not set"}</span></div>
              <div className="detail-item"><span className="detail-label">Account ID</span><span className="detail-value">#{user.id}</span></div>
            </div>

            <div className="detail-section">
              <h3>
                <FiUsers /> Access Overview
              </h3>
              <div className="detail-item"><span className="detail-label">Role</span><span className="detail-value">{user.role === "admin" ? "Administrator" : "User"}</span></div>
              <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value">{user.is_active ? "Active" : "Inactive"}</span></div>
              <div className="detail-item"><span className="detail-label">Last Login</span><span className="detail-value">{user.last_login ? formatDate(user.last_login) : "Never"}</span></div>
            </div>

            <div className="detail-section">
              <h3>
                <FiUser /> Admin Notes
              </h3>
              <div className="detail-copy-block">
                <p>
                  {user.role === "admin"
                    ? "This account has elevated permissions and can manage team operations, records, and analytics."
                    : "This account is intended for daily operational work and standard dashboard access."}
                </p>
                <p>
                  {user.is_active
                    ? "The account is currently enabled and should be able to sign in."
                    : "The account is currently disabled. You can reactivate it later without deleting the profile."}
                </p>
              </div>
            </div>
          </div>

          <div className="order-detail-actions">
            <motion.button className="btn outline" onClick={onClose} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              Close
            </motion.button>
            <motion.button className="btn outline" onClick={() => onResetPassword(user)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <FiLock /> Reset Password
            </motion.button>
            <motion.button className="btn primary" onClick={() => onEdit(user)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <FiEdit /> Edit User
            </motion.button>
            <motion.button className="btn danger" onClick={() => onDelete(user.id)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <FiTrash2 /> Delete User
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserDetailModal;
