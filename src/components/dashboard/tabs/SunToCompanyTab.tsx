import { useMemo } from "react";
import OrdersTab from "./OrdersTab";
import type { DateRange, Order, Product } from "../types";
import { parseAppDate } from "../utils";

interface SunToCompanyTabProps {
  sunToCompanyClaims: Product[];
  products?: Product[];
  orders: Order[];
  filteredSunToCompanyClaims: Product[];
  loading: boolean;
  searchTerm: string;
  companyFilterValue?: string;
  companyFilterOptions?: string[];
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onCompanyFilterChange?: (value: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onPresetClick: (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear") => void;
  onClearFilters: () => void;
  onViewOrder?: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  onPrintReceipt?: (order: Order) => void;
  onDeleteOrder?: (order: Order) => void;
  onCreateOrder?: () => void;
  getStatusColor?: (status: string) => string;
  getPriorityColor?: (priority: string) => string;
  getWarrantyColor?: (warranty: string) => string;
}

const SunToCompanyTab = ({
  sunToCompanyClaims,
  products = [],
  orders,
  filteredSunToCompanyClaims,
  loading,
  searchTerm,
  companyFilterValue = "",
  companyFilterOptions,
  dateRange,
  onSearchChange,
  onCompanyFilterChange,
  onDateRangeChange,
  onPresetClick,
  onClearFilters,
  onViewOrder,
  onEditOrder,
  onPrintReceipt,
  onDeleteOrder,
  onCreateOrder,
  getStatusColor,
  getPriorityColor,
  getWarrantyColor,
}: SunToCompanyTabProps) => {
  void getPriorityColor;

  const normalizeSearchValue = (value: unknown) => String(value || "").trim().toLowerCase();
  const normalizeSerialSearchValue = (value: unknown) =>
    String(value || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();

  const isWithinDateRange = (value: unknown) => {
    const rawValue = String(value || "").trim();
    if (!rawValue) return false;

    const parsedValue = parseAppDate(rawValue);
    if (!parsedValue) return false;

    const [startDate, endDate] = [dateRange.startDate, dateRange.endDate].map((entry) => String(entry || "").trim());
    if (!startDate && !endDate) return true;

    const normalizedValue = `${parsedValue.getFullYear()}-${String(parsedValue.getMonth() + 1).padStart(2, "0")}-${String(parsedValue.getDate()).padStart(2, "0")}`;
    if (startDate && normalizedValue < startDate) return false;
    if (endDate && normalizedValue > endDate) return false;
    return true;
  };

  const getOrderSortTimestamp = (order: Order) => {
    const parsedTime = order.created_at ? new Date(order.created_at).getTime() : NaN;
    if (Number.isFinite(parsedTime)) return parsedTime;
    return Number(order.id) || 0;
  };

  const parseCompanyNames = (order: Order) => {
    const fromDirect = [
      ...(Array.isArray(order.company_names) ? order.company_names : []),
      ...String((order as Order & { company_names_text?: string }).company_names_text || order.company_name || "")
        .split("||")
        .map((value) => value.trim())
        .filter(Boolean),
    ];
    const rawMap = (order as Order & {
      company_product_name_map?: Record<string, { company_name?: string; product_names?: string[] | string }> | string;
    }).company_product_name_map;
    let mapNames: string[] = [];

    if (typeof rawMap === "string") {
      try {
        const parsed = JSON.parse(rawMap);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          mapNames = Object.values(parsed as Record<string, { company_name?: string }>)
            .map((entry) => String(entry?.company_name || "").trim())
            .filter(Boolean);
        }
      } catch {
        mapNames = [];
      }
    } else if (rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)) {
      mapNames = Object.values(rawMap)
        .map((entry) => String(entry?.company_name || "").trim())
        .filter(Boolean);
    }

    return Array.from(new Set([...fromDirect.map((name) => String(name || "").trim()).filter(Boolean), ...mapNames]));
  };

  const parseIds = (value: unknown): number[] => {
    const raw =
      Array.isArray(value)
        ? value
        : typeof value === "string"
          ? (() => {
              const trimmed = value.trim();
              if (!trimmed) return [];
              try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? parsed : trimmed.split(",");
              } catch {
                return trimmed.split(",");
              }
            })()
          : value !== null && value !== undefined
            ? [value]
            : [];

    return Array.from(
      new Set(
        raw
          .map((entry) => Number(entry))
          .filter((entry) => Number.isInteger(entry) && entry > 0),
      ),
    );
  };

  const parseStatusProductIds = (order: Order) => {
    const raw = order.product_status_map;
    let map: Record<string, unknown> = {};

    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          map = parsed as Record<string, unknown>;
        }
      } catch {
        map = {};
      }
    } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      map = raw as Record<string, unknown>;
    }

    return Object.entries(map)
      .filter(([, status]) => {
        const normalized = String(status ?? "")
          .trim()
          .toLowerCase()
          .replaceAll("_", "")
          .replaceAll(" ", "");
        return normalized === "rajtocom";
      })
      .map(([productId]) => Number(productId))
      .filter((productId) => Number.isInteger(productId) && productId > 0);
  };

  const hasRajToComFlow = (order: Order) =>
    parseIds((order as Order & { rajtocom_product_ids?: unknown }).rajtocom_product_ids).length > 0 ||
    parseStatusProductIds(order).length > 0;

  const sourceClaims = sunToCompanyClaims;
  const sourceProducts = products.length > 0 ? products : sunToCompanyClaims;
  void filteredSunToCompanyClaims;

  const sourceOrders = orders;

  const toRajToComScopedOrder = (order: Order): Order => {
    const rajIdsFromApi = parseIds((order as Order & { rajtocom_product_ids?: unknown }).rajtocom_product_ids);
    const rajIdsFromStatus = parseStatusProductIds(order);
    const scopedIds = rajIdsFromApi.length > 0 ? rajIdsFromApi : rajIdsFromStatus;

    if (scopedIds.length === 0) {
      return order;
    }

    const orderedIds = parseIds(order.product_ids);
    const orderedNames =
      Array.isArray(order.product_names)
        ? order.product_names.map((value) => String(value || "").trim())
        : [];
    const orderedSerials =
      Array.isArray(order.product_serial_numbers)
        ? order.product_serial_numbers.map((value) => String(value || "").trim())
        : [];
    const scopedEntries = scopedIds.map((id) => {
      const orderIndex = orderedIds.findIndex((candidateId) => candidateId === id);
      const fallbackProduct = sourceClaims.find((product) => Number(product.id) === id);
      return {
        id,
        name:
          (orderIndex >= 0 ? String(orderedNames[orderIndex] || "").trim() : "") ||
          String(fallbackProduct?.product_name || "").trim(),
        serialNumber:
          (orderIndex >= 0 ? String(orderedSerials[orderIndex] || "").trim() : "") ||
          String(fallbackProduct?.serial_number || "").trim(),
      };
    });
    const scopedNames = scopedEntries
      .map((entry) => entry.name)
      .filter((name): name is string => Boolean(name && name.trim()));
    const scopedSerialNumbers = scopedEntries
      .map((entry) => entry.serialNumber)
      .filter((serial): serial is string => Boolean(serial && serial.trim()));

    const scopeMapByIds = <T extends Record<string, unknown>>(value: unknown): T | string | undefined => {
      if (!value) return value as undefined;
      let parsed: unknown = value;
      if (typeof value === "string") {
        try {
          parsed = JSON.parse(value);
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
        } catch {
          return value;
        }
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return value as string | undefined;
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(([key]) => scopedIds.includes(Number(key))),
      ) as T;
    };

    return {
      ...order,
      product_id: scopedIds[0] ?? order.product_id,
      product_ids: scopedIds,
      product_name: scopedNames[0] || order.product_name,
      product_names: scopedNames.length > 0 ? scopedNames : order.product_names,
      product_serial_numbers: scopedSerialNumbers.length > 0 ? scopedSerialNumbers : order.product_serial_numbers,
      product_quantity_map: scopeMapByIds<Record<string, number>>((order as Order & { product_quantity_map?: unknown }).product_quantity_map),
      product_status_map: scopeMapByIds<Record<string, string>>(order.product_status_map),
      product_status_dates_map: scopeMapByIds<Record<string, { pending?: string | null; rajtocom?: string | null; comtoraj?: string | null; deliveryed?: string | null }>>((order as Order & { product_status_dates_map?: unknown }).product_status_dates_map),
      repairing_status_map: scopeMapByIds<Record<string, string>>((order as Order & { repairing_status_map?: unknown }).repairing_status_map),
      issue_description_map: scopeMapByIds<Record<string, string>>((order as Order & { issue_description_map?: unknown }).issue_description_map),
      accessory_type_map: scopeMapByIds<Record<string, string>>((order as Order & { accessory_type_map?: unknown }).accessory_type_map),
      result_text_map: scopeMapByIds<Record<string, string>>((order as Order & { result_text_map?: unknown }).result_text_map),
    };
  };

  const ordersForTab = useMemo(() => {
    return sourceOrders
      .filter(hasRajToComFlow)
      .map(toRajToComScopedOrder)
      .sort((left, right) => getOrderSortTimestamp(right) - getOrderSortTimestamp(left));
  }, [sourceOrders, sourceClaims]);
  const filteredOrdersForTab = useMemo(
    () => {
      const normalizedSearch = normalizeSearchValue(searchTerm);
      const normalizedSerialSearch = normalizeSerialSearchValue(searchTerm);
      const normalizedCompanyFilter = String(companyFilterValue || "").trim().toLowerCase();
      const base = ordersForTab.filter((order) => isWithinDateRange(order.created_at));

      const companyFiltered = !normalizedCompanyFilter
        ? base
        : base.filter((order) =>
            parseCompanyNames(order).some((name) => String(name || "").trim().toLowerCase() === normalizedCompanyFilter),
          );

      if (!normalizedSearch) return companyFiltered;

      return companyFiltered.filter((order) => {
        const serialBlob = [
          ...(Array.isArray(order.product_serial_numbers) ? order.product_serial_numbers : []),
          ...(Array.isArray(order.replacement_product_serial_numbers) ? order.replacement_product_serial_numbers : []),
          order.serial_number || "",
          order.replacement_serial_number || "",
        ]
          .map((value) => normalizeSearchValue(value))
          .filter(Boolean)
          .join(" ");
        const normalizedSerialBlob = [
          ...(Array.isArray(order.product_serial_numbers) ? order.product_serial_numbers : []),
          ...(Array.isArray(order.replacement_product_serial_numbers) ? order.replacement_product_serial_numbers : []),
          order.serial_number || "",
          order.replacement_serial_number || "",
        ]
          .map((value) => normalizeSerialSearchValue(value))
          .filter(Boolean)
          .join(" ");
        const searchBlob = [
          order.order_code,
          order.client_name,
          order.client_phone,
          order.issue_description,
          order.staff_name || "",
          order.product_name || "",
          ...(Array.isArray(order.product_names) ? order.product_names : []),
          order.replacement_product_name || "",
          order.company_name || "",
          ...(Array.isArray(order.company_names) ? order.company_names : []),
          (order as Order & { company_names_text?: string }).company_names_text || "",
          ...parseCompanyNames(order),
          order.product_brand || "",
          order.product_model || "",
          order.notes || "",
        ]
          .map((value) => normalizeSearchValue(value))
          .filter(Boolean)
          .join(" ");

        return searchBlob.includes(normalizedSearch) ||
          serialBlob.includes(normalizedSearch) ||
          (normalizedSerialSearch ? normalizedSerialBlob.includes(normalizedSerialSearch) : false);
      });
    },
    [ordersForTab, companyFilterValue, searchTerm, dateRange.startDate, dateRange.endDate],
  );

  return (
    <OrdersTab
      orders={ordersForTab}
      filteredOrders={filteredOrdersForTab}
      products={sourceProducts}
      loading={loading}
      searchTerm={searchTerm}
      searchHandledByParent
      companyFilterValue={companyFilterValue}
      companyFilterOptions={companyFilterOptions}
      dateRange={dateRange}
      onSearchChange={onSearchChange}
      onCompanyFilterChange={onCompanyFilterChange}
      onDateRangeChange={onDateRangeChange}
      onPresetClick={onPresetClick}
      onViewOrder={onViewOrder || (() => {})}
      onEditOrder={onEditOrder || (() => {})}
      onPrintReceipt={onPrintReceipt || (() => {})}
      onDeleteOrder={onDeleteOrder || (() => {})}
      onCreateOrder={onCreateOrder || (() => {})}
      onClearFilters={onClearFilters}
      getStatusColor={getStatusColor || (() => "#6B7280")}
      getPriorityColor={getPriorityColor || (() => "#6B7280")}
      getWarrantyColor={getWarrantyColor || (() => "#6B7280")}
      title="RajTo Company Orders"
      emptyTitle="No RajTo Company orders found"
      emptyDescription="No orders with RajToCom product flow were found for the current filters."
      createLabel="Create New Order"
      lockedProductFlowStatusValue="rajtocom"
      hideProductFlowStatusFilter
    />
  );
};

export default SunToCompanyTab;
