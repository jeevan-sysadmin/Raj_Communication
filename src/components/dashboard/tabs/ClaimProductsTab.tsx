import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FiChevronLeft,
  FiChevronRight,
  FiPackage,
  FiSearch,
  FiShoppingBag,
  FiX,
} from "react-icons/fi";
import BulkActionPanel from "../BulkActionPanel";
import DateRangeSelector from "../DateRangeSelector";
import ClaimProductDetailModal from "../modals/ClaimProductDetailModal";
import { exportStyledPdfReport } from "../pdfExport";
import type { DateRange, Order, Product } from "../types";
import { formatCurrency, formatDisplayDate } from "../utils";

interface ClaimProductsTabProps {
  claimLabel: string;
  emptyLabel: string;
  filePrefix: string;
  accentColor: string;
  products: Product[];
  orders: Order[];
  filteredProducts: Product[];
  loading: boolean;
  searchTerm: string;
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onPresetClick: (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear") => void;
  onClearFilters: () => void;
}

const ITEMS_PER_PAGE = 20;

const formatLabel = (value?: string) =>
  value
    ? value
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "N/A";

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const ClaimProductsTab = ({
  claimLabel,
  emptyLabel,
  filePrefix,
  accentColor,
  products,
  orders,
  filteredProducts,
  loading,
  searchTerm,
  dateRange,
  onSearchChange,
  onDateRangeChange,
  onPresetClick,
  onClearFilters,
}: ClaimProductsTabProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);
  const selectedProducts = filteredProducts.filter((product) => selectedProductIds.includes(product.id));
  const bulkProducts = selectedProducts.length > 0 ? selectedProducts : filteredProducts;
  const allPageSelected =
    paginatedProducts.length > 0 && paginatedProducts.every((product) => selectedProductIds.includes(product.id));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedProductIds((prev) => prev.filter((id) => filteredProducts.some((product) => product.id === id)));
  }, [filteredProducts]);

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  };

  const togglePageSelection = () => {
    const pageIds = paginatedProducts.map((product) => product.id);
    if (allPageSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedProductIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const selectAllFilteredProducts = () => {
    setSelectedProductIds(filteredProducts.map((product) => product.id));
  };

  const clearSelection = () => {
    setSelectedProductIds([]);
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

  const exportToCSV = () => {
    if (bulkProducts.length === 0) return;

    const header = ["Product Code", "Name", "Serial", "Brand", "Model", "Claim Type", "Category", "Price", "Status", "Created"];
    const rows = bulkProducts.map((product) =>
      [
        product.product_code,
        product.product_name,
        product.serial_number || "N/A",
        product.brand || "N/A",
        product.model || "N/A",
        formatLabel(product.claim_type),
        formatLabel(product.category),
        formatCurrency(product.price),
        formatLabel(product.status),
        formatDisplayDate(product.created_at),
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );

    downloadFile(
      `\uFEFF${header.join(",")}\n${rows.join("\n")}`,
      `${filePrefix}_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const exportToPDF = () => {
    if (bulkProducts.length === 0) return;
    const totalValue = bulkProducts.reduce((sum, product) => sum + Number(product.price || 0), 0);
    const uniqueBrands = new Set(bulkProducts.map((product) => product.brand).filter(Boolean)).size;
    const linkedOrders = bulkProducts.reduce(
      (sum, product) => sum + orders.filter((order) => order.product_id === product.id).length,
      0,
    );

    exportStyledPdfReport({
      filename: `${filePrefix}_${new Date().toISOString().split("T")[0]}.pdf`,
      title: `${claimLabel} Report`,
      subtitle: "Claim inventory summary with serial tracking, product identity, and current status.",
      scopeLabel:
        selectedProducts.length > 0
          ? `${selectedProducts.length} selected products`
          : `${filteredProducts.length} filtered products`,
      accentColor,
      metrics: [
        { label: "Included", value: `${bulkProducts.length} items` },
        { label: "Inventory Value", value: `Rs. ${formatCurrency(totalValue)}` },
        { label: "Brands", value: `${uniqueBrands}` },
        { label: "Orders Linked", value: `${linkedOrders}` },
      ],
      head: [["Code", "Name", "Serial", "Brand", "Model", "Price", "Status"]],
      body: bulkProducts.map((product) => [
        product.product_code,
        product.product_name,
        product.serial_number || "N/A",
        product.brand || "N/A",
        product.model || "N/A",
        `Rs. ${formatCurrency(product.price)}`,
        formatLabel(product.status),
      ]),
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 60 },
        2: { cellWidth: 40 },
        3: { cellWidth: 34 },
        4: { cellWidth: 34 },
        5: { cellWidth: 26, halign: "right" },
        6: { cellWidth: 24 },
      },
    });
  };

  const printProducts = () => {
    if (bulkProducts.length === 0) return;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    const rows = bulkProducts
      .map(
        (product) => `
          <tr>
            <td>${escapeHtml(product.product_code)}</td>
            <td>${escapeHtml(product.product_name)}</td>
            <td>${escapeHtml(product.serial_number || "N/A")}</td>
            <td>${escapeHtml(product.brand || "N/A")}</td>
            <td>${escapeHtml(product.model || "N/A")}</td>
            <td>Rs. ${escapeHtml(formatCurrency(product.price))}</td>
            <td>${escapeHtml(formatLabel(product.status))}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${claimLabel} Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; color: ${accentColor}; }
            p { margin: 0 0 16px; color: #475569; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #eff6ff; color: #1e3a8a; }
            tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Sun Computers ${claimLabel} Report</h1>
          <p>${escapeHtml(selectedProducts.length > 0 ? `${selectedProducts.length} selected products` : `${filteredProducts.length} filtered products`)}</p>
          <table>
            <thead>
              <tr><th>Code</th><th>Name</th><th>Serial</th><th>Brand</th><th>Model</th><th>Price</th><th>Status</th></tr>
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

  return (
    <div className="products-section">
      <div className="section-header">
        <div className="section-title">
          <h2>{claimLabel} Products</h2>
          <p>
            Showing {filteredProducts.length} of {products.length} {emptyLabel.toLowerCase()} products
          </p>
          {dateRange.startDate && dateRange.endDate && (
            <p className="date-range-info">
              Date Range: {dateRange.startDate} to {dateRange.endDate}
            </p>
          )}
        </div>
      </div>

      <div className="section-filters-row orders-toolbar-row">
        <DateRangeSelector dateRange={dateRange} onDateRangeChange={onDateRangeChange} onPresetClick={onPresetClick} />
        <div className="search-filter">
          <FiSearch className="search-filter-icon" />
          <input
            type="text"
            placeholder={`Search ${emptyLabel.toLowerCase()} products by name, serial, brand, model...`}
            className="search-filter-input"
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
          <div className="delivery-stat-icon" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
            <FiShoppingBag />
          </div>
          <div className="delivery-stat-content">
            <h3>{filteredProducts.length}</h3>
            <p>{claimLabel} Items</p>
          </div>
        </div>
      </div>

      <BulkActionPanel
        itemLabelSingular={emptyLabel.toLowerCase()}
        itemLabelPlural={`${emptyLabel.toLowerCase()} products`}
        selectedCount={selectedProducts.length}
        filteredCount={filteredProducts.length}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        helperText={`Export and print use selected rows first. If nothing is selected, all filtered ${claimLabel.toLowerCase()} products are used.`}
        onSelectAll={selectAllFilteredProducts}
        onClearSelection={clearSelection}
        onExportCSV={exportToCSV}
        onExportPDF={exportToPDF}
        onPrint={printProducts}
        disableSelectAll={filteredProducts.length === 0}
        disableClearSelection={selectedProductIds.length === 0}
        disableActions={bulkProducts.length === 0}
      />

      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading {emptyLabel.toLowerCase()} products...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <table className="orders-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="row-checkbox"
                    checked={allPageSelected}
                    onChange={togglePageSelection}
                    aria-label={`Select all ${emptyLabel.toLowerCase()} products on this page`}
                  />
                </th>
                <th>Product Code</th>
                <th>Name</th>
                <th>Serial Number</th>
                <th>Brand</th>
                <th>Model</th>
                <th>Category</th>
                <th>Price (Rs.)</th>
                <th>Status</th>
                <th>Orders</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product, index) => {
                const isSelected = selectedProductIds.includes(product.id);

                return (
                  <motion.tr key={product.id} className={isSelected ? "selected-row" : ""} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ backgroundColor: "#f8fafc", cursor: "pointer" }} onClick={() => setSelectedProduct(product)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={isSelected}
                        onChange={() => toggleProductSelection(product.id)}
                        aria-label={`Select ${product.product_name}`}
                      />
                    </td>
                    <td><span className="product-code">{product.product_code}</span></td>
                    <td>
                      <div className="product-cell">
                        <FiPackage className="product-icon" />
                        <span>{product.product_name}</span>
                      </div>
                    </td>
                    <td><span className="product-code">{product.serial_number || "N/A"}</span></td>
                    <td><span className="product-brand">{product.brand || "N/A"}</span></td>
                    <td><span className="product-model">{product.model || "N/A"}</span></td>
                    <td><span className={`category-badge ${product.category}`}>{formatLabel(product.category)}</span></td>
                    <td><span className="product-price">Rs. {formatCurrency(product.price)}</span></td>
                    <td><span className={`status-badge ${product.status}`}>{formatLabel(product.status)}</span></td>
                    <td><span className="product-orders">{orders.filter((order) => order.product_id === product.id).length}</span></td>
                    <td><span className="client-date">{formatDisplayDate(product.created_at)}</span></td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <FiShoppingBag className="empty-icon" />
            <h3>No {emptyLabel.toLowerCase()} products found</h3>
            <p>The API returned no products for this claim type.</p>
          </div>
        )}
      </div>

      {filteredProducts.length > 0 && (
        <div className="orders-pagination">
          <div className="orders-pagination-info">
            Showing {pageStartIndex + 1} to {Math.min(pageStartIndex + ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} {emptyLabel.toLowerCase()} products
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

      {selectedProduct && (
        <ClaimProductDetailModal
          product={selectedProduct}
          relatedOrders={orders.filter((order) => order.product_id === selectedProduct.id)}
          title={`${claimLabel} Product`}
          accentColor={accentColor}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default ClaimProductsTab;
