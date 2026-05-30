import { useMemo } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { motion } from "framer-motion";
import {
  FiCamera,
  FiCheckSquare,
  FiLock,
  FiLoader,
  FiMail,
  FiPhone,
  FiSave,
  FiShield,
  FiUpload,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

interface UserFormState {
  name: string;
  email: string;
  password?: string;
  role: "admin" | "user";
  phone: string;
  is_active: boolean;
  profile_image?: File | null;
  profile_image_url?: string;
}

interface UserFormModalProps {
  show: boolean;
  editMode: boolean;
  title?: string;
  subtitle?: string;
  userForm: UserFormState;
  onClose: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onImageChange: (file: File, previewUrl: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isSubmitting?: boolean;
}

const UserFormModal = ({
  show,
  editMode,
  title = editMode ? "Edit User" : "Create New User",
  subtitle = editMode
    ? "Update access, identity, and contact details in one clean workspace."
    : "Create a new account with role, contact details, and login access.",
  userForm,
  onClose,
  onChange,
  onImageChange,
  onSubmit,
  isSubmitting = false,
}: UserFormModalProps) => {
  const profileLabel = userForm.name.trim() || "New User";
  const initials =
    userForm.name
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "NU";

  const completionCount = useMemo(() => {
    const values = [userForm.name, userForm.email, userForm.phone, userForm.role];
    if (!editMode) values.push(userForm.password || "");
    return values.filter((value) => String(value).trim().length > 0).length;
  }, [editMode, userForm]);

  const completionTotal = editMode ? 4 : 5;
  const roleTone = userForm.role === "admin" ? "#7c3aed" : "#2563eb";
  const accessLabel = userForm.role === "admin" ? "Full Dashboard Access" : "Operational User Access";

  if (!show) return null;

  return (
    <motion.div
      className="modal-overlay-enhanced"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content-enhanced user-modal-content"
        initial={{ opacity: 0, scale: 0.96, y: 28 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 28 }}
        transition={{ type: "spring", damping: 24, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-enhanced user-modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-wrapper">
              <div className="modal-icon-bg">
                <FiUsers />
              </div>
            </div>
            <div className="modal-title-enhanced">
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
          </div>
          <motion.button
            className="close-btn-enhanced"
            onClick={onClose}
            whileHover={{ rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <FiX />
          </motion.button>
        </div>

        <form autoComplete="off" onSubmit={onSubmit} className="service-form-enhanced user-form-enhanced">
          <div className="user-form-shell">
            <aside className="user-form-aside">
              <div className="user-identity-card">
                <div
                  className="client-identity-avatar"
                  style={{
                    width: "78px",
                    height: "78px",
                    borderRadius: "24px",
                    marginBottom: "16px",
                    background: userForm.profile_image_url
                      ? "transparent"
                      : `linear-gradient(135deg, ${roleTone}, #38bdf8)`,
                    color: "#fff",
                    overflow: "hidden",
                    boxShadow: "0 18px 40px rgba(37, 99, 235, 0.18)",
                  }}
                >
                  {userForm.profile_image_url ? (
                    <img
                      src={userForm.profile_image_url}
                      alt="User preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <span className="user-identity-badge" style={{ backgroundColor: `${roleTone}15`, color: roleTone }}>
                  {editMode ? "Editing Account" : "New Account"}
                </span>
                <h3>{profileLabel}</h3>
                <p>{userForm.email.trim() || "Email address will appear here"}</p>
                <div className="user-identity-meta">
                  <span>{userForm.phone.trim() || "Phone not added"}</span>
                  <span>{userForm.role === "admin" ? "Administrator" : "User / Staff"}</span>
                  <span>{userForm.is_active ? "Active" : "Inactive"}</span>
                </div>
              </div>

              <div className="user-progress-card">
                <div className="user-progress-header">
                  <strong>Setup progress</strong>
                  <span>
                    {completionCount}/{completionTotal}
                  </span>
                </div>
                <div className="user-progress-track">
                  <div
                    className="user-progress-fill"
                    style={{
                      width: `${(completionCount / completionTotal) * 100}%`,
                      background: `linear-gradient(90deg, ${roleTone}, #38bdf8)`,
                    }}
                  />
                </div>
                <p>Best results come from a clear name, valid email, and the correct access role.</p>
              </div>

              <div className="user-access-card">
                <div className="user-access-header">
                  <FiShield />
                  <strong>{accessLabel}</strong>
                </div>
                <p>
                  {userForm.role === "admin"
                    ? "Admins can manage users, analytics, orders, and operational settings."
                    : "Standard users focus on day-to-day operations without full admin control."}
                </p>
              </div>
            </aside>

            <div className="user-form-main">
              <section className="user-form-panel">
                <div className="user-form-panel-header">
                  <div>
                    <h3>Identity & Access</h3>
                    <p>Define who this person is and what level of system access they should get.</p>
                  </div>
                  <span className="user-form-badge required">Core setup</span>
                </div>

                <div className="form-grid user-form-grid">
                  <div className="form-group full-width user-form-group">
                    <label>Profile Image</label>
                    <div className="image-upload-container">
                      <div className="image-preview">
                        {userForm.profile_image_url ? (
                          <img src={userForm.profile_image_url} alt="Profile preview" className="image-preview-img" />
                        ) : (
                          <div className="image-placeholder">
                            <FiCamera size={24} />
                            <span>Upload Image</span>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="image-upload-input"
                        id="user-form-image-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => onImageChange(file, String(reader.result || ""));
                          reader.readAsDataURL(file);
                        }}
                      />
                      <label htmlFor="user-form-image-upload" className="btn btn-secondary">
                        <FiUpload /> Choose Image
                      </label>
                    </div>
                  </div>

                  <div className="form-group user-form-group">
                    <label htmlFor="user_name">
                      <FiUser /> Full Name *
                    </label>
                    <div className="user-input-wrap">
                      <FiUser className="user-input-icon" />
                      <input
                        id="user_name"
                        name="name"
                        value={userForm.name}
                        onChange={onChange}
                        className="user-input has-icon"
                        placeholder="Full name"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group user-form-group">
                    <label htmlFor="user_email">
                      <FiMail /> Email *
                    </label>
                    <div className="user-input-wrap">
                      <FiMail className="user-input-icon" />
                      <input
                        id="user_email"
                        name="email"
                        type="email"
                        value={userForm.email}
                        onChange={onChange}
                        className="user-input has-icon"
                        placeholder="name@example.com"
                        required
                      />
                    </div>
                  </div>

                  {!editMode && (
                    <div className="form-group user-form-group">
                      <label htmlFor="user_password">
                        <FiLock /> Password *
                      </label>
                      <div className="user-input-wrap">
                        <FiLock className="user-input-icon" />
                        <input
                          id="user_password"
                          name="password"
                          type="password"
                          value={userForm.password || ""}
                          onChange={onChange}
                          className="user-input has-icon"
                          placeholder="Minimum 6 characters"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-group user-form-group">
                    <label htmlFor="user_phone">
                      <FiPhone /> Phone
                    </label>
                    <div className="user-input-wrap">
                      <FiPhone className="user-input-icon" />
                      <input
                        id="user_phone"
                        name="phone"
                        value={userForm.phone}
                        onChange={onChange}
                        className="user-input has-icon"
                        placeholder="Contact number"
                      />
                    </div>
                  </div>

                  <div className="form-group user-form-group">
                    <label htmlFor="user_role">
                      <FiShield /> Role *
                    </label>
                    <select
                      id="user_role"
                      name="role"
                      value={userForm.role}
                      onChange={onChange}
                      className="user-input"
                      required
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="user-form-panel">
                <div className="user-form-panel-header">
                  <div>
                    <h3>Account State</h3>
                    <p>Control whether this account can currently access the dashboard.</p>
                  </div>
                  <span className="user-form-badge optional">Access</span>
                </div>

                <div className="form-grid user-form-grid">
                  <div className="form-group full-width user-form-group">
                    <label className="user-checkbox-card">
                      <input type="checkbox" name="is_active" checked={userForm.is_active} onChange={onChange} />
                      <span className="user-checkbox-visual">
                        <FiCheckSquare />
                      </span>
                      <span className="user-checkbox-copy">
                        <strong>{userForm.is_active ? "Account is Active" : "Account is Inactive"}</strong>
                        <small>
                          {userForm.is_active
                            ? "This user can sign in and use the dashboard based on their role."
                            : "This user will stay in the system but cannot sign in until reactivated."}
                        </small>
                      </span>
                    </label>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="form-actions-enhanced user-form-actions">
            <div className="user-form-actions-note">
              {editMode
                ? "Update the user profile and save changes when everything looks right."
                : "Name, email, role, and password are the essentials for a new account."}
            </div>
            <div className="user-form-actions-buttons">
              <motion.button
                type="button"
                className="btn-secondary-enhanced"
                onClick={onClose}
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                className="btn-primary-enhanced"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? <FiLoader className="btn-loading-spinner" /> : <FiSave />}
                {isSubmitting ? "Saving..." : editMode ? "Update User" : "Create User"}
              </motion.button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default UserFormModal;
