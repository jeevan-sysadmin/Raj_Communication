import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FiBox,
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiPackage,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import BulkActionPanel from "../BulkActionPanel";
import DateRangeSelector from "../DateRangeSelector";
import ProductDetailModal from "../modals/ProductDetailModal";
import { exportStyledPdfReport } from "../pdfExport";
import type { DateRange, Order, Product } from "../types";
import { formatCurrency, formatDisplayDate } from "../utils";

interface ProductsTabProps {
  products: Product[];
  orders: Order[];
  filteredProducts: Product[];
  loading: boolean;
  searchTerm: string;
  filterStatus: string;
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onFilterStatusChange: (value: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onPresetClick: (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear") => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: number) => void;
  onCreateProduct: () => void;
  onClearFilters: () => void;
}

const ITEMS_PER_PAGE = 20;

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const ProductsTab = ({
  products,
  orders,
  filteredProducts,
  loading,
  searchTerm,
  dateRange,
  onSearchChange,
  onDateRangeChange,
  onPresetClick,
  onEditProduct,
  onDeleteProduct,
  onCreateProduct,
  onClearFilters,
}: ProductsTabProps) => {
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
  const orderContainsProduct = (order: Order, productId: number) => {
    if (order.product_id === productId) return true;
    if (Array.isArray(order.product_ids)) {
      return order.product_ids.some((id) => Number(id) === productId);
    }
    return false;
  };
  const getOrderCountForProduct = (productId: number) =>
    orders.reduce((count, order) => (orderContainsProduct(order, productId) ? count + 1 : count), 0);
  const getRelatedOrdersForProduct = (productId: number) => orders.filter((order) => orderContainsProduct(order, productId));

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

  const exportProductsToCSV = () => {
    if (bulkProducts.length === 0) return;

    const baseColumns = [
      "id",
      "product_code",
      "product_name",
      "serial_number",
      "is_spare_product",
      "brand",
      "model",
      "category",
      "claim_type",
      "specifications",
      "purchase_date",
      "warranty_period",
      "warranty_status",
      "price",
      "status",
      "created_at",
      "updated_at",
      "supplier",
      "location",
    ];

    const extraColumns = Array.from(
      new Set(
        bulkProducts.flatMap((product) => Object.keys(product || {})),
      ),
    ).filter((key) => !baseColumns.includes(key));

    const allColumns = [
      ...baseColumns,
      ...extraColumns,
      "computed_order_count",
      "computed_related_order_codes",
      "computed_created_date_display",
      "computed_price_display",
    ];

    const rows = bulkProducts.map((product) => {
      const relatedOrders = getRelatedOrdersForProduct(product.id);
      const relatedOrderCodes = relatedOrders.map((order) => order.order_code).filter(Boolean);

      const rowData: Record<string, unknown> = {
        ...allColumns.reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (product as unknown as Record<string, unknown>)[key];
          return acc;
        }, {}),
        computed_order_count: relatedOrders.length,
        computed_related_order_codes: relatedOrderCodes,
        computed_created_date_display: formatDisplayDate(product.created_at),
        computed_price_display: formatCurrency(product.price),
      };

      return allColumns
        .map((column) => {
          const value = rowData[column];
          const serialized =
            value === null || value === undefined
              ? ""
              : Array.isArray(value)
                ? value.join(" | ")
                : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value);
          return `"${serialized.replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    downloadFile(
      `\uFEFF${allColumns.join(",")}\n${rows.join("\n")}`,
      `products_full_export_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const exportProductsToPDF = () => {
    if (bulkProducts.length === 0) return;
    const inventoryValue = bulkProducts.reduce((sum, product) => sum + Number(product.price || 0), 0);
    const activeProducts = bulkProducts.filter((product) => product.status === "active").length;
    const linkedOrders = bulkProducts.reduce(
      (sum, product) => sum + getOrderCountForProduct(product.id),
      0,
    );

    exportStyledPdfReport({
      filename: `products_${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Products Report",
      subtitle: "Catalog overview with product identity, value, status, and order usage.",
      scopeLabel:
        selectedProducts.length > 0
          ? `${selectedProducts.length} selected products`
          : `${filteredProducts.length} filtered products`,
      accentColor: "#ea580c",
      metrics: [
        { label: "Included", value: `${bulkProducts.length} products` },
        { label: "Inventory Value", value: `Rs. ${formatCurrency(inventoryValue)}` },
        { label: "Active", value: `${activeProducts}` },
        { label: "Orders Linked", value: `${linkedOrders}` },
      ],
      head: [["Code", "Product", "Brand", "Model", "Category", "Price", "Status", "Orders"]],
      body: bulkProducts.map((product) => [
        product.product_code,
        product.product_name,
        product.brand || "N/A",
        product.model || "N/A",
        product.category,
        `Rs. ${formatCurrency(product.price)}`,
        product.status,
        getOrderCountForProduct(product.id),
      ]),
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 54 },
        2: { cellWidth: 34 },
        3: { cellWidth: 34 },
        4: { cellWidth: 28 },
        5: { cellWidth: 26, halign: "right" },
        6: { cellWidth: 26 },
        7: { cellWidth: 18, halign: "center" },
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
            <td>${escapeHtml(product.brand || "N/A")}</td>
            <td>${escapeHtml(product.model || "N/A")}</td>
            <td>${escapeHtml(product.category)}</td>
            <td>Rs. ${escapeHtml(formatCurrency(product.price))}</td>
            <td>${escapeHtml(product.status)}</td>
            <td>${escapeHtml(getOrderCountForProduct(product.id))}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Products Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; color: #1d4ed8; }
            p { margin: 0 0 16px; color: #475569; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #eff6ff; color: #1e3a8a; }
            tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Raj Communication Products Report</h1>
          <p>${escapeHtml(selectedProducts.length > 0 ? `${selectedProducts.length} selected products` : `${filteredProducts.length} filtered products`)}</p>
          <table>
            <thead>
              <tr><th>Code</th><th>Name</th><th>Brand</th><th>Model</th><th>Category</th><th>Price</th><th>Status</th><th>Orders</th></tr>
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
          <h2>Products Management</h2>
          <p>
            Showing {filteredProducts.length} of {products.length} products
          </p>
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
            onClick={onCreateProduct}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiPlus />
            <span>Add New Product</span>
          </motion.button>
          <div className="filter-group"></div>
        </div>
      </div>

      <div className="section-filters-row orders-toolbar-row">
        <DateRangeSelector dateRange={dateRange} onDateRangeChange={onDateRangeChange} onPresetClick={onPresetClick} />
        <div className="search-filter">
          <FiSearch className="search-filter-icon" />
          <input
            type="text"
            placeholder="Search products by name, serial, brand, model..."
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

      <BulkActionPanel
        itemLabelSingular="product"
        itemLabelPlural="products"
        selectedCount={selectedProducts.length}
        filteredCount={filteredProducts.length}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        helperText="Export and print use selected rows first. If nothing is selected, all filtered products are used."
        onSelectAll={selectAllFilteredProducts}
        onClearSelection={clearSelection}
        onExportCSV={exportProductsToCSV}
        onExportPDF={exportProductsToPDF}
        onPrint={printProducts}
        disableSelectAll={filteredProducts.length === 0}
        disableClearSelection={selectedProductIds.length === 0}
        disableActions={bulkProducts.length === 0}
      />

      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading products...</p>
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
                    aria-label="Select all products on this page"
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
                <th>Actions</th>
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
                    <td>
                      <span className="product-code">{product.product_code}</span>
                    </td>
                    <td>
                      <div className="product-cell">
                        <FiPackage className="product-icon" />
                        <span>{product.product_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="product-code">{product.serial_number || "N/A"}</span>
                    </td>
                    <td>
                      <span className="product-brand">{product.brand || "N/A"}</span>
                    </td>
                    <td>
                      <span className="product-model">{product.model || "N/A"}</span>
                    </td>
                    <td>
                      <span className={`category-badge ${product.category}`}>{product.category}</span>
                    </td>
                    <td>
                      <span className="product-price">Rs. {formatCurrency(product.price)}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${product.status}`}>
                        {product.status === "handover" ? "Handover" : "Active"}
                      </span>
                    </td>
                    <td>
                      <span className="product-orders">{getOrderCountForProduct(product.id)}</span>
                    </td>
                    <td>
                      <span className="client-date">{formatDisplayDate(product.created_at)}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <motion.button className="action-btn edit" onClick={(e) => { e.stopPropagation(); onEditProduct(product); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Edit Product">
                          <FiEdit />
                        </motion.button>
                        <motion.button className="action-btn delete" onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Delete Product">
                          <FiTrash2 />
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
            <FiBox className="empty-icon" />
            <h3>No products found</h3>
            <p>Start by adding your first product</p>
            <motion.button className="btn primary" onClick={onCreateProduct} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <FiPlus />
              Add New Product
            </motion.button>
          </div>
        )}
      </div>

      {filteredProducts.length > 0 && (
        <div className="orders-pagination">
          <div className="orders-pagination-info">
            Showing {pageStartIndex + 1} to {Math.min(pageStartIndex + ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} products
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
        <ProductDetailModal
          product={selectedProduct}
          relatedOrders={getRelatedOrdersForProduct(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onEdit={(product) => {
            setSelectedProduct(null);
            onEditProduct(product);
          }}
        />
      )}
    </div>
  );
};

export default ProductsTab;

