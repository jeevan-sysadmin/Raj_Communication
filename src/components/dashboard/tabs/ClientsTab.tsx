import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";
import BulkActionPanel from "../BulkActionPanel";
import DateRangeSelector from "../DateRangeSelector";
import ClientsDetailModal from "../modals/ClientsDetailModal";
import { exportStyledPdfReport } from "../pdfExport";
import type { Client, DateRange, Order } from "../types";
import { formatDisplayDate } from "../utils";

interface ClientsTabProps {
  clients: Client[];
  orders: Order[];
  filteredClients: Client[];
  loading: boolean;
  searchTerm: string;
  dateRange: DateRange;
  onSearchChange: (value: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onPresetClick: (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear") => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: number) => void;
  onCreateClient: () => void;
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

const ClientsTab = ({
  clients,
  orders,
  filteredClients,
  loading,
  searchTerm,
  dateRange,
  onSearchChange,
  onDateRangeChange,
  onPresetClick,
  onEditClient,
  onDeleteClient,
  onCreateClient,
  onClearFilters,
}: ClientsTabProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / ITEMS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedClients = filteredClients.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);
  const selectedClients = filteredClients.filter((client) => selectedClientIds.includes(client.id));
  const bulkClients = selectedClients.length > 0 ? selectedClients : filteredClients;
  const allPageSelected =
    paginatedClients.length > 0 && paginatedClients.every((client) => selectedClientIds.includes(client.id));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedClientIds((prev) => prev.filter((id) => filteredClients.some((client) => client.id === id)));
  }, [filteredClients]);

  const toggleClientSelection = (clientId: number) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId],
    );
  };

  const togglePageSelection = () => {
    const pageIds = paginatedClients.map((client) => client.id);
    if (allPageSelected) {
      setSelectedClientIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedClientIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const selectAllFilteredClients = () => {
    setSelectedClientIds(filteredClients.map((client) => client.id));
  };

  const clearSelection = () => {
    setSelectedClientIds([]);
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

  const exportClientsToCSV = () => {
    if (bulkClients.length === 0) return;

    const header = ["Client Code", "Name", "Phone", "Email", "City", "Address", "Orders", "Created"];
    const rows = bulkClients.map((client) =>
      [
        client.client_code,
        client.full_name,
        client.phone,
        client.email || "N/A",
        client.city || "N/A",
        client.address || "N/A",
        orders.filter((order) => order.client_id === client.id).length,
        formatDisplayDate(client.created_at),
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );

    downloadFile(
      `\uFEFF${header.join(",")}\n${rows.join("\n")}`,
      `clients_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const exportClientsToPDF = () => {
    if (bulkClients.length === 0) return;
    const totalOrders = bulkClients.reduce(
      (sum, client) => sum + orders.filter((order) => order.client_id === client.id).length,
      0,
    );
    const uniqueCities = new Set(bulkClients.map((client) => client.city).filter(Boolean)).size;
    const withEmail = bulkClients.filter((client) => client.email).length;

    exportStyledPdfReport({
      filename: `clients_${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Clients Report",
      subtitle: "Customer contact records, location details, and linked service activity.",
      scopeLabel:
        selectedClients.length > 0
          ? `${selectedClients.length} selected clients`
          : `${filteredClients.length} filtered clients`,
      accentColor: "#0f766e",
      metrics: [
        { label: "Included", value: `${bulkClients.length} clients` },
        { label: "Orders Linked", value: `${totalOrders}` },
        { label: "Cities", value: `${uniqueCities}` },
        { label: "With Email", value: `${withEmail}` },
      ],
      head: [["Code", "Name", "Contact", "City", "Orders", "Address", "Created"]],
      body: bulkClients.map((client) => [
        client.client_code,
        client.full_name,
        `${client.phone}\n${client.email || "No email"}`,
        client.city || "N/A",
        orders.filter((order) => order.client_id === client.id).length,
        client.address || "N/A",
        formatDisplayDate(client.created_at),
      ]),
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 40 },
        2: { cellWidth: 44 },
        3: { cellWidth: 24 },
        4: { cellWidth: 20, halign: "center" },
        5: { cellWidth: 75 },
        6: { cellWidth: 24 },
      },
    });
  };

  const printClients = () => {
    if (bulkClients.length === 0) return;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    const rows = bulkClients
      .map(
        (client) => `
          <tr>
            <td>${escapeHtml(client.client_code)}</td>
            <td>${escapeHtml(client.full_name)}</td>
            <td>${escapeHtml(client.phone)}</td>
            <td>${escapeHtml(client.email || "N/A")}</td>
            <td>${escapeHtml(client.city || "N/A")}</td>
            <td>${escapeHtml(orders.filter((order) => order.client_id === client.id).length)}</td>
            <td>${escapeHtml(formatDisplayDate(client.created_at))}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Clients Print</title>
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
          <h1>Sun Computers Clients Report</h1>
          <p>${escapeHtml(selectedClients.length > 0 ? `${selectedClients.length} selected clients` : `${filteredClients.length} filtered clients`)}</p>
          <table>
            <thead>
              <tr><th>Code</th><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Orders</th><th>Created</th></tr>
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
    <div className="clients-section">
      <div className="section-header">
        <div className="section-title">
          <h2>Clients Management</h2>
          <p>
            Showing {filteredClients.length} of {clients.length} clients
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
            onClick={onCreateClient}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiPlus />
            <span>Add New Client</span>
          </motion.button>
        </div>
      </div>

      <div className="section-filters-row orders-toolbar-row">
        <DateRangeSelector dateRange={dateRange} onDateRangeChange={onDateRangeChange} onPresetClick={onPresetClick} />
        <div className="search-filter">
          <FiSearch className="search-filter-icon" />
          <input
            type="text"
            placeholder="Search clients by name, phone, email..."
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
        itemLabelSingular="client"
        itemLabelPlural="clients"
        selectedCount={selectedClients.length}
        filteredCount={filteredClients.length}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        helperText="Export and print use selected rows first. If nothing is selected, all filtered clients are used."
        onSelectAll={selectAllFilteredClients}
        onClearSelection={clearSelection}
        onExportCSV={exportClientsToCSV}
        onExportPDF={exportClientsToPDF}
        onPrint={printClients}
        disableSelectAll={filteredClients.length === 0}
        disableClearSelection={selectedClientIds.length === 0}
        disableActions={bulkClients.length === 0}
      />

      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading clients...</p>
          </div>
        ) : filteredClients.length > 0 ? (
          <table className="orders-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="row-checkbox"
                    checked={allPageSelected}
                    onChange={togglePageSelection}
                    aria-label="Select all clients on this page"
                  />
                </th>
                <th>Client Code</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>City</th>
                <th>Orders</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((client, index) => {
                const isSelected = selectedClientIds.includes(client.id);

                return (
                  <motion.tr key={client.id} className={isSelected ? "selected-row" : ""} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ backgroundColor: "#f8fafc", cursor: "pointer" }} onClick={() => setSelectedClient(client)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={isSelected}
                        onChange={() => toggleClientSelection(client.id)}
                        aria-label={`Select ${client.full_name}`}
                      />
                    </td>
                    <td>
                      <span className="client-code">{client.client_code}</span>
                    </td>
                    <td>
                      <div className="client-cell">
                        <div className="client-avatar-placeholder">{client.full_name?.charAt(0) || "C"}</div>
                        <div className="client-info">
                          <span className="client-name">{client.full_name}</span>
                          <span className="client-address">{client.address ? `${client.address.substring(0, 30)}...` : "N/A"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="client-phone">{client.phone}</span>
                    </td>
                    <td>
                      <span className="client-email">{client.email || "N/A"}</span>
                    </td>
                    <td>
                      <span className="client-city">{client.city || "N/A"}</span>
                    </td>
                    <td>
                      <span className="client-orders">{orders.filter((order) => order.client_id === client.id).length}</span>
                    </td>
                    <td>
                      <span className="client-date">{formatDisplayDate(client.created_at)}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <motion.button className="action-btn edit" onClick={(e) => { e.stopPropagation(); onEditClient(client); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Edit Client">
                          <FiEdit />
                        </motion.button>
                        <motion.button className="action-btn delete" onClick={(e) => { e.stopPropagation(); onDeleteClient(client.id); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Delete Client">
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
            <FiUsers className="empty-icon" />
            <h3>No clients found</h3>
            <p>Start by adding your first client</p>
            <motion.button className="btn primary" onClick={onCreateClient} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <FiPlus />
              Add New Client
            </motion.button>
          </div>
        )}
      </div>

      {filteredClients.length > 0 && (
        <div className="orders-pagination">
          <div className="orders-pagination-info">
            Showing {pageStartIndex + 1} to {Math.min(pageStartIndex + ITEMS_PER_PAGE, filteredClients.length)} of {filteredClients.length} clients
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

      {selectedClient && (
        <ClientsDetailModal
          client={selectedClient}
          relatedOrders={orders.filter((order) => order.client_id === selectedClient.id)}
          onClose={() => setSelectedClient(null)}
          onEdit={(client) => {
            setSelectedClient(null);
            onEditClient(client);
          }}
        />
      )}
    </div>
  );
};

export default ClientsTab;
