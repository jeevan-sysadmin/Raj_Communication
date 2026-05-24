import { useEffect, useMemo, useState } from "react";
import OrdersTab from "./OrdersTab";
import type { DateRange, Order, Product } from "../types";

const API_BASE_URL = "http://162.141.0.9/raj_communication/api";

interface SunToCompanyApiResponse {
  success?: boolean;
  orders?: Order[];
  products?: Product[];
  rajToComClaims?: Product[];
}

interface SunToCompanyTabProps {
  sunToCompanyClaims: Product[];
  orders: Order[];
  filteredSunToCompanyClaims: Product[];
  loading: boolean;
  searchTerm: string;
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
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
  orders,
  filteredSunToCompanyClaims,
  loading,
  searchTerm,
  dateRange,
  onSearchChange,
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
  const [apiLoaded, setApiLoaded] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiOrders, setApiOrders] = useState<Order[]>([]);
  const [apiClaims, setApiClaims] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadRajToComData = async () => {
      try {
        setApiLoading(true);
        const query =
          dateRange.startDate && dateRange.endDate
            ? `?start_date=${encodeURIComponent(dateRange.startDate)}&end_date=${encodeURIComponent(dateRange.endDate)}`
            : "";
        const response = await fetch(`${API_BASE_URL}/suntocompany.php${query}`);
        const data = (await response.json()) as SunToCompanyApiResponse;

        if (!isMounted) return;

        if (response.ok && data?.success) {
          const normalizeOrder = (order: Order): Order => ({
            ...order,
            id: Number(order.id) || 0,
            client_id: Number(order.client_id) || 0,
            product_id: Number(order.product_id) || 0,
          });

          const normalizeProduct = (product: Product): Product => ({
            ...product,
            id: Number(product.id) || 0,
          });

          const rawProducts = Array.isArray(data.products) ? data.products : [];
          const rawRajToComClaims = Array.isArray(data.rajToComClaims) ? data.rajToComClaims : [];

          const mergedClaims = Array.from(
            new Map(
              [...rawProducts, ...rawRajToComClaims]
                .map(normalizeProduct)
                .filter((product) => product.id > 0)
                .map((product) => [product.id, product]),
            ).values(),
          );

          setApiOrders((Array.isArray(data.orders) ? data.orders : []).map(normalizeOrder));
          setApiClaims(mergedClaims);
          setApiLoaded(true);
        }
      } catch {
        if (!isMounted) return;
      } finally {
        if (isMounted) setApiLoading(false);
      }
    };

    void loadRajToComData();

    return () => {
      isMounted = false;
    };
  }, [dateRange.endDate, dateRange.startDate]);

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

  const orderProductIds = (order: Order) =>
    Array.from(
      new Set([
        ...parseIds((order as Order & { rajtocom_product_ids?: unknown }).rajtocom_product_ids),
        ...parseIds(order.product_ids),
        ...parseIds(order.product_id),
        ...parseStatusProductIds(order),
      ]),
    );

  const hasRajToComFlow = (order: Order) =>
    parseIds((order as Order & { rajtocom_product_ids?: unknown }).rajtocom_product_ids).length > 0 ||
    parseStatusProductIds(order).length > 0;

  const sourceClaims = apiLoaded ? apiClaims : sunToCompanyClaims;

  const sourceFilteredClaims = useMemo(() => {
    if (!apiLoaded) {
      return filteredSunToCompanyClaims;
    }

    return sourceClaims.filter((product) => {
      const matchesSearch =
        !searchTerm ||
        [product.product_name, product.brand, product.model, product.product_code, product.category].some((value) =>
          value?.toLowerCase().includes(searchTerm.toLowerCase()),
        ) ||
        [product.serial_number, product.claim_type].some((value) =>
          value?.toLowerCase().includes(searchTerm.toLowerCase()),
        );

      const createdDate = product.created_at ? new Date(product.created_at) : null;
      const createdIso =
        createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate.toISOString().split("T")[0] : "";

      const matchesDate =
        !dateRange.startDate ||
        !dateRange.endDate ||
        (createdIso >= dateRange.startDate && createdIso <= dateRange.endDate);

      return matchesSearch && matchesDate;
    });
  }, [apiLoaded, sourceClaims, filteredSunToCompanyClaims, searchTerm, dateRange.startDate, dateRange.endDate]);

  const allClaimIds = useMemo(() => new Set(sourceClaims.map((product) => Number(product.id))), [sourceClaims]);
  const filteredClaimIds = useMemo(
    () => new Set(sourceFilteredClaims.map((product) => Number(product.id))),
    [sourceFilteredClaims],
  );

  const sourceOrders = apiLoaded ? apiOrders : orders;

  const toRajToComScopedOrder = (order: Order): Order => {
    const rajIdsFromApi = parseIds((order as Order & { rajtocom_product_ids?: unknown }).rajtocom_product_ids);
    const rajIdsFromStatus = parseStatusProductIds(order);
    const scopedIds = rajIdsFromApi.length > 0 ? rajIdsFromApi : rajIdsFromStatus;

    if (scopedIds.length === 0) {
      return order;
    }

    const scopedNames = scopedIds
      .map((id) => sourceClaims.find((product) => Number(product.id) === id)?.product_name)
      .filter((name): name is string => Boolean(name && name.trim()));

    return {
      ...order,
      product_id: scopedIds[0] ?? order.product_id,
      product_ids: scopedIds,
      product_name: scopedNames[0] || order.product_name,
      product_names: scopedNames.length > 0 ? scopedNames : order.product_names,
    };
  };

  const ordersForTab = useMemo(() => {
    if (apiLoaded) {
      return sourceOrders.map(toRajToComScopedOrder);
    }

    const base =
      allClaimIds.size === 0
        ? sourceOrders.filter(hasRajToComFlow)
        : sourceOrders.filter((order) => orderProductIds(order).some((id) => allClaimIds.has(id)));

    return base.map(toRajToComScopedOrder);
  }, [apiLoaded, sourceOrders, allClaimIds, sourceClaims]);
  const filteredOrdersForTab = useMemo(
    () =>
      filteredClaimIds.size === 0
        ? ordersForTab
        : ordersForTab.filter((order) => orderProductIds(order).some((id) => filteredClaimIds.has(id))),
    [ordersForTab, filteredClaimIds],
  );

  return (
    <OrdersTab
      orders={ordersForTab}
      filteredOrders={filteredOrdersForTab}
      products={sourceClaims}
      loading={loading || apiLoading}
      searchTerm={searchTerm}
      dateRange={dateRange}
      onSearchChange={onSearchChange}
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
    />
  );
};

export default SunToCompanyTab;
