import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiActivity,
  FiChevronsRight,
  FiCreditCard,
  FiDollarSign,
  FiDownload,
  FiEdit,
  FiFileText,
  FiMail,
  FiPackage,
  FiPhone,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiStar,
  FiUser,
  FiX,
} from "react-icons/fi";
import { exportStyledPdfReport } from "../pdfExport";

interface StaffRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  department?: string;
  profile_image?: string;
  performance_score?: number;
  avg_rating?: number;
  last_login_formatted?: string;
  total_orders?: number;
  completed_orders?: number;
  active_orders?: number;
  total_revenue?: number;
  completion_rate?: number;
  is_active?: boolean;
}

interface StaffOrder {
  id: number;
  order_code: string;
  client_name: string;
  status?: string;
  final_cost?: number | string;
}

interface SalaryRecord {
  id: number;
  service_type: string;
  amount: number;
  bonus: number;
  deductions: number;
  net_amount: number;
  salary_date: string;
  salary_month: string;
  payment_method: string;
}

interface ExpenseRecord {
  id: number;
  service_type: string;
  expense_type: string;
  amount: number;
  description: string;
  expense_date: string;
  payment_method: string;
}

interface StaffDetailModalProps {
  show: boolean;
  staff: StaffRecord | null;
  staffOrders: StaffOrder[];
  onClose: () => void;
  onEdit?: (staff: StaffRecord) => void;
  onViewOrders?: (staff: StaffRecord) => void;
}

const API_BASE_URL = "http://162.141.0.9/sun_computers/api";
const serviceTypes = ["general", "repair", "sales", "water", "inverter"];
const expenseTypes = ["petrol", "travel", "food", "tools", "stationery", "others"];

const today = () => new Date().toISOString().split("T")[0];
const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatCurrency = (value: number | string | undefined) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

const formatMonth = (value?: string) => {
  if (!value) return "N/A";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
  });
};

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: "12px",
  border: "1px solid rgba(203, 213, 225, 0.9)",
  fontSize: "14px",
  background: "#fff",
  color: "#0f172a",
} as const;

const StaffDetailModal = ({ show, staff, staffOrders, onClose, onEdit, onViewOrders }: StaffDetailModalProps) => {
  const [activeTab, setActiveTab] = useState<"overview" | "salary" | "expense">("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [selectedSalaryIds, setSelectedSalaryIds] = useState<number[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([]);
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    service_type: "general",
    amount: "",
    bonus: "0",
    deductions: "0",
    salary_date: today(),
    salary_month: currentMonth(),
    payment_method: "bank_transfer",
    transaction_id: "",
    notes: "",
  });
  const [expenseForm, setExpenseForm] = useState({
    service_type: "general",
    expense_type: "others",
    amount: "",
    description: "",
    expense_date: today(),
    payment_method: "cash",
    receipt_number: "",
    notes: "",
  });

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

  const toCsvValue = (value: string | number | undefined | null) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const headers = () => {
    const token = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadFinance = async () => {
    if (!staff) return;
    setLoading(true);
    setError(null);

    try {
      const [salaryResponse, expenseResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/salary.php?staff_id=${staff.id}`, { headers: headers() }),
        fetch(`${API_BASE_URL}/expenses.php?staff_id=${staff.id}`, { headers: headers() }),
      ]);

      const salaryJson = await salaryResponse.json();
      const expenseJson = await expenseResponse.json();

      if (!salaryResponse.ok || !salaryJson.success) {
        throw new Error(salaryJson.message || "Failed to load salary records");
      }

      if (!expenseResponse.ok || !expenseJson.success) {
        throw new Error(expenseJson.message || "Failed to load expense records");
      }

      setSalaries(Array.isArray(salaryJson.data) ? salaryJson.data : []);
      setExpenses(Array.isArray(expenseJson.data) ? expenseJson.data : []);
    } catch (responseError: any) {
      setError(responseError.message || "Failed to load staff finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!show || !staff) return;
    setActiveTab("overview");
    setShowSalaryForm(false);
    setShowExpenseForm(false);
    setSelectedSalaryIds([]);
    setSelectedExpenseIds([]);
    void loadFinance();
  }, [show, staff]);

  useEffect(() => {
    setSelectedSalaryIds((prev) => prev.filter((id) => salaries.some((item) => item.id === id)));
  }, [salaries]);

  useEffect(() => {
    setSelectedExpenseIds((prev) => prev.filter((id) => expenses.some((item) => item.id === id)));
  }, [expenses]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const salaryTotals = useMemo(() => {
    const total = salaries.reduce((sum, item) => sum + Number(item.net_amount || 0), 0);
    return {
      total,
      count: salaries.length,
      average: salaries.length ? total / salaries.length : 0,
    };
  }, [salaries]);

  const expenseTotals = useMemo(() => {
    const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      total,
      count: expenses.length,
      average: expenses.length ? total / expenses.length : 0,
    };
  }, [expenses]);

  const selectedSalaries = salaries.filter((item) => selectedSalaryIds.includes(item.id));
  const selectedExpenses = expenses.filter((item) => selectedExpenseIds.includes(item.id));
  const bulkSalaries = selectedSalaries.length > 0 ? selectedSalaries : salaries;
  const bulkExpenses = selectedExpenses.length > 0 ? selectedExpenses : expenses;
  const allSalariesSelected = salaries.length > 0 && salaries.every((item) => selectedSalaryIds.includes(item.id));
  const allExpensesSelected = expenses.length > 0 && expenses.every((item) => selectedExpenseIds.includes(item.id));

  const toggleSalarySelection = (id: number) => {
    setSelectedSalaryIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const toggleExpenseSelection = (id: number) => {
    setSelectedExpenseIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const toggleAllSalaries = () => {
    setSelectedSalaryIds(allSalariesSelected ? [] : salaries.map((item) => item.id));
  };

  const toggleAllExpenses = () => {
    setSelectedExpenseIds(allExpensesSelected ? [] : expenses.map((item) => item.id));
  };

  const exportOverviewToCSV = () => {
    if (!staff) return;
    const summaryRows = [
      ["Performance", Number(staff.performance_score || 0).toFixed(0)],
      ["Revenue", formatCurrency(staff.total_revenue || 0)],
      ["Salary Paid", formatCurrency(salaryTotals.total)],
      ["Expenses", formatCurrency(expenseTotals.total)],
    ];
    const orderRows = staffOrders.map((order) => [
      order.order_code,
      order.client_name,
      order.status || "pending",
      formatCurrency(order.final_cost || 0),
    ]);

    const summaryBlock = [`Summary`, ["Metric", "Value"].join(","), ...summaryRows.map((row) => row.map(toCsvValue).join(","))].join("\n");
    const orderBlock = [
      "Recent Orders",
      ["Order Code", "Client", "Status", "Amount"].join(","),
      ...orderRows.map((row) => row.map(toCsvValue).join(",")),
    ].join("\n");

    downloadFile(
      `\uFEFF${summaryBlock}\n\n${orderBlock}`,
      `staff_overview_${staff.id}_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const exportOverviewToPDF = () => {
    if (!staff) return;

    exportStyledPdfReport({
      filename: `staff_overview_${staff.id}_${new Date().toISOString().split("T")[0]}.pdf`,
      title: `Staff Overview - ${staff.name}`,
      subtitle: "Performance, revenue, salary, and recent orders snapshot",
      scopeLabel: `${staffOrders.length} orders in view`,
      metrics: [
        { label: "Performance", value: Number(staff.performance_score || 0).toFixed(0) },
        { label: "Revenue", value: formatCurrency(staff.total_revenue || 0) },
        { label: "Salary Paid", value: formatCurrency(salaryTotals.total) },
        { label: "Expenses", value: formatCurrency(expenseTotals.total) },
      ],
      head: [["Order Code", "Client", "Status", "Amount"]],
      body: staffOrders.map((order) => [
        order.order_code,
        order.client_name,
        order.status || "pending",
        formatCurrency(order.final_cost || 0),
      ]),
      accentColor: "#2563eb",
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 50 },
        2: { cellWidth: 22 },
        3: { cellWidth: 28, halign: "right" },
      },
    });
  };

  const printOverview = () => {
    if (!staff) return;
    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) return;

    const rows = staffOrders
      .map(
        (order) => `
          <tr>
            <td>${escapeHtml(order.order_code)}</td>
            <td>${escapeHtml(order.client_name)}</td>
            <td>${escapeHtml(order.status || "pending")}</td>
            <td>${escapeHtml(formatCurrency(order.final_cost || 0))}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Staff Overview</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; color: #1d4ed8; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 16px 0; }
            .card { padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
            .card span { display: block; color: #64748b; font-size: 12px; margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #eff6ff; color: #1e3a8a; }
            tr:nth-child(even) { background: #f8fafc; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Staff Overview - ${escapeHtml(staff.name)}</h1>
          <p>Printed on ${escapeHtml(new Date().toLocaleString("en-IN"))}</p>
          <div class="summary">
            <div class="card"><span>Performance</span><strong>${escapeHtml(Number(staff.performance_score || 0).toFixed(0))}</strong></div>
            <div class="card"><span>Revenue</span><strong>${escapeHtml(formatCurrency(staff.total_revenue || 0))}</strong></div>
            <div class="card"><span>Salary Paid</span><strong>${escapeHtml(formatCurrency(salaryTotals.total))}</strong></div>
            <div class="card"><span>Expenses</span><strong>${escapeHtml(formatCurrency(expenseTotals.total))}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Order Code</th>
                <th>Client</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
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

  const exportSalaryToCSV = () => {
    if (!staff || bulkSalaries.length === 0) return;

    const header = ["Month", "Service", "Base", "Bonus", "Deduction", "Net", "Method", "Paid Date"];
    const rows = bulkSalaries.map((item) =>
      [
        formatMonth(item.salary_month),
        item.service_type,
        formatCurrency(item.amount),
        formatCurrency(item.bonus),
        formatCurrency(item.deductions),
        formatCurrency(item.net_amount),
        item.payment_method.replace(/_/g, " "),
        formatDate(item.salary_date),
      ]
        .map(toCsvValue)
        .join(","),
    );

    downloadFile(
      `\uFEFF${header.join(",")}\n${rows.join("\n")}`,
      `salary_${staff.id}_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const exportSalaryToPDF = () => {
    if (!staff || bulkSalaries.length === 0) return;

    const total = bulkSalaries.reduce((sum, item) => sum + Number(item.net_amount || 0), 0);
    const average = bulkSalaries.length ? total / bulkSalaries.length : 0;

    exportStyledPdfReport({
      filename: `salary_${staff.id}_${new Date().toISOString().split("T")[0]}.pdf`,
      title: `Salary Report - ${staff.name}`,
      subtitle: "Salary payouts and deductions",
      scopeLabel:
        selectedSalaryIds.length > 0 ? `${selectedSalaryIds.length} selected records` : `${salaries.length} records`,
      metrics: [
        { label: "Total Paid", value: formatCurrency(total) },
        { label: "Records", value: `${bulkSalaries.length}` },
        { label: "Average", value: formatCurrency(average) },
      ],
      head: [["Month", "Service", "Base", "Bonus", "Deduction", "Net", "Method", "Paid Date"]],
      body: bulkSalaries.map((item) => [
        formatMonth(item.salary_month),
        item.service_type,
        formatCurrency(item.amount),
        formatCurrency(item.bonus),
        formatCurrency(item.deductions),
        formatCurrency(item.net_amount),
        item.payment_method.replace(/_/g, " "),
        formatDate(item.salary_date),
      ]),
      accentColor: "#10b981",
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 22 },
        2: { cellWidth: 22, halign: "right" },
        3: { cellWidth: 18, halign: "right" },
        4: { cellWidth: 20, halign: "right" },
        5: { cellWidth: 22, halign: "right" },
        6: { cellWidth: 22 },
        7: { cellWidth: 24 },
      },
    });
  };

  const printSalary = () => {
    if (!staff || bulkSalaries.length === 0) return;
    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) return;

    const rows = bulkSalaries
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(formatMonth(item.salary_month))}</td>
            <td>${escapeHtml(item.service_type)}</td>
            <td>${escapeHtml(formatCurrency(item.amount))}</td>
            <td>${escapeHtml(formatCurrency(item.bonus))}</td>
            <td>${escapeHtml(formatCurrency(item.deductions))}</td>
            <td>${escapeHtml(formatCurrency(item.net_amount))}</td>
            <td>${escapeHtml(item.payment_method.replace(/_/g, " "))}</td>
            <td>${escapeHtml(formatDate(item.salary_date))}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Salary Records</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; color: #047857; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #ecfdf5; color: #047857; }
            tr:nth-child(even) { background: #f8fafc; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Salary Records - ${escapeHtml(staff.name)}</h1>
          <p>Printed on ${escapeHtml(new Date().toLocaleString("en-IN"))}</p>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Service</th>
                <th>Base</th>
                <th>Bonus</th>
                <th>Deduction</th>
                <th>Net</th>
                <th>Method</th>
                <th>Paid Date</th>
              </tr>
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

  const exportExpenseToCSV = () => {
    if (!staff || bulkExpenses.length === 0) return;

    const header = ["Date", "Service", "Type", "Description", "Amount", "Method"];
    const rows = bulkExpenses.map((item) =>
      [
        formatDate(item.expense_date),
        item.service_type,
        item.expense_type,
        item.description,
        formatCurrency(item.amount),
        item.payment_method.replace(/_/g, " "),
      ]
        .map(toCsvValue)
        .join(","),
    );

    downloadFile(
      `\uFEFF${header.join(",")}\n${rows.join("\n")}`,
      `expenses_${staff.id}_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const exportExpenseToPDF = () => {
    if (!staff || bulkExpenses.length === 0) return;

    const total = bulkExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const average = bulkExpenses.length ? total / bulkExpenses.length : 0;

    exportStyledPdfReport({
      filename: `expenses_${staff.id}_${new Date().toISOString().split("T")[0]}.pdf`,
      title: `Expense Report - ${staff.name}`,
      subtitle: "Expense records and reimbursements",
      scopeLabel:
        selectedExpenseIds.length > 0 ? `${selectedExpenseIds.length} selected records` : `${expenses.length} records`,
      metrics: [
        { label: "Total Expenses", value: formatCurrency(total) },
        { label: "Records", value: `${bulkExpenses.length}` },
        { label: "Average", value: formatCurrency(average) },
      ],
      head: [["Date", "Service", "Type", "Description", "Amount", "Method"]],
      body: bulkExpenses.map((item) => [
        formatDate(item.expense_date),
        item.service_type,
        item.expense_type,
        item.description,
        formatCurrency(item.amount),
        item.payment_method.replace(/_/g, " "),
      ]),
      accentColor: "#f59e0b",
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 60 },
        4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 22 },
      },
    });
  };

  const printExpense = () => {
    if (!staff || bulkExpenses.length === 0) return;
    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) return;

    const rows = bulkExpenses
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(formatDate(item.expense_date))}</td>
            <td>${escapeHtml(item.service_type)}</td>
            <td>${escapeHtml(item.expense_type)}</td>
            <td>${escapeHtml(item.description)}</td>
            <td>${escapeHtml(formatCurrency(item.amount))}</td>
            <td>${escapeHtml(item.payment_method.replace(/_/g, " "))}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Expense Records</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; color: #b45309; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #fffbeb; color: #b45309; }
            tr:nth-child(even) { background: #f8fafc; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Expense Records - ${escapeHtml(staff.name)}</h1>
          <p>Printed on ${escapeHtml(new Date().toLocaleString("en-IN"))}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Method</th>
              </tr>
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

  const submitSalary = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!staff) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/salary.php`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          staff_id: staff.id,
          service_type: salaryForm.service_type,
          amount: Number(salaryForm.amount || 0),
          bonus: Number(salaryForm.bonus || 0),
          deductions: Number(salaryForm.deductions || 0),
          salary_date: salaryForm.salary_date,
          salary_month: salaryForm.salary_month,
          payment_method: salaryForm.payment_method,
          transaction_id: salaryForm.transaction_id,
          notes: salaryForm.notes,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to save salary");

      setShowSalaryForm(false);
      setSalaryForm({
        service_type: "general",
        amount: "",
        bonus: "0",
        deductions: "0",
        salary_date: today(),
        salary_month: currentMonth(),
        payment_method: "bank_transfer",
        transaction_id: "",
        notes: "",
      });
      setNotice("Salary saved successfully.");
      await loadFinance();
    } catch (saveError: any) {
      setError(saveError.message || "Failed to save salary");
    } finally {
      setSubmitting(false);
    }
  };

  const submitExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!staff) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/expenses.php`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          staff_id: staff.id,
          service_type: expenseForm.service_type,
          expense_type: expenseForm.expense_type,
          amount: Number(expenseForm.amount || 0),
          description: expenseForm.description,
          expense_date: expenseForm.expense_date,
          payment_method: expenseForm.payment_method,
          receipt_number: expenseForm.receipt_number,
          notes: expenseForm.notes,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to save expense");

      setShowExpenseForm(false);
      setExpenseForm({
        service_type: "general",
        expense_type: "others",
        amount: "",
        description: "",
        expense_date: today(),
        payment_method: "cash",
        receipt_number: "",
        notes: "",
      });
      setNotice("Expense saved successfully.");
      await loadFinance();
    } catch (saveError: any) {
      setError(saveError.message || "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  };

  if (!show || !staff) return null;

  return (
    <motion.div className="modal-overlay-enhanced" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal-content-enhanced product-modal-content"
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        onClick={(event) => event.stopPropagation()}
        style={{ width: "min(1080px, 96vw)", maxHeight: "90vh", overflow: "hidden" }}
      >
        <div className="modal-header-enhanced product-modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-wrapper">
              <div className="modal-icon-bg"><FiUser /></div>
            </div>
            <div className="modal-title-enhanced">
              <h2>{staff.name}</h2>
              <p>{staff.email}</p>
            </div>
          </div>
          <motion.button className="close-btn-enhanced" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
            <FiX />
          </motion.button>
        </div>

        <div style={{ padding: "22px", maxHeight: "calc(90vh - 110px)", overflowY: "auto", background: "#f8fbff" }}>
          {notice ? <div style={{ marginBottom: "14px", padding: "12px 14px", borderRadius: "12px", background: "rgba(16,185,129,0.12)", color: "#047857", fontWeight: 700 }}>{notice}</div> : null}
          {error ? <div style={{ marginBottom: "14px", padding: "12px 14px", borderRadius: "12px", background: "rgba(239,68,68,0.12)", color: "#dc2626", fontWeight: 700 }}>{error}</div> : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
            {[
              ["Performance", `${Number(staff.performance_score || 0).toFixed(0)}`],
              ["Revenue", formatCurrency(staff.total_revenue || 0)],
              ["Salary Paid", formatCurrency(salaryTotals.total)],
              ["Expenses", formatCurrency(expenseTotals.total)],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: "16px", borderRadius: "18px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)" }}>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>{label}</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
            {[
              ["overview", "Overview"],
              ["salary", "Salary"],
              ["expense", "Expenses"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as typeof activeTab)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  background: activeTab === key ? "linear-gradient(135deg, #2563eb, #60a5fa)" : "#e2e8f0",
                  color: activeTab === key ? "#fff" : "#334155",
                  fontWeight: 700,
                }}
              >
                {label}
              </button>
            ))}
            <button type="button" onClick={() => void loadFinance()} style={{ marginLeft: "auto", border: "1px solid rgba(148,163,184,0.2)", background: "#fff", padding: "10px 16px", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}>
              <FiRefreshCw className={loading ? "spinning" : ""} /> Refresh
            </button>
          </div>

          {activeTab === "overview" ? (
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <h3 style={{ margin: 0 }}>Overview Exports</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-secondary" onClick={exportOverviewToCSV}>
                    <FiDownload /> Export CSV
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={exportOverviewToPDF}>
                    <FiFileText /> Export PDF
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={printOverview}>
                    <FiPrinter /> Print
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ padding: "18px", borderRadius: "18px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)" }}>
                  <h3 style={{ margin: "0 0 12px 0" }}><FiActivity /> Performance</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                    {[
                      ["Total Orders", String(staff.total_orders || 0)],
                      ["Completed", String(staff.completed_orders || 0)],
                      ["Active Queue", String(staff.active_orders || 0)],
                      ["Completion", `${Number(staff.completion_rate || 0).toFixed(1)}%`],
                      ["Avg Rating", Number(staff.avg_rating || 0).toFixed(1)],
                      ["Last Login", staff.last_login_formatted || "Never"],
                    ].map(([label, value]) => (
                      <div key={label} style={{ padding: "12px", borderRadius: "14px", background: "#f8fafc" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{label}</div>
                        <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "18px", borderRadius: "18px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)" }}>
                  <h3 style={{ margin: "0 0 12px 0" }}><FiPackage /> Recent Orders</h3>
                  {staffOrders.length > 0 ? (
                    <div style={{ display: "grid", gap: "10px" }}>
                      {staffOrders.slice(0, 5).map((order) => (
                        <div key={order.id} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "12px 14px", borderRadius: "14px", background: "#f8fafc" }}>
                          <div>
                            <div style={{ fontWeight: 800 }}>{order.order_code}</div>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>{order.client_name}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ textTransform: "capitalize", fontSize: "12px", color: "#64748b" }}>{order.status || "pending"}</div>
                            <div style={{ fontWeight: 800 }}>{formatCurrency(order.final_cost)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "16px", borderRadius: "14px", background: "#f8fafc", color: "#64748b" }}>No recent orders for this staff member.</div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ padding: "18px", borderRadius: "18px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)" }}>
                  <h3 style={{ margin: "0 0 12px 0" }}><FiDollarSign /> Salary Snapshot</h3>
                  <div style={{ display: "grid", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total</span><strong>{formatCurrency(salaryTotals.total)}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Count</span><strong>{salaryTotals.count}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Average</span><strong>{formatCurrency(salaryTotals.average)}</strong></div>
                  </div>
                </div>
                <div style={{ padding: "18px", borderRadius: "18px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)" }}>
                  <h3 style={{ margin: "0 0 12px 0" }}><FiCreditCard /> Expense Snapshot</h3>
                  <div style={{ display: "grid", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total</span><strong>{formatCurrency(expenseTotals.total)}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Count</span><strong>{expenseTotals.count}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Average</span><strong>{formatCurrency(expenseTotals.average)}</strong></div>
                  </div>
                </div>
                <div style={{ padding: "18px", borderRadius: "18px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)" }}>
                  <h3 style={{ margin: "0 0 12px 0" }}><FiStar /> Staff Info</h3>
                  <div style={{ display: "grid", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Department</span><strong>{staff.department || "Service"}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Phone</span><strong>{staff.phone || "N/A"}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Status</span><strong>{staff.is_active === false ? "Inactive" : "Active"}</strong></div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          ) : null}

          {activeTab === "salary" ? (
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0 }}>Salary Records</h3>
                  <span style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(16,185,129,0.12)", color: "#047857", fontSize: "12px", fontWeight: 700 }}>
                    {selectedSalaryIds.length} selected
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-secondary" onClick={exportSalaryToCSV} disabled={bulkSalaries.length === 0}>
                    <FiDownload /> Export CSV
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={exportSalaryToPDF} disabled={bulkSalaries.length === 0}>
                    <FiFileText /> Export PDF
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={printSalary} disabled={bulkSalaries.length === 0}>
                    <FiPrinter /> Print
                  </button>
                  <button type="button" onClick={() => setShowSalaryForm((prev) => !prev)} style={{ border: "none", background: "linear-gradient(135deg, #10b981, #34d399)", color: "#fff", padding: "10px 16px", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}>
                    <FiPlus /> {showSalaryForm ? "Close Form" : "Add Salary"}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showSalaryForm ? (
                  <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onSubmit={submitSalary} style={{ padding: "18px", borderRadius: "18px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)", display: "grid", gap: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                      <select value={salaryForm.service_type} onChange={(event) => setSalaryForm((prev) => ({ ...prev, service_type: event.target.value }))} style={inputStyle}>{serviceTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
                      <input value={salaryForm.amount} onChange={(event) => setSalaryForm((prev) => ({ ...prev, amount: event.target.value }))} type="number" min="0" step="0.01" placeholder="Base salary" required style={inputStyle} />
                      <select value={salaryForm.payment_method} onChange={(event) => setSalaryForm((prev) => ({ ...prev, payment_method: event.target.value }))} style={inputStyle}><option value="bank_transfer">bank_transfer</option><option value="cash">cash</option><option value="upi">upi</option><option value="cheque">cheque</option></select>
                      <input value={salaryForm.salary_date} onChange={(event) => setSalaryForm((prev) => ({ ...prev, salary_date: event.target.value }))} type="date" required style={inputStyle} />
                      <input value={salaryForm.salary_month} onChange={(event) => setSalaryForm((prev) => ({ ...prev, salary_month: event.target.value }))} placeholder="YYYY-MM" required pattern="\d{4}-\d{2}" style={inputStyle} />
                      <input value={salaryForm.transaction_id} onChange={(event) => setSalaryForm((prev) => ({ ...prev, transaction_id: event.target.value }))} placeholder="Transaction ID" style={inputStyle} />
                      <input value={salaryForm.bonus} onChange={(event) => setSalaryForm((prev) => ({ ...prev, bonus: event.target.value }))} type="number" min="0" step="0.01" placeholder="Bonus" style={inputStyle} />
                      <input value={salaryForm.deductions} onChange={(event) => setSalaryForm((prev) => ({ ...prev, deductions: event.target.value }))} type="number" min="0" step="0.01" placeholder="Deductions" style={inputStyle} />
                    </div>
                    <textarea value={salaryForm.notes} onChange={(event) => setSalaryForm((prev) => ({ ...prev, notes: event.target.value }))} rows={3} placeholder="Notes" style={{ ...inputStyle, resize: "vertical" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>Net amount: {formatCurrency(Number(salaryForm.amount || 0) + Number(salaryForm.bonus || 0) - Number(salaryForm.deductions || 0))}</strong>
                      <button type="submit" disabled={submitting} style={{ border: "none", background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}>{submitting ? "Saving..." : "Save Salary"}</button>
                    </div>
                  </motion.form>
                ) : null}
              </AnimatePresence>

              <div style={{ padding: "18px", borderRadius: "18px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)", overflowX: "auto" }}>
                {loading ? <div style={{ color: "#64748b" }}>Loading salary records...</div> : salaries.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "center", padding: "10px", background: "#f8fafc" }}>
                          <input
                            type="checkbox"
                            checked={allSalariesSelected}
                            onChange={toggleAllSalaries}
                            className="selection-checkbox"
                          />
                        </th>
                        {["Month", "Service", "Base", "Bonus", "Deduction", "Net", "Method"].map((heading) => (
                          <th key={heading} style={{ textAlign: "right", padding: "10px", background: "#f8fafc", fontSize: "12px", color: "#475569" }}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {salaries.map((item) => (
                        <tr key={item.id} style={{ borderTop: "1px solid rgba(226,232,240,0.9)" }}>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={selectedSalaryIds.includes(item.id)}
                              onChange={() => toggleSalarySelection(item.id)}
                              className="selection-checkbox"
                            />
                          </td>
                          <td style={{ padding: "10px", textAlign: "right", fontWeight: 700 }}>{formatMonth(item.salary_month)}</td>
                          <td style={{ padding: "10px", textAlign: "right", textTransform: "capitalize" }}>{item.service_type}</td>
                          <td style={{ padding: "10px", textAlign: "right" }}>{formatCurrency(item.amount)}</td>
                          <td style={{ padding: "10px", textAlign: "right", color: "#10b981" }}>{formatCurrency(item.bonus)}</td>
                          <td style={{ padding: "10px", textAlign: "right", color: "#ef4444" }}>{formatCurrency(item.deductions)}</td>
                          <td style={{ padding: "10px", textAlign: "right", fontWeight: 800 }}>{formatCurrency(item.net_amount)}</td>
                          <td style={{ padding: "10px", textAlign: "right", textTransform: "capitalize" }}>{item.payment_method.replace(/_/g, " ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <div style={{ color: "#64748b" }}>No salary records yet.</div>}
              </div>
            </div>
          ) : null}

          {activeTab === "expense" ? (
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0 }}>Expense Records</h3>
                  <span style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(245, 158, 11, 0.18)", color: "#b45309", fontSize: "12px", fontWeight: 700 }}>
                    {selectedExpenseIds.length} selected
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-secondary" onClick={exportExpenseToCSV} disabled={bulkExpenses.length === 0}>
                    <FiDownload /> Export CSV
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={exportExpenseToPDF} disabled={bulkExpenses.length === 0}>
                    <FiFileText /> Export PDF
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={printExpense} disabled={bulkExpenses.length === 0}>
                    <FiPrinter /> Print
                  </button>
                  <button type="button" onClick={() => setShowExpenseForm((prev) => !prev)} style={{ border: "none", background: "linear-gradient(135deg, #f59e0b, #fbbf24)", color: "#fff", padding: "10px 16px", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}>
                    <FiPlus /> {showExpenseForm ? "Close Form" : "Add Expense"}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showExpenseForm ? (
                  <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onSubmit={submitExpense} style={{ padding: "18px", borderRadius: "18px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)", display: "grid", gap: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                      <select value={expenseForm.service_type} onChange={(event) => setExpenseForm((prev) => ({ ...prev, service_type: event.target.value }))} style={inputStyle}>{serviceTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
                      <select value={expenseForm.expense_type} onChange={(event) => setExpenseForm((prev) => ({ ...prev, expense_type: event.target.value }))} style={inputStyle}>{expenseTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
                      <input value={expenseForm.amount} onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))} type="number" min="0" step="0.01" placeholder="Amount" required style={inputStyle} />
                      <input value={expenseForm.expense_date} onChange={(event) => setExpenseForm((prev) => ({ ...prev, expense_date: event.target.value }))} type="date" required style={inputStyle} />
                      <select value={expenseForm.payment_method} onChange={(event) => setExpenseForm((prev) => ({ ...prev, payment_method: event.target.value }))} style={inputStyle}><option value="cash">cash</option><option value="card">card</option><option value="upi">upi</option><option value="bank_transfer">bank_transfer</option></select>
                      <input value={expenseForm.receipt_number} onChange={(event) => setExpenseForm((prev) => ({ ...prev, receipt_number: event.target.value }))} placeholder="Receipt no." style={inputStyle} />
                    </div>
                    <input value={expenseForm.description} onChange={(event) => setExpenseForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" required style={inputStyle} />
                    <textarea value={expenseForm.notes} onChange={(event) => setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))} rows={3} placeholder="Notes" style={{ ...inputStyle, resize: "vertical" }} />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button type="submit" disabled={submitting} style={{ border: "none", background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}>{submitting ? "Saving..." : "Save Expense"}</button>
                    </div>
                  </motion.form>
                ) : null}
              </AnimatePresence>

              <div style={{ padding: "18px", borderRadius: "18px", background: "#fff", border: "1px solid rgba(148,163,184,0.14)", overflowX: "auto" }}>
                {loading ? <div style={{ color: "#64748b" }}>Loading expense records...</div> : expenses.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "center", padding: "10px", background: "#f8fafc" }}>
                          <input
                            type="checkbox"
                            checked={allExpensesSelected}
                            onChange={toggleAllExpenses}
                            className="selection-checkbox"
                          />
                        </th>
                        {["Date", "Service", "Type", "Description", "Amount", "Method"].map((heading) => (
                          <th key={heading} style={{ textAlign: heading === "Amount" ? "right" : "left", padding: "10px", background: "#f8fafc", fontSize: "12px", color: "#475569" }}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((item) => (
                        <tr key={item.id} style={{ borderTop: "1px solid rgba(226,232,240,0.9)" }}>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={selectedExpenseIds.includes(item.id)}
                              onChange={() => toggleExpenseSelection(item.id)}
                              className="selection-checkbox"
                            />
                          </td>
                          <td style={{ padding: "10px" }}>{formatDate(item.expense_date)}</td>
                          <td style={{ padding: "10px", textTransform: "capitalize" }}>{item.service_type}</td>
                          <td style={{ padding: "10px", textTransform: "capitalize" }}>{item.expense_type}</td>
                          <td style={{ padding: "10px" }}>{item.description}</td>
                          <td style={{ padding: "10px", textAlign: "right", fontWeight: 800 }}>{formatCurrency(item.amount)}</td>
                          <td style={{ padding: "10px", textTransform: "capitalize" }}>{item.payment_method.replace(/_/g, " ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <div style={{ color: "#64748b" }}>No expense records yet.</div>}
              </div>
            </div>
          ) : null}

          <div className="order-detail-actions" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "20px" }}>
            {staff.phone ? <motion.a className="btn outline" href={`tel:${staff.phone}`} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}><FiPhone /> Call Staff</motion.a> : null}
            <motion.a className="btn outline" href={`mailto:${staff.email}`} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}><FiMail /> Email Staff</motion.a>
            {onEdit ? <motion.button className="btn outline" onClick={() => onEdit(staff)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}><FiEdit /> Edit Staff</motion.button> : null}
            {onViewOrders ? <motion.button className="btn outline" onClick={() => onViewOrders(staff)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ marginLeft: "auto" }}><FiChevronsRight /> View Orders</motion.button> : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StaffDetailModal;
