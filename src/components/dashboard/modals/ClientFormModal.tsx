import type { ChangeEvent, FormEvent } from "react";
import { motion } from "framer-motion";
import { FiFileText, FiMail, FiMapPin, FiPhone, FiSave, FiUser, FiX } from "react-icons/fi";
import type { ClientForm } from "../types";

interface ClientFormModalProps {
  show: boolean;
  editMode: boolean;
  clientForm: ClientForm;
  onClose: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

const ClientFormModal = ({
  show,
  editMode,
  clientForm,
  onClose,
  onChange,
  onSubmit,
}: ClientFormModalProps) => {
  if (!show) return null;

  const initials =
    clientForm.full_name
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "NC";

  const location = [clientForm.city.trim(), clientForm.state.trim()].filter(Boolean).join(", ");
  const completionCount = [
    clientForm.full_name,
    clientForm.phone,
    clientForm.email,
    clientForm.address,
    clientForm.city,
    clientForm.state,
    clientForm.zip_code,
    clientForm.notes,
  ].filter((value) => value.trim().length > 0).length;

  return (
    <motion.div
      className="modal-overlay-enhanced"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content-enhanced client-modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 32 }}
        transition={{ type: "spring", damping: 24, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-enhanced client-modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-wrapper">
              <div className="modal-icon-bg">
                <FiUser />
              </div>
            </div>
            <div className="modal-title-enhanced">
              <h2>{editMode ? "Edit Client" : "Create New Client"}</h2>
              <p>
                {editMode
                  ? "Refresh customer details and keep records accurate."
                  : "Capture contact details once and reuse them across orders, receipts, and follow-ups."}
              </p>
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

        <form onSubmit={onSubmit} className="service-form-enhanced client-form-enhanced" autoComplete="off">
          <div className="client-form-shell">
            <aside className="client-form-aside">
              <div className="client-identity-card">
                <div className="client-identity-avatar">{initials}</div>
                <div className="client-identity-copy">
                  <span className="client-identity-badge">Live Preview</span>
                  <h3>{clientForm.full_name.trim() || "New Client"}</h3>
                  <p>{clientForm.phone.trim() || "Phone number will appear here"}</p>
                </div>
                <div className="client-identity-meta">
                  <span>{clientForm.email.trim() || "No email added"}</span>
                  <span>{location || "Location not added yet"}</span>
                </div>
              </div>

              <div className="client-progress-card">
                <div className="client-progress-header">
                  <strong>Profile completeness</strong>
                  <span>{completionCount}/8</span>
                </div>
                <div className="client-progress-track">
                  <div className="client-progress-fill" style={{ width: `${(completionCount / 8) * 100}%` }} />
                </div>
                <p>Required first: full name and phone. Everything else helps with delivery, receipts, and future support.</p>
              </div>

              <div className="client-tip-card">
                <strong>Quick tips</strong>
                <ul className="client-tip-list">
                  <li>Use the customer&apos;s preferred name for receipts.</li>
                  <li>Add a phone number you can reach during repair updates.</li>
                  <li>Address and notes help with delivery and repeat visits.</li>
                </ul>
              </div>
            </aside>

            <div className="client-form-main">
              <section className="client-form-panel">
                <div className="client-form-panel-header">
                  <div>
                    <h3>Required Details</h3>
                    <p>The minimum information needed to create the client profile.</p>
                  </div>
                  <span className="client-form-badge required">2 required</span>
                </div>

                <div className="form-grid client-form-grid">
                  <div className="form-group client-form-group">
                    <label htmlFor="full_name">
                      <FiUser /> Full Name *
                    </label>
                    <div className="client-input-wrap">
                      <FiUser className="client-input-icon" />
                      <input
                        type="text"
                        id="full_name"
                        name="full_name"
                        value={clientForm.full_name}
                        onChange={onChange}
                        placeholder="Customer full name"
                        required
                        className="client-input has-icon"
                      />
                    </div>
                    <small className="client-field-help">
                      Use the same name you want to show on receipts and service history.
                    </small>
                  </div>

                  <div className="form-group client-form-group">
                    <label htmlFor="phone">
                      <FiPhone /> Phone Number *
                    </label>
                    <div className="client-input-wrap">
                      <FiPhone className="client-input-icon" />
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={clientForm.phone}
                        onChange={onChange}
                        placeholder="Primary mobile number"
                        required
                        className="client-input has-icon"
                      />
                    </div>
                    <small className="client-field-help">
                      This is the main number for repair updates, approval calls, and delivery contact.
                    </small>
                  </div>
                </div>
              </section>

              <section className="client-form-panel">
                <div className="client-form-panel-header">
                  <div>
                    <h3>Contact & Location</h3>
                    <p>Optional details that make follow-up easier.</p>
                  </div>
                  <span className="client-form-badge optional">Optional</span>
                </div>

                <div className="form-grid client-form-grid">
                  <div className="form-group client-form-group">
                    <label htmlFor="email">
                      <FiMail /> Email Address
                    </label>
                    <div className="client-input-wrap">
                      <FiMail className="client-input-icon" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={clientForm.email}
                        onChange={onChange}
                        placeholder="name@example.com"
                        className="client-input has-icon"
                      />
                    </div>
                  </div>

                  <div className="form-group full-width client-form-group">
                    <label htmlFor="address">
                      <FiMapPin /> Address
                    </label>
                    <div className="client-input-wrap">
                      <FiMapPin className="client-input-icon textarea-icon" />
                      <textarea
                        id="address"
                        name="address"
                        value={clientForm.address}
                        onChange={onChange}
                        placeholder="Street, area, landmark"
                        rows={3}
                        className="client-input client-textarea has-icon"
                      />
                    </div>
                  </div>

                  <div className="form-group client-form-group">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={clientForm.city}
                      onChange={onChange}
                      placeholder="City"
                      className="client-input"
                    />
                  </div>

                  <div className="form-group client-form-group">
                    <label htmlFor="state">State</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={clientForm.state}
                      onChange={onChange}
                      placeholder="State"
                      className="client-input"
                    />
                  </div>

                  <div className="form-group client-form-group">
                    <label htmlFor="zip_code">Zip Code</label>
                    <input
                      type="text"
                      id="zip_code"
                      name="zip_code"
                      value={clientForm.zip_code}
                      onChange={onChange}
                      placeholder="Postal / ZIP code"
                      className="client-input"
                    />
                  </div>
                </div>
              </section>

              <section className="client-form-panel">
                <div className="client-form-panel-header">
                  <div>
                    <h3>Notes</h3>
                    <p>Anything useful for your team to remember about this client.</p>
                  </div>
                  <span className="client-form-badge soft">Internal</span>
                </div>

                <div className="form-grid client-form-grid">
                  <div className="form-group full-width client-form-group">
                    <label htmlFor="notes">
                      <FiFileText /> Client Notes
                    </label>
                    <div className="client-input-wrap">
                      <FiFileText className="client-input-icon textarea-icon" />
                      <textarea
                        id="notes"
                        name="notes"
                        value={clientForm.notes}
                        onChange={onChange}
                        placeholder="Preferences, alternate contact info, service remarks, or anything your staff should know..."
                        rows={4}
                        className="client-input client-textarea has-icon"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="form-actions-enhanced client-form-actions">
            <div className="client-form-actions-note">Only full name and phone number are required to create a client.</div>
            <div className="client-form-actions-buttons">
              <motion.button
                type="button"
                className="btn-secondary-enhanced"
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                className="btn-primary-enhanced"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiSave />
                {editMode ? "Update Client" : "Create Client"}
              </motion.button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default ClientFormModal;
