import { AnimatePresence, motion } from "framer-motion";
import { FiAlertTriangle, FiTrash2, FiX } from "react-icons/fi";

interface ConfirmDeleteDetail {
  label: string;
  value: string;
}

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  details?: ConfirmDeleteDetail[];
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteModal = ({
  open,
  title,
  description,
  details = [],
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isProcessing = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          if (!isProcessing) onCancel();
        }}
      >
        <motion.div
          className="modal-content confirm-delete-modal"
          initial={{ opacity: 0, scale: 0.94, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="confirm-delete-header">
            <div className="confirm-delete-icon">
              <FiTrash2 />
            </div>
            <div className="confirm-delete-title">
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <motion.button
              type="button"
              className="close-btn"
              onClick={() => {
                if (!isProcessing) onCancel();
              }}
              whileHover={{ rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Close"
            >
              <FiX />
            </motion.button>
          </div>

          <div className="confirm-delete-body">
            {details.length > 0 && (
              <div className="confirm-delete-grid">
                {details.map((detail) => (
                  <div className="confirm-delete-card" key={`${detail.label}-${detail.value}`}>
                    <span>{detail.label}</span>
                    <strong>{detail.value}</strong>
                  </div>
                ))}
              </div>
            )}
            <div className="confirm-delete-note">
              <FiAlertTriangle />
              <span>This action permanently removes the record and cannot be undone.</span>
            </div>
          </div>

          <div className="confirm-delete-actions">
            <button type="button" className="btn secondary" onClick={onCancel} disabled={isProcessing}>
              {cancelLabel}
            </button>
            <button type="button" className="btn danger" onClick={onConfirm} disabled={isProcessing}>
              {isProcessing ? "Deleting..." : confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default ConfirmDeleteModal;
