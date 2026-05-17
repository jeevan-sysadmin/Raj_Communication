import { motion } from "framer-motion";
import {
  FiEdit,
  FiFileText,
  FiMail,
  FiMapPin,
  FiPhone,
  FiTag,
  FiUsers,
  FiX,
} from "react-icons/fi";
import type { Company } from "../types";
import { formatDisplayDate } from "../utils";

interface CompanysDetailModalProps {
  company: Company;
  onClose: () => void;
  onEdit: (company: Company) => void;
}

const CompanysDetailModal = ({ company, onClose, onEdit }: CompanysDetailModalProps) => (
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
          <div className="order-detail-kicker product-detail-kicker">Service Company</div>
          <div className="modal-title">
            <h2>{company.company_name}</h2>
            <p>
              {company.company_code} | Source: {company.source_pdf || "Manual"}
            </p>
          </div>
        </div>
        <div className="order-detail-header-actions">
          <motion.button className="close-btn" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
            <FiX />
          </motion.button>
        </div>
      </div>

      <div className="order-detail-content">
        <div className="order-detail-hero">
          <div className="order-detail-hero-card">
            <div className="order-detail-hero-icon product-detail-hero-icon">
              <FiUsers />
            </div>
            <div>
              <span className="order-detail-hero-label">Company</span>
              <strong>{company.company_name}</strong>
              <p>{company.company_code}</p>
            </div>
          </div>
          <div className="order-detail-hero-card">
            <div className="order-detail-hero-icon product-detail-hero-icon">
              <FiTag />
            </div>
            <div>
              <span className="order-detail-hero-label">Contact</span>
              <strong>{company.contact_person || "Not added"}</strong>
              <p>{company.phone || "Phone not added"}</p>
            </div>
          </div>
          <div className="order-detail-hero-card">
            <div className="order-detail-hero-icon product-detail-hero-icon">
              <FiFileText />
            </div>
            <div>
              <span className="order-detail-hero-label">PDF Source</span>
              <strong>{company.source_pdf || "Manual Entry"}</strong>
              <p>{formatDisplayDate(company.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="order-detail-grid">
          <div className="detail-section detail-section-emphasis">
            <h3>
              <FiFileText /> Product Coverage
            </h3>
            <div className="detail-copy-block">
              <span className="detail-copy-label">Supports</span>
              <p>{company.product || "No product mapping added."}</p>
            </div>
          </div>

          <div className="detail-section">
            <h3>
              <FiPhone /> Contact Details
            </h3>
            <div className="detail-item"><span className="detail-label">Contact Person</span><span className="detail-value">{company.contact_person || "N/A"}</span></div>
            <div className="detail-item"><span className="detail-label">Phone</span><span className="detail-value">{company.phone || "N/A"}</span></div>
            <div className="detail-item"><span className="detail-label">Email</span><span className="detail-value">{company.email || "N/A"}</span></div>
            <div className="detail-item"><span className="detail-label">Created</span><span className="detail-value">{formatDisplayDate(company.created_at)}</span></div>
          </div>

          <div className="detail-section">
            <h3>
              <FiMapPin /> Address
            </h3>
            <div className="detail-copy-block">
              <span className="detail-copy-label">Service Address</span>
              <p>{company.address || "No address added."}</p>
            </div>
          </div>

          {company.notes && (
            <div className="detail-section full-width detail-section-notes">
              <h3>
                <FiMail /> Notes
              </h3>
              <div className="detail-copy-block">
                <span className="detail-copy-label">Internal Notes</span>
                <p>{company.notes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="order-detail-actions">
          <motion.button className="btn outline" onClick={onClose} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
            Close
          </motion.button>
          <motion.button className="btn primary" onClick={() => onEdit(company)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
            <FiEdit /> Edit Company
          </motion.button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

export default CompanysDetailModal;
