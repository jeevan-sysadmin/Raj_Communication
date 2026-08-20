import { useMemo } from "react";
import OrdersTab from "./OrdersTab";
import type { DateRange, Order, Product } from "../types";
import { parseAppDate } from "../utils";

interface CompanyToRajProduct extends Product {
  client_name?: string;
  client_phone?: string;
  order_id?: number | string;
  order_code?: string;
  company_name?: string;
  company_names?: string[];
  company_names_text?: string;
  quantity?: number | string;
  qty?: number | string;
}

interface CompanyToSunTabProps {
  companyToSunClaims: Product[];
  orders: Order[];
  filteredCompanyToSunClaims: Product[];
  loading: boolean;
  searchTerm: string;
  companyFilterValue?: string;
  companyFilterOptions?: string[];
  productFlowStatusFilterValue?: string;
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

const CompanyToSunTab = ({
  companyToSunClaims,
  orders,
  filteredCompanyToSunClaims,
  loading,
  searchTerm,
  companyFilterValue = "",
  companyFilterOptions,
  productFlowStatusFilterValue = "",
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
}: CompanyToSunTabProps) => {
  void getPriorityColor;
  void filteredCompanyToSunClaims;

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

  const parseDateValue = (value: unknown) => {
    const normalizedValue = String(value ?? "").trim();
    if (!normalizedValue) return NaN;

    const parsedTime = new Date(normalizedValue).getTime();
    return Number.isFinite(parsedTime) ? parsedTime : NaN;
  };

  const parseProductStatusDatesMap = (
    order: Order,
  ): Record<string, { pending?: string | null; rajtocom?: string | null; comtoraj?: string | null; deliveryed?: string | null }> => {
    const raw = (order as Order & { product_status_dates_map?: unknown }).product_status_dates_map;
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

    return Object.entries(map).reduce<
      Record<string, { pending?: string | null; rajtocom?: string | null; comtoraj?: string | null; deliveryed?: string | null }>
    >((acc, [productId, dates]) => {
      if (!dates || typeof dates !== "object" || Array.isArray(dates)) return acc;
      acc[productId] = dates as { pending?: string | null; rajtocom?: string | null; comtoraj?: string | null; deliveryed?: string | null };
      return acc;
    }, {});
  };

  const getOrderSortTimestamp = (order: Order) => {
    const statusDatesMap = parseProductStatusDatesMap(order);
    const latestComToRajTime = orderProductIds(order).reduce((latest, productId) => {
      const productDates = statusDatesMap[String(productId)];
      const comToRajTime = parseDateValue(productDates?.comtoraj);
      return Number.isFinite(comToRajTime) ? Math.max(latest, comToRajTime) : latest;
    }, Number.NEGATIVE_INFINITY);

    if (Number.isFinite(latestComToRajTime)) return latestComToRajTime;

    const createdTime = parseDateValue(order.created_at);
    if (Number.isFinite(createdTime)) return createdTime;

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
  const normalizeStatus = (status: unknown) =>
    String(status ?? "")
      .trim()
      .toLowerCase()
      .replaceAll("_", "")
      .replaceAll(" ", "")
      .replaceAll("-", "");

  const parseStatusMap = (order: Order): Record<string, string> => {
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

    return Object.entries(map).reduce<Record<string, string>>((acc, [productId, status]) => {
      acc[productId] = normalizeStatus(status);
      return acc;
    }, {});
  };

  const parseStatusProductIds = (order: Order) => {
    const map = parseStatusMap(order);
    return Object.entries(map)
      .filter(([, status]) => status === "comtoraj")
      .map(([productId]) => Number(productId))
      .filter((productId) => Number.isInteger(productId) && productId > 0);
  };

  const parseOrderProductIds = (order: Order) =>
    Array.from(
      new Set(
        [
          ...(Array.isArray(order.product_ids) ? order.product_ids : order.product_ids ? [order.product_ids] : []),
          order.product_id,
        ]
          .flat()
          .map((productId) => Number(productId))
          .filter((productId) => Number.isInteger(productId) && productId > 0),
      ),
    );

  const orderProductIds = (order: Order) =>
    Array.from(
      new Set([
        ...parseStatusProductIds(order),
      ]),
    );

  const hasComToRajFlow = (order: Order) => parseStatusProductIds(order).length > 0;

  const normalizedClaims = useMemo(
    () =>
      companyToSunClaims
        .map((product) => ({ ...(product as CompanyToRajProduct), id: Number(product.id) || 0 }))
        .filter((product) => product.id > 0),
    [companyToSunClaims],
  );

  const productsById = useMemo(
    () => new Map(normalizedClaims.map((product) => [product.id, product])),
    [normalizedClaims],
  );

  const allClaimIds = useMemo(
    () => new Set(Array.from(productsById.keys())),
    [productsById],
  );
  const toComToRajScopedOrder = (order: Order): Order => {
    const comToRajIds = orderProductIds(order);
    const scopedNames = comToRajIds
      .map((id) => productsById.get(id)?.product_name)
      .filter((name): name is string => Boolean(name && name.trim()));

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
        Object.entries(parsed as Record<string, unknown>).filter(([key]) => comToRajIds.includes(Number(key))),
      ) as T;
    };
    const scopedRepairingStatusMap = scopeMapByIds<Record<string, string>>(
      (order as Order & { repairing_status_map?: unknown }).repairing_status_map,
    );
    const normalizedScopedRepairingStatusMap =
      scopedRepairingStatusMap &&
      typeof scopedRepairingStatusMap === "object" &&
      !Array.isArray(scopedRepairingStatusMap) &&
      Object.keys(scopedRepairingStatusMap).length > 0
        ? scopedRepairingStatusMap
        : Object.fromEntries(comToRajIds.map((id) => [String(id), "not ready"]));

    return {
      ...order,
      product_id: comToRajIds[0] ?? (Number(order.product_id) || 0),
      product_ids: comToRajIds,
      product_name: scopedNames[0] || order.product_name,
      product_names: scopedNames.length > 0 ? scopedNames : order.product_names,
      product_quantity_map: scopeMapByIds<Record<string, number>>((order as Order & { product_quantity_map?: unknown }).product_quantity_map),
      product_status_map: scopeMapByIds<Record<string, string>>(order.product_status_map),
      product_status_dates_map: scopeMapByIds<Record<string, { pending?: string | null; rajtocom?: string | null; comtoraj?: string | null; deliveryed?: string | null }>>((order as Order & { product_status_dates_map?: unknown }).product_status_dates_map),
      repairing_status_map: normalizedScopedRepairingStatusMap,
      issue_description_map: scopeMapByIds<Record<string, string>>((order as Order & { issue_description_map?: unknown }).issue_description_map),
      accessory_type_map: scopeMapByIds<Record<string, string>>((order as Order & { accessory_type_map?: unknown }).accessory_type_map),
      result_text_map: scopeMapByIds<Record<string, string>>((order as Order & { result_text_map?: unknown }).result_text_map),
    };
  };

  const createFallbackOrderFromProduct = (product: CompanyToRajProduct): Order => {
    const productId = Number(product.id) || 0;
    const fallbackOrderId = Number(product.order_id) || (900000000 + productId);
    const fallbackOrderCode = String(product.order_code || `COMTORAJ-${productId}`);
    const createdAt = product.created_at || new Date().toISOString();
    const fallbackCompanyNames = Array.from(
      new Set(
        [
          ...(Array.isArray(product.company_names) ? product.company_names : []),
          ...String(product.company_names_text || product.company_name || "")
            .split("||")
            .map((value) => value.trim())
            .filter(Boolean),
        ].map((value) => String(value || "").trim()).filter(Boolean),
      ),
    );

    return {
      id: fallbackOrderId,
      order_code: fallbackOrderCode,
      company_name: fallbackCompanyNames.join(" || "),
      company_names: fallbackCompanyNames,
      client_id: 0,
      client_name: String(product.client_name || ""),
      client_phone: String(product.client_phone || ""),
      product_id: productId,
      product_name: product.product_name || `Product #${productId}`,
      product_ids: [productId],
      product_names: [product.product_name || `Product #${productId}`],
      product_quantity_map: { [productId]: Math.max(1, Number(product.quantity ?? product.qty ?? 1) || 1) },
      product_status_map: { [productId]: "comtoraj" },
      repairing_status_map: { [productId]: "not ready" },
      issue_description: "",
      warranty_status: "out_of_warranty",
      estimated_cost: String(product.price || "0"),
      final_cost: String(product.price || "0"),
      payment_status: "pending",
      estimated_delivery_date: "",
      status: "pending",
      priority: "medium",
      notes: "",
      created_at: createdAt,
      staff_id: 0,
      staff_name: "",
      serial_number: product.serial_number || "",
      product_brand: product.brand || "",
      product_model: product.model || "",
    };
  };

  const ordersForTab = useMemo(() => {
    const matchedOrders = orders.filter(hasComToRajFlow);

    const orderLinkedClaimIds = new Set(
      orders.flatMap((order) => parseOrderProductIds(order)).filter((productId) => allClaimIds.size === 0 || allClaimIds.has(productId)),
    );

    const scopedOrders = matchedOrders
      .map(toComToRajScopedOrder)
      .sort((left, right) => getOrderSortTimestamp(right) - getOrderSortTimestamp(left));
    const coveredProductIds = new Set(scopedOrders.flatMap((order) => orderProductIds(order)));

    const fallbackOrders = normalizedClaims
      .filter((product) => !coveredProductIds.has(Number(product.id)))
      .filter((product) => !orderLinkedClaimIds.has(Number(product.id)))
      .map(createFallbackOrderFromProduct);

    return [...scopedOrders, ...fallbackOrders].sort(
      (left, right) => getOrderSortTimestamp(right) - getOrderSortTimestamp(left),
    );
  }, [orders, allClaimIds, productsById, normalizedClaims]);

  const filteredOrdersForTab = useMemo(() => {
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
  }, [ordersForTab, companyFilterValue, searchTerm, dateRange.startDate, dateRange.endDate]);

  return (
    <OrdersTab
      orders={ordersForTab}
      filteredOrders={filteredOrdersForTab}
      products={companyToSunClaims}
      loading={loading}
      searchTerm={searchTerm}
      searchHandledByParent
      companyFilterValue={companyFilterValue}
      companyFilterOptions={companyFilterOptions}
      productFlowStatusFilterValue={productFlowStatusFilterValue}
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
      title="Company To Raj Orders"
      emptyTitle="No Company To Raj orders found"
      emptyDescription="No orders with ComToRaj product flow were found for the current filters."
      createLabel="Create New Order"
      companyReportVariant="rma-delivery-challan"
    />
  );
};

export default CompanyToSunTab;
