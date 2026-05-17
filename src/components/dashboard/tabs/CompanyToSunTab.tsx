import { useMemo, useState } from "react";
import OrdersTab from "./OrdersTab";
import type { DateRange, Order, Product } from "../types";

interface CompanyToRajProduct extends Product {
  client_name?: string;
  client_phone?: string;
  order_id?: number | string;
  order_code?: string;
}

interface CompanyToSunTabProps {
  companyToSunClaims: Product[];
  orders: Order[];
  filteredCompanyToSunClaims: Product[];
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

const CompanyToSunTab = ({
  companyToSunClaims,
  orders,
  filteredCompanyToSunClaims,
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
}: CompanyToSunTabProps) => {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

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
  const filteredClaimIds = useMemo(
    () => new Set(filteredCompanyToSunClaims.map((product) => Number(product.id))),
    [filteredCompanyToSunClaims],
  );

  const toComToRajScopedOrder = (order: Order): Order => {
    const comToRajIds = orderProductIds(order);
    const scopedNames = comToRajIds
      .map((id) => productsById.get(id)?.product_name)
      .filter((name): name is string => Boolean(name && name.trim()));

    return {
      ...order,
      product_id: comToRajIds[0] ?? (Number(order.product_id) || 0),
      product_ids: comToRajIds,
      product_name: scopedNames[0] || order.product_name,
      product_names: scopedNames.length > 0 ? scopedNames : order.product_names,
    };
  };

  const createFallbackOrderFromProduct = (product: CompanyToRajProduct): Order => {
    const productId = Number(product.id) || 0;
    const fallbackOrderId = Number(product.order_id) || (900000000 + productId);
    const fallbackOrderCode = String(product.order_code || `COMTORAJ-${productId}`);
    const createdAt = product.created_at || new Date().toISOString();

    return {
      id: fallbackOrderId,
      order_code: fallbackOrderCode,
      client_id: 0,
      client_name: String(product.client_name || ""),
      client_phone: String(product.client_phone || ""),
      product_id: productId,
      product_name: product.product_name || `Product #${productId}`,
      product_ids: [productId],
      product_names: [product.product_name || `Product #${productId}`],
      product_status_map: { [productId]: "comtoraj" },
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
    const matchedOrders = orders
      .filter(hasComToRajFlow)
      .filter((order) => orderProductIds(order).some((id) => allClaimIds.has(id)));

    const scopedOrders = matchedOrders.map(toComToRajScopedOrder);
    const coveredProductIds = new Set(scopedOrders.flatMap((order) => orderProductIds(order)));

    const fallbackOrders = normalizedClaims
      .filter((product) => !coveredProductIds.has(Number(product.id)))
      .map(createFallbackOrderFromProduct);

    return [...scopedOrders, ...fallbackOrders];
  }, [orders, allClaimIds, productsById, normalizedClaims]);

  const filteredOrdersForTab = useMemo(
    () => ordersForTab.filter((order) => orderProductIds(order).some((id) => filteredClaimIds.has(id))),
    [ordersForTab, filteredClaimIds],
  );

  return (
    <OrdersTab
      orders={ordersForTab}
      filteredOrders={filteredOrdersForTab}
      products={companyToSunClaims}
      loading={loading}
      searchTerm={searchTerm}
      filterStatus={filterStatus}
      filterPriority={filterPriority}
      dateRange={dateRange}
      onSearchChange={onSearchChange}
      onFilterStatusChange={setFilterStatus}
      onFilterPriorityChange={setFilterPriority}
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
    />
  );
};

export default CompanyToSunTab;
