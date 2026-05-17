import type { ChangeEvent, FormEvent } from "react";
import { motion } from "framer-motion";
import {
  FiFileText,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSave,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import type { CompanyForm } from "../types";

interface CompanysFormModalProps {
  show: boolean;
  editMode: boolean;
  companyForm: CompanyForm;
  onClose: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

const CompanysFormModal = ({
  show,
  editMode,
  companyForm,
  onClose,
  onChange,
  onSubmit,
}: CompanysFormModalProps) => {
  if (!show) return null;

  const completionCount = [
    companyForm.company_name,
    companyForm.product,
    companyForm.contact_person,
    companyForm.phone,
    companyForm.email,
    companyForm.address,
    companyForm.notes,
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
                <FiUsers />
              </div>
            </div>
            <div className="modal-title-enhanced">
              <h2>{editMode ? "Edit Company" : "Create New Company"}</h2>
              <p>
                {editMode
                  ? "Update service company information."
                  : "Add a service company and map the products they handle."}
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

        <form onSubmit={onSubmit} className="service-form-enhanced client-form-enhanced">
          <div className="client-form-shell">
            <aside className="client-form-aside">
              <div className="client-progress-card">
                <div className="client-progress-header">
                  <strong>Form completeness</strong>
                  <span>{completionCount}/7</span>
                </div>
                <div className="client-progress-track">
                  <div className="client-progress-fill" style={{ width: `${(completionCount / 7) * 100}%` }} />
                </div>
                <p>Company Name and Product List are required.</p>
              </div>

              <div className="client-tip-card">
                <strong>PDF Source</strong>
                <ul className="client-tip-list">
                  <li>Keep source as SERVICE COMPANY LIST.pdf for imported records.</li>
                  <li>You can override with another PDF file name later.</li>
                  <li>Notes are useful for warranty escalation and dispatch guidance.</li>
                </ul>
              </div>
            </aside>

            <div className="client-form-main">
              <section className="client-form-panel">
                <div className="client-form-panel-header">
                  <div>
                    <h3>Required Details</h3>
                    <p>Core information used in company-level tracking.</p>
                  </div>
                  <span className="client-form-badge required">2 required</span>
                </div>

                <div className="form-grid client-form-grid">
                  <div className="form-group client-form-group">
                    <label htmlFor="company_name">
                      <FiUsers /> Company Name *
                    </label>
                    <div className="client-input-wrap">
                      <FiUsers className="client-input-icon" />
                      <input
                        id="company_name"
                        name="company_name"
                        value={companyForm.company_name}
                        onChange={onChange}
                        type="text"
                        placeholder="Service company name"
                        required
                        className="client-input has-icon"
                      />
                    </div>
                  </div>

                  <div className="form-group client-form-group full-width">
                    <label htmlFor="product">
                      <FiFileText /> Product / Coverage *
                    </label>
                    <div className="client-input-wrap">
                      <FiFileText className="client-input-icon textarea-icon" />
                      <textarea
                        id="product"
                        name="product"
                        value={companyForm.product}
                        onChange={onChange}
                        rows={3}
                        placeholder="Products, brands, HDD types, or service scope"
                        required
                        className="client-input client-textarea has-icon"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="client-form-panel">
                <div className="client-form-panel-header">
                  <div>
                    <h3>Contact Details</h3>
                    <p>Optional details for quick follow-up.</p>
                  </div>
                  <span className="client-form-badge optional">Optional</span>
                </div>

                <div className="form-grid client-form-grid">
                  <div className="form-group client-form-group">
                    <label htmlFor="contact_person">
                      <FiUser /> Contact Person
                    </label>
                    <div className="client-input-wrap">
                      <FiUser className="client-input-icon" />
                      <input
                        id="contact_person"
                        name="contact_person"
                        value={companyForm.contact_person}
                        onChange={onChange}
                        type="text"
                        placeholder="Contact name"
                        className="client-input has-icon"
                      />
                    </div>
                  </div>

                  <div className="form-group client-form-group">
                    <label htmlFor="phone">
                      <FiPhone /> Phone
                    </label>
                    <div className="client-input-wrap">
                      <FiPhone className="client-input-icon" />
                      <input
                        id="phone"
                        name="phone"
                        value={companyForm.phone}
                        onChange={onChange}
                        type="tel"
                        placeholder="Phone number"
                        className="client-input has-icon"
                      />
                    </div>
                  </div>

                  <div className="form-group client-form-group">
                    <label htmlFor="email">
                      <FiMail /> Email
                    </label>
                    <div className="client-input-wrap">
                      <FiMail className="client-input-icon" />
                      <input
                        id="email"
                        name="email"
                        value={companyForm.email}
                        onChange={onChange}
                        type="email"
                        placeholder="company@email.com"
                        className="client-input has-icon"
                      />
                    </div>
                  </div>

                  <div className="form-group client-form-group full-width">
                    <label htmlFor="address">
                      <FiMapPin /> Address
                    </label>
                    <div className="client-input-wrap">
                      <FiMapPin className="client-input-icon textarea-icon" />
                      <textarea
                        id="address"
                        name="address"
                        value={companyForm.address}
                        onChange={onChange}
                        rows={3}
                        placeholder="Service address"
                        className="client-input client-textarea has-icon"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="client-form-panel">
                <div className="client-form-panel-header">
                  <div>
                    <h3>Reference</h3>
                    <p>Source tracking and team notes.</p>
                  </div>
                  <span className="client-form-badge soft">Internal</span>
                </div>

                <div className="form-grid client-form-grid">
                  <div className="form-group client-form-group">
                    <label htmlFor="source_pdf">
                      <FiFileText /> Source PDF
                    </label>
                    <input
                      id="source_pdf"
                      name="source_pdf"
                      value={companyForm.source_pdf}
                      onChange={onChange}
                      type="text"
                      placeholder="SERVICE COMPANY LIST.pdf"
                      className="client-input"
                    />
                  </div>

                  <div className="form-group client-form-group full-width">
                    <label htmlFor="notes">
                      <FiFileText /> Notes
                    </label>
                    <div className="client-input-wrap">
                      <FiFileText className="client-input-icon textarea-icon" />
                      <textarea
                        id="notes"
                        name="notes"
                        value={companyForm.notes}
                        onChange={onChange}
                        rows={3}
                        placeholder="Internal remarks, handover notes, escalation details..."
                        className="client-input client-textarea has-icon"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="form-actions-enhanced client-form-actions">
            <div className="client-form-actions-note">Company Name and Product/Coverage are required.</div>
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
                {editMode ? "Update Company" : "Create Company"}
              </motion.button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CompanysFormModal;
