import ClaimProductsTab from "./ClaimProductsTab";
import type { DateRange, Order, Product } from "../types";

interface CompanyClaimTabProps {
  companyClaims: Product[];
  orders: Order[];
  filteredCompanyClaims: Product[];
  loading: boolean;
  searchTerm: string;
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onPresetClick: (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear") => void;
  onClearFilters: () => void;
}

const CompanyClaimTab = ({
  companyClaims,
  orders,
  filteredCompanyClaims,
  loading,
  searchTerm,
  dateRange,
  onSearchChange,
  onDateRangeChange,
  onPresetClick,
  onClearFilters,
}: CompanyClaimTabProps) => (
  <ClaimProductsTab
    claimLabel="Company Claim"
    emptyLabel="Company Claim"
    filePrefix="company_claim"
    accentColor="#2563eb"
    products={companyClaims}
    orders={orders}
    filteredProducts={filteredCompanyClaims}
    loading={loading}
    searchTerm={searchTerm}
    dateRange={dateRange}
    onSearchChange={onSearchChange}
    onDateRangeChange={onDateRangeChange}
    onPresetClick={onPresetClick}
    onClearFilters={onClearFilters}
  />
);

export default CompanyClaimTab;
