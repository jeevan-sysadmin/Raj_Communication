import { motion } from "framer-motion";
import {
  FiCheckSquare,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiMapPin,
  FiPackage,
  FiPrinter,
  FiTruck,
  FiUser,
  FiX,
} from "react-icons/fi";
import type { Delivery } from "../types";
import { formatDisplayDate } from "../utils";

interface DeliveryDetailModalProps {
  delivery: Delivery;
  onClose: () => void;
  onPrint: (delivery: Delivery) => void;
}

const formatValue = (value?: string) => {
  if (!value || value === "0000-00-00 00:00:00") return "N/A";
  return value;
};

const normalizeStatus = (delivery: Delivery) =>
  delivery.status === "delivered" || (delivery.delivered_date && delivery.delivered_date !== "0000-00-00 00:00:00")
    ? "Delivered"
    : delivery.status || "Pending";

const humanize = (value?: string) =>
  (value || "n/a")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const DeliveryDetailModal = ({ delivery, onClose, onPrint }: DeliveryDetailModalProps) => {
  const deliveryCode = delivery.delivery_code || `DEL${String(delivery.id).padStart(3, "0")}`;
  const orderCode = delivery.order_code || `ORD${String(delivery.order_id).padStart(3, "0")}`;
  const scheduledDate = delivery.scheduled_date_formatted || formatDisplayDate(delivery.scheduled_date);
  const deliveredDate =
    delivery.delivered_date_formatted ||
    (delivery.delivered_date && delivery.delivered_date !== "0000-00-00 00:00:00"
      ? formatDisplayDate(delivery.delivered_date)
      : "Not Delivered");
  const status = normalizeStatus(delivery);
  const statusColor =
    status.toLowerCase() === "delivered"
      ? "#8B5CF6"
      : delivery.status === "scheduled"
        ? "#10B981"
        : delivery.status === "pending"
          ? "#DC2626"
          : "#64748B";

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content order-detail-modal delivery-detail-modal"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        initial={{ opacity: 0, scale: 0.94, y: 36 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header order-detail-header delivery-detail-header">
          <div className="order-detail-title-wrap">
            <div className="order-detail-kicker delivery-detail-kicker">Delivery Profile</div>
            <div className="modal-title">
              <h2>{deliveryCode}</h2>
              <p>
                {delivery.client_name || "N/A"} - {delivery.product_name || "N/A"}
              </p>
            </div>
          </div>
          <div className="order-detail-header-actions">
            <span className="order-inline-badge" style={{ backgroundColor: `${statusColor}18`, color: statusColor }}>
              {humanize(status)}
            </span>
            <motion.button className="close-btn" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
              <FiX />
            </motion.button>
          </div>
        </div>

        <div className="order-detail-content">
          <div className="order-detail-hero">
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon delivery-detail-hero-icon">
                <FiTruck />
              </div>
              <div>
                <span className="order-detail-hero-label">Delivery</span>
                <strong>{deliveryCode}</strong>
                <p>Order {orderCode}</p>
              </div>
            </div>
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon delivery-detail-hero-icon">
                <FiUser />
              </div>
              <div>
                <span className="order-detail-hero-label">Client</span>
                <strong>{delivery.client_name || "N/A"}</strong>
                <p>{delivery.client_phone || delivery.contact_phone || "Phone not available"}</p>
              </div>
            </div>
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon delivery-detail-hero-icon">
                <FiPackage />
              </div>
              <div>
                <span className="order-detail-hero-label">Product</span>
                <strong>{delivery.product_name || "N/A"}</strong>
                <p>{delivery.product_brand || "Brand not available"}</p>
              </div>
            </div>
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon delivery-detail-hero-icon">
                <FiCalendar />
              </div>
              <div>
                <span className="order-detail-hero-label">Scheduled</span>
                <strong>{scheduledDate}</strong>
                <p>{delivery.scheduled_time_formatted || formatValue(delivery.scheduled_time)}</p>
              </div>
            </div>
          </div>

          <div className="order-detail-grid">
            <div className="detail-section">
              <h3>
                <FiCheckCircle /> Status Overview
              </h3>
              <div className="detail-item"><span className="detail-label">Current Status</span><span className="detail-value">{humanize(status)}</span></div>
              <div className="detail-item"><span className="detail-label">Delivery Type</span><span className="detail-value">{humanize(delivery.delivery_type)}</span></div>
              <div className="detail-item"><span className="detail-label">Delivered Date</span><span className="detail-value">{deliveredDate}</span></div>
            </div>

            <div className="detail-section">
              <h3>
                <FiClock /> Timeline
              </h3>
              <div className="detail-item"><span className="detail-label">Scheduled Date</span><span className="detail-value">{scheduledDate}</span></div>
              <div className="detail-item"><span className="detail-label">Scheduled Time</span><span className="detail-value">{delivery.scheduled_time_formatted || formatValue(delivery.scheduled_time)}</span></div>
              <div className="detail-item"><span className="detail-label">Created</span><span className="detail-value">{formatDisplayDate(delivery.created_at)}</span></div>
            </div>

            <div className="detail-section">
              <h3>
                <FiCheckSquare /> Contact & Address
              </h3>
              <div className="detail-item"><span className="detail-label">Contact Person</span><span className="detail-value">{delivery.contact_person || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Contact Phone</span><span className="detail-value">{delivery.contact_phone || delivery.client_phone || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Delivery Person</span><span className="detail-value">{delivery.delivery_person || "N/A"}</span></div>
            </div>

            <div className="detail-section">
              <h3>
                <FiTruck /> Reference
              </h3>
              <div className="detail-item"><span className="detail-label">Delivery ID</span><span className="detail-value">#{delivery.id}</span></div>
              <div className="detail-item"><span className="detail-label">Delivery Code</span><span className="detail-value">{deliveryCode}</span></div>
              <div className="detail-item"><span className="detail-label">Order Code</span><span className="detail-value">{orderCode}</span></div>
            </div>

            <div className="detail-section full-width detail-section-notes">
              <h3>
                <FiMapPin /> Delivery Address
              </h3>
              <div className="detail-copy-block">
                <span className="detail-copy-label">Destination</span>
                <p>{delivery.address || delivery.client_address || "Address not available"}</p>
              </div>
            </div>

            {delivery.notes && (
              <div className="detail-section full-width detail-section-notes">
                <h3>
                  <FiFileText /> Notes
                </h3>
                <div className="detail-copy-block">
                  <span className="detail-copy-label">Delivery Notes</span>
                  <p>{delivery.notes}</p>
                </div>
              </div>
            )}
          </div>

          <div className="order-detail-actions">
            <motion.button className="btn outline" onClick={onClose} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              Close
            </motion.button>
            <motion.button className="btn secondary" onClick={() => onPrint(delivery)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <FiPrinter /> Receipt Options
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DeliveryDetailModal;
