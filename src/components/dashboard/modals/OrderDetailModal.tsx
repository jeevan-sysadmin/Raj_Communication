import { motion } from "framer-motion";
import {
  FiCalendar,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiEdit,
  FiInfo,
  FiPackage,
  FiPrinter,
  FiShield,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import type { Order, Product } from "../types";
import { formatCurrency, formatDisplayDate, getBalanceDue } from "../utils";

interface OrderDetailModalProps {
  order: Order;
  products?: Product[];
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getWarrantyColor: (warranty: string) => string;
  onClose: () => void;
  onEdit: (order: Order) => void;
  onPrint: (order: Order) => void;
}

const formatOrderMeta = (value?: string) =>
  value && value !== "0000-00-00 00:00:00" ? formatDisplayDate(value) : "Not set";

const formatFlowDate = (value?: string) => {
  if (!value || value === "0000-00-00" || value === "0000-00-00 00:00:00") return "Not set";
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    // Always show backend value instead of hiding valid-looking timestamps.
    return value;
  }
  return value;
};

const prettify = (value?: string) =>
  (value || "n/a")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const prettifyKey = (key: string) =>
  key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatAnyValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const parseJsonArray = (value: string): unknown[] | null => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeNames = (value: unknown) =>
  Array.from(
    new Set(
      (
        Array.isArray(value)
          ? value
          : typeof value === "number"
            ? [value]
          : typeof value === "string"
            ? parseJsonArray(value.trim()) ??
              (value.includes("||") ? value.split("||") : value.split(","))
            : []
      )
        .map((name) => String(name ?? "").trim())
        .filter((name): name is string => {
          const normalized = name.toLowerCase();
          return Boolean(normalized) && normalized !== "null" && normalized !== "undefined";
        }),
    ),
  );

const normalizeIds = (value: unknown) =>
  Array.from(
    new Set(
      (
        Array.isArray(value)
          ? value
          : typeof value === "number"
            ? [value]
            : typeof value === "string"
              ? parseJsonArray(value.trim()) ?? value.split(",")
              : []
      )
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );

const withIdFallback = (names: string[], ids: number[], labelPrefix: string) => {
  if (names.length > 0) return names;
  return ids.map((id) => `${labelPrefix} #${id}`);
};

interface ProductEntry {
  label: string;
  serialNumber: string;
}

const buildOrderProductEntries = (
  order: Order,
  products: Product[],
  isReplacement: boolean,
): ProductEntry[] => {
  const ids = normalizeIds([
    ...(isReplacement ? normalizeIds(order.replacement_product_ids) : normalizeIds(order.product_ids)),
    ...(isReplacement ? normalizeIds(order.replacement_product_id) : normalizeIds(order.product_id)),
  ]);
  const namesFromList = isReplacement ? normalizeNames(order.replacement_product_names) : normalizeNames(order.product_names);
  const fallbackNames = isReplacement ? normalizeNames(order.replacement_product_name) : normalizeNames(order.product_name);
  const names = namesFromList.length > 0 ? namesFromList : fallbackNames;
  const serials = normalizeNames(
    isReplacement ? order.replacement_product_serial_numbers : order.product_serial_numbers,
  );
  const fallbackSerial = (isReplacement ? order.replacement_serial_number : order.serial_number) || "";

  const entries = ids.map((id, index) => {
    const matched = products.find((product) => product.id === id);
    return {
      label:
        names[index] ||
        matched?.product_name ||
        `${isReplacement ? "Replacement Product" : "Product"} #${id}`,
      serialNumber: serials[index] || matched?.serial_number || (index === 0 ? fallbackSerial : "") || "",
    };
  });

  if (entries.length > 0) return entries;

  return withIdFallback(names, ids, isReplacement ? "Replacement Product" : "Product").map((label, index) => ({
    label,
    serialNumber: serials[index] || (index === 0 ? fallbackSerial : "") || "",
  }));
};

const renderProductCollection = (entries: ProductEntry[], emptyLabel: string) => {
  if (!entries.length) {
    return <span className="order-detail-product-empty">{emptyLabel}</span>;
  }

  return (
    <div className="order-detail-product-value">
      <span className="order-detail-product-count">
        {entries.length} item{entries.length > 1 ? "s" : ""}
      </span>
      <div className="order-detail-product-list">
        {entries.map((entry, index) => (
          <div
            key={`${entry.label}-${index}`}
            className="order-detail-product-list-item"
            title={entry.serialNumber ? `${entry.label} (SN: ${entry.serialNumber})` : entry.label}
          >
            <span className="order-detail-product-index">{index + 1}.</span>
            <span className="order-detail-product-text">
              {entry.label}
              {entry.serialNumber ? ` (SN: ${entry.serialNumber})` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const renderCompanyProductBlocks = (
  lines: Array<{ companyLabel: string; productNames: string[] }>,
) => {
  if (lines.length === 0) {
    return <span>No company-wise products</span>;
  }

  return (
    <div>
      {lines.map((line, index) => (
        <div key={`${line.companyLabel}-${index}`} style={{ marginBottom: "10px" }}>
          <div><strong>{line.companyLabel}</strong></div>
          {line.productNames.length > 0 ? (
            line.productNames.map((productName, productIndex) => (
              <div key={`${line.companyLabel}-${productName}-${productIndex}`}>
                {productIndex + 1}. {productName}
              </div>
            ))
          ) : (
            <div>No products</div>
          )}
        </div>
      ))}
    </div>
  );
};

interface RepairingStatusEntry {
  productId: number;
  label: string;
  status: string;
  tone: { bg: string; color: string; border: string; label: string };
}

const renderRepairingStatusRows = (entries: RepairingStatusEntry[]) => {
  const rows = entries.map((entry, index) => (
    <div key={`repairing-status-${entry.productId}`} className="repairing-status-row">
      <span className="repairing-status-label">
        {index + 1}. {entry.label}
      </span>
      <span
        className="repairing-status-pill"
        style={{
          borderColor: entry.tone.border,
          backgroundColor: entry.tone.bg,
          color: entry.tone.color,
        }}
      >
        {entry.tone.label}
      </span>
    </div>
  ));

  if (!rows.length) {
    return <span className="order-detail-product-empty">No repairing status added</span>;
  }

  return <div className="repairing-status-list">{rows}</div>;
};

const normalizeCompanyProductMap = (value: unknown): Record<string, number[]> => {
  let raw: unknown = value;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    const parsed = parseJsonArray(trimmed);
    if (parsed) return {};
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return {};
    }
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const map: Record<string, number[]> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([companyId, productIds]) => {
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) return;
    map[id.toString()] = normalizeIds(productIds);
  });
  return map;
};

const normalizeRepairingStatusMap = (value: unknown): Record<string, string> => {
  if (!value) return {};
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
    } catch {
      const fallback: Record<string, string> = {};
      const matches = value.matchAll(/"(\d+)"\s*:\s*"([^"]+)"/g);
      for (const match of matches) {
        const key = String(match[1] || "").trim();
        const raw = String(match[2] || "").trim().toLowerCase();
        if (!key || !raw) continue;
        if (raw === "ready") fallback[key] = "ready";
        else if (raw === "replacement") fallback[key] = "replacement";
        else if (raw === "not_ready" || raw === "not ready" || raw === "notready") fallback[key] = "not ready";
        else fallback[key] = raw.replaceAll("_", " ");
      }
      return fallback;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const normalized: Record<string, string> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, status]) => {
    const key = String(productId || "").trim();
    if (!key) return;
    const raw = String(status || "").trim().toLowerCase();
    if (raw === "ready") normalized[key] = "ready";
    else if (raw === "replacement") normalized[key] = "replacement";
    else if (raw === "not_ready" || raw === "not ready" || raw === "notready") normalized[key] = "not ready";
    else if (raw) normalized[key] = raw.replaceAll("_", " ");
  });
  return normalized;
};

const normalizeProductFlowStatusMap = (value: unknown): Record<string, string> => {
  if (!value) return {};
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const normalized: Record<string, string> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, status]) => {
    const key = String(productId || "").trim();
    if (!key) return;
    const raw = String(status || "").trim().toLowerCase();
    if (raw === "rajtocom" || raw === "comtoraj" || raw === "deliveryed" || raw === "pending") {
      normalized[key] = raw;
    } else if (raw === "delivered") {
      normalized[key] = "deliveryed";
    }
  });
  return normalized;
};

const normalizeProductFlowDatesMap = (
  value: unknown,
): Record<string, { pending?: string; rajtocom?: string; comtoraj?: string; deliveryed?: string }> => {
  if (!value) return {};
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const normalized: Record<string, { pending?: string; rajtocom?: string; comtoraj?: string; deliveryed?: string }> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, dates]) => {
    const key = String(productId || "").trim();
    if (!key || !dates || typeof dates !== "object" || Array.isArray(dates)) return;
    const row = dates as Record<string, unknown>;
    normalized[key] = {
      pending: row.pending ? String(row.pending) : "",
      rajtocom: row.rajtocom ? String(row.rajtocom) : "",
      comtoraj: row.comtoraj ? String(row.comtoraj) : "",
      deliveryed: row.deliveryed
        ? String(row.deliveryed)
        : row.delivered
          ? String(row.delivered)
          : "",
    };
  });
  return normalized;
};

const getRepairingStatusTone = (status: string) => {
  const normalized = status.trim().toLowerCase().replaceAll("_", " ");
  if (normalized === "ready") {
    return { bg: "#dcfce7", color: "#166534", border: "#86efac", label: "Ready" };
  }
  if (normalized === "not ready") {
    return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5", label: "Not Ready" };
  }
  if (normalized === "replacement") {
    return { bg: "#fef3c7", color: "#92400e", border: "#fcd34d", label: "Replacement" };
  }
  return { bg: "#e2e8f0", color: "#334155", border: "#cbd5e1", label: prettify(normalized) };
};

const getCompanyNames = (order: Order): string[] => {
  const companyIds = normalizeIds([...(normalizeIds(order.company_ids)), ...(normalizeIds(order.company_id))]);
  const fromArray = normalizeNames(order.company_names);
  const fromText = normalizeNames((order as Order & { company_names_text?: string }).company_names_text || order.company_name);
  const names = fromArray.length > 0 ? fromArray : fromText;
  return names.length > 0 ? names : companyIds.map((id) => `Company #${id}`);
};

const OrderDetailModal = ({
  order,
  products = [],
  getStatusColor,
  getPriorityColor,
  getWarrantyColor,
  onClose,
  onEdit,
  onPrint,
}: OrderDetailModalProps) => {
  const statusColor = getStatusColor(order.status);
  const priorityColor = getPriorityColor(order.priority);
  const warrantyColor = getWarrantyColor(order.warranty_status);
  const finalAmount = formatCurrency(order.final_cost || order.estimated_cost);
  const depositAmount = formatCurrency(order.deposit_amount);
  const balanceDue = getBalanceDue(order.final_cost, order.estimated_cost, order.deposit_amount);
  const productEntries = buildOrderProductEntries(order, products, false);
  const replacementEntries = buildOrderProductEntries(order, products, true);
  const repairingStatusMap = normalizeRepairingStatusMap((order as Order & { repairing_status_map?: unknown }).repairing_status_map);
  const productFlowStatusMap = normalizeProductFlowStatusMap((order as Order & { product_status_map?: unknown }).product_status_map);
  const productFlowDatesMap = normalizeProductFlowDatesMap(
    (order as Order & { product_status_dates_map?: unknown }).product_status_dates_map,
  );
  const productIdsForRepairingStatus = normalizeIds(order.product_ids);
  const mapRepairingProductIds = Object.keys(repairingStatusMap)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
  const resolvedRepairingProductIds = mapRepairingProductIds.length > 0
    ? mapRepairingProductIds
    : productIdsForRepairingStatus;
  const productNameById = new Map<number, string>();
  productEntries.forEach((entry, index) => {
    const pid = productIdsForRepairingStatus[index];
    if (pid) productNameById.set(pid, entry.label);
  });
  const productSummary = productEntries.length > 1
    ? `${productEntries[0].label} +${productEntries.length - 1} more`
    : (productEntries[0]?.label || "Not added");
  const productFullList = productEntries.length
    ? productEntries
      .map((entry, index) => `${index + 1}. ${entry.serialNumber ? `${entry.label} (SN: ${entry.serialNumber})` : entry.label}`)
      .join(", ")
    : "Not added";
  const replacementFullList = replacementEntries.length
    ? replacementEntries
      .map((entry, index) => `${index + 1}. ${entry.serialNumber ? `${entry.label} (SN: ${entry.serialNumber})` : entry.label}`)
      .join(", ")
    : "Not added";
  const productCountLabel = productEntries.length ? `${productEntries.length} product${productEntries.length > 1 ? "s" : ""}` : "No product";
  const replacementCountLabel = replacementEntries.length
    ? `${replacementEntries.length} replacement item${replacementEntries.length > 1 ? "s" : ""}`
    : "No replacement product";
  const companyProductMap = normalizeCompanyProductMap(order.company_product_map || order.companies_products);
  const companyIds = Array.from(
    new Set([
      ...normalizeIds(order.company_ids),
      ...normalizeIds(order.company_id),
      ...Object.keys(companyProductMap).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
    ]),
  );
  const companyNames = getCompanyNames(order);
  const companyNamesText = companyNames.length > 0 ? companyNames.join(", ") : "No company selected";
  const apiCompanyProductNameMap = (order as Order & {
    company_product_name_map?: Record<string, { company_name?: string; product_names?: string[] | string }>;
  }).company_product_name_map;
  const companyProductLines = (
    apiCompanyProductNameMap && typeof apiCompanyProductNameMap === "object"
      ? Object.values(apiCompanyProductNameMap).map((entry) => {
          const parsedNames = normalizeNames(entry?.product_names || []);
          return {
            companyLabel: String(entry?.company_name || "").trim() || "Company",
            productNames: parsedNames,
          };
        })
      : companyIds.map((companyId, index) => {
          const companyLabel = companyNames[index] || `Company #${companyId}`;
          const productNames = (companyProductMap[companyId.toString()] || [])
            .map((productId) => products.find((product) => product.id === productId)?.product_name || `Product #${productId}`);
          return {
            companyLabel,
            productNames,
          };
        })
  );
  const allOrderData = order as unknown as Record<string, unknown>;
  const repairingStatusEntries: RepairingStatusEntry[] = resolvedRepairingProductIds
    .map((productId) => {
      const status = repairingStatusMap[String(productId)];
      if (!status) return null;
      const label = productNameById.get(productId) || `Product #${productId}`;
      const tone = getRepairingStatusTone(status);
      return { productId, label, status, tone };
    })
    .filter((entry): entry is RepairingStatusEntry => Boolean(entry));
  const repairingReadyCount = repairingStatusEntries.filter((entry) => entry.status === "ready").length;
  const repairingNotReadyCount = repairingStatusEntries.filter((entry) => entry.status === "not ready").length;
  const repairingReplacementCount = repairingStatusEntries.filter((entry) => entry.status === "replacement").length;
  const repairingPendingCount = Math.max(productEntries.length - repairingStatusEntries.length, 0);
  const productFlowIds = Array.from(
    new Set([
      ...normalizeIds(order.product_ids),
      ...Object.keys(productFlowStatusMap).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
      ...Object.keys(productFlowDatesMap).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
    ]),
  );

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content order-detail-modal"
        initial={{ opacity: 0, scale: 0.94, y: 36 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header order-detail-header">
          <div className="order-detail-title-wrap">
            <div className="order-detail-kicker">Service Order</div>
            <div className="modal-title">
              <h2>{order.order_code}</h2>
              <p title={productFullList}>
                {order.client_name} | {productSummary}
              </p>
              <p title={companyNamesText}>Companies: {companyNamesText}</p>
            </div>
          </div>
          <div className="order-detail-header-actions">
            <div className="order-detail-status-row">
              <span className="order-detail-pill" style={{ backgroundColor: `${statusColor}18`, color: statusColor }}>
                {prettify(order.status)}
              </span>
              <span className="order-detail-pill" style={{ backgroundColor: `${priorityColor}18`, color: priorityColor }}>
                {prettify(order.priority)} Priority
              </span>
              <span className="order-detail-pill" style={{ backgroundColor: `${warrantyColor}18`, color: warrantyColor }}>
                {prettify(order.warranty_status)}
              </span>
            </div>
            <motion.button className="close-btn" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
              <FiX />
            </motion.button>
          </div>
        </div>

        <div className="order-detail-content">
          <div className="order-detail-hero">
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon"><FiUser /></div>
              <div>
                <span className="order-detail-hero-label">Client</span>
                <strong>{order.client_name}</strong>
                <p>{order.client_phone || "Phone not available"}</p>
              </div>
            </div>
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon"><FiPackage /></div>
              <div>
                <span className="order-detail-hero-label">Product</span>
                <strong title={productFullList}>{productSummary}</strong>
                <p title={replacementFullList}>
                  {productCountLabel} | {replacementCountLabel}
                </p>
              </div>
            </div>
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon"><FiCreditCard /></div>
              <div>
                <span className="order-detail-hero-label">Payment</span>
                <strong>Rs. {finalAmount}</strong>
                <p>{prettify(order.payment_status)}</p>
              </div>
            </div>
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon"><FiCalendar /></div>
              <div>
                <span className="order-detail-hero-label">Timeline</span>
                <strong>{formatOrderMeta(order.estimated_delivery_date)}</strong>
                <p>Created {formatOrderMeta(order.created_at)}</p>
              </div>
            </div>
            <div className="order-detail-hero-card">
              <div className="order-detail-hero-icon"><FiUsers /></div>
              <div>
                <span className="order-detail-hero-label">Companies</span>
                <strong title={companyNamesText}>{companyNamesText}</strong>
                <p>{companyNames.length} selected</p>
              </div>
            </div>
            <div className="order-detail-hero-card order-detail-hero-card-status">
              <div className="order-detail-hero-icon"><FiTrendingUp /></div>
              <div>
                <span className="order-detail-hero-label">Repairing Status</span>
                <strong>
                  {repairingStatusEntries.length}/{productEntries.length || 0} Updated
                </strong>
                <div className="repairing-status-summary-chips">
                  <span className="repairing-status-summary-chip ready">Ready {repairingReadyCount}</span>
                  <span className="repairing-status-summary-chip not-ready">Not Ready {repairingNotReadyCount}</span>
                  <span className="repairing-status-summary-chip replacement">Replacement {repairingReplacementCount}</span>
                  <span className="repairing-status-summary-chip pending">Pending {repairingPendingCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="order-detail-grid">
            <div className="detail-section detail-section-emphasis">
              <h3><FiInfo /> Service Summary</h3>
              <div className="detail-stack">
                <div className="detail-copy-block">
                  <span className="detail-copy-label">Issue Description</span>
                  <p>{order.issue_description || "No issue description provided."}</p>
                </div>
                <div className="detail-copy-grid">
                  <div className="detail-copy-block">
                    <span className="detail-copy-label">Diagnosis Notes</span>
                    <p>{order.diagnosis_notes || "No diagnosis notes yet."}</p>
                  </div>
                  <div className="detail-copy-block">
                    <span className="detail-copy-label">Repair Notes</span>
                    <p>{order.repair_notes || "No repair notes yet."}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3><FiPackage /> Product Information</h3>
              <div className="detail-item">
                <span className="detail-label">Main Products</span>
                <div className="detail-value">
                  {companyProductLines.length > 0 ? (
                    renderCompanyProductBlocks(companyProductLines)
                  ) : (
                    renderProductCollection(productEntries, "Not added")
                  )}
                </div>
              </div>
              <div className="detail-item"><span className="detail-label">Replacement Products</span>{renderProductCollection(replacementEntries, "No replacement")}</div>
              <div className="detail-item"><span className="detail-label">Brand</span><span className="detail-value">{order.product_brand || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Model</span><span className="detail-value">{order.product_model || "N/A"}</span></div>
              <div className="detail-item">
                <span className="detail-label">Repairing Status</span>
                <div className="detail-value">
                  {renderRepairingStatusRows(repairingStatusEntries)}
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Product Flow Status</span>
                <div className="detail-value">
                  {productFlowIds.length > 0 ? (
                    <div className="flow-status-list">
                      {productFlowIds.map((productId, index) => {
                        const label = productNameById.get(productId) || `Product #${productId}`;
                        const current = productFlowStatusMap[String(productId)] || "pending";
                        const dates = productFlowDatesMap[String(productId)] || {};
                        return (
                          <div key={`flow-${productId}`} className="flow-status-card">
                            <div className="flow-status-head">
                              <strong>{index + 1}. {label}</strong>
                              <span className={`flow-status-pill flow-${current}`}>{prettify(current)}</span>
                            </div>
                            <div className="flow-status-dates">
                              <span>Pending: {formatFlowDate(dates.pending)}</span>
                              <span>RajToCom: {formatFlowDate(dates.rajtocom)}</span>
                              <span>ComToRaj: {formatFlowDate(dates.comtoraj)}</span>
                              <span>Deliveryed: {formatFlowDate(dates.deliveryed)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="order-detail-product-empty">No product flow status added</span>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3><FiDollarSign /> Payment Snapshot</h3>
              <div className="detail-item"><span className="detail-label">Estimated Cost</span><span className="detail-value">Rs. {formatCurrency(order.estimated_cost)}</span></div>
              <div className="detail-item"><span className="detail-label">Final Cost</span><span className="detail-value">Rs. {finalAmount}</span></div>
              <div className="detail-item"><span className="detail-label">Deposit</span><span className="detail-value">Rs. {depositAmount}</span></div>
              <div className="detail-item"><span className="detail-label">Balance Due</span><span className="detail-value">Rs. {balanceDue}</span></div>
              <div className="detail-item">
                <span className="detail-label">Payment Status</span>
                <span className="detail-value order-inline-badge">{prettify(order.payment_status)}</span>
              </div>
            </div>

            <div className="detail-section">
              <h3><FiTrendingUp /> Workflow</h3>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className="detail-value order-inline-badge" style={{ backgroundColor: `${statusColor}18`, color: statusColor }}>
                  {prettify(order.status)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Priority</span>
                <span className="detail-value order-inline-badge" style={{ backgroundColor: `${priorityColor}18`, color: priorityColor }}>
                  {prettify(order.priority)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Warranty</span>
                <span className="detail-value order-inline-badge" style={{ backgroundColor: `${warrantyColor}18`, color: warrantyColor }}>
                  {prettify(order.warranty_status)}
                </span>
              </div>
              <div className="detail-item"><span className="detail-label">Estimated Delivery</span><span className="detail-value">{formatOrderMeta(order.estimated_delivery_date)}</span></div>
              <div className="detail-item"><span className="detail-label">Actual Delivery</span><span className="detail-value">{formatOrderMeta(order.actual_delivery_date)}</span></div>
            </div>

            <div className="detail-section">
              <h3><FiUsers /> Team & Client</h3>
              <div className="detail-item"><span className="detail-label">Client Phone</span><span className="detail-value">{order.client_phone || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Client Email</span><span className="detail-value">{order.client_email || "N/A"}</span></div>
              <div className="detail-item"><span className="detail-label">Companies</span><span className="detail-value">{companyNamesText}</span></div>
              <div className="detail-item">
                <span className="detail-label">Company Products</span>
                <div className="detail-value">
                  {companyProductLines.length > 0 ? (
                    renderCompanyProductBlocks(companyProductLines)
                  ) : (
                    "No company-wise products"
                  )}
                </div>
              </div>
              <div className="detail-item"><span className="detail-label">Service Staff</span><span className="detail-value">{order.staff_name || "Not assigned"}</span></div>
              <div className="detail-item"><span className="detail-label">Staff Email</span><span className="detail-value">{order.staff_email || "N/A"}</span></div>
            </div>

            <div className="detail-section">
              <h3><FiClock /> Record Timeline</h3>
              <div className="detail-item"><span className="detail-label">Created At</span><span className="detail-value">{new Date(order.created_at).toLocaleString()}</span></div>
              <div className="detail-item"><span className="detail-label">Order ID</span><span className="detail-value">#{order.id}</span></div>
              <div className="detail-item"><span className="detail-label">Code</span><span className="detail-value">{order.order_code}</span></div>
            </div>

            {order.notes && (
              <div className="detail-section full-width detail-section-notes">
                <h3><FiShield /> Notes & Instructions</h3>
                <div className="detail-copy-block">
                  <span className="detail-copy-label">Additional Notes</span>
                  <p>{order.notes}</p>
                </div>
              </div>
            )}

            <div className="detail-section full-width">
              <h3><FiInfo /> All Order Data</h3>
              <div className="all-order-data-grid">
                {Object.keys(allOrderData)
                  .sort((a, b) => a.localeCompare(b))
                  .map((key) => (
                    <div className="all-order-data-item" key={`all-data-${key}`}>
                      <span className="all-order-data-key">{prettifyKey(key)}</span>
                      <span
                        className="all-order-data-value"
                        title={formatAnyValue(allOrderData[key])}
                      >
                        {formatAnyValue(allOrderData[key])}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="order-detail-actions">
            <motion.button className="btn outline" onClick={onClose} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>Close</motion.button>
            <motion.button className="btn primary" onClick={() => onEdit(order)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}><FiEdit /> Edit Order</motion.button>
            <motion.button className="btn secondary" onClick={() => onPrint(order)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}><FiPrinter /> Receipt Options</motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OrderDetailModal;
