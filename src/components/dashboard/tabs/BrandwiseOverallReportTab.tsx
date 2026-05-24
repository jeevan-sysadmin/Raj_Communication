import { useEffect, useMemo, useState } from "react";
import { FiBarChart2, FiClock, FiDownload, FiLayers, FiPackage, FiPrinter, FiShoppingBag, FiTruck } from "react-icons/fi";
import { exportStyledPdfReport } from "../pdfExport";

interface ReportOrder {
  id?: number;
  brand?: string;
  product_brand?: string;
  status?: string;
  replacement_product_id?: number | null;
  replacement_product_name?: string;
  replacement_product_ids?: number[];
  replacement_product_names?: string[];
  final_cost?: string | number;
  estimated_cost?: string | number;
}

interface ReportProduct {
  brand?: string;
  is_spare_product?: boolean | number | string;
}

interface ReportDelivery {
  order_id?: number;
  status?: string;
}

interface BrandwiseOverallReportTabProps {
  orders: ReportOrder[];
  products: ReportProduct[];
  deliveries: ReportDelivery[];
  loading?: boolean;
}

const toAmount = (value: string | number | undefined): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number.parseFloat(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeBrand = (order: ReportOrder): string => {
  const value = (order.product_brand || order.brand || "").trim();
  return value || "Unknown";
};

const normalizeProductBrand = (product: ReportProduct): string => {
  const value = (product.brand || "").trim();
  return value || "Unknown";
};

const isSpareProduct = (value: ReportProduct["is_spare_product"]) => {
  if (value === true || value === 1 || value === "1") return true;
  return String(value || "").trim().toLowerCase() === "true";
};

const isDeliveredStatus = (status: string | undefined) => {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "delivered" || normalized === "deliveryed";
};

const hasReplacement = (order: ReportOrder) => {
  const hasReplacementId = Number(order.replacement_product_id) > 0;
  const hasReplacementIds = Array.isArray(order.replacement_product_ids) && order.replacement_product_ids.length > 0;
  const hasReplacementName = String(order.replacement_product_name || "").trim().length > 0;
  const hasReplacementNames = Array.isArray(order.replacement_product_names) && order.replacement_product_names.length > 0;
  return hasReplacementId || hasReplacementIds || hasReplacementName || hasReplacementNames;
};

const BrandwiseOverallReportTab = ({ orders, products, deliveries, loading = false }: BrandwiseOverallReportTabProps) => {
  const rows = useMemo(() => {
    const orderByIdBrand = new Map<number, string>();
    const brandMap = new Map<
      string,
      {
        brand: string;
        serviceOrders: number;
        replacementOrders: number;
        pendingOrders: number;
        deliveredOrders: number;
        spareProducts: number;
        deliveryRows: number;
        revenue: number;
      }
    >();

    const ensureBrand = (brand: string) => {
      const current = brandMap.get(brand);
      if (current) return current;
      const next = {
        brand,
        serviceOrders: 0,
        replacementOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        spareProducts: 0,
        deliveryRows: 0,
        revenue: 0,
      };
      brandMap.set(brand, next);
      return next;
    };

    orders.forEach((order) => {
      const brand = normalizeBrand(order);
      if (typeof order.id === "number") orderByIdBrand.set(order.id, brand);
      const revenue = toAmount(order.final_cost) || toAmount(order.estimated_cost);
      const current = ensureBrand(brand);
      current.serviceOrders += 1;
      if (hasReplacement(order)) current.replacementOrders += 1;
      if (String(order.status || "").trim().toLowerCase() === "pending") current.pendingOrders += 1;
      if (isDeliveredStatus(order.status)) current.deliveredOrders += 1;
      current.revenue += revenue;
    });

    products.forEach((product) => {
      if (!isSpareProduct(product.is_spare_product)) return;
      const brand = normalizeProductBrand(product);
      const current = ensureBrand(brand);
      current.spareProducts += 1;
    });

    deliveries.forEach((delivery) => {
      const orderId = Number(delivery.order_id);
      const brand = orderByIdBrand.get(orderId);
      if (!brand) return;
      const current = ensureBrand(brand);
      current.deliveryRows += 1;
      if (isDeliveredStatus(delivery.status)) current.deliveredOrders += 1;
    });

    return Array.from(brandMap.values()).sort((a, b) => b.serviceOrders - a.serviceOrders || b.revenue - a.revenue);
  }, [orders, products, deliveries]);

  const totalOrders = useMemo(() => rows.reduce((sum, item) => sum + item.serviceOrders, 0), [rows]);
  const totalReplacementOrders = useMemo(() => rows.reduce((sum, item) => sum + item.replacementOrders, 0), [rows]);
  const totalSpareProducts = useMemo(() => rows.reduce((sum, item) => sum + item.spareProducts, 0), [rows]);
  const totalPendingOrders = useMemo(() => rows.reduce((sum, item) => sum + item.pendingOrders, 0), [rows]);
  const totalDelivered = useMemo(() => rows.reduce((sum, item) => sum + item.deliveredOrders, 0), [rows]);
  const totalDeliveryRows = useMemo(() => rows.reduce((sum, item) => sum + item.deliveryRows, 0), [rows]);
  const totalRevenue = useMemo(() => rows.reduce((sum, item) => sum + item.revenue, 0), [rows]);
  const topBrand = rows[0];
  const maxServiceOrders = useMemo(() => rows.reduce((max, item) => Math.max(max, item.serviceOrders), 0), [rows]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const selectedRows = useMemo(() => rows.filter((row) => selectedBrands.includes(row.brand)), [rows, selectedBrands]);
  const exportRows = selectedRows.length > 0 ? selectedRows : rows;
  const isAllSelected = rows.length > 0 && rows.every((row) => selectedBrands.includes(row.brand));
  const selectedLabel = selectedRows.length > 0 ? `${selectedRows.length} selected` : "All brands";

  useEffect(() => {
    setSelectedBrands((prev) => prev.filter((brand) => rows.some((row) => row.brand === brand)));
  }, [rows]);

  const formatAmount = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;
  const today = new Date().toISOString().split("T")[0];

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

  const exportCsv = () => {
    if (exportRows.length === 0) return;
    const header = [
      "brand",
      "service_orders",
      "replacement_orders",
      "spare_products",
      "delivery_rows",
      "pending_orders",
      "delivered_orders",
      "total_revenue",
      "avg_revenue_per_order",
    ];

    const csvRows = exportRows.map((row) => {
      const avg = row.serviceOrders ? row.revenue / row.serviceOrders : 0;
      const values = [
        row.brand,
        row.serviceOrders,
        row.replacementOrders,
        row.spareProducts,
        row.deliveryRows,
        row.pendingOrders,
        row.deliveredOrders,
        row.revenue.toFixed(2),
        avg.toFixed(2),
      ];
      return values.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",");
    });

    downloadFile(`\uFEFF${header.join(",")}\n${csvRows.join("\n")}`, `brandwise_overall_report_${today}.csv`, "text/csv;charset=utf-8;");
  };

  const exportPdf = () => {
    if (exportRows.length === 0) return;
    exportStyledPdfReport({
      filename: `brandwise_overall_report_${today}.pdf`,
      title: "Brandwise Overall Report",
      subtitle: "Complete brand performance across service, replacements, deliveries, and revenue.",
      scopeLabel: `${exportRows.length} brands (${selectedLabel})`,
      accentColor: "#0f766e",
      orientation: "landscape",
      metrics: [
        { label: "Brands", value: `${exportRows.length}` },
        { label: "Service Orders", value: `${exportRows.reduce((sum, item) => sum + item.serviceOrders, 0)}` },
        { label: "Deliveries", value: `${exportRows.reduce((sum, item) => sum + item.deliveryRows, 0)}` },
        { label: "Revenue", value: formatAmount(exportRows.reduce((sum, item) => sum + item.revenue, 0)) },
      ],
      head: [[
        "Brand",
        "Service Orders",
        "Replacements",
        "Spare Products",
        "Deliveries",
        "Pending",
        "Delivered",
        "Total Revenue",
        "Avg Revenue / Order",
      ]],
      body: exportRows.map((row) => {
        const avg = row.serviceOrders ? row.revenue / row.serviceOrders : 0;
        return [
          row.brand,
          row.serviceOrders.toLocaleString(),
          row.replacementOrders.toLocaleString(),
          row.spareProducts.toLocaleString(),
          row.deliveryRows.toLocaleString(),
          row.pendingOrders.toLocaleString(),
          row.deliveredOrders.toLocaleString(),
          formatAmount(row.revenue),
          formatAmount(Number(avg.toFixed(2))),
        ];
      }),
    });
  };

  const printReport = () => {
    if (exportRows.length === 0) return;
    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    const bodyRows = exportRows
      .map((row) => {
        const avg = row.serviceOrders ? row.revenue / row.serviceOrders : 0;
        return `
          <tr>
            <td>${row.brand}</td>
            <td>${row.serviceOrders.toLocaleString()}</td>
            <td>${row.replacementOrders.toLocaleString()}</td>
            <td>${row.spareProducts.toLocaleString()}</td>
            <td>${row.deliveryRows.toLocaleString()}</td>
            <td>${row.pendingOrders.toLocaleString()}</td>
            <td>${row.deliveredOrders.toLocaleString()}</td>
            <td>${formatAmount(row.revenue)}</td>
            <td>${formatAmount(Number(avg.toFixed(2)))}</td>
          </tr>`;
      })
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Brandwise Overall Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            p { margin: 0 0 16px; color: #475569; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>Brandwise Overall Report</h1>
          <p>Generated on ${new Date().toLocaleString("en-IN")} - ${selectedLabel}</p>
          <table>
            <thead>
              <tr>
                <th>Brand</th>
                <th>Service Orders</th>
                <th>Replacements</th>
                <th>Spare Products</th>
                <th>Deliveries</th>
                <th>Pending</th>
                <th>Delivered</th>
                <th>Total Revenue</th>
                <th>Avg Revenue / Order</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
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
    <div className="data-table-wrapper brand-report-wrapper">
      <div className="table-header-section brand-report-header">
        <div className="table-title-wrapper">
          <h2 className="table-title">
            <FiBarChart2 /> Brandwise Overall Report
          </h2>
          <p className="table-subtitle">A complete brand performance snapshot across service, replacements, delivery, and revenue.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" className="btn secondary" onClick={exportCsv} disabled={rows.length === 0}>
            <FiDownload /> CSV
          </button>
          <button type="button" className="btn secondary" onClick={exportPdf} disabled={rows.length === 0}>
            <FiDownload /> PDF
          </button>
          <button type="button" className="btn secondary" onClick={printReport} disabled={rows.length === 0}>
            <FiPrinter /> Print
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 10, color: "#475569", fontSize: 13 }}>
        Export/print uses selected brands first. Current scope: <strong>{selectedLabel}</strong>.
      </div>

      <div className="stats-grid-small brand-stats-grid">
        <div className="stat-item brand-stat-item">
          <div className="stat-label">
            <FiLayers /> Brands
          </div>
          <span className="stat-value-small">{rows.length}</span>
        </div>
        <div className="stat-item brand-stat-item">
          <div className="stat-label">
            <FiPackage /> Service
          </div>
          <span className="stat-value-small">{totalOrders.toLocaleString()}</span>
        </div>
        <div className="stat-item brand-stat-item">
          <div className="stat-label">
            <FiShoppingBag /> Replacements
          </div>
          <span className="stat-value-small">{totalReplacementOrders.toLocaleString()}</span>
        </div>
        <div className="stat-item brand-stat-item">
          <div className="stat-label">
            <FiShoppingBag /> Spare
          </div>
          <span className="stat-value-small">{totalSpareProducts.toLocaleString()}</span>
        </div>
        <div className="stat-item brand-stat-item">
          <div className="stat-label">
            <FiTruck /> Deliveries
          </div>
          <span className="stat-value-small">{totalDeliveryRows.toLocaleString()}</span>
        </div>
        <div className="stat-item brand-stat-item">
          <div className="stat-label">
            <FiClock /> Pending
          </div>
          <span className="stat-value-small">{totalPendingOrders.toLocaleString()}</span>
        </div>
        <div className="stat-item brand-stat-item">
          <div className="stat-label">
            <FiTruck /> Delivered
          </div>
          <span className="stat-value-small">{totalDelivered.toLocaleString()}</span>
        </div>
        <div className="stat-item brand-stat-item brand-stat-item-revenue">
          <div className="stat-label">
            <FiBarChart2 /> Revenue
          </div>
          <span className="stat-value-small">{formatAmount(totalRevenue)}</span>
        </div>
      </div>

      {topBrand ? (
        <div className="brand-top-highlight">
          <div className="brand-top-highlight-title">Top Brand</div>
          <div className="brand-top-highlight-body">
            <strong>{topBrand.brand}</strong> leads with {topBrand.serviceOrders.toLocaleString()} service orders and{" "}
            {formatAmount(topBrand.revenue)} revenue.
          </div>
        </div>
      ) : null}

      <div className="table-responsive brand-table-responsive">
        <table className="data-table brand-report-table">
          <thead>
            <tr>
              <th style={{ width: 48, textAlign: "center" }}>
                <input
                  type="checkbox"
                  className="row-checkbox"
                  checked={isAllSelected}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedBrands(rows.map((row) => row.brand));
                    } else {
                      setSelectedBrands([]);
                    }
                  }}
                  aria-label="Select all brands"
                />
              </th>
              <th>Brand</th>
              <th>Service Orders</th>
              <th>Replacements</th>
              <th>Spare Products</th>
              <th>Deliveries</th>
              <th>Pending</th>
              <th>Delivered</th>
              <th>Total Revenue</th>
              <th>Avg Revenue / Order</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "20px" }}>
                  No brandwise data available.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const avg = row.serviceOrders ? row.revenue / row.serviceOrders : 0;
                const serviceIntensity = maxServiceOrders ? Math.round((row.serviceOrders / maxServiceOrders) * 100) : 0;
                const isSelected = selectedBrands.includes(row.brand);
                return (
                  <tr key={row.brand} className={isSelected ? "selected-row" : ""}>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelectedBrands((prev) =>
                            checked ? [...prev, row.brand] : prev.filter((brand) => brand !== row.brand),
                          );
                        }}
                        aria-label={`Select brand ${row.brand}`}
                      />
                    </td>
                    <td>
                      <div className="brand-name-cell">
                        <span className="brand-name">{row.brand}</span>
                        <span className="brand-rank-chip">#{rows.findIndex((item) => item.brand === row.brand) + 1}</span>
                      </div>
                    </td>
                    <td>{row.serviceOrders.toLocaleString()}</td>
                    <td>{row.replacementOrders.toLocaleString()}</td>
                    <td>{row.spareProducts.toLocaleString()}</td>
                    <td>{row.deliveryRows.toLocaleString()}</td>
                    <td>{row.pendingOrders.toLocaleString()}</td>
                    <td>{row.deliveredOrders.toLocaleString()}</td>
                    <td>{formatAmount(row.revenue)}</td>
                    <td>
                      <div className="avg-revenue-cell">
                        <span>{formatAmount(Number(avg.toFixed(2)))}</span>
                        <div className="service-intensity-track" aria-hidden="true">
                          <div className="service-intensity-bar" style={{ width: `${serviceIntensity}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BrandwiseOverallReportTab;
