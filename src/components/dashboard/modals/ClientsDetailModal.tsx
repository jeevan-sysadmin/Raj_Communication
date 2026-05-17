import { motion } from "framer-motion";
import {
  FiCalendar,
  FiEdit,
  FiFileText,
  FiMapPin,
  FiPhone,
  FiShoppingBag,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import type { Client, Order } from "../types";
import { formatDisplayDate } from "../utils";

interface ClientsDetailModalProps {
  client: Client;
  relatedOrders: Order[];
  onClose: () => void;
  onEdit: (client: Client) => void;
}

const ClientsDetailModal = ({ client, relatedOrders, onClose, onEdit }: ClientsDetailModalProps) => {
  const recentOrders = relatedOrders.slice(0, 5);

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content client-detail-modal"
        initial={{ opacity: 0, scale: 0.94, y: 36 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header client-detail-header">
          <div className="client-detail-title-wrap">
            <div className="client-detail-kicker">Client Profile</div>
            <div className="modal-title">
              <h2>{client.full_name}</h2>
              <p>{client.client_code} • {client.phone}</p>
            </div>
          </div>
          <div className="client-detail-header-actions">
            <motion.button className="close-btn" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
              <FiX />
            </motion.button>
          </div>
        </div>

        <div className="order-detail-content">
          <div className="client-detail-hero">
            <div className="client-detail-hero-card">
              <div className="client-detail-hero-icon"><FiUser /></div>
              <div>
                <span className="client-detail-hero-label">Primary Contact</span>
                <strong>{client.full_name}</strong>
                <p>{client.phone}</p>
              </div>
            </div>
            <div className="client-detail-hero-card">
              <div className="client-detail-hero-icon"><FiUsers /></div>
              <div>
                <span className="client-detail-hero-label">Email</span>
                <strong>{client.email || "Not provided"}</strong>
                <p>{client.city || "City not added"}</p>
              </div>
            </div>
            <div className="client-detail-hero-card">
              <div className="client-detail-hero-icon"><FiShoppingBag /></div>
              <div>
                <span className="client-detail-hero-label">Orders</span>
                <strong>{relatedOrders.length}</strong>
                <p>{relatedOrders.length > 0 ? "Service orders linked" : "No service orders yet"}</p>
              </div>
            </div>
            <div className="client-detail-hero-card">
              <div className="client-detail-hero-icon"><FiCalendar /></div>
              <div>
                <span className="client-detail-hero-label">Customer Since</span>
                <strong>{formatDisplayDate(client.created_at)}</strong>
                <p>Created in system</p>
              </div>
            </div>
          </div>

          <div className="order-detail-grid">
            <div className="detail-section detail-section-emphasis">
              <h3><FiMapPin /> Address & Location</h3>
              <div className="detail-copy-block">
                <span className="detail-copy-label">Address</span>
                <p>{client.address || "No address added."}</p>
              </div>
              <div className="detail-copy-grid">
                <div className="detail-copy-block">
                  <span className="detail-copy-label">City</span>
                  <p>{client.city || "N/A"}</p>
                </div>
                <div className="detail-copy-block">
                  <span className="detail-copy-label">State / ZIP</span>
                  <p>{[client.state, client.zip_code].filter(Boolean).join(" • ") || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3><FiPhone /> Contact Details</h3>
              <div className="detail-item"><span className="detail-label">Phone</span><span className="detail-value">{client.phone}</span></div>
              <div className="detail-item"><span className="detail-label">Email</span><span className="detail-value">{client.email || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Client Code</span><span className="detail-value">{client.client_code}</span></div>
              <div className="detail-item"><span className="detail-label">Created</span><span className="detail-value">{formatDisplayDate(client.created_at)}</span></div>
            </div>

            <div className="detail-section">
              <h3><FiShoppingBag /> Recent Orders</h3>
              {recentOrders.length > 0 ? recentOrders.map((order) => (
                <div key={order.id} className="detail-item">
                  <span className="detail-label">
                    {order.order_code}
                    <small className="client-detail-order-meta">{order.status}</small>
                  </span>
                  <span className="detail-value">{order.product_name}</span>
                </div>
              )) : <div className="detail-copy-block"><p>No orders linked to this client yet.</p></div>}
            </div>

            {client.notes && (
              <div className="detail-section full-width detail-section-notes">
                <h3><FiFileText /> Notes</h3>
                <div className="detail-copy-block">
                  <span className="detail-copy-label">Client Notes</span>
                  <p>{client.notes}</p>
                </div>
              </div>
            )}
          </div>

          <div className="order-detail-actions">
            <motion.button className="btn outline" onClick={onClose} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>Close</motion.button>
            <motion.button className="btn primary" onClick={() => onEdit(client)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}><FiEdit /> Edit Client</motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ClientsDetailModal;
