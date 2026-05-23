import { motion } from "framer-motion";
import {
  FiCalendar,
  FiCheckSquare,
  FiCpu,
  FiDollarSign,
  FiEdit,
  FiFileText,
  FiPackage,
  FiShoppingBag,
  FiTag,
  FiX,
  FiZap,
} from "react-icons/fi";
import type { Order, Product } from "../types";
import { formatCurrency, formatDisplayDate } from "../utils";

interface ProductDetailModalProps {
  product: Product;
  relatedOrders: Order[];
  onClose: () => void;
  onEdit: (product: Product) => void;
}

const formatLabel = (value?: string) =>
  value
    ? value
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "N/A";

const ProductDetailModal = ({ product, relatedOrders, onClose, onEdit }: ProductDetailModalProps) => {
  const isSpareProduct = Boolean(Number(product.is_spare_product || 0));
  const recentOrders = [...relatedOrders]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

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
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        initial={{ opacity: 0, scale: 0.94, y: 36 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header order-detail-header product-detail-header">
          <div className="order-detail-title-wrap">
            <div className="order-detail-kicker product-detail-kicker">Product Profile</div>
            <div className="modal-title">
              <h2>{product.product_name}</h2>
              <p>
                {product.product_code} - {product.serial_number || "No serial number"}
              </p>
            </div>
          </div>
          <div className="order-detail-header-actions">
            <span className={`order-inline-badge status-badge ${product.status}`}>{formatLabel(product.status)}</span>
            <motion.button className="close-btn" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
              <FiX />
            </motion.button>
          </div>
        </div>

        <div className="order-detail-content">
          <div className="order-detail-hero">
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon product-detail-hero-icon">
                <FiPackage />
              </div>
              <div>
                <span className="order-detail-hero-label">Identity</span>
                <strong>{product.product_name}</strong>
                <p>{product.product_code}</p>
              </div>
            </div>
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon product-detail-hero-icon">
                <FiZap />
              </div>
              <div>
                <span className="order-detail-hero-label">Serial</span>
                <strong>{product.serial_number || "Not added"}</strong>
                <p>{isSpareProduct ? "Replacement Product" : "Standard Product"}</p>
              </div>
            </div>
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon product-detail-hero-icon">
                <FiDollarSign />
              </div>
              <div>
                <span className="order-detail-hero-label">Price</span>
                <strong>Rs. {formatCurrency(product.price)}</strong>
                <p>{formatLabel(product.category)}</p>
              </div>
            </div>
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon product-detail-hero-icon">
                <FiCalendar />
              </div>
              <div>
                <span className="order-detail-hero-label">Created</span>
                <strong>{formatDisplayDate(product.created_at)}</strong>
                <p>
                  {product.purchase_date ? `Purchased ${formatDisplayDate(product.purchase_date)}` : "Purchase date not set"} • {relatedOrders.length} linked orders
                </p>
              </div>
            </div>
          </div>

          <div className="order-detail-grid">
            <div className="detail-section">
              <h3>
                <FiTag /> Product Details
              </h3>
              <div className="detail-item"><span className="detail-label">Brand</span><span className="detail-value">{product.brand || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Model</span><span className="detail-value">{product.model || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Category</span><span className="detail-value">{formatLabel(product.category)}</span></div>
            </div>

            <div className="detail-section">
              <h3>
                <FiCheckSquare /> Inventory
              </h3>
              <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value">{formatLabel(product.status)}</span></div>
              <div className="detail-item"><span className="detail-label">Stock Quantity</span><span className="detail-value">{Number(product.stock_quantity ?? 0)}</span></div>
              <div className="detail-item"><span className="detail-label">Replacement Product</span><span className="detail-value">{isSpareProduct ? "Yes" : "No"}</span></div>
              <div className="detail-item"><span className="detail-label">Warranty</span><span className="detail-value">{product.warranty_period || "Not specified"}</span></div>
              <div className="detail-item"><span className="detail-label">Purchase Date</span><span className="detail-value">{product.purchase_date ? formatDisplayDate(product.purchase_date) : "N/A"}</span></div>
            </div>

            <div className="detail-section">
              <h3>
                <FiShoppingBag /> Linked Orders
              </h3>
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="detail-item">
                    <span className="detail-label">
                      {order.order_code}
                      <small className="client-detail-order-meta">{formatLabel(order.status)}</small>
                    </span>
                    <span className="detail-value">{order.client_name}</span>
                  </div>
                ))
              ) : (
                <div className="detail-copy-block">
                  <p>No service orders linked to this product yet.</p>
                </div>
              )}
            </div>

            {product.specifications && (
              <div className="detail-section full-width detail-section-notes">
                <h3>
                  <FiFileText /> Specifications
                </h3>
                <div className="detail-copy-block">
                  <span className="detail-copy-label">Technical Notes</span>
                  <p>{product.specifications}</p>
                </div>
              </div>
            )}

            <div className="detail-section">
              <h3>
                <FiCpu /> Record Summary
              </h3>
              <div className="detail-item"><span className="detail-label">Product ID</span><span className="detail-value">#{product.id}</span></div>
              <div className="detail-item"><span className="detail-label">Product Code</span><span className="detail-value">{product.product_code}</span></div>
              <div className="detail-item"><span className="detail-label">Total Orders</span><span className="detail-value">{relatedOrders.length}</span></div>
            </div>
          </div>

          <div className="order-detail-actions">
            <motion.button className="btn outline" onClick={onClose} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              Close
            </motion.button>
            <motion.button className="btn primary" onClick={() => onEdit(product)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <FiEdit /> Edit Product
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProductDetailModal;
