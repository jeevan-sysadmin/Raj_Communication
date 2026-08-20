import { motion } from "framer-motion";
import {
  FiCheckSquare,
  FiCalendar,
  FiEdit2,
  FiFileText,
  FiMapPin,
  FiPackage,
  FiPrinter,
  FiTrash2,
  FiTruck,
  FiUser,
  FiX,
} from "react-icons/fi";
import type { Delivery } from "../types";
import { formatDisplayDateTime } from "../utils";

interface DeliveryDetailModalProps {
  delivery: Delivery;
  onClose: () => void;
  onEdit: (delivery: Delivery) => void;
  onPrint: (delivery: Delivery) => void;
  onDelete: (delivery: Delivery) => void;
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

const parseNameList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((entry) => String(entry ?? "").trim()).filter(Boolean);
    } catch {
      return trimmed
        .split("||")
        .flatMap((part) => part.split(","))
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const parseIdList = (value: unknown): number[] => {
  if (Array.isArray(value)) return value.map((entry) => Number(entry)).filter((id) => Number.isInteger(id) && id > 0);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => Number(entry)).filter((id) => Number.isInteger(id) && id > 0);
      }
    } catch {
      const normalized = trimmed.replace(/^\[/, "").replace(/\]$/, "");
      return normalized.split(",").map((entry) => Number(entry.trim())).filter((id) => Number.isInteger(id) && id > 0);
    }
  }
  return [];
};

const parseObjectMap = (value: unknown): Record<string, string> => {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, entry]) => {
      const normalized = String(entry ?? "").trim();
      if (normalized) acc[key] = normalized;
      return acc;
    }, {});
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, entry]) => {
          const normalized = String(entry ?? "").trim();
          if (normalized) acc[key] = normalized;
          return acc;
        }, {});
      }
    } catch {
      return {};
    }
  }
  return {};
};

const findListValueByName = (names: string[], values: string[], targetName: string): string => {
  const target = String(targetName || "").trim().toLowerCase();
  if (!target || names.length === 0 || values.length === 0) return "";
  const index = names.findIndex((name) => String(name || "").trim().toLowerCase() === target);
  if (index < 0) return "";
  return values[index] || "";
};

const findListIndexByName = (names: string[], targetName: string): number => {
  const target = String(targetName || "").trim().toLowerCase();
  if (!target || names.length === 0) return -1;
  return names.findIndex((name) => String(name || "").trim().toLowerCase() === target);
};

const formatRawFieldValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "N/A";
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return trimmed;
    }
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const fieldLabel = (key: string) =>
  key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const DeliveryDetailModal = ({ delivery, onClose, onEdit, onPrint, onDelete }: DeliveryDetailModalProps) => {
  const deliveryAny = delivery as Delivery & {
    product_serial_number?: string;
    serial_number?: string;
    order_product_ids?: number[] | string[] | string;
    delivery_item_product_ids?: number[] | string[] | string;
    product_serial_numbers?: string[] | string;
    product_names?: string[] | string;
    product_models?: string[] | string;
    delivery_item_product_names?: string[] | string;
    delivery_item_models?: string[] | string;
    delivery_item_serial_numbers?: string[] | string;
    replacement_product_names?: string[] | string;
    replacement_product_serial_numbers?: string[] | string;
  };
  const deliveryTableFieldOrder = [
    "id",
    "order_id",
    "serial_number",
    "delivery_type_map",
    "delivery_code",
    "delivery_type",
    "address",
    "contact_person",
    "contact_phone",
    "scheduled_date",
    "scheduled_time",
    "delivered_date",
    "delivery_person",
    "status",
    "notes",
    "created_at",
    "updated_at",
    "product_id",
    "product_ids",
    "serial_numbers",
    "order_code",
    "client_id",
    "companies_products",
    "company_id",
    "company_ids",
    "company_product_map",
    "product_status_map",
    "repairing_status_map",
    "issue_description_map",
    "accessory_type_map",
    "result_text_map",
    "replacement_product_id",
    "replacement_product_ids",
    "staff_id",
    "service_type",
    "issue_description",
    "diagnosis_notes",
    "repair_notes",
    "warranty_status",
    "estimated_cost",
    "final_cost",
    "deposit_amount",
    "payment_status",
    "estimated_delivery_date",
    "actual_delivery_date",
    "handover_type",
    "handover_type_map",
    "priority",
    "rating",
    "product_status_dates_map",
  ] as const;
  const deliveryTableFields = deliveryTableFieldOrder
    .filter((key) => key in deliveryAny)
    .map((key) => ({
      key,
      label: fieldLabel(key),
      value: formatRawFieldValue((deliveryAny as unknown as Record<string, unknown>)[key]),
    }));
  const productSerial = (() => {
    const direct = String(deliveryAny.product_serial_number || "").trim();
    if (direct) return direct;
    const legacy = String(deliveryAny.serial_number || "").trim();
    if (legacy) return legacy;
    const rawList = deliveryAny.product_serial_numbers;
    if (Array.isArray(rawList)) {
      const first = String(rawList[0] || "").trim();
      if (first) return first;
    } else if (typeof rawList === "string") {
      const trimmed = rawList.trim();
      if (trimmed) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const first = String(parsed[0] || "").trim();
            if (first) return first;
          }
        } catch {
          const first = trimmed.split("||")[0]?.split(",")[0]?.trim();
          if (first) return first;
        }
      }
    }
    return "";
  })();
  const productName = String(delivery.product_name || "").trim() || "N/A";
  const orderProductIds = parseIdList(deliveryAny.order_product_ids);
  const deliveredProductIds = (() => {
    const itemIds = parseIdList(deliveryAny.delivery_item_product_ids);
    if (itemIds.length > 0) return itemIds;
    return parseIdList(delivery.product_ids);
  })();
  const productNames = parseNameList(deliveryAny.product_names);
  const productModels = parseNameList(deliveryAny.product_models);
  const productSerials = parseNameList(deliveryAny.product_serial_numbers);
  const deliveredNames = (() => {
    const itemNames = parseNameList(deliveryAny.delivery_item_product_names);
    if (itemNames.length > 0) return itemNames;
    return parseNameList(delivery.delivered_product_names);
  })();
  const deliveredModels = (() => {
    const itemModels = parseNameList(deliveryAny.delivery_item_models);
    if (itemModels.length > 0) return itemModels;
    return parseNameList(delivery.delivered_product_models);
  })();
  const deliveredSerials = (() => {
    const itemSerials = parseNameList(deliveryAny.delivery_item_serial_numbers);
    if (itemSerials.length > 0) return itemSerials;
    return parseNameList(delivery.delivered_product_serial_numbers);
  })();
  const deliveryTypeMap = parseObjectMap(delivery.delivery_type_map);
  const replacementNames = parseNameList(deliveryAny.replacement_product_names);
  const replacementSerials = parseNameList(deliveryAny.replacement_product_serial_numbers);
  const orderProductsById = new Map<number, { name: string; serial: string; model: string }>();
  orderProductIds.forEach((id, index) => {
    if (id <= 0) return;
    orderProductsById.set(id, {
      name: productNames[index] || `Product ${index + 1}`,
      serial: productSerials[index] || "",
      model: productModels[index] || "N/A",
    });
  });
  const resolveOrderProductDetail = (
    id: number,
    name: string,
    field: "serial" | "model",
  ) => {
    const byId = id > 0 ? orderProductsById.get(id) : undefined;
    const directValue = byId?.[field];
    if (directValue && directValue !== "N/A") return directValue;

    const fallbackByName =
      field === "serial"
        ? findListValueByName(productNames, productSerials, name)
        : findListValueByName(productNames, productModels, name);
    if (fallbackByName && fallbackByName !== "N/A") return fallbackByName;

    return "";
  };
  const resolveDeliveredFieldByIndex = (index: number, name: string, field: "serial" | "model") => {
    const directList = field === "serial" ? deliveredSerials : deliveredModels;
    const orderList = field === "serial" ? productSerials : productModels;
    const directValue = String(directList[index] || "").trim();
    if (directValue && directValue !== "N/A") return directValue;

    const orderValue = String(orderList[index] || "").trim();
    if (orderValue && orderValue !== "N/A") return orderValue;

    const matchedIndex = findListIndexByName(productNames, name);
    if (matchedIndex >= 0) {
      const matchedValue = String(orderList[matchedIndex] || "").trim();
      if (matchedValue && matchedValue !== "N/A") return matchedValue;
    }

    const fallbackByName =
      field === "serial"
        ? findListValueByName(productNames, productSerials, name)
        : findListValueByName(productNames, productModels, name);
    if (fallbackByName && fallbackByName !== "N/A") return fallbackByName;

    if (field === "serial") {
      return index === 0 ? productSerial || "N/A" : "N/A";
    }

    return String(delivery.product_model || "").trim() || "N/A";
  };
  const deliveredProducts = (() => {
    if (deliveredProductIds.length > 0) {
      return deliveredProductIds.map((id, index) => {
        const orderMatch = orderProductsById.get(id);
        const resolvedName = deliveredNames[index] || orderMatch?.name || (index === 0 ? productName : `Product #${id}`);
        const resolvedSerial =
          deliveredSerials[index] ||
          orderMatch?.serial ||
          resolveOrderProductDetail(id, resolvedName, "serial") ||
          (index === 0 ? productSerial : "") ||
          "N/A";
        const resolvedModel =
          deliveredModels[index] ||
          orderMatch?.model ||
          resolveOrderProductDetail(id, resolvedName, "model") ||
          String(delivery.product_model || "").trim() ||
          "N/A";
        return {
          id,
          name: resolvedName,
          serial: resolvedSerial,
          model: resolvedModel,
          deliveryType: humanize(deliveryTypeMap[String(id)] || delivery.delivery_type),
        };
      });
    }

    const maxLength = Math.max(deliveredNames.length, deliveredSerials.length, deliveredModels.length, delivery.product_name ? 1 : 0);
    return Array.from({ length: maxLength }, (_, index) => ({
      id: 0,
      name: deliveredNames[index] || (index === 0 ? productName : `Product ${index + 1}`),
      serial: resolveDeliveredFieldByIndex(index, deliveredNames[index] || productNames[index] || productName, "serial"),
      model: resolveDeliveredFieldByIndex(index, deliveredNames[index] || productNames[index] || productName, "model"),
      deliveryType: humanize(delivery.delivery_type),
    })).filter((entry) => entry.name !== "N/A" || entry.serial !== "N/A");
  })();
  const remainingProducts = (() => {
    const deliveredIdSet = new Set(deliveredProductIds);
    const deliveredNameCount = new Map<string, number>();
    deliveredProducts.forEach((entry) => {
      const key = String(entry.name || "").trim().toLowerCase();
      if (!key) return;
      deliveredNameCount.set(key, (deliveredNameCount.get(key) || 0) + 1);
    });

    const entries = (productNames.length > 0 ? productNames : [productName]).map((name, index) => ({
      id: orderProductIds[index] || 0,
      name: name || `Product ${index + 1}`,
      serial:
        productSerials[index] ||
        resolveOrderProductDetail(orderProductIds[index] || 0, name, "serial") ||
        (index === 0 ? productSerial || "N/A" : "N/A"),
      model:
        productModels[index] ||
        resolveOrderProductDetail(orderProductIds[index] || 0, name, "model") ||
        "N/A",
    }));

    return entries.filter((entry) => {
      if (entry.id > 0 && deliveredIdSet.has(entry.id)) return false;
      const key = String(entry.name || "").trim().toLowerCase();
      if (!key) return true;
      const count = deliveredNameCount.get(key) || 0;
      if (count <= 0) return true;
      deliveredNameCount.set(key, count - 1);
      return false;
    });
  })();
  const replacementListLines =
    replacementNames.length > 0
      ? replacementNames.map((name, index) => `${index + 1}. ${name} - Serial: ${replacementSerials[index] || "N/A"}`)
      : [];
  const productModelSummary = productModels.length > 0 ? productModels.join(", ") : "";
  const deliveryCode = delivery.delivery_code || `DEL${String(delivery.id).padStart(3, "0")}`;
  const orderCode = delivery.order_code || `ORD${String(delivery.order_id).padStart(3, "0")}`;
  const scheduledDate = delivery.scheduled_date_formatted || formatDisplayDateTime(delivery.scheduled_date);
  const deliveredDate =
    delivery.delivered_date_formatted ||
    (delivery.delivered_date && delivery.delivered_date !== "0000-00-00 00:00:00"
      ? formatDisplayDateTime(delivery.delivered_date)
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
        style={{ maxHeight: "90vh" }}
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
            <motion.button className="btn outline delivery-detail-top-action" onClick={() => onEdit(delivery)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <FiEdit2 /> Edit
            </motion.button>
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
                <strong>{productName}</strong>
                <p>{productSerial ? `Serial: ${productSerial}` : "Serial: N/A"}</p>
                <p>{String(delivery.product_model || "").trim() ? `Model: ${String(delivery.product_model || "").trim()}` : "Model: N/A"}</p>
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
                <FiCheckSquare /> Contact & Address
              </h3>
              <div className="detail-item"><span className="detail-label">Contact Person</span><span className="detail-value">{delivery.contact_person || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Contact Phone</span><span className="detail-value">{delivery.contact_phone || delivery.client_phone || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Delivery Person</span><span className="detail-value">{delivery.delivery_person || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Created</span><span className="detail-value">{formatDisplayDateTime(delivery.created_at)}</span></div>
            </div>

            <div className="detail-section full-width detail-section-emphasis">
              <h3>
                <FiPackage /> Delivered Products
              </h3>
              <div className="order-detail-product-value">
                <span className="order-detail-product-count">
                  {deliveredProducts.length} delivered item{deliveredProducts.length === 1 ? "" : "s"}
                </span>
                <div className="order-detail-product-list">
                  {deliveredProducts.map((entry, index) => (
                    <div className="order-detail-product-list-item" key={`delivered-${entry.id || index}`}>
                      <span className="order-detail-product-index">{index + 1}</span>
                      <div className="order-detail-product-text">
                        <span className="order-detail-product-name">{entry.name}</span>
                        <span className="order-detail-product-serial">Serial No: {entry.serial || "N/A"}</span>
                        <span className="order-detail-product-serial">Model No: {entry.model || "N/A"}</span>
                        <span className="order-detail-product-serial">Delivery Type: {entry.deliveryType}</span>
                        <span className="order-detail-product-serial">Current Status: {humanize(status)}</span>
                        <span className="order-detail-product-serial">Delivered Date: {deliveredDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="detail-section full-width">
              <h3>
                <FiPackage /> Remaining Products
              </h3>
              <div className="order-detail-product-value">
                <span className="order-detail-product-count">
                  {remainingProducts.length} remaining item{remainingProducts.length === 1 ? "" : "s"}
                </span>
                {remainingProducts.length > 0 ? (
                  <div className="order-detail-product-list">
                    {remainingProducts.map((entry, index) => (
                      <div className="order-detail-product-list-item" key={`remaining-${entry.id || index}`}>
                        <span className="order-detail-product-index">{index + 1}</span>
                        <div className="order-detail-product-text">
                          <span className="order-detail-product-name">{entry.name}</span>
                          <span className="order-detail-product-serial">Serial No: {entry.serial || "N/A"}</span>
                          <span className="order-detail-product-serial">Model No: {entry.model || "N/A"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="order-detail-product-empty">No remaining products.</span>
                )}
              </div>
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

            <div className="detail-section full-width">
              <h3>
                <FiTruck /> Reference
              </h3>
              <div className="detail-item"><span className="detail-label">Delivery ID</span><span className="detail-value">#{delivery.id}</span></div>
              <div className="detail-item"><span className="detail-label">Delivery Code</span><span className="detail-value">{deliveryCode}</span></div>
              <div className="detail-item"><span className="detail-label">Order Code</span><span className="detail-value">{orderCode}</span></div>
              <div className="detail-item"><span className="detail-label">Replacement</span><span className="detail-value" style={{ whiteSpace: "pre-line" }}>{replacementListLines.length > 0 ? replacementListLines.join("\n") : "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Product Model</span><span className="detail-value">{productModelSummary || "N/A"}</span></div>
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

            <div className="detail-section full-width detail-section-notes">
              <h3>
                <FiFileText /> Deliveries Table Data
              </h3>
              <p className="detail-section-intro">
                Full delivery record from the <code>deliveries</code> table.
              </p>
              <div className="delivery-raw-fields-grid">
                {deliveryTableFields.map((field) => (
                  <div className="delivery-raw-field-card" key={field.key}>
                    <span className="detail-label">{field.label}</span>
                    <pre className="delivery-raw-field-value">
                      {field.value}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-detail-actions">
            <motion.button className="btn outline" onClick={onClose} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              Close
            </motion.button>
            <motion.button className="btn secondary" onClick={() => onEdit(delivery)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <FiEdit2 /> Edit
            </motion.button>
            <motion.button className="btn danger" onClick={() => onDelete(delivery)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <FiTrash2 /> Delete Delivery
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
