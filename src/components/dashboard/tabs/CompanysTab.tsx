import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { motion } from "framer-motion";
import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiFileText,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";
import BulkActionPanel from "../BulkActionPanel";
import DateRangeSelector from "../DateRangeSelector";
import CompanysDetailModal from "../modals/CompanysDetailModal";
import CompanysFormModal from "../modals/CompanysFormModal";
import { exportStyledPdfReport } from "../pdfExport";
import type { Company, CompanyForm, DateRange } from "../types";
import { formatDisplayDate } from "../utils";

const ITEMS_PER_PAGE = 20;
const COMPANY_API_URL = "http://localhost/raj_communication/api/companys.php";
const SERVICE_COMPANY_PDF = "SERVICE COMPANY LIST.pdf";

const emptyForm: CompanyForm = {
  company_name: "",
  product: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  source_pdf: SERVICE_COMPANY_PDF,
};

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isoDate = (input: Date) => input.toISOString().split("T")[0];

const normalizeDateForRange = (value: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return isoDate(parsed);
};

const normalizeCompany = (row: any): Company => ({
  id: Number(row?.id ?? 0),
  company_code: String(row?.company_code ?? ""),
  company_name: String(row?.company_name ?? ""),
  product: String(row?.product ?? ""),
  contact_person: String(row?.contact_person ?? ""),
  phone: String(row?.phone ?? ""),
  email: String(row?.email ?? ""),
  address: String(row?.address ?? ""),
  notes: String(row?.notes ?? ""),
  source_pdf: String(row?.source_pdf ?? ""),
  created_at: String(row?.created_at ?? new Date().toISOString()),
});

const applyPresetDateRange = (
  preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear",
) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === "yesterday") {
    start.setDate(now.getDate() - 1);
    end.setDate(now.getDate() - 1);
  } else if (preset === "thisWeek") {
    const day = now.getDay();
    const weekStartOffset = day === 0 ? 6 : day - 1;
    start.setDate(now.getDate() - weekStartOffset);
  } else if (preset === "thisMonth") {
    start.setDate(1);
  } else if (preset === "lastMonth") {
    start.setMonth(now.getMonth() - 1, 1);
    end.setDate(0);
  } else if (preset === "thisYear") {
    start.setMonth(0, 1);
  }

  return { startDate: isoDate(start), endDate: isoDate(end) };
};

const CompanysTab = () => {
  const [companys, setCompanys] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyForm);
  const [loadingData, setLoadingData] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  const loadCompaniesFromDb = useCallback(async () => {
    setLoadingData(true);
    try {
      const response = await fetch(COMPANY_API_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to load companies from database");
      }

      const rows = Array.isArray(payload.companys) ? payload.companys.map(normalizeCompany) : [];
      setCompanys(rows);
    } catch (error: any) {
      console.error("Company DB load error:", error);
      setCompanys([]);
      window.alert(error?.message || "Unable to load companies from database.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void loadCompaniesFromDb();
  }, [loadCompaniesFromDb]);

  const filteredCompanys = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return companys.filter((company) => {
      const companyDate = normalizeDateForRange(company.created_at);
      const matchesStart = !dateRange.startDate || (companyDate && companyDate >= dateRange.startDate);
      const matchesEnd = !dateRange.endDate || (companyDate && companyDate <= dateRange.endDate);
      const matchesDate = matchesStart && matchesEnd;

      if (!term) return matchesDate;

      const blob = [
        company.company_name,
        company.product,
        company.contact_person,
        company.phone,
        company.email,
        company.address,
        company.company_code,
        company.source_pdf,
      ]
        .join(" ")
        .toLowerCase();

      return matchesDate && blob.includes(term);
    });
  }, [companys, dateRange.endDate, dateRange.startDate, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanys.length / ITEMS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCompanys = filteredCompanys.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);
  const selectedCompanys = filteredCompanys.filter((company) => selectedCompanyIds.includes(company.id));
  const bulkCompanys = selectedCompanys.length > 0 ? selectedCompanys : filteredCompanys;
  const allPageSelected =
    paginatedCompanys.length > 0 && paginatedCompanys.every((company) => selectedCompanyIds.includes(company.id));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedCompanyIds((prev) => prev.filter((id) => filteredCompanys.some((company) => company.id === id)));
  }, [filteredCompanys]);

  const openCreateModal = () => {
    setEditCompany(null);
    setCompanyForm({ ...emptyForm, source_pdf: SERVICE_COMPANY_PDF });
    setShowFormModal(true);
  };

  const openEditModal = (company: Company) => {
    setEditCompany(company);
    setCompanyForm({
      company_name: company.company_name,
      product: company.product,
      contact_person: company.contact_person || "",
      phone: company.phone || "",
      email: company.email || "",
      address: company.address || "",
      notes: company.notes || "",
      source_pdf: company.source_pdf || "",
    });
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    if (savingCompany) return;
    setShowFormModal(false);
    setEditCompany(null);
    setCompanyForm(emptyForm);
  };

  const onCompanyFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({ ...prev, [name]: value }));
  };

  const onCompanyFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingCompany) return;

    if (!companyForm.company_name.trim() || !companyForm.product.trim()) {
      window.alert("Company Name and Product/Coverage are required.");
      return;
    }

    const payload = {
      company_name: companyForm.company_name.trim(),
      product: companyForm.product.trim(),
      contact_person: companyForm.contact_person.trim(),
      phone: companyForm.phone.trim(),
      email: companyForm.email.trim(),
      address: companyForm.address.trim(),
      notes: companyForm.notes.trim(),
      source_pdf: companyForm.source_pdf.trim() || SERVICE_COMPANY_PDF,
    };

    setSavingCompany(true);
    try {
      if (editCompany) {
        const response = await fetch(`${COMPANY_API_URL}?id=${editCompany.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Failed to update company");
        }
      } else {
        const response = await fetch(COMPANY_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Failed to create company");
        }
      }

      closeFormModal();
      await loadCompaniesFromDb();
    } catch (error: any) {
      console.error("Company save error:", error);
      window.alert(error?.message || "Failed to save company");
    } finally {
      setSavingCompany(false);
    }
  };

  const deleteCompany = async (id: number) => {
    const target = companys.find((item) => item.id === id);
    if (!target) return;

    const confirmed = window.confirm(`Delete ${target.company_name}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${COMPANY_API_URL}?id=${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to delete company");
      }

      setSelectedCompanyIds((prev) => prev.filter((selectedId) => selectedId !== id));
      if (selectedCompany?.id === id) setSelectedCompany(null);
      await loadCompaniesFromDb();
    } catch (error: any) {
      console.error("Company delete error:", error);
      window.alert(error?.message || "Failed to delete company");
    }
  };

  const toggleCompanySelection = (companyId: number) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId],
    );
  };

  const togglePageSelection = () => {
    const pageIds = paginatedCompanys.map((company) => company.id);
    if (allPageSelected) {
      setSelectedCompanyIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedCompanyIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const selectAllFilteredCompanys = () => {
    setSelectedCompanyIds(filteredCompanys.map((company) => company.id));
  };

  const clearSelection = () => {
    setSelectedCompanyIds([]);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateRange({ startDate: "", endDate: "" });
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  const handlePresetClick = (
    preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear",
  ) => {
    setDateRange(applyPresetDateRange(preset));
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
    if (bulkCompanys.length === 0) return;

    const header = [
      "Company Code",
      "Company Name",
      "Products",
      "Contact Person",
      "Phone",
      "Email",
      "Address",
      "Source PDF",
      "Created",
    ];
    const rows = bulkCompanys.map((company) =>
      [
        company.company_code,
        company.company_name,
        company.product,
        company.contact_person || "N/A",
        company.phone || "N/A",
        company.email || "N/A",
        company.address || "N/A",
        company.source_pdf || "N/A",
        formatDisplayDate(company.created_at),
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );

    downloadFile(
      `\uFEFF${header.join(",")}\n${rows.join("\n")}`,
      `companys_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const exportToPDF = () => {
    if (bulkCompanys.length === 0) return;

    const withContact = bulkCompanys.filter((company) => company.contact_person || company.phone).length;
    const withEmail = bulkCompanys.filter((company) => company.email).length;
    const fromPdf = bulkCompanys.filter((company) => company.source_pdf).length;

    exportStyledPdfReport({
      filename: `companys_${new Date().toISOString().split("T")[0]}.pdf`,
      title: "Service Companies Report",
      subtitle: "Company list and product coverage imported from PDF or created manually.",
      scopeLabel:
        selectedCompanys.length > 0
          ? `${selectedCompanys.length} selected companies`
          : `${filteredCompanys.length} filtered companies`,
      accentColor: "#0f766e",
      metrics: [
        { label: "Included", value: `${bulkCompanys.length} companies` },
        { label: "With Contact", value: `${withContact}` },
        { label: "With Email", value: `${withEmail}` },
        { label: "PDF Source", value: `${fromPdf}` },
      ],
      head: [["Code", "Company", "Product Coverage", "Contact", "Source", "Created"]],
      body: bulkCompanys.map((company) => [
        company.company_code,
        company.company_name,
        company.product,
        [company.contact_person, company.phone, company.email].filter(Boolean).join("\n") || "N/A",
        company.source_pdf || "Manual",
        formatDisplayDate(company.created_at),
      ]),
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 40 },
        2: { cellWidth: 86 },
        3: { cellWidth: 40 },
        4: { cellWidth: 34 },
        5: { cellWidth: 24 },
      },
    });
  };

  const printCompanys = () => {
    if (bulkCompanys.length === 0) return;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    const rows = bulkCompanys
      .map(
        (company) => `
          <tr>
            <td>${escapeHtml(company.company_code)}</td>
            <td>${escapeHtml(company.company_name)}</td>
            <td>${escapeHtml(company.product)}</td>
            <td>${escapeHtml(company.contact_person || "N/A")}</td>
            <td>${escapeHtml(company.phone || "N/A")}</td>
            <td>${escapeHtml(company.source_pdf || "Manual")}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Service Companies Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; color: #0f766e; }
            p { margin: 0 0 16px; color: #475569; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; vertical-align: top; }
            th { background: #eff6ff; color: #1e3a8a; }
            tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Raj Communication Service Companies Report</h1>
          <p>${escapeHtml(selectedCompanys.length > 0 ? `${selectedCompanys.length} selected companies` : `${filteredCompanys.length} filtered companies`)}</p>
          <table>
            <thead>
              <tr><th>Code</th><th>Company</th><th>Product Coverage</th><th>Contact</th><th>Phone</th><th>Source</th></tr>
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
          <h2>Service Companies</h2>
          <p>
            Showing {filteredCompanys.length} of {companys.length} companies
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
            onClick={openCreateModal}
            disabled={loadingData}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiPlus />
            <span>Add New Company</span>
          </motion.button>
        </div>
      </div>

      <div className="section-filters-row orders-toolbar-row">
        <DateRangeSelector dateRange={dateRange} onDateRangeChange={handleDateRangeChange} onPresetClick={handlePresetClick} />
        <div className="search-filter">
          <FiSearch className="search-filter-icon" />
          <input
            type="text"
            placeholder="Search company, product, contact, phone..."
            className="search-filter-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button type="button" className="btn secondary orders-clear-btn" onClick={clearFilters}>
          <FiX />
          <span>Clear Filters</span>
        </button>
      </div>

      <BulkActionPanel
        itemLabelSingular="company"
        itemLabelPlural="companies"
        selectedCount={selectedCompanys.length}
        filteredCount={filteredCompanys.length}
        totalPages={totalPages}
        itemsPerPage={ITEMS_PER_PAGE}
        helperText="Export and print use selected rows first. If nothing is selected, all filtered companies are used."
        onSelectAll={selectAllFilteredCompanys}
        onClearSelection={clearSelection}
        onExportCSV={exportToCSV}
        onExportPDF={exportToPDF}
        onPrint={printCompanys}
        disableSelectAll={filteredCompanys.length === 0}
        disableClearSelection={selectedCompanyIds.length === 0}
        disableActions={bulkCompanys.length === 0}
      />

      <div className="table-container">
        {loadingData ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading companies from database...</p>
          </div>
        ) : filteredCompanys.length > 0 ? (
          <table className="orders-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="row-checkbox"
                    checked={allPageSelected}
                    onChange={togglePageSelection}
                    aria-label="Select all companies on this page"
                  />
                </th>
                <th>Company Code</th>
                <th>Company Name</th>
                <th>Product Coverage</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCompanys.map((company, index) => {
                const isSelected = selectedCompanyIds.includes(company.id);

                return (
                  <motion.tr
                    key={company.id}
                    className={isSelected ? "selected-row" : ""}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ backgroundColor: "#f8fafc", cursor: "pointer" }}
                    onClick={() => setSelectedCompany(company)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={isSelected}
                        onChange={() => toggleCompanySelection(company.id)}
                        aria-label={`Select ${company.company_name}`}
                      />
                    </td>
                    <td>
                      <span className="product-code">{company.company_code}</span>
                    </td>
                    <td>
                      <div className="client-cell">
                        <div className="client-avatar-placeholder">{company.company_name?.charAt(0) || "C"}</div>
                        <div className="client-info">
                          <span className="client-name">{company.company_name}</span>
                          <span className="client-address">
                            {company.email || company.phone || "Contact details not added"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="client-email">{company.product}</span>
                    </td>
                    <td>
                      <span className="client-phone">{company.contact_person || company.phone || "N/A"}</span>
                    </td>
                    <td>
                      <span className="category-badge">{company.source_pdf || "Manual"}</span>
                    </td>
                    <td>
                      <span className="client-date">{formatDisplayDate(company.created_at)}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <motion.button
                          className="action-btn edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(company);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Edit Company"
                        >
                          <FiEdit />
                        </motion.button>
                        <motion.button
                          className="action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteCompany(company.id);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Delete Company"
                        >
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
            <h3>No companies found</h3>
            <p>Start by adding your first company.</p>
            <div className="empty-state-actions" style={{ display: "flex", gap: 12 }}>
              <motion.button
                className="btn primary"
                onClick={openCreateModal}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiPlus />
                Add Company
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {filteredCompanys.length > 0 && (
        <div className="orders-pagination">
          <div className="orders-pagination-info">
            Showing {pageStartIndex + 1} to {Math.min(pageStartIndex + ITEMS_PER_PAGE, filteredCompanys.length)} of{" "}
            {filteredCompanys.length} companies
          </div>
          <div className="orders-pagination-controls">
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <FiChevronLeft />
              <span>Previous</span>
            </button>
            <span className="pagination-page-chip">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              <span>Next</span>
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}

      {selectedCompany && (
        <CompanysDetailModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onEdit={(company) => {
            setSelectedCompany(null);
            openEditModal(company);
          }}
        />
      )}

      <CompanysFormModal
        show={showFormModal}
        editMode={Boolean(editCompany)}
        isSubmitting={savingCompany}
        companyForm={companyForm}
        onClose={closeFormModal}
        onChange={onCompanyFormChange}
        onSubmit={(event) => {
          void onCompanyFormSubmit(event);
        }}
      />

      <div className="dashboard-note" style={{ marginTop: 12, color: "#64748b", fontSize: 12 }}>
        <FiFileText style={{ marginRight: 6 }} />
        Company records are loaded from database using <code>companys.php</code>.
      </div>
    </div>
  );
};

export default CompanysTab;
