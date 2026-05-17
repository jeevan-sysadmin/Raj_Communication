import ClaimProductsTab from "./ClaimProductsTab";
import type { DateRange, Order, Product } from "../types";

interface ShopclaimTabProps {
  shopClaims: Product[];
  orders: Order[];
  filteredShopClaims: Product[];
  loading: boolean;
  searchTerm: string;
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onPresetClick: (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear") => void;
  onClearFilters: () => void;
}

const ShopclaimTab = ({
  shopClaims,
  orders,
  filteredShopClaims,
  loading,
  searchTerm,
  dateRange,
  onSearchChange,
  onDateRangeChange,
  onPresetClick,
  onClearFilters,
}: ShopclaimTabProps) => (
  <ClaimProductsTab
    claimLabel="Shop Claim"
    emptyLabel="Shop Claim"
    filePrefix="shop_claim"
    accentColor="#d97706"
    products={shopClaims}
    orders={orders}
    filteredProducts={filteredShopClaims}
    loading={loading}
    searchTerm={searchTerm}
    dateRange={dateRange}
    onSearchChange={onSearchChange}
    onDateRangeChange={onDateRangeChange}
    onPresetClick={onPresetClick}
    onClearFilters={onClearFilters}
  />
);

export default ShopclaimTab;
