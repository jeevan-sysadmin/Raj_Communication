import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiEye,
  FiPackage,
  FiPlus,
  FiPrinter,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import BulkActionPanel from "../BulkActionPanel";
import DateRangeSelector from "../DateRangeSelector";
import { exportStyledPdfReport } from "../pdfExport";
import type { DateRange, Order, Product } from "../types";
import { formatCurrency, formatDisplayDate } from "../utils";

interface OrdersTabProps {
  orders: Order[];
  filteredOrders: Order[];
  products?: Product[];
  loading: boolean;
  searchTerm: string;
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onPresetClick: (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear") => void;
  onViewOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onPrintReceipt: (order: Order) => void;
  onDeleteOrder: (order: Order) => void;
  onCreateOrder: () => void;
  onClearFilters: () => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getWarrantyColor: (warranty: string) => string;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  createLabel?: string;
  exportFilePrefix?: string;
}

const ITEMS_PER_PAGE = 20;
const MAX_VISIBLE_PRODUCT_CHIPS = 2;

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const parseJsonArray = (value: string): unknown[] | null => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeNames = (value: unknown) => {
  const rawValues =
    Array.isArray(value)
      ? value
      : typeof value === "number"
        ? [value]
        : typeof value === "string"
          ? parseJsonArray(value.trim()) ??
            (value.includes("||") ? value.split("||") : value.split(","))
          : [];

  return Array.from(
    new Set(
      rawValues
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => {
          const normalized = entry.toLowerCase();
          return Boolean(normalized) && normalized !== "null" && normalized !== "undefined";
        }),
    ),
  );
};

const normalizeIds = (value: unknown) => {
  const rawValues =
    Array.isArray(value)
      ? value
      : typeof value === "number"
        ? [value]
        : typeof value === "string"
          ? parseJsonArray(value.trim()) ?? value.split(",")
          : [];

  return Array.from(
    new Set(
      rawValues
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry > 0),
    ),
  );
};

const mergeIds = (...values: unknown[]) =>
  Array.from(
    new Set(
      values.reduce<number[]>((allIds, value) => [...allIds, ...normalizeIds(value)], []),
    ),
  );

const withIdFallback = (names: string[], ids: number[], prefix: string) =>
  names.length > 0 ? names : ids.map((id) => `${prefix} #${id}`);

interface ProductEntry {
  label: string;
  serialNumber: string;
}

const parseSerialList = (value: unknown) => normalizeNames(value);

const buildOrderProductEntries = (
  order: Order,
  products: Product[],
  isReplacement: boolean,
): ProductEntry[] => {
  const orderAny = order as Order & {
    replacement_serial_numbers?: string[] | string;
    replacement_product_serial_number?: string;
    replacement_serial_no?: string;
    replacement_product_serial_no?: string;
  };

  const ids = isReplacement
    ? mergeIds(order.replacement_product_ids, order.replacement_product_id)
    : mergeIds(order.product_ids, order.product_id);
  const namesFromList = isReplacement ? normalizeNames(order.replacement_product_names) : normalizeNames(order.product_names);
  const fallbackNames = isReplacement ? normalizeNames(order.replacement_product_name) : normalizeNames(order.product_name);
  const names = namesFromList.length > 0 ? namesFromList : fallbackNames;
  const replacementSerials = isReplacement
    ? [
        ...parseSerialList(order.replacement_product_serial_numbers),
        ...parseSerialList(orderAny.replacement_serial_numbers),
      ]
    : [];
  const serialsFromList = isReplacement
    ? Array.from(new Set(replacementSerials.map((value) => String(value || "").trim()).filter(Boolean)))
    : parseSerialList(order.product_serial_numbers);
  const fallbackSerial = isReplacement
    ? String(
        order.replacement_serial_number ||
          orderAny.replacement_product_serial_number ||
          orderAny.replacement_serial_no ||
          orderAny.replacement_product_serial_no ||
          "",
      )
    : String(order.serial_number || "");

  const idEntries = ids.map((id, index) => {
    const matched = products.find((product) => product.id === id);
    const label = names[index] || matched?.product_name || `${isReplacement ? "Replacement Product" : "Product"} #${id}`;
    const serialNumber = serialsFromList[index] || matched?.serial_number || (index === 0 ? fallbackSerial : "") || "";
    return { label, serialNumber };
  });

  if (idEntries.length > 0) return idEntries;

  return withIdFallback(names, ids, isReplacement ? "Replacement Product" : "Product").map((label, index) => ({
    label,
    serialNumber: serialsFromList[index] || (index === 0 ? fallbackSerial : "") || "",
  }));
};

const getOrderProductEntries = (order: Order, products: Product[]) => {
  const entries = buildOrderProductEntries(order, products, false);
  return entries.length > 0 ? entries : [{ label: "Not added", serialNumber: "" }];
};

const getOrderReplacementEntries = (order: Order, products: Product[]) => {
  return buildOrderProductEntries(order, products, true);
};

const formatProductEntry = (entry: ProductEntry) =>
  entry.serialNumber ? `${entry.label} (SN: ${entry.serialNumber})` : entry.label;

const formatProductEntryList = (entries: ProductEntry[], fallback: string) =>
  entries.length > 0
    ? entries.map((entry, index) => `${index + 1}. ${formatProductEntry(entry)}`).join(", ")
    : fallback;

const formatPaymentStatusLabel = (value?: string) =>
  (value || "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getPendingDays = (order: Order): number => {
  if (!order.created_at) return 0;

  const createdDate = new Date(order.created_at);
  if (Number.isNaN(createdDate.getTime())) return 0;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const createdStart = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
  const diffMs = todayStart.getTime() - createdStart.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

const isAllProductsDelivered = (order: Order): boolean => {
  if (String(order.status || "").trim().toLowerCase() === "delivered") return true;

  const raw = (order as Order & { product_status_map?: unknown }).product_status_map;
  if (!raw) return false;

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    try {
      parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
    } catch {
      return false;
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;

  const statuses = Object.values(parsed as Record<string, unknown>)
    .map((value) => String(value || "").trim().toLowerCase());
  if (statuses.length === 0) return false;

  const deliveredStatuses = new Set(["delivered", "deliveryed"]);
  return statuses.every((status) => deliveredStatuses.has(status));
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
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
    } catch {
      const fallback: Record<string, string> = {};
      const matches = trimmed.matchAll(/"(\d+)"\s*:\s*"([^"]+)"/g);
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

const normalizeIssueDescriptionMap = (value: unknown): Record<string, string> => {
  if (!value) return {};
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const normalized: Record<string, string> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, text]) => {
    const key = String(productId || "").trim();
    if (!key) return;
    normalized[key] = String(text ?? "").trim();
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
  return { bg: "#e2e8f0", color: "#334155", border: "#cbd5e1", label: normalized || "N/A" };
};

const getRepairingStatusSummary = (order: Order, products: Product[]) => {
  const map = normalizeRepairingStatusMap((order as Order & { repairing_status_map?: unknown }).repairing_status_map);
  const productIds = mergeIds(order.product_ids, order.product_id);
  const mapIds = Object.keys(map).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
  const sourceIds = mapIds.length > 0 ? mapIds : productIds;
  if (sourceIds.length === 0 || Object.keys(map).length === 0) return <span className="staff-name">{"{}"}</span>;
  const entries = sourceIds
    .map((id) => {
      const value = map[String(id)];
      if (!value) return null as null | { id: number; productName: string; tone: ReturnType<typeof getRepairingStatusTone> };
      const productName = products.find((product) => product.id === id)?.product_name || `Product #${id}`;
      return { id, productName, tone: getRepairingStatusTone(value) };
    })
    .filter(Boolean) as Array<{ id: number; productName: string; tone: ReturnType<typeof getRepairingStatusTone> }>;
  if (entries.length === 0) return <span className="staff-name">{"{}"}</span>;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {entries.map((entry, index) => (
        <div key={`repairing-${entry.id}-${index}`} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span className="staff-name">{entry.productName}:</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 999,
              border: `1px solid ${entry.tone.border}`,
              backgroundColor: entry.tone.bg,
              color: entry.tone.color,
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.4,
            }}
          >
            {entry.tone.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const getCompanyNames = (order: Order): string[] => {
  const companyIds = mergeIds(order.company_ids, order.company_id);
  const fromArray = normalizeNames(order.company_names);
  const fromText = normalizeNames((order as Order & { company_names_text?: string }).company_names_text || order.company_name);
  const names = fromArray.length > 0 ? fromArray : fromText;
  return names.length > 0 ? names : companyIds.map((id) => `Company #${id}`);
};

const getCompanyProductLines = (order: Order, products: Product[]): string[] => {
  const companyProductMap = normalizeCompanyProductMap(order.company_product_map || order.companies_products);
  const companyIds = Array.from(
    new Set([
      ...mergeIds(order.company_ids, order.company_id),
      ...Object.keys(companyProductMap).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
    ]),
  );
  const companyNames = getCompanyNames(order);

  return companyIds.map((companyId, index) => {
    const companyLabel = companyNames[index] || `Company #${companyId}`;
    const productNames = (companyProductMap[companyId.toString()] || [])
      .map((productId) => products.find((product) => product.id === productId)?.product_name || `Product #${productId}`);
    const numberedProducts = productNames.length > 0
      ? productNames.map((name, productIndex) => `${productIndex + 1}. ${name}`).join(", ")
      : "No products";
    return `${companyLabel}: ${numberedProducts}`;
  });
};

const getPerProductIssueLines = (order: Order, products: Product[]): string[] => {
  const issueMap = normalizeIssueDescriptionMap((order as Order & { issue_description_map?: unknown }).issue_description_map);
  const productIds = mergeIds(order.product_ids, order.product_id);
  const productEntries = getOrderProductEntries(order, products);
  return productIds
    .map((productId, index) => {
      const text = String(issueMap[String(productId)] || "").trim();
      if (!text) return "";
      const label = productEntries[index]?.label || products.find((p) => p.id === productId)?.product_name || `Product #${productId}`;
      return `${label}: ${text}`;
    })
    .filter((line) => line.length > 0);
};

const renderOrderProductChips = (
  entries: ProductEntry[],
  emptyLabel: string,
  columnType: "product" | "replacement",
) => {
  if (!entries.length) {
    return <span className="product-empty">{emptyLabel}</span>;
  }

  const visibleEntries = entries.slice(0, MAX_VISIBLE_PRODUCT_CHIPS);
  const hiddenCount = entries.length - visibleEntries.length;

  return (
    <div
      className={`order-product-stack ${columnType === "replacement" ? "replacement" : "product"}`}
      title={entries.map((entry, index) => `${index + 1}. ${formatProductEntry(entry)}`).join(", ")}
    >
      <div className="order-product-chips">
        {visibleEntries.map((entry, index) => (
          <span key={`${entry.label}-${index}`} className="product-chip">
            <span className="product-chip-title">{index + 1}. {entry.label}</span>
            <small className="product-chip-serial">SN: {entry.serialNumber || "N/A"}</small>
          </span>
        ))}
        {hiddenCount > 0 && <span className="product-chip more">+{hiddenCount} more</span>}
      </div>
      <span className="order-product-count">
        {entries.length} item{entries.length > 1 ? "s" : ""}
      </span>
    </div>
  );
};

const OrdersTab = (props: OrdersTabProps) => {
  const {
    orders,
    filteredOrders,
    products = [],
    loading,
    searchTerm,
    dateRange,
    onSearchChange,
    onDateRangeChange,
    onPresetClick,
    onViewOrder,
    onEditOrder,
    onPrintReceipt,
    onDeleteOrder,
    onCreateOrder,
    onClearFilters,
    getStatusColor,
    getPriorityColor,
    getWarrantyColor,
    title = "Service Orders",
    emptyTitle = "No orders found",
    emptyDescription = "Try adjusting your filters or create a new order",
    createLabel = "Create New Order",
    exportFilePrefix = "service_orders_full_export",
  } = props;
  void getStatusColor;
  void getPriorityColor;

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  const searchableOrders = useMemo(() => {
    const search = String(searchTerm || "").trim().toLowerCase();
    if (!search) return filteredOrders;

    const matchesSearch = (order: Order) => {
      const productEntries = getOrderProductEntries(order, products);
      const replacementEntries = getOrderReplacementEntries(order, products);

      const serialBlob = [
        ...(Array.isArray(order.product_serial_numbers) ? order.product_serial_numbers : []),
        ...(Array.isArray(order.replacement_product_serial_numbers) ? order.replacement_product_serial_numbers : []),
        order.serial_number || "",
        order.replacement_serial_number || "",
        ...productEntries.map((entry) => entry.serialNumber || ""),
        ...replacementEntries.map((entry) => entry.serialNumber || ""),
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
        .join(" ");

      const basicBlob = [
        order.order_code,
        order.client_name,
        order.client_phone,
        order.issue_description,
        order.staff_name,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return basicBlob.includes(search) || serialBlob.includes(search);
    };

    const filteredMatches = filteredOrders.filter(matchesSearch);
    if (filteredMatches.length > 0) return filteredMatches;

    // Fallback: if parent-level filtering misses serial matches, search full orders here.
    return orders.filter(matchesSearch);
  }, [filteredOrders, orders, products, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(searchableOrders.length / ITEMS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = searchableOrders.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);
  const selectedOrders = searchableOrders.filter((order) => selectedOrderIds.includes(order.id));
  const bulkOrders = selectedOrders.length > 0 ? selectedOrders : searchableOrders;
  const allPageSelected =
    paginatedOrders.length > 0 && paginatedOrders.every((order) => selectedOrderIds.includes(order.id));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedOrderIds((prev) => prev.filter((id) => searchableOrders.some((order) => order.id === id)));
  }, [searchableOrders]);

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  };

  const togglePageSelection = () => {
    const pageIds = paginatedOrders.map((order) => order.id);
    if (allPageSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const selectAllFilteredOrders = () => {
    setSelectedOrderIds(searchableOrders.map((order) => order.id));
  };

  const clearSelection = () => {
    setSelectedOrderIds([]);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const exportOrdersToCSV = () => {
    const csvOrders = bulkOrders;
    if (csvOrders.length === 0) return;

    const parseStatusMap = (value: unknown): Record<string, string> => {
      if (!value) return {};
      let parsed: unknown = value;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return {};
        try {
          parsed = JSON.parse(trimmed);
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
        } catch {
          return {};
        }
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      const out: Record<string, string> = {};
      Object.entries(parsed as Record<string, unknown>).forEach(([k, v]) => {
        out[String(k)] = String(v ?? "");
      });
      return out;
    };

    const parseFlowDatesMap = (value: unknown): Record<string, Record<string, string>> => {
      if (!value) return {};
      let parsed: unknown = value;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return {};
        try {
          parsed = JSON.parse(trimmed);
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
        } catch {
          return {};
        }
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      const out: Record<string, Record<string, string>> = {};
      Object.entries(parsed as Record<string, unknown>).forEach(([productId, stages]) => {
        if (!stages || typeof stages !== "object" || Array.isArray(stages)) return;
        out[String(productId)] = {};
        Object.entries(stages as Record<string, unknown>).forEach(([stage, dt]) => {
          out[String(productId)][String(stage)] = String(dt ?? "");
        });
      });
      return out;
    };

    const header = [
      "order_id",
      "order_code",
      "status",
      "priority",
      "Client Information - client_id",
      "Client Information - client_name",
      "Client Information - client_phone",
      "Client Information - client_email",
      "Client Information - client_address",
      "Product Information - product_name_primary",
      "Product Information - product_name",
      "Product Information - product_names_all",
      "Product Information - product_names",
      "Product Information - replacement_product_name_primary",
      "Product Information - replacement_product_name",
      "Product Information - replacement_product_names_all",
      "Product Information - replacement_product_names",
      "Product Information - company_name_primary",
      "Product Information - company_names_all",
      "Product Information - company_names",
      "Product Information - company_product_map",
      "Product Information - companies_products",
      "Repairing Status - map",
      "Repairing Status - summary",
      "Product Flow Status Timeline - status_map",
      "Product Flow Status Timeline - dates_map",
      "Product Flow Status Timeline - timeline_text",
      "Service Details - service_type",
      "Service Details - issue_description",
      "Service Details - diagnosis_notes",
      "Service Details - repair_notes",
      "Service Details - notes",
      "Service Details - warranty_status",
      "Service Details - handover_type",
      "Service Details - handover_type_map",
      "Financial Information - estimated_cost",
      "Financial Information - final_cost",
      "Financial Information - deposit_amount",
      "Financial Information - balance_due",
      "Financial Information - payment_status",
      "Financial Information - payment_method",
      "Timeline & Dates - created_at",
      "Timeline & Dates - updated_at",
      "Timeline & Dates - estimated_delivery_date",
      "Timeline & Dates - actual_delivery_date",
      "Timeline & Dates - next_service_date",
      "raw_product_status_dates_map",
      "raw_repairing_status_map",
      "raw_product_status_map",
    ];

    const rows = csvOrders.map((order) => {
      const productEntries = getOrderProductEntries(order, products);
      const replacementEntries = getOrderReplacementEntries(order, products);
      const companyLines = getCompanyProductLines(order, products);
      const companyNames = getCompanyNames(order);
      const finalAmount = Number(order.final_cost || order.estimated_cost || 0);
      const deposit = Number(order.deposit_amount || 0);
      const balanceDue = Math.max(finalAmount - deposit, 0);

      const repairingMap = normalizeRepairingStatusMap((order as Order & { repairing_status_map?: unknown }).repairing_status_map);
      const repairingSummary = [
        `ready=${Object.values(repairingMap).filter((v) => v === "ready").length}`,
        `replacement=${Object.values(repairingMap).filter((v) => v === "replacement").length}`,
        `not_ready=${Object.values(repairingMap).filter((v) => v === "not ready").length}`,
      ].join(", ");

      const flowStatusMap = parseStatusMap((order as Order & { product_status_map?: unknown }).product_status_map);
      const flowDatesMap = parseFlowDatesMap((order as Order & { product_status_dates_map?: unknown }).product_status_dates_map);
      const productNameById = new Map<number, string>(
        products.map((p) => [p.id, p.product_name || `Product #${p.id}`]),
      );
      const productLabel = (id: string) => {
        const num = Number(id);
        return Number.isInteger(num) && num > 0 ? (productNameById.get(num) || `Product #${id}`) : `Product #${id}`;
      };
      const flowStatusByProductName = Object.fromEntries(
        Object.entries(flowStatusMap).map(([productId, status]) => [productLabel(productId), status]),
      );
      const flowDatesByProductName = Object.fromEntries(
        Object.entries(flowDatesMap).map(([productId, stages]) => [productLabel(productId), stages]),
      );
      const flowTimelineText = Object.entries(flowDatesMap)
        .map(([productId, stages]) => {
          const stagesText = Object.entries(stages).map(([stage, dt]) => `${stage}:${dt}`).join(" -> ");
          return `${productLabel(productId)}[${stagesText}]`;
        })
        .join(" | ");
      const repairingStatusByProductName = Object.fromEntries(
        Object.entries(repairingMap).map(([productId, status]) => [productLabel(productId), status]),
      );

      const allPrimaryProductNames = productEntries.map((entry) => entry.label);
      const allReplacementProductNames = replacementEntries.map((entry) => entry.label);
      const productInfoCompanyMapByName = Object.fromEntries(
        companyNames.map((company, index) => [
          company,
          ((companyLines[index] || "").split(":")[1] || "")
            .split("|")
            .map((v) => v.trim())
            .filter(Boolean),
        ]),
      );

      const rowValues = [
        order.id,
        order.order_code,
        order.status || "",
        order.priority || "",
        order.client_id,
        order.client_name || "",
        order.client_phone || "",
        order.client_email || "",
        order.client_address || "",
        allPrimaryProductNames[0] || order.product_name || "",
        order.product_name || allPrimaryProductNames[0] || "",
        JSON.stringify(allPrimaryProductNames),
        JSON.stringify(order.product_names || allPrimaryProductNames),
        allReplacementProductNames[0] || order.replacement_product_name || "",
        order.replacement_product_name || allReplacementProductNames[0] || "",
        JSON.stringify(allReplacementProductNames),
        JSON.stringify(order.replacement_product_names || allReplacementProductNames),
        companyNames[0] || "",
        JSON.stringify(companyNames),
        JSON.stringify(companyNames),
        JSON.stringify(productInfoCompanyMapByName),
        JSON.stringify(productInfoCompanyMapByName),
        JSON.stringify(repairingStatusByProductName),
        repairingSummary,
        JSON.stringify(flowStatusByProductName),
        JSON.stringify(flowDatesByProductName),
        flowTimelineText,
        order.service_type || "general",
        order.issue_description || "",
        order.diagnosis_notes || "",
        order.repair_notes || "",
        order.notes || "",
        order.warranty_status || "",
        (order as Order & { handover_type?: string }).handover_type || "",
        JSON.stringify((order as Order & { handover_type_map?: unknown }).handover_type_map || {}),
        formatCurrency(order.estimated_cost),
        formatCurrency(order.final_cost || order.estimated_cost),
        formatCurrency(order.deposit_amount),
        formatCurrency(balanceDue),
        order.payment_status || "",
        (order as Order & { payment_method?: string }).payment_method || "",
        order.created_at || "",
        (order as Order & { updated_at?: string }).updated_at || "",
        order.estimated_delivery_date || "",
        (order as Order & { actual_delivery_date?: string }).actual_delivery_date || "",
        (order as Order & { next_service_date?: string }).next_service_date || "",
        JSON.stringify(flowDatesByProductName),
        JSON.stringify(repairingStatusByProductName),
        JSON.stringify(flowStatusByProductName),
      ];

      return rowValues.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",");
    });

    downloadFile(
      `\uFEFF${header.join(",")}\n${rows.join("\n")}`,
      `${exportFilePrefix}_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const exportOrdersToPDF = () => {
    if (bulkOrders.length === 0) return;
    const totalValue = bulkOrders.reduce(
      (sum, order) => sum + Number(order.final_cost || order.estimated_cost || 0),
      0,
    );
    const closedOrders = bulkOrders.filter((order) =>
      ["completed", "ready", "delivered"].includes(order.status),
    ).length;
    const unpaidOrders = bulkOrders.filter(
      (order) => (order.payment_status || "").toLowerCase() !== "paid",
    ).length;

    exportStyledPdfReport({
      filename: `service_orders_${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Service Orders Report",
      subtitle: "Complete service order export including product/replacement lists, serials, workflow, notes, and payment details.",
      scopeLabel:
        selectedOrders.length > 0
          ? `${selectedOrders.length} selected orders`
          : `${searchableOrders.length} filtered orders`,
      accentColor: "#2563eb",
      orientation: "landscape",
      metrics: [
        { label: "Included", value: `${bulkOrders.length} orders` },
        { label: "Collection", value: `Rs. ${formatCurrency(totalValue)}` },
        { label: "Closed", value: `${closedOrders}` },
        { label: "Payment Pending", value: `${unpaidOrders}` },
      ],
      head: [[
        "Order",
        "Client",
        "Replacement Products",
        "Companies & Products",
        "Issue / Notes",
        "Priority / Warranty",
        "Timeline",
        "Payment",
      ]],
      body: bulkOrders.map((order) => {
        const replacementEntries = getOrderReplacementEntries(order, products);
        const companyLines = getCompanyProductLines(order, products);
        const perProductIssue = getPerProductIssueLines(order, products);
        const issueText = [order.issue_description, ...perProductIssue, order.diagnosis_notes, order.repair_notes, order.notes]
          .filter((value) => Boolean(String(value || "").trim()))
          .join("\n");
        const finalAmount = Number(order.final_cost || order.estimated_cost || 0);
        const deposit = Number(order.deposit_amount || 0);
        const balanceDue = Math.max(finalAmount - deposit, 0);

        return [
          `${order.order_code}\nCreated: ${formatDisplayDate(order.created_at)}`,
          `${order.client_name}\n${order.client_phone || "N/A"}\n${order.client_email || "N/A"}`,
          formatProductEntryList(replacementEntries, "No replacement"),
          companyLines.length > 0 ? companyLines.join("\n") : getCompanyNames(order).join("\n"),
          issueText || "N/A",
          `Priority: ${order.priority}\nWarranty: ${order.warranty_status || "N/A"}`,
          `Est: ${formatDisplayDate(order.estimated_delivery_date)}\nAct: ${formatDisplayDate(order.actual_delivery_date || "")}`,
          `Estimated: Rs. ${formatCurrency(order.estimated_cost)}\nFinal: Rs. ${formatCurrency(order.final_cost || order.estimated_cost)}\nDeposit: Rs. ${formatCurrency(order.deposit_amount)}\nBalance: Rs. ${formatCurrency(balanceDue)}\nPayment: ${order.payment_status}`,
        ];
      }),
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 36 },
        2: { cellWidth: 34 },
        3: { cellWidth: 44 },
        4: { cellWidth: 38 },
        5: { cellWidth: 30 },
        6: { cellWidth: 30 },
        7: { cellWidth: 42 },
      },
    });
  };

  const printOrders = () => {
    if (bulkOrders.length === 0) return;
    const printScopeOrders = bulkOrders;

    const printWindow = window.open("", "_blank", "width=1400,height=960");
    if (!printWindow) return;

    const rows = printScopeOrders
      .map((order) => {
        const productEntries = getOrderProductEntries(order, products);
        const companyLines = getCompanyProductLines(order, products);
        const companySummary = companyLines.length > 0 ? companyLines.join("\n") : getCompanyNames(order).join("\n");
        const companyHtml = companySummary
          ? companySummary
              .split("\n")
              .filter((line) => line.trim().length > 0)
              .map((line) => `<div class="print-company-line">${escapeHtml(line)}</div>`)
              .join("")
          : `<div class="print-muted">No companies</div>`;
        const perProductIssue = getPerProductIssueLines(order, products);
        const issueMainText = [order.issue_description, ...perProductIssue]
          .filter((value) => Boolean(String(value || "").trim()))
          .join("\n");
        const issueHtml = issueMainText
          ? `<div class="print-issue-main">${escapeHtml(issueMainText).replace(/\n/g, "<br />")}</div>`
          : `<div class="print-muted">N/A</div>`;
        const notesHtml = order.notes
          ? `<div class="print-issue-note"><strong>Note:</strong> ${escapeHtml(order.notes)}</div>`
          : "";
        const serialSummary = productEntries
          .map((entry) => entry.serialNumber)
          .filter((serial) => serial && serial.trim().length > 0)
          .join(", ");

        return `
          <tr>
            <td>${escapeHtml(order.order_code)}<br /><small>${escapeHtml(formatDisplayDate(order.created_at))}</small></td>
            <td>${escapeHtml(order.client_name)}<br /><small>${escapeHtml(order.client_phone)}</small><br /><small>${escapeHtml(order.client_email || "N/A")}</small></td>
            <td>${escapeHtml(String(getRepairingStatusSummary(order, products) || "N/A"))}</td>
            <td>${companyHtml}</td>
            <td>${issueHtml}${notesHtml}</td>
            <td>${escapeHtml(serialSummary || "N/A")}</td>
          </tr>`;
      })
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(title)} Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            .header { margin-bottom: 20px; }
            .header h1 { margin: 0 0 6px; color: #1d4ed8; }
            .header p { margin: 0; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; vertical-align: top; word-break: break-word; }
            th { background: #eff6ff; color: #1e3a8a; }
            tr:nth-child(even) { background: #f8fafc; }
            small { color: #64748b; }
            .print-company-line { margin: 0 0 4px 0; line-height: 1.45; }
            .print-company-line:last-child { margin-bottom: 0; }
            .print-issue-main { line-height: 1.55; margin-bottom: 6px; }
            .print-issue-note { color: #334155; line-height: 1.5; }
            .print-muted { color: #64748b; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Raj Communication ${escapeHtml(title)}</h1>
            <p>${escapeHtml(
              selectedOrders.length > 0
                ? `${selectedOrders.length} selected orders`
                : `${searchableOrders.length} filtered orders`,
            )}</p>
            <p>Printed on ${escapeHtml(new Date().toLocaleString("en-IN"))}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Client</th>
                <th>Repairing Status</th>
                <th>Companies & Products</th>
                <th>Issue / Notes</th>
                <th>Serial Number</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };


  return (
    <div className="orders-section">
      <div className="section-header">
        <div className="section-title">
          <h2>{title}</h2>
          <p>
            Showing {searchableOrders.length} of {orders.length} orders
          </p>
          {dateRange.startDate && dateRange.endDate && (
            <p className="date-range-info">
              Date Range: {dateRange.startDate} to {dateRange.endDate}
            </p>
          )}
        </div>
        <div className="section-filters">
          <motion.button
            type="button"
            className="btn primary"
            onClick={onCreateOrder}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiPlus />
            <span>{createLabel}</span>
          </motion.button>
        </div>
      </div>

      <div className="section-filters-row orders-toolbar-row">
        <DateRangeSelector dateRange={dateRange} onDateRangeChange={onDateRangeChange} onPresetClick={onPresetClick} />
        <div className="search-filter">
          <FiSearch className="search-filter-icon" />
          <input
            type="text"
            placeholder="Search orders by client, product, order code..."
            className="search-filter-input"
            style={{ height: "48px", fontSize: "15px", paddingLeft: "44px" }}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button type="button" className="btn secondary orders-clear-btn" onClick={onClearFilters}>
          <FiX />
          <span>Clear Filters</span>
        </button>
      </div>

      <BulkActionPanel
        itemLabelSingular="order"
        itemLabelPlural="orders"
        selectedCount={selectedOrders.length}
        filteredCount={searchableOrders.length}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        helperText="Export and print use selected rows first. If nothing is selected, all filtered orders are used."
        receiptHint="Use the receipt button in any order row to preview and download the receipt PDF."
        onSelectAll={selectAllFilteredOrders}
        onClearSelection={clearSelection}
        onExportCSV={exportOrdersToCSV}
        onExportPDF={exportOrdersToPDF}
        onPrint={printOrders}
        disableSelectAll={searchableOrders.length === 0}
        disableClearSelection={selectedOrderIds.length === 0}
        disableActions={bulkOrders.length === 0}
      />

      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading orders...</p>
          </div>
        ) : searchableOrders.length > 0 ? (
          <table className="orders-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="row-checkbox"
                    checked={allPageSelected}
                    onChange={togglePageSelection}
                    aria-label="Select all orders on this page"
                  />
                </th>
                <th>Order ID</th>
                <th>Product</th>
                <th>Replacement</th>
                <th>Client</th>
                <th>Companies</th>
                <th>Warranty</th>
                <th>Payment Status</th>
                <th>Repairing Status</th>
                <th>Pending Days</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order, index) => {
                const isSelected = selectedOrderIds.includes(order.id);
                const productEntries = getOrderProductEntries(order, products);
                const replacementEntries = getOrderReplacementEntries(order, products);
                const companyNames = getCompanyNames(order);
                const companyProductLines = getCompanyProductLines(order, products);
                const pendingDays = getPendingDays(order);
                const deliveredByProducts = isAllProductsDelivered(order);

                return (
                  <motion.tr
                    key={order.id}
                    className={isSelected ? "selected-row" : ""}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    whileHover={{ backgroundColor: "#f8fafc", cursor: "pointer" }}
                    onClick={() => onViewOrder(order)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={isSelected}
                        onChange={() => toggleOrderSelection(order.id)}
                        aria-label={`Select ${order.order_code}`}
                      />
                    </td>
                    <td>
                      <div className="order-id-cell">
                        <span className="order-id">{order.order_code}</span>
                        <span className="order-date">{formatDisplayDate(order.created_at)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="product-cell order-products-cell">
                        <div className="order-products-meta">
                          <FiPackage className="product-icon" />
                          <span className="order-products-label">Products</span>
                        </div>
                        {renderOrderProductChips(productEntries, "Not added", "product")}
                      </div>
                    </td>
                    <td>
                      <div className="product-cell order-products-cell">
                        <div className="order-products-meta">
                          <FiPackage className="product-icon" />
                          <span className="order-products-label">Replacement</span>
                        </div>
                        {renderOrderProductChips(replacementEntries, "No replacement", "replacement")}
                      </div>
                    </td>
                    <td>
                      <div className="client-cell">
                        <div className="client-avatar-placeholder">{order.client_name?.charAt(0) || "C"}</div>
                        <div className="client-info">
                          <span className="client-name">{order.client_name}</span>
                          <span className="client-phone">{order.client_phone}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="staff-name"
                        title={companyProductLines.length > 0 ? companyProductLines.join(" | ") : companyNames.join(", ")}
                      >
                        {companyNames.length > 0 ? companyNames.join(", ") : "No company"}
                      </span>
                    </td>
                    <td>
                      <span
                        className="warranty-badge"
                        style={{
                          backgroundColor: `${getWarrantyColor(order.warranty_status)}20`,
                          color: getWarrantyColor(order.warranty_status),
                        }}
                      >
                        {order.warranty_status?.replace("_", " ") || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-status ${order.payment_status}`}>{formatPaymentStatusLabel(order.payment_status)}</span>
                    </td>
                    <td>
                      {getRepairingStatusSummary(order, products)}
                    </td>
                    <td>
                      <span className="staff-name">
                        {deliveredByProducts ? "Delivered" : pendingDays}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <motion.button
                          className="action-btn view"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewOrder(order);
                          }}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          title="View Details"
                        >
                          <FiEye />
                        </motion.button>
                        <motion.button
                          className="action-btn edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditOrder(order);
                          }}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          title="Edit Order"
                        >
                          <FiEdit />
                        </motion.button>
                        <motion.button
                          className="action-btn print"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrintReceipt(order);
                          }}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          title="Receipt Options"
                        >
                          <FiPrinter />
                        </motion.button>
                        <motion.button
                          className="action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteOrder(order);
                          }}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          title="Delete Order"
                        >
                          <FiTrash2 />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <FiPackage className="empty-icon" />
            <h3>{emptyTitle}</h3>
            <p>{emptyDescription}</p>
            <motion.button className="btn primary" onClick={onCreateOrder} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <FiPlus />
              {createLabel}
            </motion.button>
          </div>
        )}
      </div>

      {searchableOrders.length > 0 && (
        <div className="orders-pagination">
          <div className="orders-pagination-info">
            Showing {pageStartIndex + 1} to {Math.min(pageStartIndex + ITEMS_PER_PAGE, searchableOrders.length)} of{" "}
            {searchableOrders.length} orders
          </div>
          <div className="orders-pagination-controls">
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <FiChevronLeft />
              <span>Previous</span>
            </button>
            <span className="pagination-page-chip">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              <span>Next</span>
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;

