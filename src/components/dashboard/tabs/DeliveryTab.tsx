import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiPrinter,
  FiSave,
  FiSearch,
  FiTruck,
  FiUser,
  FiX,
} from "react-icons/fi";
import BulkActionPanel from "../BulkActionPanel";
import DateRangeSelector from "../DateRangeSelector";
import DeliveryDetailModal from "../modals/DeliveryDetailModal";
import { exportStyledPdfReport } from "../pdfExport";
import type { DateRange, Delivery } from "../types";
import { formatDisplayDateTime } from "../utils";
import { buildApiUrl } from "../../../config/runtime";

interface DeliveryTabProps {
  orders?: DeliveryOrderMeta[];
  filteredDeliveries: Delivery[];
  loading: boolean;
  searchTerm: string;
  companyFilterValue?: string;
  companyFilterOptions?: string[];
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onCompanyFilterChange?: (value: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onPresetClick: (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear") => void;
  onPrintDeliveryReceipt: (delivery: Delivery) => void;
  onDeleteDelivery?: (id: number) => void | Promise<void>;
  onViewOrders: () => void;
  onClearFilters: () => void;
  enableLiveFetch?: boolean;
}

type EditDeliveryProductTypeRow = {
  id: number;
  name: string;
  serial: string;
  delivery_type: "inhand" | "courier" | "parcelservice";
};

const ITEMS_PER_PAGE = 20;
const DELIVERY_API_URL = buildApiUrl("deliveries.php");
const ORDERS_API_URL = buildApiUrl("Order.php");
const COMPANY_API_URL = buildApiUrl("companys.php");
const PRODUCT_API_URL = buildApiUrl("Product.php");

interface DeliveryOrderMeta {
  id: number;
  order_code?: string;
  product_name?: string;
  product_names?: string[] | string;
  product_models?: string[] | string;
  product_serial_numbers?: string[] | string;
  product_model?: string;
  product_brand?: string;
  product_ids?: number[] | string[] | string;
  product_status_map?: Record<string, string> | string;
  product_status_dates_map?: Record<string, { pending?: string | null; rajtocom?: string | null; comtoraj?: string | null; deliveryed?: string | null }> | string;
  handover_type_map?: Record<string, string> | string;
  replacement_product_name?: string;
  replacement_product_names?: string[] | string;
  replacement_product_models?: string[] | string;
  replacement_product_serial_numbers?: string[] | string;
  client_name?: string;
  client_phone?: string;
  client_address?: string;
  company_id?: number | null;
  company_ids?: number[] | string[] | string;
  company_name?: string;
  company_names?: string[] | string;
  company_product_map?: Record<string, number[] | string[] | string> | string;
  warranty_status?: string;
  priority?: string;
  estimated_cost?: string | number;
  final_cost?: string | number;
  amount?: string | number;
  created_at?: string;
}

interface ProductLookupDetail {
  id: number;
  product_name?: string;
  serial_number?: string;
  model?: string;
}
type SplitDeliveryRow = Delivery & { __rowKey: string; product_ids?: number[] | string[] | string };

const buildOrderMetaMap = (orders: DeliveryOrderMeta[]): Record<number, DeliveryOrderMeta> => {
  const map: Record<number, DeliveryOrderMeta> = {};
  orders.forEach((order) => {
    if (!order?.id) return;
    map[Number(order.id)] = {
      id: Number(order.id),
      order_code: (order as any).order_code,
      product_name: order.product_name,
      product_names: order.product_names,
      product_models: (order as any).product_models,
      product_serial_numbers: (order as any).product_serial_numbers,
      replacement_product_name: order.replacement_product_name,
      replacement_product_names: order.replacement_product_names,
      replacement_product_models: (order as any).replacement_product_models,
      replacement_product_serial_numbers: (order as any).replacement_product_serial_numbers,
      client_name: order.client_name,
      client_phone: (order as any).client_phone,
      client_address: (order as any).client_address,
      company_id: (order as any).company_id,
      company_ids: (order as any).company_ids,
      company_name: order.company_name,
      company_names: order.company_names,
      product_model: (order as any).product_model,
      product_brand: (order as any).product_brand,
      company_product_map: order.company_product_map,
      product_ids: order.product_ids,
      product_status_map: order.product_status_map,
      product_status_dates_map: (order as any).product_status_dates_map,
      handover_type_map: order.handover_type_map,
      warranty_status: order.warranty_status,
      priority: order.priority,
      estimated_cost: (order as any).estimated_cost,
      final_cost: (order as any).final_cost,
      amount: (order as any).final_cost || (order as any).estimated_cost || 0,
      created_at: (order as any).created_at,
    };
  });
  return map;
};

const hasUsableOrderMeta = (orderMeta: DeliveryOrderMeta | undefined) => {
  if (!orderMeta) return false;

  const names = toList(orderMeta.product_names).length > 0 ? toList(orderMeta.product_names) : toList(orderMeta.product_name);
  const ids = parseIds(orderMeta.product_ids);
  const models = toList(orderMeta.product_models);
  const serials = toList(orderMeta.product_serial_numbers);
  const expectedCount = Math.max(names.length, ids.length);

  if (expectedCount === 0) return false;
  if (names.length === 0) return false;

  const hasModelsForAll = models.length >= expectedCount;
  const hasSerialsForAll = serials.length >= expectedCount;

  return hasModelsForAll && hasSerialsForAll;
};

const needsOrderMetaProductHydration = (orderMeta: DeliveryOrderMeta | undefined) => {
  if (!orderMeta) return false;

  const ids = parseIds(orderMeta.product_ids);
  if (ids.length === 0) return false;

  const names = toList(orderMeta.product_names).length > 0 ? toList(orderMeta.product_names) : toList(orderMeta.product_name);
  const models = toList(orderMeta.product_models);
  const serials = toList(orderMeta.product_serial_numbers);
  const expectedCount = ids.length;

  return names.length < expectedCount || models.length < expectedCount || serials.length < expectedCount;
};

const mergeOrderMetaWithProductDetails = (
  orderMeta: DeliveryOrderMeta | undefined,
  productDetailsById: Record<number, ProductLookupDetail>,
): DeliveryOrderMeta | undefined => {
  if (!orderMeta) return orderMeta;

  const ids = parseIds(orderMeta.product_ids);
  if (ids.length === 0) return orderMeta;

  const existingNames = toList(orderMeta.product_names).length > 0 ? toList(orderMeta.product_names) : toList(orderMeta.product_name);
  const existingModels = toList(orderMeta.product_models);
  const existingSerials = toList(orderMeta.product_serial_numbers);

  const productNames = ids.map((id, index) => {
    const existing = String(existingNames[index] || "").trim();
    if (existing) return existing;
    return String(productDetailsById[id]?.product_name || "").trim() || `Product #${id}`;
  });

  const productModels = ids.map((id, index) => {
    const existing = String(existingModels[index] || "").trim();
    if (existing) return existing;
    return String(productDetailsById[id]?.model || "").trim();
  });

  const productSerials = ids.map((id, index) => {
    const existing = String(existingSerials[index] || "").trim();
    if (existing) return existing;
    return String(productDetailsById[id]?.serial_number || "").trim();
  });

  return {
    ...orderMeta,
    product_name: orderMeta.product_name || productNames[0] || "",
    product_names: productNames,
    product_models: productModels,
    product_serial_numbers: productSerials,
    product_model: String(orderMeta.product_model || "").trim() || productModels[0] || "",
  };
};

const isDeliveryCompleted = (delivery: Delivery) => {
  const normalizedStatus = String(delivery.status || "").toLowerCase();
  return (
    normalizedStatus === "delivered" ||
    normalizedStatus === "deliveryed" ||
    (delivery.delivered_date && delivery.delivered_date !== "0000-00-00 00:00:00")
  );
};

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry ?? "").trim()).filter(Boolean);
      }
    } catch {
      return trimmed
        .split("||")
        .flatMap((part) => part.split(","))
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [];
  }
  return [];
};

const parseIds = (value: unknown): number[] => {
  if (Array.isArray(value)) return value.map((entry) => Number(entry)).filter((id) => Number.isInteger(id) && id > 0);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((entry) => Number(entry)).filter((id) => Number.isInteger(id) && id > 0);
      if (typeof parsed === "string") return parseIds(parsed);
    } catch {
      const normalized = trimmed.replace(/^\[/, "").replace(/\]$/, "");
      return normalized.split(",").map((entry) => Number(entry.trim())).filter((id) => Number.isInteger(id) && id > 0);
    }
  }
  return [];
};

const normalizeDelivery = (item: any): Delivery => ({
  ...item,
  id: Number(item?.id) || 0,
  order_id: Number(item?.order_id) || 0,
});

const getDeliveryProductId = (delivery: Delivery): number => {
  const raw = (delivery as any)?.product_id;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
};

const normalizeDeliveryTypeValue = (value: unknown): "inhand" | "courier" | "parcelservice" => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "inhand" || normalized === "courier" || normalized === "parcelservice") return normalized;
  if (normalized === "pickup" || normalized === "in_hand") return "inhand";
  if (normalized === "delivery" || normalized === "parcel_service") return "parcelservice";
  return "inhand";
};

const DELIVERY_TYPE_OPTIONS: Array<{
  value: "inhand" | "courier" | "parcelservice";
  label: string;
  hint: string;
}> = [
  { value: "inhand", label: "In Hand", hint: "Direct handover to customer" },
  { value: "courier", label: "Courier", hint: "Third-party courier partner" },
  { value: "parcelservice", label: "Parcel Service", hint: "Local parcel transport" },
];

const getOrderProductNameById = (orderMeta: DeliveryOrderMeta | undefined, productId: number): string => {
  if (!orderMeta || productId <= 0) return "";
  const names = toList(orderMeta.product_names).length > 0 ? toList(orderMeta.product_names) : toList(orderMeta.product_name);
  const ids = parseIds(orderMeta.product_ids);
  if (ids.length === 0 || names.length === 0) return "";
  const index = ids.findIndex((id) => id === productId);
  if (index < 0) return "";
  return names[index] || "";
};

const parseCompanyProductMap = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && value ? (value as Record<string, unknown>) : {};
};

const getCompanyNameById = (orderMeta: DeliveryOrderMeta | undefined, companyId: number): string => {
  if (!orderMeta || companyId <= 0) return "";

  const companyIds = parseIds(orderMeta.company_ids);
  const companyNames = toList(orderMeta.company_names).length > 0 ? toList(orderMeta.company_names) : toList(orderMeta.company_name);
  const index = companyIds.findIndex((id) => id === companyId);

  if (index >= 0 && companyNames[index]) {
    return companyNames[index] || "";
  }

  if (companyNames.length === 1) {
    return companyNames[0] || "";
  }

  return "";
};

const getDeliveryCompanyNames = (orderMeta: DeliveryOrderMeta | undefined, delivery: Delivery): string[] => {
  const explicitCompanyNames = toList((delivery as any).delivered_company_names);
  if (explicitCompanyNames.length > 0) {
    return Array.from(new Set(explicitCompanyNames));
  }

  const explicitCompanyName = String((delivery as any).delivered_company_name || "").trim();
  if (explicitCompanyName) {
    return Array.from(
      new Set(
        explicitCompanyName
          .replaceAll("||", ",")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    );
  }

  if (!orderMeta) return [];

  const companies = toList(orderMeta.company_names).length > 0 ? toList(orderMeta.company_names) : toList(orderMeta.company_name);
  const deliveredProductIds = getPreferredDeliveryProductIds(delivery);
  const parsedCompanyMap = parseCompanyProductMap(orderMeta.company_product_map);

  if (deliveredProductIds.length > 0 && Object.keys(parsedCompanyMap).length > 0) {
    const matchedNames: string[] = [];
    Object.entries(parsedCompanyMap).forEach(([companyKey, mappedIds]) => {
      const companyId = Number(companyKey);
      const normalizedIds = parseIds(mappedIds);
      if (normalizedIds.some((id) => deliveredProductIds.includes(id))) {
        const matchedName = getCompanyNameById(orderMeta, companyId) || `Company #${companyKey}`;
        matchedNames.push(matchedName);
      }
    });

    if (matchedNames.length > 0) {
      return Array.from(new Set(matchedNames));
    }
  }

  return Array.from(new Set(companies.filter(Boolean)));
};

const getDeliveryCompanyName = (orderMeta: DeliveryOrderMeta | undefined, delivery: Delivery): string => {
  const names = getDeliveryCompanyNames(orderMeta, delivery);
  return names.length > 0 ? names.join(", ") : "N/A";
};

const getOrderProductSerialById = (orderMeta: DeliveryOrderMeta | undefined, productId: number): string => {
  if (!orderMeta || productId <= 0) return "";
  const serials = toList(orderMeta.product_serial_numbers);
  const ids = parseIds(orderMeta.product_ids);
  if (ids.length === 0 || serials.length === 0) return "";
  const index = ids.findIndex((id) => id === productId);
  if (index < 0) return "";
  return serials[index] || "";
};

const getOrderProductModelById = (orderMeta: DeliveryOrderMeta | undefined, productId: number): string => {
  if (!orderMeta || productId <= 0) return "";
  const models = toList(orderMeta.product_models);
  const ids = parseIds(orderMeta.product_ids);
  if (ids.length === 0 || models.length === 0) return "";
  const index = ids.findIndex((id) => id === productId);
  if (index < 0) return "";
  return models[index] || "";
};

const getOrderProductSerialByName = (orderMeta: DeliveryOrderMeta | undefined, productName: string): string => {
  if (!orderMeta) return "";
  const target = String(productName || "").trim().toLowerCase();
  if (!target) return "";
  const names = toList(orderMeta.product_names).length > 0 ? toList(orderMeta.product_names) : toList(orderMeta.product_name);
  const serials = toList(orderMeta.product_serial_numbers);
  if (names.length === 0 || serials.length === 0) return "";
  const index = names.findIndex((name) => String(name || "").trim().toLowerCase() === target);
  if (index < 0) return "";
  return serials[index] || "";
};

const getOrderProductModelByName = (orderMeta: DeliveryOrderMeta | undefined, productName: string): string => {
  if (!orderMeta) return "";
  const target = String(productName || "").trim().toLowerCase();
  if (!target) return "";
  const names = toList(orderMeta.product_names).length > 0 ? toList(orderMeta.product_names) : toList(orderMeta.product_name);
  const models = toList(orderMeta.product_models);
  if (names.length === 0 || models.length === 0) return "";
  const index = names.findIndex((name) => String(name || "").trim().toLowerCase() === target);
  if (index < 0) return "";
  return models[index] || "";
};

const getDeliveredProductEntryById = (orderMeta: DeliveryOrderMeta | undefined, productId: number) => {
  if (!orderMeta || productId <= 0) return null as null | { name: string; serial: string; model: string };
  const name = getOrderProductNameById(orderMeta, productId);
  const serial = getOrderProductSerialById(orderMeta, productId);
  const model = getOrderProductModelById(orderMeta, productId);
  if (!name && !serial && !model) return null;
  return { name: name || "N/A", serial: serial || "N/A", model: model || "N/A" };
};

const getNumberedNameSerialLines = (names: string[], serials: string[]) =>
  names.map((name, index) => `${index + 1}. ${name}\nSerial: ${serials[index] || ""}`).join("\n");

const toSerialListFromDelivery = (delivery: Delivery): string[] => {
  const directStoredSerials = toList((delivery as any).serial_numbers);
  if (directStoredSerials.length > 0) return directStoredSerials;
  const itemSerials = toList((delivery as any).delivery_item_serial_numbers);
  if (itemSerials.length > 0) return itemSerials;
  const directList = toList((delivery as any).product_serial_numbers);
  if (directList.length > 0) return directList;
  const one =
    String((delivery as any).serial_number || (delivery as any).delivery_serial_number || (delivery as any).product_serial_number || "").trim();
  return one ? [one] : [];
};

const getPreferredDeliveryProductIds = (delivery: Delivery): number[] => {
  const directProductIds = parseIds((delivery as any).product_ids);
  if (directProductIds.length > 0) return directProductIds;

  const itemProductIds = parseIds((delivery as any).delivery_item_product_ids);
  if (itemProductIds.length > 0) return itemProductIds;

  const primaryProductId = getDeliveryProductId(delivery);
  return primaryProductId > 0 ? [primaryProductId] : [];
};

const getStrictDeliveredProductIds = (delivery: Delivery): number[] => {
  const itemProductIds = parseIds((delivery as any).delivery_item_product_ids);
  if (itemProductIds.length > 0) return itemProductIds;

  const directProductIds = parseIds((delivery as any).product_ids);
  if (directProductIds.length > 0) return directProductIds;

  const primaryProductId = getDeliveryProductId(delivery);
  return primaryProductId > 0 ? [primaryProductId] : [];
};

const getExplicitDeliveredProductEntries = (
  orderMeta: DeliveryOrderMeta | undefined,
  delivery: Delivery,
): Array<{ id: number; name: string; serial: string; model: string }> => {
  const deliveredIds = getStrictDeliveredProductIds(delivery);
  const names = toList((delivery as any).delivered_product_names);
  const models =
    toList((delivery as any).delivery_item_models).length > 0
      ? toList((delivery as any).delivery_item_models)
      : toList((delivery as any).delivered_product_models);
  const serials = toList((delivery as any).delivered_product_serial_numbers);

  if (deliveredIds.length === 0 || names.length === 0) {
    return [];
  }

  return deliveredIds.map((id, index) => ({
    id,
    name: names[index] || getOrderProductNameById(orderMeta, id) || `Product #${id}`,
    model:
      models[index] ||
      getOrderProductModelById(orderMeta, id) ||
      (deliveredIds.length === 1 ? String((delivery as any).product_model || "").trim() : "") ||
      getOrderProductModelByName(orderMeta, names[index] || "") ||
      "N/A",
    serial:
      serials[index] ||
      (deliveredIds.length === 1
        ? String((delivery as any).product_serial_number || (delivery as any).serial_number || "").trim()
        : "") ||
      getOrderProductSerialById(orderMeta, id) ||
      getOrderProductSerialByName(orderMeta, names[index] || "") ||
      "",
  }));
};

const getOrderDetailProductEntries = (
  orderMeta: DeliveryOrderMeta | undefined,
  delivery: Delivery,
): Array<{ id: number; name: string; serial: string; model: string }> => {
  const orderIds = parseIds(orderMeta?.product_ids);
  const orderNames = toList(orderMeta?.product_names).length > 0 ? toList(orderMeta?.product_names) : toList(orderMeta?.product_name);
  const orderModels = toList(orderMeta?.product_models);
  const orderSerials = toList(orderMeta?.product_serial_numbers);

  if (orderIds.length > 0 || orderNames.length > 0 || orderModels.length > 0) {
    const maxLength = Math.max(orderIds.length, orderNames.length, orderModels.length, orderSerials.length);
    return Array.from({ length: maxLength }, (_, index) => {
      const id = orderIds[index] || 0;
      return {
        id,
        name: orderNames[index] || (id > 0 ? `Product #${id}` : "N/A"),
        model: orderModels[index] || (id > 0 ? getOrderProductModelById(orderMeta, id) : "") || "N/A",
        serial: orderSerials[index] || (id > 0 ? getOrderProductSerialById(orderMeta, id) : "") || "",
      };
    });
  }

  const fallbackName = String((delivery as any).product_name || "").trim();
  const fallbackSerials = toSerialListFromDelivery(delivery);
  const primaryProductId = getDeliveryProductId(delivery);

  if (fallbackName || fallbackSerials.length > 0) {
    return [
      {
        id: primaryProductId,
        name: fallbackName || (primaryProductId > 0 ? `Product #${primaryProductId}` : "N/A"),
        model: primaryProductId > 0 ? getOrderProductModelById(orderMeta, primaryProductId) || "N/A" : "N/A",
        serial: fallbackSerials[0] || "",
      },
    ];
  }

  return [];
};

const getDeliveredProductsEntries = (
  orderMeta: DeliveryOrderMeta | undefined,
  delivery: Delivery,
): Array<{ id: number; name: string; serial: string; model: string }> => {
  const explicitEntries = getExplicitDeliveredProductEntries(orderMeta, delivery);
  if (explicitEntries.length > 0) {
    return explicitEntries;
  }

  const deliveredIds = getStrictDeliveredProductIds(delivery);
  const fallbackSerials = toSerialListFromDelivery(delivery);

  if (deliveredIds.length === 0) {
    return [];
  }

  return deliveredIds.map((id, index) => ({
    id,
    name:
      getOrderProductNameById(orderMeta, id) ||
      (deliveredIds.length === 1 ? String((delivery as any).product_name || "").trim() : "") ||
      `Product #${id}`,
    model:
      getOrderProductModelById(orderMeta, id) ||
      (deliveredIds.length === 1 ? String((delivery as any).product_model || "").trim() : "") ||
      "N/A",
    serial:
      fallbackSerials[index] ||
      (deliveredIds.length === 1
        ? String((delivery as any).product_serial_number || (delivery as any).serial_number || "").trim()
        : "") ||
      getOrderProductSerialById(orderMeta, id) ||
      "",
  }));
};

const mergeProductEntries = (
  primaryEntries: Array<{ id: number; name: string; serial: string; model: string }>,
  fallbackEntries: Array<{ id: number; name: string; serial: string; model: string }>,
) =>
  primaryEntries.map((entry, index) => {
    const fallbackEntry =
      fallbackEntries.find((candidate) => candidate.id > 0 && candidate.id === entry.id) || fallbackEntries[index];

    return {
      ...entry,
      name: entry.name || fallbackEntry?.name || "N/A",
      model:
        entry.model && entry.model !== "N/A"
          ? entry.model
          : fallbackEntry?.model || "N/A",
      serial: entry.serial || fallbackEntry?.serial || "",
    };
  });

const hydrateEntriesFromOrderMeta = (
  orderMeta: DeliveryOrderMeta | undefined,
  entries: Array<{ id: number; name: string; serial: string; model: string }>,
  fallbackEntries: Array<{ id: number; name: string; serial: string; model: string }> = [],
) =>
  entries.map((entry, index) => {
    const fallbackEntry =
      fallbackEntries.find((candidate) => candidate.id > 0 && candidate.id === entry.id) || fallbackEntries[index];
    const resolvedName = entry.name || fallbackEntry?.name || (entry.id > 0 ? getOrderProductNameById(orderMeta, entry.id) : "") || "N/A";
    const resolvedModel =
      (entry.model && entry.model !== "N/A" ? entry.model : "") ||
      (fallbackEntry?.model && fallbackEntry.model !== "N/A" ? fallbackEntry.model : "") ||
      (entry.id > 0 ? getOrderProductModelById(orderMeta, entry.id) : "") ||
      getOrderProductModelByName(orderMeta, resolvedName) ||
      "N/A";
    const resolvedSerial =
      entry.serial ||
      fallbackEntry?.serial ||
      (entry.id > 0 ? getOrderProductSerialById(orderMeta, entry.id) : "") ||
      getOrderProductSerialByName(orderMeta, resolvedName) ||
      "";

    return {
      ...entry,
      name: resolvedName,
      model: resolvedModel,
      serial: resolvedSerial,
    };
  });

const getDeliveredCompanyNameForProduct = (
  orderMeta: DeliveryOrderMeta | undefined,
  delivery: Delivery,
  productId: number,
): string => {
  if (productId <= 0) return "";

  const parsedCompanyMap = parseCompanyProductMap(orderMeta?.company_product_map);
  for (const [companyKey, mappedIds] of Object.entries(parsedCompanyMap)) {
    const normalizedIds = parseIds(mappedIds);
    if (normalizedIds.includes(productId)) {
      return getCompanyNameById(orderMeta, Number(companyKey)) || `Company #${companyKey}`;
    }
  }

  const fallbackNames = getDeliveryCompanyNames(orderMeta, delivery);
  if (fallbackNames.length === 1) {
    return fallbackNames[0] || "";
  }

  return "";
};

const parseDeliveryTypeMap = (value: unknown): Record<string, "inhand" | "courier" | "parcelservice"> => {
  let raw = value;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, "inhand" | "courier" | "parcelservice"> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([productId, deliveryType]) => {
    result[String(productId)] = normalizeDeliveryTypeValue(deliveryType);
  });
  return result;
};

const formatDeliveredProductsDetails = (
  entries: Array<{ id: number; name: string; serial: string; model: string; company?: string }>,
  fallback: string,
) => {
  if (entries.length === 0) return fallback;
  return entries
    .map((entry, index) => {
      const parts = [`${index + 1}. ${entry.name || "N/A"}`];
      if (entry.company) {
        parts.push(`Company: ${entry.company}`);
      }
      if (entry.model && entry.model !== "N/A") {
        parts.push(`Model No: ${entry.model}`);
      }
      if (entry.serial) {
        parts.push(`Serial No: ${entry.serial}`);
      }
      return parts.join("\n");
    })
    .join("\n");
};

const formatProductDetailEntries = (
  entries: Array<{ id: number; name: string; serial: string; model: string }>,
  fallback: string,
) => {
  if (entries.length === 0) return fallback;
  return entries
    .map((entry, index) => {
      const parts = [`${index + 1}. ${entry.name || "N/A"}`];
      if (entry.model && entry.model !== "N/A") {
        parts.push(`Model No: ${entry.model}`);
      }
      if (entry.serial) {
        parts.push(`Serial No: ${entry.serial}`);
      }
      return parts.join("\n");
    })
    .join("\n");
};

const DeliveryTab = ({
  orders = [],
  filteredDeliveries,
  loading,
  searchTerm,
  companyFilterValue = "",
  companyFilterOptions,
  dateRange,
  onSearchChange,
  onCompanyFilterChange,
  onDateRangeChange,
  onPresetClick,
  onPrintDeliveryReceipt,
  onDeleteDelivery,
  onViewOrders,
  onClearFilters,
  enableLiveFetch = true,
}: DeliveryTabProps) => {
  const [liveDeliveries, setLiveDeliveries] = useState<Delivery[]>([]);
  const [orderMetaById, setOrderMetaById] = useState<Record<number, DeliveryOrderMeta>>({});
  const [masterCompanyOptions, setMasterCompanyOptions] = useState<string[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [loadingDetailData, setLoadingDetailData] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [editForm, setEditForm] = useState({
    delivery_type: "inhand",
    delivery_type_map: {} as Record<string, "inhand" | "courier" | "parcelservice">,
    address: "",
    contact_person: "",
    contact_phone: "",
    scheduled_date: "",
    scheduled_time: "",
    delivery_person: "",
    status: "scheduled",
    notes: "",
  });
  const [editProductTypeRows, setEditProductTypeRows] = useState<EditDeliveryProductTypeRow[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [editFeedback, setEditFeedback] = useState<string>("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!enableLiveFetch) return;
    let mounted = true;

    const loadLiveDeliveries = async () => {
      try {
        if (mounted) setLiveLoading(true);
        const token = localStorage.getItem("authToken") || localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(DELIVERY_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (mounted && data?.success && Array.isArray(data?.deliveries)) {
          setLiveDeliveries(data.deliveries.map(normalizeDelivery));
        }
      } catch {
        // Keep existing UI data if live refresh fails.
      } finally {
        if (mounted) setLiveLoading(false);
      }
    };

    loadLiveDeliveries();

    return () => {
      mounted = false;
    };
  }, [enableLiveFetch]);

  useEffect(() => {
    let mounted = true;
    if (orders.length > 0) {
      setOrderMetaById(buildOrderMetaMap(orders));
    }

    const loadOrderMeta = async () => {
      try {
        const token = localStorage.getItem("authToken") || localStorage.getItem("token");
        if (!token) return;
        const response = await fetch(ORDERS_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!mounted || !data?.success || !Array.isArray(data?.orders)) return;
        setOrderMetaById(buildOrderMetaMap(data.orders as DeliveryOrderMeta[]));
      } catch {
        // Keep UI functional even when order metadata cannot be loaded.
      }
    };

    loadOrderMeta();
    return () => {
      mounted = false;
    };
  }, [orders]);

  useEffect(() => {
    let mounted = true;

    const loadCompanyOptions = async () => {
      try {
        const token = localStorage.getItem("authToken") || localStorage.getItem("token");
        const response = await fetch(COMPANY_API_URL, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const payload = await response.json();
        if (!mounted || !response.ok) return;

        const rows = Array.isArray(payload?.companys) ? (payload.companys as Array<{ company_name?: unknown }>) : [];
        const names: string[] = rows
          .map((company: { company_name?: unknown }) => String(company?.company_name || "").trim())
          .filter(Boolean);

        setMasterCompanyOptions(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)));
      } catch {
        if (mounted) setMasterCompanyOptions([]);
      }
    };

    void loadCompanyOptions();

    return () => {
      mounted = false;
    };
  }, []);

  const fetchProductDetailsByIds = async (ids: number[]): Promise<Record<number, ProductLookupDetail>> => {
    const uniqueIds = Array.from(new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
    if (uniqueIds.length === 0) return {};

    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const responses = await Promise.all(
        uniqueIds.map(async (id) => {
          const response = await fetch(`${PRODUCT_API_URL}?id=${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          const data = await response.json();
          if (!response.ok || !data?.success || !data?.product) return null;
          return data.product as ProductLookupDetail;
        }),
      );

      return responses.reduce<Record<number, ProductLookupDetail>>((acc, product) => {
        const id = Number(product?.id);
        if (product && Number.isInteger(id) && id > 0) {
          acc[id] = product;
        }
        return acc;
      }, {});
    } catch {
      return {};
    }
  };

  const ensureOrderMetaProductDetails = async (orderMeta: DeliveryOrderMeta | undefined) => {
    if (!needsOrderMetaProductHydration(orderMeta)) {
      return orderMeta;
    }

    const hydrated = mergeOrderMetaWithProductDetails(
      orderMeta,
      await fetchProductDetailsByIds(parseIds(orderMeta?.product_ids)),
    );

    if (hydrated?.id) {
      setOrderMetaById((prev) => ({ ...prev, [hydrated.id]: hydrated }));
    }

    return hydrated;
  };

  const fetchOrderMetaForDelivery = async (orderId: number) => {
    const numericOrderId = Number(orderId);
    if (!Number.isInteger(numericOrderId) || numericOrderId <= 0) return undefined;

    const existing = await ensureOrderMetaProductDetails(orderMetaById[numericOrderId]);
    if (hasUsableOrderMeta(existing)) {
      return existing;
    }

    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (!token) return existing;

      const response = await fetch(`${ORDERS_API_URL}?id=${numericOrderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data?.order) {
        return existing;
      }

      const fetchedMeta = buildOrderMetaMap([data.order as DeliveryOrderMeta])[numericOrderId];
      if (fetchedMeta) {
        const hydratedMeta = await ensureOrderMetaProductDetails(fetchedMeta);
        setOrderMetaById((prev) => ({ ...prev, [numericOrderId]: hydratedMeta || fetchedMeta }));
        return hydratedMeta || fetchedMeta;
      }
    } catch {
      // Keep popup usable with available delivery data when order fetch fails.
    }

    return existing;
  };

  const sourceDeliveries =
    enableLiveFetch && liveDeliveries.length > 0
      ? liveDeliveries
      : filteredDeliveries;
  const splitDeliveries = useMemo<SplitDeliveryRow[]>(
    () =>
      sourceDeliveries.map((delivery) => {
        const orderMeta = orderMetaById[delivery.order_id];
        const itemProductNames = toList((delivery as any).delivery_item_product_names);
        const directProductIds = getPreferredDeliveryProductIds(delivery);
        const scopedProductEntries = getDeliveredProductsEntries(orderMeta, delivery);
        const scopedNames = scopedProductEntries.map((entry) => entry.name).filter(Boolean);
        const fallbackName = delivery.product_name && String(delivery.product_name).trim()
          ? String(delivery.product_name).trim()
          : "";
        const candidateNames =
          itemProductNames.length > 0
            ? itemProductNames
            : scopedNames.length > 0
              ? scopedNames
              : (fallbackName ? [fallbackName] : []);
        const candidateSerials = toSerialListFromDelivery(delivery);
        const primaryProductId = getDeliveryProductId(delivery);
        const scopedProductIds =
          directProductIds.length > 0
            ? directProductIds
            : primaryProductId > 0
              ? [primaryProductId]
              : [];

        return {
          ...delivery,
          product_name: candidateNames.join(", "),
          product_ids: scopedProductIds,
          product_serial_numbers: candidateSerials,
          delivery_type: normalizeDeliveryTypeValue(delivery.delivery_type),
          __rowKey: `delivery-${delivery.id}-${scopedProductIds.join("-") || "single"}`,
        };
      }),
    [orderMetaById, sourceDeliveries],
  );
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const normalizedSelectedCompanyName = String(companyFilterValue || "").trim();
  const availableCompanyFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...(companyFilterOptions || []),
            ...masterCompanyOptions,
            ...splitDeliveries.map((delivery) => getDeliveryCompanyName(orderMetaById[delivery.order_id], delivery)),
          ]
            .map((value) => String(value || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [companyFilterOptions, masterCompanyOptions, orderMetaById, splitDeliveries],
  );
  const filteredSourceDeliveries = useMemo(
    () =>
      splitDeliveries.filter((delivery) => {
        const orderMeta = orderMetaById[delivery.order_id];
        if (dateRange.startDate && delivery.scheduled_date && delivery.scheduled_date < dateRange.startDate) return false;
        if (dateRange.endDate && delivery.scheduled_date && delivery.scheduled_date > dateRange.endDate) return false;
        if (normalizedSelectedCompanyName) {
          const companyName = getDeliveryCompanyName(orderMeta, delivery).trim().toLowerCase();
          if (companyName !== normalizedSelectedCompanyName.toLowerCase()) return false;
        }
        if (!normalizedSearchTerm) return true;

        const haystack = [
          delivery.delivery_code,
          delivery.order_code,
          delivery.client_name,
          delivery.product_name,
          delivery.contact_person,
          delivery.contact_phone,
          delivery.delivery_type,
          orderMeta?.product_name,
          toList(orderMeta?.product_names).join(" "),
          orderMeta?.replacement_product_name,
          toList(orderMeta?.replacement_product_names).join(" "),
          orderMeta?.company_name,
          toList(orderMeta?.company_names).join(" "),
          orderMeta?.warranty_status,
          orderMeta?.priority,
        ]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");

        return haystack.includes(normalizedSearchTerm);
      }),
    [splitDeliveries, dateRange.startDate, dateRange.endDate, normalizedSearchTerm, normalizedSelectedCompanyName, orderMetaById],
  );

  const sortedDeliveries = useMemo(
    () =>
      [...filteredSourceDeliveries.filter((delivery) => isDeliveryCompleted(delivery))].sort((a, b) => {
        const aTime = new Date(a.delivered_date || (a as any).updated_at || a.created_at || a.scheduled_date).getTime();
        const bTime = new Date(b.delivered_date || (b as any).updated_at || b.created_at || b.scheduled_date).getTime();
        return bTime - aTime;
      }),
    [filteredSourceDeliveries],
  );

  const deliveredCount = sortedDeliveries.length;
  const uniqueClientsCount = useMemo(
    () =>
      new Set(
        sortedDeliveries
          .map((delivery) => String(orderMetaById[delivery.order_id]?.client_name || delivery.client_name || "").trim())
          .filter(Boolean),
      ).size,
    [orderMetaById, sortedDeliveries],
  );
  const deliveryTypeCounts = useMemo(
    () =>
      sortedDeliveries.reduce<Record<"inhand" | "courier" | "parcelservice", number>>(
        (acc, delivery) => {
          const type = normalizeDeliveryTypeValue(delivery.delivery_type);
          acc[type] += 1;
          return acc;
        },
        { inhand: 0, courier: 0, parcelservice: 0 },
      ),
    [sortedDeliveries],
  );
  const latestDeliveredLabel = useMemo(() => {
    if (sortedDeliveries.length === 0) return "No completed deliveries";
    const latest = sortedDeliveries[0];
    return latest.delivered_date_formatted || formatDisplayDateTime(latest.delivered_date || latest.scheduled_date || latest.created_at);
  }, [sortedDeliveries]);

  const totalPages = Math.max(1, Math.ceil(sortedDeliveries.length / ITEMS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDeliveries = sortedDeliveries.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);
  const selectedDeliveries = sortedDeliveries.filter((delivery) => selectedDeliveryIds.includes(delivery.__rowKey));
  const bulkDeliveries = selectedDeliveries.length > 0 ? selectedDeliveries : sortedDeliveries;
  const activeScopeCount = selectedDeliveries.length > 0 ? selectedDeliveries.length : sortedDeliveries.length;
  const deliveryHighlights = [
    {
      key: "delivered",
      icon: <FiCheckCircle />,
      label: "Completed Deliveries",
      value: deliveredCount,
      hint: "Successfully handed over or dispatched",
      tone: "violet",
    },
    {
      key: "clients",
      icon: <FiUser />,
      label: "Clients Covered",
      value: uniqueClientsCount,
      hint: "Unique customers in the current view",
      tone: "sky",
    },
    {
      key: "inhand",
      icon: <FiPackage />,
      label: "In Hand",
      value: deliveryTypeCounts.inhand,
      hint: "Direct customer handovers",
      tone: "emerald",
    },
    {
      key: "courier",
      icon: <FiTruck />,
      label: "Courier / Parcel",
      value: deliveryTypeCounts.courier + deliveryTypeCounts.parcelservice,
      hint: "Shipped through delivery partners",
      tone: "amber",
    },
  ];
  const allPageSelected =
    paginatedDeliveries.length > 0 && paginatedDeliveries.every((delivery) => selectedDeliveryIds.includes(delivery.__rowKey));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedDeliveryIds((prev) => prev.filter((id) => sortedDeliveries.some((delivery) => delivery.__rowKey === id)));
  }, [sortedDeliveries]);

  const toggleDeliverySelection = (rowKey: string) => {
    setSelectedDeliveryIds((prev) =>
      prev.includes(rowKey) ? prev.filter((id) => id !== rowKey) : [...prev, rowKey],
    );
  };

  const togglePageSelection = () => {
    const pageIds = paginatedDeliveries.map((delivery) => delivery.__rowKey);
    if (allPageSelected) {
      setSelectedDeliveryIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedDeliveryIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const selectAllFilteredDeliveries = () => {
    setSelectedDeliveryIds(sortedDeliveries.map((delivery) => delivery.__rowKey));
  };

  const clearSelection = () => {
    setSelectedDeliveryIds([]);
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

  const exportDeliveriesToCSV = () => {
    if (bulkDeliveries.length === 0) return;

    const header = ["Delivery Code", "Order Code", "Client", "Product", "Delivered Products", "Scheduled Date", "Status", "Delivered Date"];
    const rows = bulkDeliveries.map((delivery) => {
      const isDelivered = isDeliveryCompleted(delivery);
      const orderMeta = orderMetaById[delivery.order_id];
      const scopedProductEntries = getDeliveredProductsEntries(orderMeta, delivery);
      const deliveredProductsValue =
        formatDeliveredProductsDetails(scopedProductEntries, delivery.product_name || "N/A").replace(/\n/g, " | ");

      return [
        delivery.delivery_code || `DEL${String(delivery.id).padStart(3, "0")}`,
        delivery.order_code || `ORD${String(delivery.order_id).padStart(3, "0")}`,
        delivery.client_name || "N/A",
        delivery.product_name || "N/A",
        deliveredProductsValue,
        delivery.scheduled_date_formatted || formatDisplayDateTime(delivery.scheduled_date),
        isDelivered ? "Delivered" : delivery.status,
        isDelivered ? delivery.delivered_date_formatted || formatDisplayDateTime(delivery.delivered_date) : "Not Delivered",
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",");
    });

    downloadFile(
      `\uFEFF${header.join(",")}\n${rows.join("\n")}`,
      `deliveries_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const exportDeliveriesToPDF = () => {
    if (bulkDeliveries.length === 0) return;
    const deliveredItems = bulkDeliveries.filter(
      (delivery) => isDeliveryCompleted(delivery),
    ).length;
    const scheduledItems = bulkDeliveries.filter((delivery) => delivery.status === "scheduled").length;
    const uniqueClients = new Set(
      bulkDeliveries.map((delivery) => delivery.client_name).filter(Boolean),
    ).size;

    exportStyledPdfReport({
      filename: `deliveries_${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Delivery Report",
      subtitle: "Dispatch status, client details, scheduled dates, and handover tracking.",
      scopeLabel:
        selectedDeliveries.length > 0
          ? `${selectedDeliveries.length} selected deliveries`
          : `${sortedDeliveries.length} filtered deliveries`,
      accentColor: "#7c3aed",
      metrics: [
        { label: "Included", value: `${bulkDeliveries.length} deliveries` },
        { label: "Delivered", value: `${deliveredItems}` },
        { label: "Scheduled", value: `${scheduledItems}` },
        { label: "Clients", value: `${uniqueClients}` },
      ],
      head: [["Delivery", "Order", "Client", "Product", "Delivered Products", "Scheduled", "Delivered", "Status"]],
      body: bulkDeliveries.map((delivery) => {
        const isDelivered =
          isDeliveryCompleted(delivery);
        const orderMeta = orderMetaById[delivery.order_id];
        const scopedProductEntries = getDeliveredProductsEntries(orderMeta, delivery);
        const deliveredProductsValue =
          formatDeliveredProductsDetails(scopedProductEntries, delivery.product_name || "N/A").replace(/\n/g, ", ");

        return [
          delivery.delivery_code || `DEL${String(delivery.id).padStart(3, "0")}`,
          delivery.order_code || `ORD${String(delivery.order_id).padStart(3, "0")}`,
          delivery.client_name || "N/A",
          delivery.product_name || "N/A",
          deliveredProductsValue,
          delivery.scheduled_date_formatted || formatDisplayDateTime(delivery.scheduled_date),
          isDelivered
            ? delivery.delivered_date_formatted || formatDisplayDateTime(delivery.delivered_date)
            : "Pending",
          isDelivered ? "Delivered" : delivery.status,
        ];
      }),
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 24 },
        2: { cellWidth: 42 },
        3: { cellWidth: 54 },
        4: { cellWidth: 22 },
        5: { cellWidth: 28 },
        6: { cellWidth: 28 },
        7: { cellWidth: 22 },
      },
    });
  };

  const printDeliveries = () => {
    if (bulkDeliveries.length === 0) return;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    const rows = bulkDeliveries
      .map((delivery) => {
        const normalizedDelivered = isDeliveryCompleted(delivery);
        const orderMeta = orderMetaById[delivery.order_id];
        const scopedProductEntries = getDeliveredProductsEntries(orderMeta, delivery);
        const productValue =
          (scopedProductEntries.length > 0 ? scopedProductEntries.map((entry) => entry.name).join(", ") : "") ||
          (delivery.product_name && String(delivery.product_name).trim()) ||
          "N/A";
        const replacementValue =
          (toList(orderMeta?.replacement_product_names).length > 0
            ? toList(orderMeta?.replacement_product_names).join(", ")
            : orderMeta?.replacement_product_name) || "N/A";
        const companiesValue = getDeliveryCompanyName(orderMeta, delivery);
        const deliveredProductsValue =
          formatDeliveredProductsDetails(scopedProductEntries, productValue);
        return `
          <tr>
            <td>${escapeHtml(delivery.id)}</td>
            <td>${escapeHtml(delivery.delivery_code || `DEL${String(delivery.id).padStart(3, "0")}`)}</td>
            <td>${escapeHtml(delivery.order_code || `ORD${String(delivery.order_id).padStart(3, "0")}`)}</td>
            <td>${escapeHtml(orderMeta?.client_name || delivery.client_name || "N/A")}</td>
            <td>${escapeHtml(productValue)}</td>
            <td>${escapeHtml(replacementValue)}</td>
            <td style="white-space: pre-line;">${escapeHtml(companiesValue)}</td>
            <td style="white-space: pre-line;">${escapeHtml(deliveredProductsValue)}</td>
            <td>${escapeHtml(delivery.scheduled_date_formatted || formatDisplayDateTime(delivery.scheduled_date))}</td>
            <td>${escapeHtml(normalizedDelivered ? "Delivered" : delivery.status)}</td>
            <td>${escapeHtml(
              normalizedDelivered ? delivery.delivered_date_formatted || formatDisplayDateTime(delivery.delivered_date) : "Not Delivered",
            )}</td>
          </tr>`;
      })
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Deliveries Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; color: #1d4ed8; }
            p { margin: 0 0 16px; color: #475569; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; vertical-align: top; }
            th { background: #eff6ff; color: #1e3a8a; }
            tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Raj Communication Delivery Report</h1>
          <p>${escapeHtml(selectedDeliveries.length > 0 ? `${selectedDeliveries.length} selected deliveries` : `${sortedDeliveries.length} filtered deliveries`)}</p>
          <table>
            <thead>
              <tr><th>ID</th><th>Delivery</th><th>Order</th><th>Client</th><th>Product</th><th>Replacement</th><th>Companies</th><th>Delivered Products</th><th>Scheduled</th><th>Status</th><th>Delivered Date</th></tr>
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

  const openEditModal = async (delivery: Delivery) => {
    if (Number(delivery.id) <= 0) {
      setEditFeedback("This row was recovered from order status history. Save the order again to create a real delivery record.");
      return;
    }
    setEditingDelivery(delivery);
    setEditFeedback("");
    setEditErrors({});
    setLoadingEditData(true);
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(`${DELIVERY_API_URL}?id=${delivery.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      const source = data?.success && data?.delivery ? normalizeDelivery(data.delivery) : delivery;
      const orderMeta = orderMetaById[source.order_id];
      const deliveredEntries = getDeliveredProductsEntries(orderMeta, source);
      const deliveryTypeMap = parseDeliveryTypeMap((source as any).delivery_type_map);
      const defaultType = normalizeDeliveryTypeValue(source.delivery_type);
      setEditProductTypeRows(
        deliveredEntries.map((entry) => ({
          id: entry.id,
          name: entry.name,
          serial: entry.serial,
          delivery_type: deliveryTypeMap[String(entry.id)] || defaultType,
        })),
      );
      setEditForm({
        delivery_type: defaultType,
        delivery_type_map:
          deliveredEntries.length > 0
            ? Object.fromEntries(
                deliveredEntries.map((entry) => [String(entry.id), deliveryTypeMap[String(entry.id)] || defaultType]),
              )
            : {},
        address: source.address || "",
        contact_person: source.contact_person || "",
        contact_phone: source.contact_phone || "",
        scheduled_date: source.scheduled_date || "",
        scheduled_time: source.scheduled_time || "",
        delivery_person: source.delivery_person || "",
        status: source.status || "scheduled",
        notes: source.notes || "",
      });
      if (!(data?.success && data?.delivery)) {
        setEditFeedback("Loaded available values. Live DB details could not be fetched.");
      }
    } catch {
      setEditForm({
        delivery_type: normalizeDeliveryTypeValue(delivery.delivery_type),
        delivery_type_map: {},
        address: delivery.address || "",
        contact_person: delivery.contact_person || "",
        contact_phone: delivery.contact_phone || "",
        scheduled_date: delivery.scheduled_date || "",
        scheduled_time: delivery.scheduled_time || "",
        delivery_person: delivery.delivery_person || "",
        status: delivery.status || "scheduled",
        notes: delivery.notes || "",
      });
      setEditProductTypeRows([]);
      setEditFeedback("Loaded available values. Live DB details could not be fetched.");
    } finally {
      setLoadingEditData(false);
    }
  };

  const openDeliveryDetailModal = async (delivery: Delivery) => {
    setLoadingDetailData(true);
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(`${DELIVERY_API_URL}?id=${delivery.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      const apiDelivery =
        data?.delivery ||
        (Array.isArray(data?.deliveries)
          ? data.deliveries.find((entry: unknown) => Number((entry as { id?: number })?.id) === delivery.id)
          : null);
      if (response.ok && data?.success && apiDelivery) {
        const normalized = normalizeDelivery(apiDelivery) as Delivery & { product_serial_number?: string; product_id?: number };
        const orderMeta = (await fetchOrderMetaForDelivery(normalized.order_id)) || orderMetaById[normalized.order_id];
        const orderEntries = hydrateEntriesFromOrderMeta(
          orderMeta,
          getOrderDetailProductEntries(orderMeta, normalized),
        );
        const scopedEntries = hydrateEntriesFromOrderMeta(
          orderMeta,
          getDeliveredProductsEntries(orderMeta, normalized),
          orderEntries,
        );
        const productId = getDeliveryProductId(normalized);
        const deliveredEntry = getDeliveredProductEntryById(orderMeta, productId);
        const preferredName =
          delivery.product_name ||
          normalized.product_name ||
          (scopedEntries.length > 0 ? scopedEntries.map((entry) => entry.name).join(", ") : "") ||
          deliveredEntry?.name ||
          "";
        const serialByName = getOrderProductSerialByName(orderMeta, preferredName);
        setSelectedDelivery({
          ...normalized,
          order_product_ids: orderMeta?.product_ids,
          product_name: preferredName || deliveredEntry?.name || "N/A",
          delivery_item_product_ids: scopedEntries.map((entry) => String(entry.id)).filter((id) => Number(id) > 0),
          delivery_item_product_names: scopedEntries.map((entry) => entry.name),
          delivery_item_models: scopedEntries.map((entry) => entry.model),
          delivery_item_serial_numbers: scopedEntries.map((entry) => entry.serial),
          product_ids:
            scopedEntries.length > 0
              ? scopedEntries.map((entry) => entry.id).filter((id) => id > 0)
              : normalized.product_ids,
          product_serial_numbers:
            toList(orderMeta?.product_serial_numbers).length > 0
              ? toList(orderMeta?.product_serial_numbers)
              : toList((delivery as any).product_serial_numbers).length > 0
                ? toList((delivery as any).product_serial_numbers)
                : toSerialListFromDelivery(normalized),
          product_names:
            orderEntries.length > 0
              ? orderEntries.map((entry) => entry.name)
              : toList(orderMeta?.product_names).length > 0
                ? toList(orderMeta?.product_names)
                : toList(orderMeta?.product_name),
          product_models:
            orderEntries.length > 0
              ? orderEntries.map((entry) => entry.model)
              : toList(orderMeta?.product_models),
          replacement_product_names:
            toList(orderMeta?.replacement_product_names).length > 0
              ? toList(orderMeta?.replacement_product_names)
              : toList(orderMeta?.replacement_product_name),
          replacement_product_serial_numbers: (orderMeta as any)?.replacement_product_serial_numbers,
          delivered_product_names: scopedEntries.map((entry) => entry.name),
          delivered_product_models: scopedEntries.map((entry) => entry.model),
          delivered_product_serial_numbers: scopedEntries.map((entry) => entry.serial),
          product_serial_number:
            scopedEntries[0]?.serial ||
            deliveredEntry?.serial ||
            getOrderProductSerialById(orderMeta, productId) ||
            serialByName ||
            "",
          product_brand: normalized.product_brand || (orderMeta?.product_brand as any) || delivery.product_brand || "",
          product_model: scopedEntries[0]?.model || orderEntries[0]?.model || (orderMeta?.product_model as any) || "",
          estimated_cost: orderMeta?.estimated_cost,
          final_cost: orderMeta?.final_cost,
          amount: orderMeta?.final_cost || orderMeta?.estimated_cost || (normalized as any)?.amount || 0,
        } as Delivery);
      } else {
        const fallback = delivery as Delivery & { product_serial_number?: string; product_id?: number };
        const orderMeta = (await fetchOrderMetaForDelivery(fallback.order_id)) || orderMetaById[fallback.order_id];
        const orderEntries = hydrateEntriesFromOrderMeta(
          orderMeta,
          getOrderDetailProductEntries(orderMeta, fallback),
        );
        const scopedEntries = hydrateEntriesFromOrderMeta(
          orderMeta,
          getDeliveredProductsEntries(orderMeta, fallback),
          orderEntries,
        );
        const productId = getDeliveryProductId(fallback);
        const deliveredEntry = getDeliveredProductEntryById(orderMeta, productId);
        const preferredName =
          fallback.product_name ||
          (scopedEntries.length > 0 ? scopedEntries.map((entry) => entry.name).join(", ") : "") ||
          deliveredEntry?.name ||
          "";
        const serialByName = getOrderProductSerialByName(orderMeta, preferredName);
        setSelectedDelivery({
          ...fallback,
          order_product_ids: orderMeta?.product_ids,
          product_name: preferredName || "N/A",
          delivery_item_product_ids: scopedEntries.map((entry) => String(entry.id)).filter((id) => Number(id) > 0),
          delivery_item_product_names: scopedEntries.map((entry) => entry.name),
          delivery_item_models: scopedEntries.map((entry) => entry.model),
          delivery_item_serial_numbers: scopedEntries.map((entry) => entry.serial),
          product_ids:
            scopedEntries.length > 0
              ? scopedEntries.map((entry) => entry.id).filter((id) => id > 0)
              : fallback.product_ids,
          product_serial_numbers:
            toList(orderMeta?.product_serial_numbers).length > 0
              ? toList(orderMeta?.product_serial_numbers)
              : toList((fallback as any).product_serial_numbers).length > 0
                ? toList((fallback as any).product_serial_numbers)
                : toSerialListFromDelivery(fallback),
          product_names:
            orderEntries.length > 0
              ? orderEntries.map((entry) => entry.name)
              : toList(orderMeta?.product_names).length > 0
                ? toList(orderMeta?.product_names)
                : toList(orderMeta?.product_name),
          product_models:
            orderEntries.length > 0
              ? orderEntries.map((entry) => entry.model)
              : toList(orderMeta?.product_models),
          replacement_product_names:
            toList(orderMeta?.replacement_product_names).length > 0
              ? toList(orderMeta?.replacement_product_names)
              : toList(orderMeta?.replacement_product_name),
          replacement_product_serial_numbers: (orderMeta as any)?.replacement_product_serial_numbers,
          delivered_product_names: scopedEntries.map((entry) => entry.name),
          delivered_product_models: scopedEntries.map((entry) => entry.model),
          delivered_product_serial_numbers: scopedEntries.map((entry) => entry.serial),
          product_serial_number:
            scopedEntries[0]?.serial ||
            deliveredEntry?.serial ||
            getOrderProductSerialById(orderMeta, productId) ||
            serialByName ||
            "",
          product_brand: fallback.product_brand || (orderMeta?.product_brand as any) || "",
          product_model: scopedEntries[0]?.model || orderEntries[0]?.model || (orderMeta?.product_model as any) || "",
          estimated_cost: orderMeta?.estimated_cost,
          final_cost: orderMeta?.final_cost,
          amount: orderMeta?.final_cost || orderMeta?.estimated_cost || (fallback as any)?.amount || 0,
        } as Delivery);
      }
    } catch {
      const fallback = delivery as Delivery & { product_serial_number?: string; product_id?: number };
      const orderMeta = (await fetchOrderMetaForDelivery(fallback.order_id)) || orderMetaById[fallback.order_id];
      const orderEntries = hydrateEntriesFromOrderMeta(
        orderMeta,
        getOrderDetailProductEntries(orderMeta, fallback),
      );
      const scopedEntries = hydrateEntriesFromOrderMeta(
        orderMeta,
        getDeliveredProductsEntries(orderMeta, fallback),
        orderEntries,
      );
      const productId = getDeliveryProductId(fallback);
      const deliveredEntry = getDeliveredProductEntryById(orderMeta, productId);
      const preferredName =
        fallback.product_name ||
        (scopedEntries.length > 0 ? scopedEntries.map((entry) => entry.name).join(", ") : "") ||
        deliveredEntry?.name ||
        "";
      const serialByName = getOrderProductSerialByName(orderMeta, preferredName);
      setSelectedDelivery({
        ...fallback,
        order_product_ids: orderMeta?.product_ids,
        product_name: preferredName || "N/A",
        delivery_item_product_ids: scopedEntries.map((entry) => String(entry.id)).filter((id) => Number(id) > 0),
        delivery_item_product_names: scopedEntries.map((entry) => entry.name),
        delivery_item_models: scopedEntries.map((entry) => entry.model),
        delivery_item_serial_numbers: scopedEntries.map((entry) => entry.serial),
        product_ids:
          scopedEntries.length > 0
            ? scopedEntries.map((entry) => entry.id).filter((id) => id > 0)
            : fallback.product_ids,
        product_serial_numbers:
          toList(orderMeta?.product_serial_numbers).length > 0
            ? toList(orderMeta?.product_serial_numbers)
            : toList((fallback as any).product_serial_numbers).length > 0
              ? toList((fallback as any).product_serial_numbers)
              : toSerialListFromDelivery(fallback),
        product_names:
          orderEntries.length > 0
            ? orderEntries.map((entry) => entry.name)
            : toList(orderMeta?.product_names).length > 0
              ? toList(orderMeta?.product_names)
              : toList(orderMeta?.product_name),
        product_models:
          orderEntries.length > 0
            ? orderEntries.map((entry) => entry.model)
            : toList(orderMeta?.product_models),
        replacement_product_names:
          toList(orderMeta?.replacement_product_names).length > 0
            ? toList(orderMeta?.replacement_product_names)
            : toList(orderMeta?.replacement_product_name),
        replacement_product_serial_numbers: (orderMeta as any)?.replacement_product_serial_numbers,
        delivered_product_names: scopedEntries.map((entry) => entry.name),
        delivered_product_models: scopedEntries.map((entry) => entry.model),
        delivered_product_serial_numbers: scopedEntries.map((entry) => entry.serial),
        product_serial_number:
          scopedEntries[0]?.serial ||
          deliveredEntry?.serial ||
          getOrderProductSerialById(orderMeta, productId) ||
          serialByName ||
          "",
        product_brand: fallback.product_brand || (orderMeta?.product_brand as any) || "",
        product_model: scopedEntries[0]?.model || orderEntries[0]?.model || (orderMeta?.product_model as any) || "",
        estimated_cost: orderMeta?.estimated_cost,
        final_cost: orderMeta?.final_cost,
        amount: orderMeta?.final_cost || orderMeta?.estimated_cost || (fallback as any)?.amount || 0,
      } as Delivery);
    } finally {
      setLoadingDetailData(false);
    }
  };

  const validateEditForm = () => {
    const errors: Record<string, string> = {};
    if (!editForm.contact_person.trim()) errors.contact_person = "Contact person is required.";
    if (!editForm.contact_phone.trim()) errors.contact_phone = "Contact phone is required.";
    if (!editForm.scheduled_date) errors.scheduled_date = "Scheduled date is required.";
    if (!editForm.scheduled_time) errors.scheduled_time = "Scheduled time is required.";
    if (editForm.delivery_type !== "inhand" && !editForm.address.trim()) {
      errors.address = "Address is required for courier and parcel service.";
    }
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveDeliveryEdit = async () => {
    if (!editingDelivery) return;
    if (!validateEditForm()) return;
    try {
      setSavingEdit(true);
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (!token) return;

      const normalizedTypeMap =
        editProductTypeRows.length > 0
          ? Object.fromEntries(
              editProductTypeRows.map((row) => [String(row.id), normalizeDeliveryTypeValue(row.delivery_type)]),
            )
          : editForm.delivery_type_map;
      const primaryType =
        editProductTypeRows[0]?.delivery_type
          ? normalizeDeliveryTypeValue(editProductTypeRows[0].delivery_type)
          : normalizeDeliveryTypeValue(editForm.delivery_type);
      const payload = {
        ...editForm,
        delivery_type: primaryType,
        delivery_type_map: normalizedTypeMap,
        address: editForm.address.trim(),
        contact_person: editForm.contact_person.trim(),
        contact_phone: editForm.contact_phone.trim(),
        delivery_person: editForm.delivery_person.trim(),
        notes: editForm.notes.trim(),
      };

      const response = await fetch(`${DELIVERY_API_URL}?id=${editingDelivery.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data?.delivery) {
        throw new Error(data?.message || "Failed to update delivery");
      }

      const nextDelivery = normalizeDelivery(data.delivery);
      const nextOrderMeta = orderMetaById[nextDelivery.order_id];
      const savedDeliveredEntries =
        editProductTypeRows.length > 0
          ? editProductTypeRows.map((row) => ({
              id: row.id,
              name: row.name || getOrderProductNameById(nextOrderMeta, row.id) || `Product #${row.id}`,
              serial: row.serial || getOrderProductSerialById(nextOrderMeta, row.id) || "",
              model:
                getOrderProductModelById(nextOrderMeta, row.id) || "N/A",
            }))
          : getDeliveredProductsEntries(nextOrderMeta, nextDelivery);
      const savedDeliveryTypeMap =
        editProductTypeRows.length > 0
          ? Object.fromEntries(editProductTypeRows.map((row) => [String(row.id), normalizeDeliveryTypeValue(row.delivery_type)]))
          : normalizedTypeMap;
      setLiveDeliveries((prev) => prev.map((item) => (item.id === nextDelivery.id ? { ...item, ...nextDelivery } : item)));
      setSelectedDelivery((prev) =>
        prev && prev.id === nextDelivery.id
          ? {
              ...prev,
              ...nextDelivery,
              order_product_ids: nextOrderMeta?.product_ids,
              product_names:
                toList(nextOrderMeta?.product_names).length > 0 ? toList(nextOrderMeta?.product_names) : toList(nextOrderMeta?.product_name),
              product_serial_numbers:
                toList(nextOrderMeta?.product_serial_numbers).length > 0
                  ? toList(nextOrderMeta?.product_serial_numbers)
                  : prev.product_serial_numbers,
              delivery_item_product_ids: savedDeliveredEntries.map((entry) => String(entry.id)).filter((id) => Number(id) > 0),
              delivery_item_product_names: savedDeliveredEntries.map((entry) => entry.name),
              delivery_item_models: savedDeliveredEntries.map((entry) => entry.model),
              delivery_item_serial_numbers: savedDeliveredEntries.map((entry) => entry.serial),
              delivered_product_names: savedDeliveredEntries.map((entry) => entry.name),
              delivered_product_models: savedDeliveredEntries.map((entry) => entry.model),
              delivered_product_serial_numbers: savedDeliveredEntries.map((entry) => entry.serial),
              delivery_type_map: savedDeliveryTypeMap,
            }
          : prev,
      );
      setEditFeedback("Delivery updated successfully.");
      setTimeout(() => {
        setEditingDelivery(null);
        setEditFeedback("");
      }, 500);
    } catch (error) {
      setEditFeedback(error instanceof Error ? error.message : "Failed to update delivery");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="orders-section delivery-section delivery-section-ux">
      <div className="delivery-command-hero">
        <div className="delivery-command-copy">
          <span className="delivery-command-kicker">Delivery Tracking</span>
          <div className="delivery-command-title-row">
            <div>
              <h2>Completed handovers, organized for fast follow-up</h2>
              <p>
                Track delivered service orders, verify who received what, and export a clean delivery record
                without hunting through the full orders list.
              </p>
            </div>
            <motion.button
              type="button"
              className="btn primary delivery-primary-link"
              onClick={onViewOrders}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiPackage />
              <span>Go To Service Orders</span>
            </motion.button>
          </div>
          <div className="delivery-command-meta">
            <span className="delivery-command-meta-chip">
              <FiCheckCircle />
              {deliveredCount} delivered
            </span>
            <span className="delivery-command-meta-chip">
              <FiUser />
              {uniqueClientsCount} clients
            </span>
            <span className="delivery-command-meta-chip">
              <FiCalendar />
              Latest completed: {latestDeliveredLabel}
            </span>
            {dateRange.startDate && dateRange.endDate ? (
              <span className="delivery-command-meta-chip">
                <FiClock />
                {dateRange.startDate} to {dateRange.endDate}
              </span>
            ) : null}
          </div>
        </div>
        <div className="delivery-command-side">
          <div className="delivery-command-side-card">
            <span className="delivery-command-side-label">Current Scope</span>
            <strong>{activeScopeCount} ready for export</strong>
            <p>
              {selectedDeliveries.length > 0
                ? "Your selected deliveries will be used for print and export."
                : "No rows selected, so actions use the full filtered delivery list."}
            </p>
          </div>
          <div className="delivery-command-side-card delivery-command-side-card-soft">
            <span className="delivery-command-side-label">Delivery Mix</span>
            <div className="delivery-command-side-stats">
              <span>{deliveryTypeCounts.inhand} In Hand</span>
              <span>{deliveryTypeCounts.courier} Courier</span>
              <span>{deliveryTypeCounts.parcelservice} Parcel Service</span>
            </div>
          </div>
        </div>
      </div>

      <div className="delivery-insight-grid">
        {deliveryHighlights.map((item) => (
          <div key={item.key} className={`delivery-insight-card tone-${item.tone}`}>
            <div className="delivery-insight-icon">{item.icon}</div>
            <div className="delivery-insight-body">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.hint}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="delivery-filter-deck">
        <div className="delivery-filter-main">
          <DateRangeSelector dateRange={dateRange} onDateRangeChange={onDateRangeChange} onPresetClick={onPresetClick} />
          <select
            className="filter-select"
            style={{ minWidth: "220px", height: "48px" }}
            value={companyFilterValue}
            onChange={(e) => onCompanyFilterChange?.(e.target.value)}
            aria-label="Filter deliveries by company"
          >
            <option value="">All Companies</option>
            {availableCompanyFilterOptions.map((companyName) => (
              <option key={companyName} value={companyName}>
                {companyName}
              </option>
            ))}
          </select>
          <div className="search-filter delivery-search-filter">
            <FiSearch className="search-filter-icon" />
            <input
              type="text"
              placeholder="Search by client, order, product, serial, company..."
              className="search-filter-input"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        <div className="delivery-filter-actions">
          <button type="button" className="btn secondary orders-clear-btn" onClick={onClearFilters}>
            <FiX />
            <span>Reset Filters</span>
          </button>
          <div className="delivery-filter-note">
            <FiMapPin />
            <span>
              Showing {sortedDeliveries.length} completed records
              {companyFilterValue ? ` for ${companyFilterValue}` : ""}
              {" "}from {sourceDeliveries.length} loaded deliveries.
            </span>
          </div>
        </div>
      </div>

      <BulkActionPanel
        itemLabelSingular="delivery"
        itemLabelPlural="deliveries"
        selectedCount={selectedDeliveries.length}
        filteredCount={sortedDeliveries.length}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        helperText="Export and print use selected rows first. If nothing is selected, all filtered deliveries are used."
        receiptHint="Use the receipt button in any delivery row to preview and download the receipt PDF."
        onSelectAll={selectAllFilteredDeliveries}
        onClearSelection={clearSelection}
        onExportCSV={exportDeliveriesToCSV}
        onExportPDF={exportDeliveriesToPDF}
        onPrint={printDeliveries}
        disableSelectAll={sortedDeliveries.length === 0}
        disableClearSelection={selectedDeliveryIds.length === 0}
        disableActions={bulkDeliveries.length === 0}
      />

      <div className="table-container delivery-results-shell">
        <div className="delivery-results-header">
          <div>
            <span className="delivery-results-kicker">Delivery Ledger</span>
            <h3>Delivered service orders</h3>
            <p>Every row below is optimized for proof, export, and quick customer confirmation.</p>
          </div>
          <div className="delivery-results-badges">
            <span className="delivery-results-badge">
              <FiCheckCircle />
              Completed only
            </span>
            <span className="delivery-results-badge">
              <FiTruck />
              Sorted newest first
            </span>
          </div>
        </div>
        {loading || liveLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading deliveries...</p>
          </div>
        ) : sortedDeliveries.length > 0 ? (
          <>
          <div className="desktop-table-view delivery-table-view">
          <table className="orders-table delivery-orders-table">
            <thead>
              <tr>
                <th className="delivery-table-check-col">
                  <input
                    type="checkbox"
                    className="row-checkbox"
                    checked={allPageSelected}
                    onChange={togglePageSelection}
                    aria-label="Select all deliveries on this page"
                  />
                </th>
                <th className="delivery-table-client-col">Client</th>
                <th className="delivery-table-product-col">Product Detail</th>
                <th className="delivery-table-company-col">Company</th>
                <th className="delivery-table-delivered-products-col">Delivered Products</th>
                <th className="delivery-table-status-col">Status</th>
                <th className="delivery-table-date-col">Delivered Date</th>
                <th className="delivery-table-action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDeliveries.map((delivery, index) => {
                const isDelivered = isDeliveryCompleted(delivery);
                const isSelected = selectedDeliveryIds.includes(delivery.__rowKey);
                const orderMeta = orderMetaById[delivery.order_id];
                const orderProductEntries = getOrderDetailProductEntries(orderMeta, delivery);
                const scopedProductEntries = getDeliveredProductsEntries(orderMeta, delivery);
                const productValue =
                  (orderProductEntries.length > 0 ? orderProductEntries.map((entry) => entry.name).join(", ") : "") ||
                  (delivery.product_name && String(delivery.product_name).trim()) ||
                  "N/A";
                const replacementValue =
                  (toList(orderMeta?.replacement_product_names).length > 0
                    ? toList(orderMeta?.replacement_product_names).join(", ")
                    : orderMeta?.replacement_product_name) || "N/A";
                const productSerialList =
                  toList((delivery as any).delivery_item_serial_numbers).length > 0
                    ? toList((delivery as any).delivery_item_serial_numbers)
                    : toList((delivery as any).product_serial_numbers).length > 0
                      ? toList((delivery as any).product_serial_numbers)
                    : toList(orderMeta?.product_serial_numbers);
                const replacementNamesList =
                  toList(orderMeta?.replacement_product_names).length > 0
                    ? toList(orderMeta?.replacement_product_names)
                    : toList(orderMeta?.replacement_product_name);
                const replacementSerialList = toList((orderMeta as any)?.replacement_product_serial_numbers);
                const deliveryCompanyNames = getDeliveryCompanyNames(orderMeta, delivery);
                const companiesValue = deliveryCompanyNames.length > 0 ? deliveryCompanyNames.join(", ") : "N/A";
                const productNamesList =
                  orderProductEntries.length > 0
                    ? orderProductEntries.map((entry) => entry.name)
                    : toList(orderMeta?.product_names).length > 0
                      ? toList(orderMeta?.product_names)
                      : toList(orderMeta?.product_name);
                const productIds =
                  orderProductEntries.length > 0
                    ? orderProductEntries.map((entry) => entry.id)
                    : [];
                const productDisplayEntries = mergeProductEntries(
                  orderProductEntries.length > 0
                    ? orderProductEntries
                    : (productNamesList.length > 0 ? productNamesList : [productValue]).map((name, index) => ({
                        id: productIds[index] || 0,
                        name,
                        model:
                          (productIds[index] ? getOrderProductModelById(orderMeta, productIds[index] || 0) : "") ||
                          toList(orderMeta?.product_models)[index] ||
                          "N/A",
                        serial: productSerialList[index] || "",
                      })),
                  scopedProductEntries,
                );
                const productMultiLine = formatProductDetailEntries(productDisplayEntries, productValue);
                const deliveredProductsValue =
                  formatDeliveredProductsDetails(
                    scopedProductEntries.map((entry) => ({
                      ...entry,
                      company: getDeliveredCompanyNameForProduct(orderMeta, delivery, entry.id),
                    })),
                    productValue,
                  );
                const replacementMultiLine =
                  replacementNamesList.length > 0
                    ? getNumberedNameSerialLines(replacementNamesList, replacementSerialList)
                    : "N/A";
                const companyNamesList =
                  toList(orderMeta?.company_names).length > 0 ? toList(orderMeta?.company_names) : toList(orderMeta?.company_name);
                const parsedCompanyMap = (() => {
                  const raw = orderMeta?.company_product_map;
                  if (!raw) return {} as Record<string, unknown>;
                  if (typeof raw === "string") {
                    try {
                      const parsed = JSON.parse(raw);
                      return typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
                    } catch {
                      return {};
                    }
                  }
                  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
                })();
                const companyProductNameMap = (() => {
                  const result: Record<string, { company_name?: string; product_names?: string[] | string }> = {};
                  if (companyNamesList.length === 0) return result;
                  const productNameById = new Map<number, string>();
                  productIds.forEach((id, index) => {
                    productNameById.set(id, productNamesList[index] || `Product #${id}`);
                  });
                  const mapKeys = Object.keys(parsedCompanyMap);
                  companyNamesList.forEach((company, index) => {
                    const mapKey = mapKeys[index];
                    const mappedIds = mapKey ? parseIds(parsedCompanyMap[mapKey]) : [];
                    const names =
                      mappedIds.length > 0
                        ? mappedIds.map((id) => productNameById.get(id) || `Product #${id}`)
                        : productNamesList;
                    result[company] = {
                      company_name: company,
                      product_names: names,
                    };
                  });
                  return result;
                })();
                const enrichedDeliveryForReceipt = {
                  ...delivery,
                  client_name: orderMeta?.client_name || delivery.client_name,
                  product_name: productValue,
                  product_names: productNamesList,
                  product_models:
                    orderProductEntries.length > 0
                      ? orderProductEntries.map((entry) => entry.model)
                      : (productNamesList.length > 0 ? productNamesList : [productValue]).map((name, index) =>
                          (productIds[index] ? getOrderProductModelById(orderMeta, productIds[index] || 0) : "") ||
                          getOrderProductModelByName(orderMeta, name) ||
                          toList(orderMeta?.product_models)[index] ||
                          "N/A",
                        ),
                  product_model:
                    scopedProductEntries[0]?.model ||
                    orderProductEntries[0]?.model ||
                    "N/A",
                  order_product_ids: productIds,
                  product_ids: scopedProductEntries.map((entry) => entry.id).filter((id) => id > 0),
                  product_serial_numbers:
                    toList((delivery as any).delivery_item_serial_numbers).length > 0
                      ? toList((delivery as any).delivery_item_serial_numbers)
                      : toList((delivery as any).product_serial_numbers).length > 0
                        ? toList((delivery as any).product_serial_numbers)
                      : orderMeta?.product_serial_numbers,
                  delivered_product_names: scopedProductEntries.map((entry) => entry.name),
                  delivered_product_models: scopedProductEntries.map((entry) => entry.model),
                  delivered_product_serial_numbers: scopedProductEntries.map((entry) => entry.serial),
                  product_status_map: orderMeta?.product_status_map,
                  replacement_product_name: replacementValue === "N/A" ? "" : replacementValue,
                  replacement_product_names:
                    toList(orderMeta?.replacement_product_names).length > 0
                      ? toList(orderMeta?.replacement_product_names)
                      : toList(orderMeta?.replacement_product_name),
                  replacement_product_serial_numbers: (orderMeta as any)?.replacement_product_serial_numbers,
                  company_name: orderMeta?.company_name,
                  company_names: companyNamesList,
                  company_product_name_map: companyProductNameMap,
                  estimated_cost: orderMeta?.estimated_cost,
                  final_cost: orderMeta?.final_cost,
                  amount: orderMeta?.final_cost || orderMeta?.estimated_cost || (delivery as any)?.amount || 0,
                };

                return (
                  <motion.tr
                    key={delivery.__rowKey}
                    className={isSelected ? "selected-row" : ""}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    whileHover={{ backgroundColor: "#f8fafc", cursor: "pointer" }}
                    onClick={() => void openDeliveryDetailModal(delivery)}
                  >
                    <td className="delivery-table-check-col" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={isSelected}
                        onChange={() => toggleDeliverySelection(delivery.__rowKey)}
                        aria-label={`Select ${delivery.delivery_code || delivery.id} ${delivery.product_name || ""}`}
                      />
                    </td>
                    <td className="delivery-table-client-col">
                      <div className="client-cell delivery-client-cell">
                        <div className="client-avatar-placeholder delivery-avatar">
                          {delivery.client_name?.charAt(0) || "C"}
                        </div>
                        <div className="client-info">
                          <span className="client-name delivery-client-name">{orderMeta?.client_name || delivery.client_name || "N/A"}</span>
                          <span className="delivery-client-subline">{delivery.delivery_code || `DLV-${delivery.id}`}</span>
                        </div>
                      </div>
                    </td>
                    <td className="delivery-table-product-col">
                      <div className="delivery-table-stack-card">
                        <span className="delivery-stack-label">Product</span>
                        <div className="product-cell delivery-product-cell">
                          <FiPackage className="product-icon" />
                          <span className="delivery-list-text">{productMultiLine}</span>
                        </div>
                      </div>
                      <div className="delivery-table-mini-note">
                        <span className="delivery-stack-label">Replacement</span>
                        <span className="delivery-list-text">{replacementMultiLine}</span>
                      </div>
                    </td>
                    <td className="delivery-table-company-col">
                      <div className="delivery-table-value-block">
                        <span className="delivery-stack-label">Company</span>
                        <strong>{companiesValue}</strong>
                        <span className="delivery-company-meta">
                          {scopedProductEntries.length || productIds.length} delivered item{(scopedProductEntries.length || productIds.length) === 1 ? "" : "s"}
                          {deliveryCompanyNames.length > 1 ? ` across ${deliveryCompanyNames.length} companies` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="delivery-table-delivered-products-col">
                      <div className="delivery-table-value-block">
                        <span className="delivery-stack-label">Delivered</span>
                        <span className="delivery-list-text">{deliveredProductsValue}</span>
                      </div>
                    </td>
                    <td className="delivery-table-status-col">
                      <div className="status-cell">
                        <div className="status-indicator" style={{ backgroundColor: isDelivered ? "#7c3aed" : delivery.status === "scheduled" ? "#0f766e" : delivery.status === "pending" ? "#dc2626" : "#6B7280" }}></div>
                        <span className="status-label" style={{ color: isDelivered ? "#7c3aed" : delivery.status === "scheduled" ? "#0f766e" : delivery.status === "pending" ? "#dc2626" : "#6B7280", fontWeight: "700" }}>
                          {isDelivered ? "Delivered" : delivery.status}
                        </span>
                      </div>
                    </td>
                    <td className="delivery-table-date-col">
                      <div className="delivery-date-cell delivery-date-cell-strong">
                        <FiCalendar />
                        <span>{isDelivered ? delivery.delivered_date_formatted || formatDisplayDateTime(delivery.delivered_date) : "Not Delivered"}</span>
                      </div>
                    </td>
                    <td className="delivery-table-action-col" onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons delivery-action-buttons">
                        <motion.button className="action-btn print" onClick={(e) => { e.stopPropagation(); onPrintDeliveryReceipt(enrichedDeliveryForReceipt as Delivery); }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} title="Receipt Options">
                          <FiPrinter />
                        </motion.button>
                        <motion.button className="action-btn view" onClick={(e) => { e.stopPropagation(); void openEditModal(delivery); }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} title="Edit Delivery">
                          <FiEdit2 />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div className="mobile-record-list">
            {paginatedDeliveries.map((delivery, index) => {
              const isDelivered = isDeliveryCompleted(delivery);
              const isSelected = selectedDeliveryIds.includes(delivery.__rowKey);
              const orderMeta = orderMetaById[delivery.order_id];
              const orderProductEntries = getOrderDetailProductEntries(orderMeta, delivery);
              const scopedProductEntries = getDeliveredProductsEntries(orderMeta, delivery);
              const productValue =
                (orderProductEntries.length > 0 ? orderProductEntries.map((entry) => entry.name).join(", ") : "") ||
                (delivery.product_name && String(delivery.product_name).trim()) ||
                "N/A";
              const replacementValue =
                (toList(orderMeta?.replacement_product_names).length > 0
                  ? toList(orderMeta?.replacement_product_names).join(", ")
                  : orderMeta?.replacement_product_name) || "N/A";
              const productSerialList =
                toList((delivery as any).delivery_item_serial_numbers).length > 0
                  ? toList((delivery as any).delivery_item_serial_numbers)
                  : toList((delivery as any).product_serial_numbers).length > 0
                    ? toList((delivery as any).product_serial_numbers)
                  : toList(orderMeta?.product_serial_numbers);
              const replacementNamesList =
                toList(orderMeta?.replacement_product_names).length > 0
                  ? toList(orderMeta?.replacement_product_names)
                  : toList(orderMeta?.replacement_product_name);
              const replacementSerialList = toList((orderMeta as any)?.replacement_product_serial_numbers);
              const deliveryCompanyNames = getDeliveryCompanyNames(orderMeta, delivery);
              const companiesValue = deliveryCompanyNames.length > 0 ? deliveryCompanyNames.join(", ") : "N/A";
              const productNamesList =
                orderProductEntries.length > 0
                  ? orderProductEntries.map((entry) => entry.name)
                  : toList(orderMeta?.product_names).length > 0
                    ? toList(orderMeta?.product_names)
                    : toList(orderMeta?.product_name);
              const productIds =
                orderProductEntries.length > 0
                  ? orderProductEntries.map((entry) => entry.id)
                  : [];
              const productDisplayEntries = mergeProductEntries(
                orderProductEntries.length > 0
                  ? orderProductEntries
                  : (productNamesList.length > 0 ? productNamesList : [productValue]).map((name, index) => ({
                      id: productIds[index] || 0,
                      name,
                      model:
                        (productIds[index] ? getOrderProductModelById(orderMeta, productIds[index] || 0) : "") ||
                        toList(orderMeta?.product_models)[index] ||
                        "N/A",
                      serial: productSerialList[index] || "",
                    })),
                scopedProductEntries,
              );
              const productMultiLine = formatProductDetailEntries(productDisplayEntries, productValue);
              const deliveredProductsValue =
                formatDeliveredProductsDetails(
                  scopedProductEntries.map((entry) => ({
                    ...entry,
                    company: getDeliveredCompanyNameForProduct(orderMeta, delivery, entry.id),
                  })),
                  productValue,
                );
              const replacementMultiLine =
                replacementNamesList.length > 0
                  ? getNumberedNameSerialLines(replacementNamesList, replacementSerialList)
                  : "N/A";
              const companyNamesList =
                toList(orderMeta?.company_names).length > 0 ? toList(orderMeta?.company_names) : toList(orderMeta?.company_name);
              const parsedCompanyMap = (() => {
                const raw = orderMeta?.company_product_map;
                if (!raw) return {} as Record<string, unknown>;
                if (typeof raw === "string") {
                  try {
                    const parsed = JSON.parse(raw);
                    return typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
                  } catch {
                    return {};
                  }
                }
                return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
              })();
              const companyProductNameMap = (() => {
                const result: Record<string, { company_name?: string; product_names?: string[] | string }> = {};
                if (companyNamesList.length === 0) return result;
                const productNameById = new Map<number, string>();
                productIds.forEach((id, index) => {
                  productNameById.set(id, productNamesList[index] || `Product #${id}`);
                });
                const mapKeys = Object.keys(parsedCompanyMap);
                companyNamesList.forEach((company, index) => {
                  const mapKey = mapKeys[index];
                  const mappedIds = mapKey ? parseIds(parsedCompanyMap[mapKey]) : [];
                  const names =
                    mappedIds.length > 0
                      ? mappedIds.map((id) => productNameById.get(id) || `Product #${id}`)
                      : productNamesList;
                  result[company] = {
                    company_name: company,
                    product_names: names,
                  };
                });
                return result;
              })();
              const enrichedDeliveryForReceipt = {
                ...delivery,
                client_name: orderMeta?.client_name || delivery.client_name,
                product_name: productValue,
                product_names: productNamesList,
                product_models:
                  orderProductEntries.length > 0
                    ? orderProductEntries.map((entry) => entry.model)
                    : (productNamesList.length > 0 ? productNamesList : [productValue]).map((name, index) =>
                        (productIds[index] ? getOrderProductModelById(orderMeta, productIds[index] || 0) : "") ||
                        getOrderProductModelByName(orderMeta, name) ||
                        toList(orderMeta?.product_models)[index] ||
                        "N/A",
                      ),
                product_model:
                  scopedProductEntries[0]?.model ||
                  orderProductEntries[0]?.model ||
                  "N/A",
                order_product_ids: productIds,
                product_ids: scopedProductEntries.map((entry) => entry.id).filter((id) => id > 0),
                product_serial_numbers:
                  toList((delivery as any).delivery_item_serial_numbers).length > 0
                    ? toList((delivery as any).delivery_item_serial_numbers)
                    : toList((delivery as any).product_serial_numbers).length > 0
                      ? toList((delivery as any).product_serial_numbers)
                    : orderMeta?.product_serial_numbers,
                delivered_product_names: scopedProductEntries.map((entry) => entry.name),
                delivered_product_models: scopedProductEntries.map((entry) => entry.model),
                delivered_product_serial_numbers: scopedProductEntries.map((entry) => entry.serial),
                product_status_map: orderMeta?.product_status_map,
                replacement_product_name: replacementValue === "N/A" ? "" : replacementValue,
                replacement_product_names:
                  toList(orderMeta?.replacement_product_names).length > 0
                    ? toList(orderMeta?.replacement_product_names)
                    : toList(orderMeta?.replacement_product_name),
                replacement_product_serial_numbers: (orderMeta as any)?.replacement_product_serial_numbers,
                company_name: orderMeta?.company_name,
                company_names: companyNamesList,
                company_product_name_map: companyProductNameMap,
                estimated_cost: orderMeta?.estimated_cost,
                final_cost: orderMeta?.final_cost,
                amount: orderMeta?.final_cost || orderMeta?.estimated_cost || (delivery as any)?.amount || 0,
              };

              return (
                <motion.div
                  key={`mobile-${delivery.__rowKey}`}
                  className={`mobile-record-card${isSelected ? " selected-row" : ""}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => void openDeliveryDetailModal(delivery)}
                >
                  <div className="mobile-record-header">
                    <div className="mobile-record-header-main">
                      <span className="mobile-record-kicker">Delivery</span>
                      <strong className="mobile-record-title">{orderMeta?.client_name || delivery.client_name || "N/A"}</strong>
                      <span className="mobile-record-subtitle">{isDelivered ? delivery.delivered_date_formatted || formatDisplayDateTime(delivery.delivered_date) : "Not Delivered"}</span>
                    </div>
                    <input
                      type="checkbox"
                      className="row-checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleDeliverySelection(delivery.__rowKey)}
                      aria-label={`Select ${delivery.delivery_code || delivery.id}`}
                    />
                  </div>
                  <div className="mobile-record-grid">
                    <div className="mobile-record-field full"><span className="mobile-record-label">Products</span><span className="delivery-list-text">{productMultiLine}</span></div>
                    <div className="mobile-record-field full"><span className="mobile-record-label">Replacement</span><span className="delivery-list-text">{replacementMultiLine}</span></div>
                    <div className="mobile-record-field full"><span className="mobile-record-label">Delivered Products</span><span className="delivery-list-text">{deliveredProductsValue}</span></div>
                    <div className="mobile-record-field full"><span className="mobile-record-label">Companies</span><span>{companiesValue}</span></div>
                    <div className="mobile-record-field"><span className="mobile-record-label">Status</span><span className="status-label" style={{ color: isDelivered ? "#8B5CF6" : delivery.status === "scheduled" ? "#10B981" : delivery.status === "pending" ? "#DC2626" : "#6B7280", fontWeight: "600" }}>{isDelivered ? "Delivered" : delivery.status}</span></div>
                    <div className="mobile-record-field"><span className="mobile-record-label">Delivered Date</span><span>{isDelivered ? delivery.delivered_date_formatted || formatDisplayDateTime(delivery.delivered_date) : "Not Delivered"}</span></div>
                  </div>
                  <div className="mobile-record-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="action-btn print" onClick={() => onPrintDeliveryReceipt(enrichedDeliveryForReceipt as Delivery)} title="Receipt Options">
                      <FiPrinter />
                    </button>
                    <button className="action-btn view" onClick={() => void openEditModal(delivery)} title="Edit Delivery">
                      <FiEdit2 />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          </>
        ) : (
          <div className="empty-state">
            <FiTruck className="empty-icon" />
            <h3>No deliveries found</h3>
            <p>No delivery records available.</p>
            <div className="empty-state-actions">
              <motion.button className="btn primary" onClick={onViewOrders} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <FiPackage />
                View Orders
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {sortedDeliveries.length > 0 && (
        <div className="orders-pagination">
          <div className="orders-pagination-info">
            Showing {pageStartIndex + 1} to {Math.min(pageStartIndex + ITEMS_PER_PAGE, sortedDeliveries.length)} of {sortedDeliveries.length} deliveries
          </div>
          <div className="orders-pagination-controls">
            <button type="button" className="pagination-btn" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
              <FiChevronLeft />
              <span>Previous</span>
            </button>
            <span className="pagination-page-chip">Page {currentPage} of {totalPages}</span>
            <button type="button" className="pagination-btn" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
              <span>Next</span>
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}

      {selectedDelivery && !loadingDetailData && (
        <DeliveryDetailModal
          delivery={selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          onEdit={(delivery) => {
            setSelectedDelivery(null);
            void openEditModal(delivery);
          }}
          onDelete={(delivery) => {
            setSelectedDelivery(null);
            void onDeleteDelivery?.(delivery.id);
          }}
          onPrint={onPrintDeliveryReceipt}
        />
      )}

      {editingDelivery && (
        <motion.div
          className="modal-overlay-enhanced"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !savingEdit && setEditingDelivery(null)}
        >
          <motion.div
            className="modal-content-enhanced delivery-edit-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 28 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-enhanced delivery-edit-modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-wrapper">
                  <div className="modal-icon-bg">
                    <FiTruck />
                  </div>
                </div>
                <div className="modal-title-enhanced">
                  <h2>Edit Delivery</h2>
                  <p>Update handover details, schedule, and tracking in one clean flow.</p>
                </div>
              </div>
              <motion.button
                type="button"
                className="close-btn-enhanced"
                onClick={() => !savingEdit && setEditingDelivery(null)}
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX />
              </motion.button>
            </div>

            <div className="service-form-enhanced delivery-edit-form-enhanced">
              <div className="delivery-edit-shell">
                <aside className="delivery-edit-aside">
                  <div className="delivery-edit-preview-card">
                    <span className="delivery-edit-preview-badge">Delivery #{editingDelivery.id}</span>
                    <h3>{editingDelivery.delivery_code || `DEL${String(editingDelivery.id).padStart(3, "0")}`}</h3>
                    <p>{editingDelivery.client_name || "Client name not available"}</p>
                    <div className="delivery-edit-preview-meta">
                      <span>{editingDelivery.product_name || "Product not linked"}</span>
                      <span>{editForm.status.replaceAll("_", " ")}</span>
                    </div>
                  </div>
                  <div className="delivery-edit-tip-card">
                    <strong>Quick tips</strong>
                    <ul className="delivery-edit-tip-list">
                      <li>Choose delivery type first to auto-check address requirements.</li>
                      <li>Keep phone and contact person updated for same-day delivery calls.</li>
                      <li>Mark delivered only after handover confirmation.</li>
                    </ul>
                  </div>
                </aside>

                <div className="delivery-edit-main">
                  {editFeedback && <div className="delivery-edit-feedback">{editFeedback}</div>}

                  <section className="delivery-edit-panel">
                    <div className="delivery-edit-panel-header">
                      <div>
                        <h3>Delivered Product Types</h3>
                        <p>Choose delivery type separately for each delivered product.</p>
                      </div>
                    </div>
                    {editProductTypeRows.length > 0 ? (
                      <div className="delivery-product-type-list">
                        {editProductTypeRows.map((row, rowIndex) => (
                          <div key={row.id || rowIndex} className="delivery-product-type-card">
                            <div className="delivery-product-type-header">
                              <strong>{row.name || `Product #${row.id}`}</strong>
                              <span>{row.serial ? `Serial: ${row.serial}` : ""}</span>
                            </div>
                            <div className="delivery-type-grid">
                              {DELIVERY_TYPE_OPTIONS.map((option) => {
                                const active = row.delivery_type === option.value;
                                return (
                                  <button
                                    key={`${row.id}-${option.value}`}
                                    type="button"
                                    className={`delivery-type-option ${active ? "active" : ""}`}
                                    onClick={() => {
                                      setEditProductTypeRows((prev) =>
                                        prev.map((item, index) =>
                                          index === rowIndex ? { ...item, delivery_type: option.value } : item,
                                        ),
                                      );
                                      setEditForm((prev) => ({
                                        ...prev,
                                        delivery_type: rowIndex === 0 ? option.value : prev.delivery_type,
                                        delivery_type_map: {
                                          ...prev.delivery_type_map,
                                          [String(row.id)]: option.value,
                                        },
                                      }));
                                    }}
                                  >
                                    <strong>{option.label}</strong>
                                    <span>{option.hint}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="delivery-type-grid">
                        {DELIVERY_TYPE_OPTIONS.map((option) => {
                          const active = editForm.delivery_type === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={`delivery-type-option ${active ? "active" : ""}`}
                              onClick={() => setEditForm((prev) => ({ ...prev, delivery_type: option.value }))}
                            >
                              <strong>{option.label}</strong>
                              <span>{option.hint}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="delivery-edit-panel">
                    <div className="delivery-edit-panel-header">
                      <div>
                        <h3>Contact & Schedule</h3>
                        <p>Who receives it and when.</p>
                      </div>
                    </div>
                    <div className="form-grid delivery-edit-grid">
                      <label className="delivery-edit-field">
                        <span><FiUser /> Contact Person</span>
                        <input value={editForm.contact_person} onChange={(e) => setEditForm((prev) => ({ ...prev, contact_person: e.target.value }))} placeholder="Contact person" className="client-input" />
                        {editErrors.contact_person && <small className="delivery-edit-error">{editErrors.contact_person}</small>}
                      </label>
                      <label className="delivery-edit-field">
                        <span><FiPhone /> Contact Phone</span>
                        <input value={editForm.contact_phone} onChange={(e) => setEditForm((prev) => ({ ...prev, contact_phone: e.target.value }))} placeholder="Contact phone" className="client-input" />
                        {editErrors.contact_phone && <small className="delivery-edit-error">{editErrors.contact_phone}</small>}
                      </label>
                      <label className="delivery-edit-field full-width">
                        <span><FiMapPin /> Address</span>
                        <input value={editForm.address} onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Address / landmark" className="client-input" />
                        {editErrors.address && <small className="delivery-edit-error">{editErrors.address}</small>}
                      </label>
                      <label className="delivery-edit-field">
                        <span><FiCalendar /> Scheduled Date</span>
                        <input type="date" value={editForm.scheduled_date} onChange={(e) => setEditForm((prev) => ({ ...prev, scheduled_date: e.target.value }))} className="client-input" />
                        {editErrors.scheduled_date && <small className="delivery-edit-error">{editErrors.scheduled_date}</small>}
                      </label>
                      <label className="delivery-edit-field">
                        <span><FiClock /> Scheduled Time</span>
                        <input type="time" value={editForm.scheduled_time} onChange={(e) => setEditForm((prev) => ({ ...prev, scheduled_time: e.target.value }))} className="client-input" />
                        {editErrors.scheduled_time && <small className="delivery-edit-error">{editErrors.scheduled_time}</small>}
                      </label>
                    </div>
                  </section>

                  <section className="delivery-edit-panel">
                    <div className="delivery-edit-panel-header">
                      <div>
                        <h3>Execution</h3>
                        <p>Assign owner, status, and notes.</p>
                      </div>
                    </div>
                    <div className="form-grid delivery-edit-grid">
                      <label className="delivery-edit-field">
                        <span>Delivery Person</span>
                        <input value={editForm.delivery_person} onChange={(e) => setEditForm((prev) => ({ ...prev, delivery_person: e.target.value }))} placeholder="Delivery person name" className="client-input" />
                      </label>
                      <label className="delivery-edit-field">
                        <span>Status</span>
                        <select value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))} className="client-input">
                          <option value="scheduled">Scheduled</option>
                          <option value="in_transit">In Transit</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="failed">Failed</option>
                        </select>
                      </label>
                      <label className="delivery-edit-field full-width">
                        <span>Notes</span>
                        <textarea value={editForm.notes} onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Add delivery notes for staff follow-up..." rows={4} className="client-input client-textarea" />
                      </label>
                    </div>
                  </section>
                </div>
              </div>

              <div className="form-actions-enhanced delivery-edit-actions">
                <div className="delivery-edit-actions-note">Changes will update this delivery record instantly.</div>
                <div className="client-form-actions-buttons">
                  <motion.button type="button" className="btn-secondary-enhanced" onClick={() => setEditingDelivery(null)} disabled={savingEdit || loadingEditData} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    Cancel
                  </motion.button>
                  <motion.button type="button" className="btn-primary-enhanced" onClick={saveDeliveryEdit} disabled={savingEdit || loadingEditData} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <FiSave />
                    {loadingEditData ? "Loading..." : savingEdit ? "Saving..." : "Save Delivery"}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default DeliveryTab;

