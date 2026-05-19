import { motion } from "framer-motion";
import { FiDownload, FiFileText, FiPrinter, FiTruck, FiX } from "react-icons/fi";

interface ReceiptSummaryItem {
  label: string;
  value: string;
}

interface ReceiptActionModalProps {
  kind: "order" | "delivery";
  code: string;
  subtitle: string;
  description: string;
  summaryItems: ReceiptSummaryItem[];
  previewMarkup: string;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

const ReceiptActionModal = ({
  kind,
  code,
  subtitle,
  description,
  summaryItems,
  previewMarkup,
  onClose,
  onDownload,
  onPrint,
}: ReceiptActionModalProps) => {
  const title = kind === "order" ? "Receipt PDF" : "Delivery Receipt PDF";

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content receipt-action-modal"
        style={{ maxHeight: "92vh", overflowY: "auto", overflowX: "hidden" }}
        initial={{ opacity: 0, scale: 0.94, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header receipt-action-header">
          <div className="receipt-action-heading">
            <div className={`receipt-action-icon ${kind === "delivery" ? "delivery" : ""}`}>
              {kind === "order" ? <FiFileText /> : <FiTruck />}
            </div>
            <div className="modal-title">
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          </div>
          <motion.button className="close-btn" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
            <FiX />
          </motion.button>
        </div>

        <div className="receipt-action-body">
          <div className="receipt-action-layout">
            <div className="receipt-action-sidebar" style={{ maxHeight: "calc(100vh - 220px)", overflowY: "scroll", overflowX: "hidden", scrollbarGutter: "stable" }}>
              <div className={`receipt-action-hero ${kind === "delivery" ? "delivery" : ""}`}>
                <div>
                  <span className="receipt-action-kicker">{kind === "order" ? "Service Receipt" : "Delivery Receipt"}</span>
                  <h3>{code}</h3>
                  <p>{subtitle}</p>
                </div>
                <div className="receipt-action-hero-badge">
                  <span>PDF ready</span>
                  <strong>Download now</strong>
                </div>
              </div>

              <div className="receipt-action-summary-grid receipt-action-summary-grid-sidebar">
                {summaryItems.map((item) => (
                  <div key={item.label} className="receipt-action-summary-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="receipt-action-choice-grid receipt-action-choice-grid-sidebar">
                <button type="button" className="receipt-action-choice primary" onClick={onDownload}>
                  <div className="receipt-action-choice-icon">
                    <FiDownload />
                  </div>
                  <div>
                    <strong>Download PDF</strong>
                    <p>Save a polished PDF copy for records, sharing, or printing later.</p>
                  </div>
                </button>
                <button type="button" className="receipt-action-choice" onClick={onPrint}>
                  <div className="receipt-action-choice-icon">
                    <FiPrinter />
                  </div>
                  <div>
                    <strong>Print Now</strong>
                    <p>Open printer dialog instantly for the current receipt preview.</p>
                  </div>
                </button>
              </div>

              <div className="receipt-action-note-panel">
                <strong>Printing Ready</strong>
                <p>Use Print Now for direct printing, or download PDF for sharing and archive.</p>
              </div>
            </div>

            <div className="receipt-preview-stage" style={{ maxHeight: "calc(100vh - 220px)", overflowY: "scroll", overflowX: "hidden", scrollbarGutter: "stable" }}>
              <div className="receipt-preview-toolbar">
                <span>A4 Receipt Preview</span>
                <strong>{kind === "order" ? "Customer copy" : "Delivery handover copy"}</strong>
              </div>
              <div className="receipt-preview-scroll" style={{ maxHeight: "none", overflowY: "visible", overflowX: "hidden" }}>
                <div className="receipt-preview-paper" dangerouslySetInnerHTML={{ __html: previewMarkup }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReceiptActionModal;
