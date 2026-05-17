import ClaimProductsTab from "./ClaimProductsTab";
import type { DateRange, Order, Product } from "../types";

interface SpareProductsTabProps {
  spareProducts: Product[];
  orders: Order[];
  filteredSpareProducts: Product[];
  loading: boolean;
  searchTerm: string;
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onPresetClick: (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear") => void;
  onClearFilters: () => void;
}

const SpareProductsTab = ({
  spareProducts,
  orders,
  filteredSpareProducts,
  loading,
  searchTerm,
  dateRange,
  onSearchChange,
  onDateRangeChange,
  onPresetClick,
  onClearFilters,
}: SpareProductsTabProps) => (
  <ClaimProductsTab
    claimLabel="Spare Products"
    emptyLabel="Spare Product"
    filePrefix="spare_products"
    accentColor="#ea580c"
    products={spareProducts}
    orders={orders}
    filteredProducts={filteredSpareProducts}
    loading={loading}
    searchTerm={searchTerm}
    dateRange={dateRange}
    onSearchChange={onSearchChange}
    onDateRangeChange={onDateRangeChange}
    onPresetClick={onPresetClick}
    onClearFilters={onClearFilters}
  />
);

export default SpareProductsTab;
