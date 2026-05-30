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
import { formatDisplayDate } from "../utils";

interface DeliveryTabProps {
  filteredDeliveries: Delivery[];
  loading: boolean;
  searchTerm: string;
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onPresetClick: (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear") => void;
  onPrintDeliveryReceipt: (delivery: Delivery) => void;
  onViewOrders: () => void;
  onClearFilters: () => void;
}

const ITEMS_PER_PAGE = 20;
const DELIVERY_API_URL = "http://cloud.anyrdp.in:3001/raj_communication/api/deliveries.php";
const ORDERS_API_URL = "http://cloud.anyrdp.in:3001/raj_communication/api/Order.php";

interface DeliveryOrderMeta {
  id: number;
  product_name?: string;
  product_names?: string[] | string;
  product_serial_numbers?: string[] | string;
  product_model?: string;
  product_brand?: string;
  product_ids?: number[] | string[] | string;
  product_status_map?: Record<string, string> | string;
  handover_type_map?: Record<string, string> | string;
  replacement_product_name?: string;
  replacement_product_names?: string[] | string;
  replacement_product_serial_numbers?: string[] | string;
  client_name?: string;
  company_name?: string;
  company_names?: string[] | string;
  company_product_map?: Record<string, number[] | string[] | string> | string;
  warranty_status?: string;
  priority?: string;
  estimated_cost?: string | number;
  final_cost?: string | number;
  amount?: string | number;
}
type SplitDeliveryRow = Delivery & { __rowKey: string; product_ids?: number[] | string[] | string };
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
    } catch {
      return trimmed.split(",").map((entry) => Number(entry.trim())).filter((id) => Number.isInteger(id) && id > 0);
    }
  }
  return [];
};

const parseProductStatusMap = (value: unknown): Record<string, string> => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object") return {};
      return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, status]) => {
        acc[key] = String(status || "").toLowerCase();
        return acc;
      }, {});
    } catch {
      return {};
    }
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, status]) => {
      acc[key] = String(status || "").toLowerCase();
      return acc;
    }, {});
  }
  return {};
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

const getDeliveredProductNames = (orderMeta?: DeliveryOrderMeta): string[] => {
  if (!orderMeta) return [];
  const names = toList(orderMeta.product_names).length > 0 ? toList(orderMeta.product_names) : toList(orderMeta.product_name);
  const ids = parseIds(orderMeta.product_ids);
  const statusMap = parseProductStatusMap(orderMeta.product_status_map);

  if (ids.length === 0 || names.length === 0 || Object.keys(statusMap).length === 0) return [];

  const deliveredStatuses = new Set(["deliveryed", "delivered"]);
  return ids
    .map((id, index) => ({ id, name: names[index] || `Product #${id}` }))
    .filter((entry) => deliveredStatuses.has(statusMap[String(entry.id)]))
    .map((entry) => entry.name)
    .filter(Boolean);
};

const parseHandoverTypeMap = (value: unknown): Record<string, string> => {
  if (!value) return {};
  const normalize = (raw: Record<string, unknown>) =>
    Object.entries(raw).reduce<Record<string, string>>((acc, [key, val]) => {
      const normalized = String(val || "").trim().toLowerCase();
      if (normalized === "inhand" || normalized === "courier" || normalized === "parcelservice") acc[key] = normalized;
      else if (normalized === "in_hand") acc[key] = "inhand";
      else if (normalized === "parcel_service") acc[key] = "parcelservice";
      return acc;
    }, {});
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return normalize(parsed as Record<string, unknown>);
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) return normalize(value as Record<string, unknown>);
  return {};
};

const getDeliveredProductEntries = (orderMeta?: DeliveryOrderMeta): Array<{ id: number; name: string; deliveryType: string }> => {
  if (!orderMeta) return [];
  const names = toList(orderMeta.product_names).length > 0 ? toList(orderMeta.product_names) : toList(orderMeta.product_name);
  const ids = parseIds(orderMeta.product_ids);
  const statusMap = parseProductStatusMap(orderMeta.product_status_map);
  const handoverMap = parseHandoverTypeMap(orderMeta.handover_type_map);
  if (ids.length === 0 || names.length === 0 || Object.keys(statusMap).length === 0) return [];
  const deliveredStatuses = new Set(["deliveryed", "delivered"]);
  return ids
    .map((id, index) => ({
      id,
      name: names[index] || `Product #${id}`,
      deliveryType: handoverMap[String(id)] || "inhand",
    }))
    .filter((entry) => deliveredStatuses.has(statusMap[String(entry.id)]));
};

const getOrderProductNameById = (orderMeta: DeliveryOrderMeta | undefined, productId: number): string => {
  if (!orderMeta || productId <= 0) return "";
  const names = toList(orderMeta.product_names).length > 0 ? toList(orderMeta.product_names) : toList(orderMeta.product_name);
  const ids = parseIds(orderMeta.product_ids);
  if (ids.length === 0 || names.length === 0) return "";
  const index = ids.findIndex((id) => id === productId);
  if (index < 0) return "";
  return names[index] || "";
};

const getDeliveryCompanyName = (orderMeta: DeliveryOrderMeta | undefined, delivery: Delivery): string => {
  if (!orderMeta) return "N/A";

  const companies = toList(orderMeta.company_names).length > 0 ? toList(orderMeta.company_names) : toList(orderMeta.company_name);
  const fallbackCompany = companies[0] || "N/A";
  const productId = getDeliveryProductId(delivery);

  const parsedCompanyMap = (() => {
    const raw = orderMeta.company_product_map;
    if (!raw) return {} as Record<string, unknown>;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    }
    return typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
  })();

  if (productId > 0 && Object.keys(parsedCompanyMap).length > 0) {
    const companyKeys = Object.keys(parsedCompanyMap);
    for (let index = 0; index < companyKeys.length; index += 1) {
      const companyKey = companyKeys[index];
      const mappedIds = parseIds(parsedCompanyMap[companyKey]);
      if (mappedIds.includes(productId)) {
        return companies[index] || companies[0] || `Company #${companyKey}`;
      }
    }
  }

  return fallbackCompany;
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

const getDeliveredProductEntryById = (orderMeta: DeliveryOrderMeta | undefined, productId: number) => {
  if (!orderMeta || productId <= 0) return null as null | { name: string; serial: string };
  const name = getOrderProductNameById(orderMeta, productId);
  const serial = getOrderProductSerialById(orderMeta, productId);
  if (!name && !serial) return null;
  return { name: name || "N/A", serial: serial || "N/A" };
};

const getNumberedNameSerialLines = (names: string[], serials: string[]) =>
  names.map((name, index) => `${index + 1}. ${name}\nSerial: ${serials[index] || ""}`).join("\n");

const toSerialListFromDelivery = (delivery: Delivery): string[] => {
  const itemSerials = toList((delivery as any).delivery_item_serial_numbers);
  if (itemSerials.length > 0) return itemSerials;
  const directList = toList((delivery as any).product_serial_numbers);
  if (directList.length > 0) return directList;
  const one =
    String((delivery as any).serial_number || (delivery as any).delivery_serial_number || (delivery as any).product_serial_number || "").trim();
  return one ? [one] : [];
};

const DeliveryTab = ({
  filteredDeliveries,
  loading,
  searchTerm,
  dateRange,
  onSearchChange,
  onDateRangeChange,
  onPresetClick,
  onPrintDeliveryReceipt,
  onViewOrders,
  onClearFilters,
}: DeliveryTabProps) => {
  const [liveDeliveries, setLiveDeliveries] = useState<Delivery[]>([]);
  const [orderMetaById, setOrderMetaById] = useState<Record<number, DeliveryOrderMeta>>({});
  const [liveLoading, setLiveLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [loadingDetailData, setLoadingDetailData] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [editForm, setEditForm] = useState({
    delivery_type: "inhand",
    address: "",
    contact_person: "",
    contact_phone: "",
    scheduled_date: "",
    scheduled_time: "",
    delivery_person: "",
    status: "scheduled",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [editFeedback, setEditFeedback] = useState<string>("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadOrderMeta = async () => {
      try {
        const token = localStorage.getItem("authToken") || localStorage.getItem("token");
        if (!token) return;
        const response = await fetch(ORDERS_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!mounted || !data?.success || !Array.isArray(data?.orders)) return;

        const map: Record<number, DeliveryOrderMeta> = {};
        (data.orders as DeliveryOrderMeta[]).forEach((order) => {
          if (!order?.id) return;
          map[Number(order.id)] = {
            id: Number(order.id),
            product_name: order.product_name,
            product_names: order.product_names,
            product_serial_numbers: (order as any).product_serial_numbers,
            replacement_product_name: order.replacement_product_name,
            replacement_product_names: order.replacement_product_names,
            replacement_product_serial_numbers: (order as any).replacement_product_serial_numbers,
            client_name: order.client_name,
            company_name: order.company_name,
            company_names: order.company_names,
            product_model: (order as any).product_model,
            product_brand: (order as any).product_brand,
            company_product_map: order.company_product_map,
            product_ids: order.product_ids,
            product_status_map: order.product_status_map,
            handover_type_map: order.handover_type_map,
            warranty_status: order.warranty_status,
            priority: order.priority,
            estimated_cost: (order as any).estimated_cost,
            final_cost: (order as any).final_cost,
            amount: (order as any).final_cost || (order as any).estimated_cost || 0,
          };
        });
        setOrderMetaById(map);
      } catch {
        // Keep UI functional even when order metadata cannot be loaded.
      }
    };

    loadOrderMeta();
    return () => {
      mounted = false;
    };
  }, []);

  const sourceDeliveries = liveDeliveries.length > 0 ? liveDeliveries : filteredDeliveries;
  const splitDeliveries = useMemo<SplitDeliveryRow[]>(
    () => {
      const grouped = new Map<number, SplitDeliveryRow>();

      sourceDeliveries.forEach((delivery) => {
        const orderMeta = orderMetaById[delivery.order_id];
        const itemProductNames = toList((delivery as any).delivery_item_product_names);
        const itemProductIds = parseIds((delivery as any).delivery_item_product_ids);
        const deliveredProductEntries = getDeliveredProductEntries(orderMeta);
        const deliveredNames = deliveredProductEntries.map((entry) => entry.name).filter(Boolean);
        const fallbackName = delivery.product_name && String(delivery.product_name).trim()
          ? String(delivery.product_name).trim()
          : "";
        const candidateNames =
          itemProductNames.length > 0
            ? itemProductNames
            : deliveredNames.length > 0
              ? deliveredNames
              : (fallbackName ? [fallbackName] : []);
        const candidateSerials = toSerialListFromDelivery(delivery);

        const existing = grouped.get(delivery.order_id);
        if (!existing) {
          grouped.set(delivery.order_id, {
            ...delivery,
            product_name: candidateNames.join(", "),
            product_ids: itemProductIds.length > 0 ? itemProductIds : (delivery as any).product_ids,
            product_serial_numbers: candidateSerials,
            delivery_type: normalizeDeliveryTypeValue(delivery.delivery_type),
            __rowKey: `order-${delivery.order_id}`,
          });
          return;
        }

        const existingNames = String(existing.product_name || "")
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean);
        const mergedNames = Array.from(new Set([...existingNames, ...candidateNames]));
        const existingSerials = toList((existing as any).product_serial_numbers);
        const mergedSerials = Array.from(new Set([...existingSerials, ...candidateSerials]));
        const existingTime = new Date(existing.scheduled_date || existing.created_at || 0).getTime();
        const currentTime = new Date(delivery.scheduled_date || delivery.created_at || 0).getTime();
        const preferCurrent = Number.isFinite(currentTime) && currentTime >= existingTime;

        grouped.set(delivery.order_id, {
          ...(preferCurrent ? delivery : existing),
          product_name: mergedNames.join(", "),
          product_serial_numbers: mergedSerials,
          delivery_type: normalizeDeliveryTypeValue((preferCurrent ? delivery : existing).delivery_type),
          __rowKey: `order-${delivery.order_id}`,
        });
      });

      return Array.from(grouped.values());
    },
    [orderMetaById, sourceDeliveries],
  );
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredSourceDeliveries = useMemo(
    () =>
      splitDeliveries.filter((delivery) => {
        const orderMeta = orderMetaById[delivery.order_id];
        if (dateRange.startDate && delivery.scheduled_date && delivery.scheduled_date < dateRange.startDate) return false;
        if (dateRange.endDate && delivery.scheduled_date && delivery.scheduled_date > dateRange.endDate) return false;
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
    [splitDeliveries, dateRange.startDate, dateRange.endDate, normalizedSearchTerm, orderMetaById],
  );

  const sortedDeliveries = useMemo(
    () =>
      [...filteredSourceDeliveries.filter((delivery) => isDeliveryCompleted(delivery))].sort((a, b) => {
        const aTime = new Date(a.scheduled_date || a.created_at).getTime();
        const bTime = new Date(b.scheduled_date || b.created_at).getTime();
        return bTime - aTime;
      }),
    [filteredSourceDeliveries],
  );

  const deliveredCount = sortedDeliveries.length;

  const totalPages = Math.max(1, Math.ceil(sortedDeliveries.length / ITEMS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDeliveries = sortedDeliveries.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);
  const selectedDeliveries = sortedDeliveries.filter((delivery) => selectedDeliveryIds.includes(delivery.__rowKey));
  const bulkDeliveries = selectedDeliveries.length > 0 ? selectedDeliveries : sortedDeliveries;
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

    const header = ["Delivery Code", "Order Code", "Client", "Product", "Delivery Type", "Scheduled Date", "Status", "Delivered Date"];
    const rows = bulkDeliveries.map((delivery) => {
      const isDelivered = isDeliveryCompleted(delivery);

      return [
        delivery.delivery_code || `DEL${String(delivery.id).padStart(3, "0")}`,
        delivery.order_code || `ORD${String(delivery.order_id).padStart(3, "0")}`,
        delivery.client_name || "N/A",
        delivery.product_name || "N/A",
        delivery.delivery_type || "inhand",
        delivery.scheduled_date_formatted || formatDisplayDate(delivery.scheduled_date),
        isDelivered ? "Delivered" : delivery.status,
        isDelivered ? delivery.delivered_date_formatted || formatDisplayDate(delivery.delivered_date) : "Not Delivered",
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
      head: [["Delivery", "Order", "Client", "Product", "Type", "Scheduled", "Delivered", "Status"]],
      body: bulkDeliveries.map((delivery) => {
        const isDelivered =
          isDeliveryCompleted(delivery);

        return [
          delivery.delivery_code || `DEL${String(delivery.id).padStart(3, "0")}`,
          delivery.order_code || `ORD${String(delivery.order_id).padStart(3, "0")}`,
          delivery.client_name || "N/A",
          delivery.product_name || "N/A",
          delivery.delivery_type || "inhand",
          delivery.scheduled_date_formatted || formatDisplayDate(delivery.scheduled_date),
          isDelivered
            ? delivery.delivered_date_formatted || formatDisplayDate(delivery.delivered_date)
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
        const deliveredProductNames = getDeliveredProductNames(orderMeta);
        const productValue =
          (deliveredProductNames.length > 0 ? deliveredProductNames.join(", ") : "") ||
          (delivery.product_name && String(delivery.product_name).trim()) ||
          "N/A";
        const replacementValue =
          (toList(orderMeta?.replacement_product_names).length > 0
            ? toList(orderMeta?.replacement_product_names).join(", ")
            : orderMeta?.replacement_product_name) || "N/A";
        const companiesValue = getDeliveryCompanyName(orderMeta, delivery);
        return `
          <tr>
            <td>${escapeHtml(delivery.id)}</td>
            <td>${escapeHtml(delivery.delivery_code || `DEL${String(delivery.id).padStart(3, "0")}`)}</td>
            <td>${escapeHtml(delivery.order_code || `ORD${String(delivery.order_id).padStart(3, "0")}`)}</td>
            <td>${escapeHtml(orderMeta?.client_name || delivery.client_name || "N/A")}</td>
            <td>${escapeHtml(productValue)}</td>
            <td>${escapeHtml(replacementValue)}</td>
            <td style="white-space: pre-line;">${escapeHtml(companiesValue)}</td>
            <td>${escapeHtml(orderMeta?.warranty_status || "N/A")}</td>
            <td>${escapeHtml(delivery.scheduled_date_formatted || formatDisplayDate(delivery.scheduled_date))}</td>
            <td>${escapeHtml(normalizedDelivered ? "Delivered" : delivery.status)}</td>
            <td>${escapeHtml(
              normalizedDelivered ? delivery.delivered_date_formatted || formatDisplayDate(delivery.delivered_date) : "Not Delivered",
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
              <tr><th>ID</th><th>Delivery</th><th>Order</th><th>Client</th><th>Product</th><th>Replacement</th><th>Companies</th><th>Warranty</th><th>Scheduled</th><th>Status</th><th>Delivered Date</th></tr>
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
      setEditForm({
        delivery_type: normalizeDeliveryTypeValue(source.delivery_type),
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
        address: delivery.address || "",
        contact_person: delivery.contact_person || "",
        contact_phone: delivery.contact_phone || "",
        scheduled_date: delivery.scheduled_date || "",
        scheduled_time: delivery.scheduled_time || "",
        delivery_person: delivery.delivery_person || "",
        status: delivery.status || "scheduled",
        notes: delivery.notes || "",
      });
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
      if (response.ok && data?.success && data?.delivery) {
        const normalized = normalizeDelivery(data.delivery) as Delivery & { product_serial_number?: string; product_id?: number };
        const orderMeta = orderMetaById[normalized.order_id];
        const productId = getDeliveryProductId(normalized);
        const deliveredEntry = getDeliveredProductEntryById(orderMeta, productId);
        const preferredName = delivery.product_name || normalized.product_name || deliveredEntry?.name || "";
        const serialByName = getOrderProductSerialByName(orderMeta, preferredName);
        setSelectedDelivery({
          ...normalized,
          product_name: preferredName || deliveredEntry?.name || "N/A",
          product_serial_numbers:
            toList((delivery as any).product_serial_numbers).length > 0
              ? toList((delivery as any).product_serial_numbers)
              : toSerialListFromDelivery(normalized),
          product_names: toList(orderMeta?.product_names).length > 0 ? toList(orderMeta?.product_names) : toList(orderMeta?.product_name),
          replacement_product_names:
            toList(orderMeta?.replacement_product_names).length > 0
              ? toList(orderMeta?.replacement_product_names)
              : toList(orderMeta?.replacement_product_name),
          replacement_product_serial_numbers: (orderMeta as any)?.replacement_product_serial_numbers,
          product_serial_number:
            deliveredEntry?.serial ||
            getOrderProductSerialById(orderMeta, productId) ||
            serialByName ||
            "",
          product_brand: normalized.product_brand || (orderMeta?.product_brand as any) || delivery.product_brand || "",
          product_model: (orderMeta?.product_model as any) || (delivery as any).product_model || "",
          estimated_cost: orderMeta?.estimated_cost,
          final_cost: orderMeta?.final_cost,
          amount: orderMeta?.final_cost || orderMeta?.estimated_cost || (normalized as any)?.amount || 0,
        } as Delivery);
      } else {
        const fallback = delivery as Delivery & { product_serial_number?: string; product_id?: number };
        const orderMeta = orderMetaById[fallback.order_id];
        const productId = getDeliveryProductId(fallback);
        const deliveredEntry = getDeliveredProductEntryById(orderMeta, productId);
        const preferredName = fallback.product_name || deliveredEntry?.name || "";
        const serialByName = getOrderProductSerialByName(orderMeta, preferredName);
        setSelectedDelivery({
          ...fallback,
          product_name: preferredName || "N/A",
          product_serial_numbers:
            toList((fallback as any).product_serial_numbers).length > 0
              ? toList((fallback as any).product_serial_numbers)
              : toSerialListFromDelivery(fallback),
          product_names: toList(orderMeta?.product_names).length > 0 ? toList(orderMeta?.product_names) : toList(orderMeta?.product_name),
          replacement_product_names:
            toList(orderMeta?.replacement_product_names).length > 0
              ? toList(orderMeta?.replacement_product_names)
              : toList(orderMeta?.replacement_product_name),
          replacement_product_serial_numbers: (orderMeta as any)?.replacement_product_serial_numbers,
          product_serial_number:
            deliveredEntry?.serial ||
            getOrderProductSerialById(orderMeta, productId) ||
            serialByName ||
            "",
          product_brand: fallback.product_brand || (orderMeta?.product_brand as any) || "",
          product_model: (orderMeta?.product_model as any) || (fallback as any).product_model || "",
          estimated_cost: orderMeta?.estimated_cost,
          final_cost: orderMeta?.final_cost,
          amount: orderMeta?.final_cost || orderMeta?.estimated_cost || (fallback as any)?.amount || 0,
        } as Delivery);
      }
    } catch {
      const fallback = delivery as Delivery & { product_serial_number?: string; product_id?: number };
      const orderMeta = orderMetaById[fallback.order_id];
      const productId = getDeliveryProductId(fallback);
      const deliveredEntry = getDeliveredProductEntryById(orderMeta, productId);
      const preferredName = fallback.product_name || deliveredEntry?.name || "";
      const serialByName = getOrderProductSerialByName(orderMeta, preferredName);
      setSelectedDelivery({
        ...fallback,
        product_name: preferredName || "N/A",
        product_serial_numbers:
          toList((fallback as any).product_serial_numbers).length > 0
            ? toList((fallback as any).product_serial_numbers)
            : toSerialListFromDelivery(fallback),
        product_names: toList(orderMeta?.product_names).length > 0 ? toList(orderMeta?.product_names) : toList(orderMeta?.product_name),
        replacement_product_names:
          toList(orderMeta?.replacement_product_names).length > 0
            ? toList(orderMeta?.replacement_product_names)
            : toList(orderMeta?.replacement_product_name),
        replacement_product_serial_numbers: (orderMeta as any)?.replacement_product_serial_numbers,
        product_serial_number:
          deliveredEntry?.serial ||
          getOrderProductSerialById(orderMeta, productId) ||
          serialByName ||
          "",
        product_brand: fallback.product_brand || (orderMeta?.product_brand as any) || "",
        product_model: (orderMeta?.product_model as any) || (fallback as any).product_model || "",
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

      const payload = {
        ...editForm,
        delivery_type: normalizeDeliveryTypeValue(editForm.delivery_type),
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
      setLiveDeliveries((prev) => prev.map((item) => (item.id === nextDelivery.id ? { ...item, ...nextDelivery } : item)));
      setSelectedDelivery((prev) => (prev && prev.id === nextDelivery.id ? { ...prev, ...nextDelivery } : prev));
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
      <div className="section-header">
        <div className="section-title">
          <h2>Delivery Tracking</h2>
          <p>Showing {sortedDeliveries.length} of {sourceDeliveries.length} deliveries</p>
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
            onClick={onViewOrders}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiPackage />
            <span>Service Orders</span>
          </motion.button>
        </div>
      </div>

      <div className="section-filters-row orders-toolbar-row">
        <DateRangeSelector dateRange={dateRange} onDateRangeChange={onDateRangeChange} onPresetClick={onPresetClick} />
        <div className="search-filter">
          <FiSearch className="search-filter-icon" />
          <input
            type="text"
            placeholder="Search deliveries by order, client, product..."
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

      <div className="delivery-stats">
        <div className="delivery-stat-card">
          <div className="delivery-stat-icon" style={{ backgroundColor: "#8B5CF620", color: "#8B5CF6" }}>
            <FiCheckCircle />
          </div>
          <div className="delivery-stat-content">
            <h3>{deliveredCount}</h3>
            <p>Delivered</p>
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

      <div className="table-container">
        {loading || liveLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading deliveries...</p>
          </div>
        ) : sortedDeliveries.length > 0 ? (
          <table className="orders-table delivery-compact-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="row-checkbox"
                    checked={allPageSelected}
                    onChange={togglePageSelection}
                    aria-label="Select all deliveries on this page"
                  />
                </th>
                <th>Client</th>
                <th>Product</th>
                <th>Replacement</th>
                <th>Companies</th>
                <th>Warranty</th>
                <th>Delivery Type</th>
                <th>Status</th>
                <th>Delivered Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDeliveries.map((delivery, index) => {
                const isDelivered = isDeliveryCompleted(delivery);
                const isSelected = selectedDeliveryIds.includes(delivery.__rowKey);
                const orderMeta = orderMetaById[delivery.order_id];
                const deliveredProductNames = getDeliveredProductNames(orderMeta);
                const deliveryItemNames = toList((delivery as any).delivery_item_product_names);
                const productValue =
                  (deliveryItemNames.length > 0 ? deliveryItemNames.join(", ") : "") ||
                  (deliveredProductNames.length > 0 ? deliveredProductNames.join(", ") : "") ||
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
                const companiesValue = getDeliveryCompanyName(orderMeta, delivery);
                const productNamesList =
                  deliveryItemNames.length > 0
                    ? deliveryItemNames
                    : deliveredProductNames.length > 0
                    ? deliveredProductNames
                    : toList(orderMeta?.product_names).length > 0
                      ? toList(orderMeta?.product_names)
                      : toList(orderMeta?.product_name);
                const productIds =
                  parseIds((delivery as any).delivery_item_product_ids).length > 0
                    ? parseIds((delivery as any).delivery_item_product_ids)
                    : parseIds(orderMeta?.product_ids);
                const productMultiLine = getNumberedNameSerialLines(
                  productNamesList.length > 0 ? productNamesList : [productValue],
                  productSerialList,
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
                  product_ids: productIds,
                  product_serial_numbers:
                    toList((delivery as any).delivery_item_serial_numbers).length > 0
                      ? toList((delivery as any).delivery_item_serial_numbers)
                      : toList((delivery as any).product_serial_numbers).length > 0
                        ? toList((delivery as any).product_serial_numbers)
                      : orderMeta?.product_serial_numbers,
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
                  <motion.tr key={delivery.__rowKey} className={isSelected ? "selected-row" : ""} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ backgroundColor: "#f8fafc", cursor: "pointer" }} onClick={() => void openDeliveryDetailModal(delivery)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={isSelected}
                        onChange={() => toggleDeliverySelection(delivery.__rowKey)}
                        aria-label={`Select ${delivery.delivery_code || delivery.id} ${delivery.product_name || ""}`}
                      />
                    </td>
                    <td>
                      <div className="client-cell">
                        <div className="client-avatar-placeholder" style={{ background: "#8B5CF6" }}>
                          {delivery.client_name?.charAt(0) || "C"}
                        </div>
                        <div className="client-info">
                          <span className="client-name" style={{ fontWeight: "600" }}>{orderMeta?.client_name || delivery.client_name || "N/A"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="product-cell">
                        <FiPackage className="product-icon" />
                        <span className="delivery-list-text">{productMultiLine}</span>
                      </div>
                    </td>
                    <td>
                      <span className="delivery-list-text">{replacementMultiLine}</span>
                    </td>
                    <td>
                      <div style={{ whiteSpace: "pre-line", fontSize: "12px", lineHeight: 1.35 }}>
                        {companiesValue}
                      </div>
                    </td>
                    <td><span>{orderMeta?.warranty_status || "N/A"}</span></td>
                    <td>
                      <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                        {String(delivery.delivery_type || "inhand").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div className="status-cell">
                        <div className="status-indicator" style={{ backgroundColor: isDelivered ? "#8B5CF6" : delivery.status === "scheduled" ? "#10B981" : delivery.status === "pending" ? "#DC2626" : "#6B7280" }}></div>
                        <span className="status-label" style={{ color: isDelivered ? "#8B5CF6" : delivery.status === "scheduled" ? "#10B981" : delivery.status === "pending" ? "#DC2626" : "#6B7280", fontWeight: "600" }}>
                          {isDelivered ? "Delivered" : delivery.status}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <FiCalendar />
                        <span>{isDelivered ? delivery.delivered_date_formatted || formatDisplayDate(delivery.delivered_date) : "Not Delivered"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <motion.button className="action-btn print" onClick={(e) => { e.stopPropagation(); onPrintDeliveryReceipt(enrichedDeliveryForReceipt as Delivery); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Receipt Options">
                          <FiPrinter />
                        </motion.button>
                        <motion.button className="action-btn view" onClick={(e) => { e.stopPropagation(); void openEditModal(delivery); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Edit Delivery">
                          <FiEdit2 />
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
                        <h3>Delivery Method</h3>
                        <p>Select how this handover will happen.</p>
                      </div>
                    </div>
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

