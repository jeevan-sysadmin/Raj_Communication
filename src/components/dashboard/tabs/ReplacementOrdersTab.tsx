import OrdersTab from "./OrdersTab";
import type { DateRange, Order, Product } from "../types";

interface ReplacementOrdersTabProps {
  replacementOrders: Order[];
  filteredReplacementOrders: Order[];
  products?: Product[];
  loading: boolean;
  searchTerm: string;
  filterStatus: string;
  filterPriority: string;
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onFilterStatusChange: (value: string) => void;
  onFilterPriorityChange: (value: string) => void;
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
}

const ReplacementOrdersTab = (props: ReplacementOrdersTabProps) => (
  <OrdersTab
    orders={props.replacementOrders}
    filteredOrders={props.filteredReplacementOrders}
    products={props.products}
    loading={props.loading}
    searchTerm={props.searchTerm}
    filterStatus={props.filterStatus}
    filterPriority={props.filterPriority}
    dateRange={props.dateRange}
    onSearchChange={props.onSearchChange}
    onFilterStatusChange={props.onFilterStatusChange}
    onFilterPriorityChange={props.onFilterPriorityChange}
    onDateRangeChange={props.onDateRangeChange}
    onPresetClick={props.onPresetClick}
    onViewOrder={props.onViewOrder}
    onEditOrder={props.onEditOrder}
    onPrintReceipt={props.onPrintReceipt}
    onDeleteOrder={props.onDeleteOrder}
    onCreateOrder={props.onCreateOrder}
    onClearFilters={props.onClearFilters}
    getStatusColor={props.getStatusColor}
    getPriorityColor={props.getPriorityColor}
    getWarrantyColor={props.getWarrantyColor}
    title="Replacement Orders"
    emptyTitle="No replacement orders found"
    emptyDescription="No service orders with a replacement product were found for the current filters."
    createLabel="Create Replacement Order"
    exportFilePrefix="replacement_orders_full_export"
  />
);

export default ReplacementOrdersTab;
