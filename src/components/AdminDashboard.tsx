// src/components/AdminDashboard.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiPackage, FiDollarSign, FiTrendingUp, FiBarChart2,
  FiLogOut, FiBell, FiSearch, FiMenu, FiHome,
  FiShield, FiAlertCircle, FiCheckCircle,
  FiClock, FiRefreshCw,
  FiEdit, FiTrash2, FiChevronLeft, FiChevronRight,
  FiTrendingDown, FiBox, FiUserCheck,
  FiX, FiShoppingBag, FiCalendar,
  FiUpload, FiTruck, FiUser, FiCamera,
  FiInfo, FiHardDrive,
  FiMessageSquare, FiCreditCard, FiTruck as FiDelivery, FiMapPin,
  FiPhone, FiMail, FiCalendar as FiDate, FiDollarSign as FiRupee,
  FiAlertTriangle, FiStar,
  FiCheck, FiXCircle, FiLoader, FiDownload
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './css/AdminDashboard.css';
import './css/Dashboard.css';
import OrdersTab from './dashboard/tabs/OrdersTab';
import UserTab from './dashboard/tabs/UserTab';
import StaffTab from './dashboard/tabs/StaffTab';
import RevenueTab from './dashboard/tabs/RevenueTab';
import AnalyticsTab from './dashboard/tabs/AnalyticsTab';
import NotificationDropdown from './dashboard/NotificationDropdown';
import ReceiptActionModal from './dashboard/modals/ReceiptActionModal';
import ClientsTab from './dashboard/tabs/ClientsTab';
import ProductsTab from './dashboard/tabs/ProductsTab';
import DeliveryTab from './dashboard/tabs/DeliveryTab';
import OrderFormModal from './dashboard/modals/OrderFormModal';
import ClientFormModal from './dashboard/modals/ClientFormModal';
import ProductFormModal from './dashboard/modals/ProductFormModal';
import UserFormModal from './dashboard/modals/UserFormModal';
import StaffFormModal from './dashboard/modals/StaffFormModal';
import UserDetailModal from './dashboard/modals/UserDetailModal';
import StaffDetailModal from './dashboard/modals/StaffDetailModal';
import ReplacementOrdersTab from './dashboard/tabs/ReplacementOrdersTab';
import SpareProductsTab from './dashboard/tabs/SpareProductsTab';
import ShopclaimTab from './dashboard/tabs/ShopclaimTab';
import CompanyClaimTab from './dashboard/tabs/CompanyClaimTab';
import CompanysTab from './dashboard/tabs/CompanysTab';
import SunToCompanyTab from './dashboard/tabs/SunToCompanyTab';
import CompanyToSunTab from './dashboard/tabs/CompanyToSunTab';
import BrandwiseOverallReportTab from './dashboard/tabs/BrandwiseOverallReportTab';
import {
  createDeliveryReceiptMarkup,
  createOrderReceiptMarkup,
  downloadReceiptPdf,
  openReceiptPrintWindow,
} from './dashboard/receiptUtils';
import { exportStyledPdfReport } from './dashboard/pdfExport';
import { expandProductNameSerialPairs } from './dashboard/productBatch';
import ConfirmDeleteModal from './dashboard/modals/ConfirmDeleteModal';
import type { Order as DashboardOrder } from './dashboard/types';

// Enhanced Type Definitions
interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'user';
  avatar?: string;
  profile_image?: string;
  last_login?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  order_count?: number;
  department?: string;
  password?: string;
}

interface DashboardStats {
  total_users: number;
  total_clients: number;
  total_orders: number;
  total_products: number;
  active_staff: number;
  pending_orders: number;
  completed_orders: number;
  delivered_orders: number;
  total_revenue: number;
  today_orders: number;
  today_revenue: number;
  active_products?: number;
  low_stock_products?: number;
  avg_order_value?: number;
}

interface StaffPerformance {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  profile_image?: string;
  last_login: string;
  last_login_formatted: string;
  is_active: boolean;
  total_orders: number;
  completed_orders: number;
  active_orders: number;
  total_revenue: number;
  avg_rating: number;
  completion_rate: number;
  avg_order_value: number;
  performance_score: number;
  department: string;
}

interface Order {
  id: number;
  order_code: string;
  company_id?: number | null;
  company_ids?: number[];
  company_name?: string;
  company_names?: string[];
  company_names_text?: string;
  company_product_map?: Record<string, string[]>;
  companies_products?: Record<string, string[]>;
  product_status_map?: Record<string, string> | string;
  company_product_name_map?: Record<string, { company_name?: string; product_names?: string[] | string }>;
  client_id: number;
  client_name: string;
  client_phone: string;
  client_email?: string;
  client_address?: string;
  product_id: number;
  product_name: string;
  product_ids?: number[];
  product_names?: string[];
  replacement_product_id?: number | null;
  replacement_product_name?: string;
  replacement_product_ids?: number[];
  replacement_product_names?: string[];
  issue_description: string;
  warranty_status: 'in_warranty' | 'out_of_warranty' | 'extended_warranty';
  estimated_cost: string;
  final_cost: string;
  deposit_amount: string;
  payment_status: 'pending' | 'partially_paid' | 'paid' | 'refunded';
  estimated_delivery_date: string;
  status: 'pending' | 'scheduled' | 'process' | 'ready' | 'completed' | 'delivered' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes: string;
  created_at: string;
  updated_at?: string;
  staff_id?: number;
  staff_name?: string;
  diagnosis_notes?: string;
  repair_notes?: string;
  brand?: string;
  model?: string;
  product_brand?: string;
  product_model?: string;
  serial_number?: string;
  replacement_serial_number?: string;
  product_serial_numbers?: string[];
  replacement_product_serial_numbers?: string[];
  purchase_date?: string;
  service_type?: string;
  accessories?: string;
  technician_notes?: string;
  customer_feedback?: string;
  next_service_date?: string;
}

interface Client {
  id: number;
  client_code: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
  created_at: string;
  updated_at: string;
  total_orders: number;
  total_spent: number;
  customer_since: string;
}

interface Product {
  id: number;
  product_code: string;
  product_name: string;
  serial_number?: string;
  is_spare_product?: boolean | number | string;
  brand: string;
  model: string;
  category: 'laptop' | 'desktop' | 'mobile' | 'tablet' | 'accessory' | 'other';
  claim_type?: string;
  specifications: string;
  purchase_date: string;
  warranty_period: string;
  warranty_status: 'active' | 'expired';
  price: string;
  stock_quantity: number;
  min_stock_level: number;
  status: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  updated_at: string;
  supplier?: string;
  location?: string;
  total_orders?: number;
}

interface Delivery {
  id: number;
  order_id: number;
  order_code: string;
  delivery_code: string;
  client_name: string;
  client_phone: string;
  product_name: string;
  address: string;
  contact_person: string;
  contact_phone: string;
  delivery_type: 'home_delivery' | 'pickup';
  scheduled_date: string;
  scheduled_time: string;
  delivery_person: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
  delivered_date?: string;
  notes: string;
  created_at: string;
}

interface AnalyticsData {
  monthly_revenue: Array<{month: string; revenue: number}>;
  order_trends: Array<{date: string; orders: number}>;
  category_distribution: Array<{category: string; count: number; value: number}>;
  status_distribution: Array<{status: string; count: number; color: string}>;
  priority_distribution: Array<{priority: string; count: number; color: string}>;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  icon?: string;
  order_id?: number;
  order_code?: string;
  pending_days?: number;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

type ReceiptTarget =
  | { kind: 'order'; order: Order }
  | { kind: 'delivery'; delivery: Delivery };

// Alert Component
const AlertMessage: React.FC<{
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  onClose: () => void;
}> = ({ type, message, onClose }) => {
  const icons = {
    error: <FiAlertCircle className="alert-icon" />,
    success: <FiCheckCircle className="alert-icon" />,
    warning: <FiAlertCircle className="alert-icon" />,
    info: <FiAlertCircle className="alert-icon" />,
  };

  return (
    <div className={`alert alert-${type}`}>
      <div className="alert-content">
        {icons[type]}
        <div className="alert-message">{message}</div>
        <button className="alert-close" onClick={onClose}>
          x
        </button>
      </div>
    </div>
  );
};

// Modal Component
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg',
    xl: 'modal-xl',
    full: 'modal-full'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="modal-backdrop" onClick={onClose} />
          <div className="modal-overlay">
            <div className="modal-container">
              <div className={`modal-content ${sizeClasses[size]}`}>
                <div className="modal-header">
                  <div className="modal-title-wrapper">
                    <h3 className="modal-title">{title}</h3>
                    <div className="title-underline"></div>
                  </div>
                  <button
                    onClick={onClose}
                    className="modal-close-button"
                  >
                    <FiX />
                  </button>
                </div>
                <div className="modal-body">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// Order Details Modal Component
const OrderDetailsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  products?: Product[];
  onEdit: () => void;
  onGenerateReceipt: () => void;
  onDelete: () => void;
}> = ({ isOpen, onClose, order, products = [], onEdit, onGenerateReceipt, onDelete }) => {
  if (!order) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <FiClock className="status-icon pending" />;
      case 'scheduled': return <FiCalendar className="status-icon scheduled" />;
      case 'process': return <FiLoader className="status-icon process" />;
      case 'ready': return <FiCheckCircle className="status-icon ready" />;
      case 'completed': return <FiCheck className="status-icon completed" />;
      case 'delivered': return <FiDelivery className="status-icon delivered" />;
      case 'cancelled': return <FiXCircle className="status-icon cancelled" />;
      default: return <FiInfo className="status-icon" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'low': return <FiTrendingDown className="priority-icon low" />;
      case 'medium': return <FiTrendingUp className="priority-icon medium" />;
      case 'high': return <FiAlertTriangle className="priority-icon high" />;
      case 'urgent': return <FiAlertTriangle className="priority-icon urgent" />;
      default: return <FiInfo className="priority-icon" />;
    }
  };

  const getWarrantyIcon = (warranty: string) => {
    switch (warranty) {
      case 'in_warranty': return <FiShield className="warranty-icon in-warranty" />;
      case 'out_of_warranty': return <FiShield className="warranty-icon out-warranty" />;
      case 'extended_warranty': return <FiShield className="warranty-icon extended-warranty" />;
      default: return <FiShield className="warranty-icon" />;
    }
  };

  const getPaymentIcon = (payment: string) => {
    switch (payment) {
      case 'pending': return <FiCreditCard className="payment-icon pending" />;
      case 'partially_paid': return <FiCreditCard className="payment-icon partially-paid" />;
      case 'paid': return <FiCreditCard className="payment-icon paid" />;
      case 'refunded': return <FiCreditCard className="payment-icon refunded" />;
      default: return <FiCreditCard className="payment-icon" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    const normalized = dateString.includes(' ') ? dateString.replace(' ', 'T') : dateString;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseJsonArray = (value: string): unknown[] | null => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const normalizeNameList = (value: unknown): string[] => {
    let rawList: unknown[] = [];

    if (Array.isArray(value)) {
      rawList = value;
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      rawList =
        parseJsonArray(trimmed) ??
        (trimmed.includes('||') ? trimmed.split('||') : trimmed.split(','));
    }

    return Array.from(
      new Set(
        rawList
          .map((entry) => String(entry ?? '').trim())
          .filter(Boolean),
      ),
    );
  };

  const normalizeIdList = (value: unknown): number[] => {
    let rawList: unknown[] = [];

    if (Array.isArray(value)) {
      rawList = value;
    } else if (typeof value === 'number') {
      rawList = [value];
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      rawList = parseJsonArray(trimmed) ?? trimmed.split(',');
    }

    return Array.from(
      new Set(
        rawList
          .map((entry) => Number(entry))
          .filter((entry) => Number.isInteger(entry) && entry > 0),
      ),
    );
  };

  const withIdFallback = (names: string[], ids: number[], labelPrefix: string) => {
    if (names.length > 0) return names;
    return ids.map((id) => `${labelPrefix} #${id}`);
  };

  type ProductEntry = { label: string; serialNumber: string };

  const buildOrderProductEntries = (
    ids: number[],
    names: string[],
    serials: string[],
    fallbackSerial: string,
    prefix: string,
  ): ProductEntry[] => {
    const entries = ids.map((id, index) => {
      const matched = products.find((product) => product.id === id);
      return {
        label: names[index] || matched?.product_name || `${prefix} #${id}`,
        serialNumber: serials[index] || matched?.serial_number || (index === 0 ? fallbackSerial : '') || '',
      };
    });

    if (entries.length > 0) return entries;

    return names.map((name, index) => ({
      label: name,
      serialNumber: serials[index] || (index === 0 ? fallbackSerial : '') || '',
    }));
  };

  const primaryIds = Array.from(
    new Set([
      ...normalizeIdList(order.product_ids),
      ...normalizeIdList(order.product_id),
    ]),
  );
  const replacementIds = Array.from(
    new Set([
      ...normalizeIdList(order.replacement_product_ids),
      ...normalizeIdList(order.replacement_product_id),
    ]),
  );
  const normalizedPrimaryNamesFromList = normalizeNameList(order.product_names);
  const normalizedReplacementNamesFromList = normalizeNameList(order.replacement_product_names);
  const primaryNames = withIdFallback(
    normalizedPrimaryNamesFromList.length > 0
      ? normalizedPrimaryNamesFromList
      : normalizeNameList(order.product_name),
    primaryIds,
    'Product',
  );
  const replacementNames = withIdFallback(
    normalizedReplacementNamesFromList.length > 0
      ? normalizedReplacementNamesFromList
      : normalizeNameList(order.replacement_product_name),
    replacementIds,
    'Replacement Product',
  );
  const primarySerials = normalizeNameList(order.product_serial_numbers);
  const replacementSerials = normalizeNameList(order.replacement_product_serial_numbers);
  const primaryEntries = buildOrderProductEntries(
    primaryIds,
    primaryNames,
    primarySerials,
    order.serial_number || '',
    'Product',
  );
  const replacementEntries = buildOrderProductEntries(
    replacementIds,
    replacementNames,
    replacementSerials,
    order.replacement_serial_number || '',
    'Replacement Product',
  );
  const brandValue = order.product_brand || order.brand;
  const modelValue = order.product_model || order.model;
  const normalizeProductFlowStatusMap = (value: unknown): Record<string, string> => {
    if (!value) return {};
    let parsed: unknown = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        return {};
      }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const normalized: Record<string, string> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([productId, status]) => {
      const key = String(productId || '').trim();
      if (!key) return;
      const raw = String(status || '').trim().toLowerCase();
      if (raw === 'pending' || raw === 'rajtocom' || raw === 'comtoraj' || raw === 'deliveryed' || raw === 'delivered') {
        normalized[key] = raw === 'delivered' ? 'deliveryed' : raw;
      }
    });
    return normalized;
  };
  const normalizeProductFlowDatesMap = (
    value: unknown,
  ): Record<string, { pending?: string; rajtocom?: string; comtoraj?: string; deliveryed?: string }> => {
    if (!value) return {};
    let parsed: unknown = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        return {};
      }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const normalized: Record<string, { pending?: string; rajtocom?: string; comtoraj?: string; deliveryed?: string }> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([productId, dates]) => {
      const key = String(productId || '').trim();
      if (!key || !dates || typeof dates !== 'object' || Array.isArray(dates)) return;
      const row = dates as Record<string, unknown>;
      normalized[key] = {
        pending: row.pending ? String(row.pending) : '',
        rajtocom: row.rajtocom ? String(row.rajtocom) : '',
        comtoraj: row.comtoraj ? String(row.comtoraj) : '',
        deliveryed: row.deliveryed
          ? String(row.deliveryed)
          : row.delivered
            ? String(row.delivered)
            : '',
      };
    });
    return normalized;
  };
  const normalizeRepairingStatusMap = (value: unknown): Record<string, string> => {
    if (!value) return {};
    let parsed: unknown = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      } catch {
        return {};
      }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const normalized: Record<string, string> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([productId, status]) => {
      const id = Number(productId);
      if (!Number.isInteger(id) || id <= 0) return;
      const raw = String(status || '').trim().toLowerCase().replaceAll('_', ' ');
      if (raw === 'ready') normalized[id.toString()] = 'ready';
      else if (raw === 'replacement') normalized[id.toString()] = 'replacement';
      else normalized[id.toString()] = 'not ready';
    });
    return normalized;
  };
  const getRepairingStatusTone = (status: string) => {
    if (status === 'ready') return { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Ready' };
    if (status === 'replacement') return { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', label: 'Replacement' };
    return { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: 'Not Ready' };
  };
  const normalizeCompanyProductMap = (value: unknown): Record<string, number[]> => {
    let raw: unknown = value;

    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return {};
      try {
        raw = JSON.parse(trimmed);
      } catch {
        return {};
      }
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const map: Record<string, number[]> = {};
    Object.entries(raw as Record<string, unknown>).forEach(([companyId, productIds]) => {
      const id = Number(companyId);
      if (!Number.isInteger(id) || id <= 0) return;
      map[id.toString()] = normalizeIdList(productIds);
    });
    return map;
  };

  const companyProductMap = normalizeCompanyProductMap(order.company_product_map || order.companies_products);
  const companyIds = Array.from(
    new Set([
      ...normalizeIdList(order.company_ids),
      ...normalizeIdList(order.company_id),
      ...Object.keys(companyProductMap)
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ]),
  );
  const companyNamesFromArray = normalizeNameList(order.company_names);
  const companyNamesFromText = normalizeNameList(order.company_names_text || order.company_name);
  const companyNames =
    companyNamesFromArray.length > 0
      ? companyNamesFromArray
      : companyNamesFromText.length > 0
        ? companyNamesFromText
        : companyIds.map((id) => `Company #${id}`);
  const companyNamesText = companyNames.length > 0 ? companyNames.join(', ') : 'No company selected';
  const repairingStatusMap = normalizeRepairingStatusMap((order as any).repairing_status_map);
  const repairingStatusIds = Object.keys(repairingStatusMap)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
  const productNameById = new Map<number, string>();
  primaryEntries.forEach((entry, index) => {
    const pid = primaryIds[index];
    if (pid) productNameById.set(pid, entry.label);
  });
  const repairingEntries = repairingStatusIds.map((productId) => {
    const status = repairingStatusMap[productId.toString()];
    const matchedProduct = products.find((product) => product.id === productId);
    const label = productNameById.get(productId) || matchedProduct?.product_name || `Product #${productId}`;
    return { productId, status, label, tone: getRepairingStatusTone(status) };
  });
  const repairingReadyCount = repairingEntries.filter((entry) => entry.status === 'ready').length;
  const repairingReplacementCount = repairingEntries.filter((entry) => entry.status === 'replacement').length;
  const repairingNotReadyCount = repairingEntries.filter((entry) => entry.status === 'not ready').length;
  const productFlowStatusMap = normalizeProductFlowStatusMap((order as any).product_status_map);
  const productFlowDatesMap = normalizeProductFlowDatesMap((order as any).product_status_dates_map);
  const productFlowIds = Array.from(
    new Set([
      ...primaryIds,
      ...Object.keys(productFlowStatusMap).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
      ...Object.keys(productFlowDatesMap).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
    ]),
  );
  const apiCompanyProductNameMap = order.company_product_name_map;
  const companyProductLines =
    apiCompanyProductNameMap && typeof apiCompanyProductNameMap === 'object'
      ? Object.values(apiCompanyProductNameMap)
          .map((entry) => {
            const companyLabel = String(entry?.company_name || '').trim();
            const parsedNames = normalizeNameList(entry?.product_names || []);
            return {
              companyLabel: companyLabel || 'Company',
              productNames: parsedNames,
            };
          })
          .filter((line) => line.companyLabel)
      : companyIds.length > 0
        ? companyIds.map((companyId, index) => {
            const companyLabel = companyNames[index] || `Company #${companyId}`;
            const mappedIds = companyProductMap[companyId.toString()] || [];
            const productNames =
              mappedIds.length > 0
                ? mappedIds
                    .map((productId) => products.find((product) => product.id === productId)?.product_name || `Product #${productId}`)
                : index === 0 && primaryEntries.length > 0
                  ? primaryEntries.map((entry) => entry.label)
                  : [];
            return {
              companyLabel,
              productNames,
            };
          })
        : companyNames.length > 0
          ? companyNames.map((name, index) => ({
              companyLabel: name,
              productNames: index === 0 && primaryEntries.length > 0 ? primaryEntries.map((entry) => entry.label) : [],
            }))
          : [];

  const renderCompanyProductBlocks = (
    lines: Array<{ companyLabel: string; productNames: string[] }>,
  ) => {
    if (lines.length === 0) {
      return <span>No products</span>;
    }

    return (
      <div>
        {lines.map((line, index) => (
          <div key={`${line.companyLabel}-${index}`} style={{ marginBottom: '10px' }}>
            <div><strong>{line.companyLabel}</strong></div>
            {line.productNames.length > 0 ? (
              line.productNames.map((productName, productIndex) => (
                <div key={`${line.companyLabel}-${productName}-${productIndex}`}>
                  {productIndex + 1}. {productName}
                </div>
              ))
            ) : (
              <div>No products</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order Details - ${order.order_code}`}
      size="xl"
    >
      <div className="order-details-modal">
        {/* Order Header */}
        <div className="order-header">
          <div className="order-code-section">
            <h3 className="order-code">{order.order_code}</h3>
            <span className="order-date">Created: {formatDate(order.created_at)}</span>
          </div>
          <div className="order-status-section">
            <div className="status-display">
              {getStatusIcon(order.status)}
              <span className={`status-badge ${order.status}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
            <div className="priority-display">
              {getPriorityIcon(order.priority)}
              <span className={`priority-badge ${order.priority}`}>
                {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="order-details-grid">
          {/* Client Information */}
          <div className="detail-card client-info">
            <div className="detail-card-header">
              <FiUser className="detail-card-icon" />
              <h4>Client Information</h4>
            </div>
            <div className="detail-card-content">
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{order.client_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">
                  <FiPhone className="inline-icon" /> {order.client_phone}
                </span>
              </div>
              {order.client_email && (
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">
                    <FiMail className="inline-icon" /> {order.client_email}
                  </span>
                </div>
              )}
              {order.client_address && (
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">
                    <FiMapPin className="inline-icon" /> {order.client_address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Product Information */}
          <div className="detail-card product-info">
            <div className="detail-card-header">
              <FiPackage className="detail-card-icon" />
              <h4>Product Information</h4>
            </div>
            <div className="detail-card-content">
              <div className="detail-row">
                <span className="detail-label">Companies:</span>
                <span className="detail-value" title={companyNamesText}>{companyNamesText}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Main Products:</span>
                <div className="detail-value">
                  {companyProductLines.length > 0 ? (
                    renderCompanyProductBlocks(companyProductLines)
                  ) : (
                    <span
                      title={
                        primaryEntries.length
                          ? primaryEntries
                              .map((entry) =>
                                entry.serialNumber ? `${entry.label} (SN: ${entry.serialNumber})` : entry.label,
                              )
                              .join(', ')
                          : 'Not added'
                      }
                    >
                      {primaryEntries.length
                        ? primaryEntries
                            .map((entry, index) =>
                              `${index + 1}. ${entry.label}${entry.serialNumber ? ` (SN: ${entry.serialNumber})` : ''}`,
                            )
                            .join(', ')
                        : 'Not added'}
                    </span>
                  )}
                </div>
              </div>
              {replacementEntries.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Replacement Products:</span>
                  <span
                    className="detail-value"
                    title={replacementEntries
                      .map((entry) =>
                        entry.serialNumber ? `${entry.label} (SN: ${entry.serialNumber})` : entry.label,
                      )
                      .join(', ')}
                  >
                    {replacementEntries
                      .map((entry, index) =>
                        `${index + 1}. ${entry.label}${entry.serialNumber ? ` (SN: ${entry.serialNumber})` : ''}`,
                      )
                      .join(', ')}
                  </span>
                </div>
              )}
              {(brandValue || modelValue) && (
                <div className="detail-row">
                  <span className="detail-label">Brand/Model:</span>
                  <span className="detail-value">
                    {brandValue || 'N/A'} {modelValue ? `- ${modelValue}` : ''}
                  </span>
                </div>
              )}
              {order.serial_number && (
                <div className="detail-row">
                  <span className="detail-label">Serial Number:</span>
                  <span className="detail-value">{order.serial_number}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Warranty:</span>
                <span className="detail-value">
                  {getWarrantyIcon(order.warranty_status)}
                  <span className={`warranty-status ${order.warranty_status}`}>
                    {order.warranty_status.replace('_', ' ')}
                  </span>
                </span>
              </div>
              {order.purchase_date && (
                <div className="detail-row">
                  <span className="detail-label">Purchase Date:</span>
                  <span className="detail-value">{formatDate(order.purchase_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Repairing Status */}
          <div className="detail-card repairing-status-info">
            <div className="detail-card-header">
              <FiTrendingUp className="detail-card-icon" />
              <h4>Repairing Status</h4>
            </div>
            <div className="detail-card-content">
              <div className="repairing-status-summary-admin">
                <span className="repair-chip ready">Ready {repairingReadyCount}</span>
                <span className="repair-chip not-ready">Not Ready {repairingNotReadyCount}</span>
                <span className="repair-chip replacement">Replacement {repairingReplacementCount}</span>
              </div>
              {repairingEntries.length > 0 ? (
                <div className="repairing-status-list-admin">
                  {repairingEntries.map((entry, index) => (
                    <div key={`repairing-${entry.productId}`} className="repairing-status-row-admin">
                      <span className="repairing-status-label-admin">{index + 1}. {entry.label}</span>
                      <span
                        className="repairing-status-pill-admin"
                        style={{
                          borderColor: entry.tone.border,
                          backgroundColor: entry.tone.bg,
                          color: entry.tone.color,
                        }}
                      >
                        {entry.tone.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="detail-value">No repairing status added</span>
              )}
            </div>
          </div>

          {/* Product Flow Status Timeline */}
          <div className="detail-card product-flow-info">
            <div className="detail-card-header">
              <FiTrendingUp className="detail-card-icon" />
              <h4>Product Flow Status Timeline</h4>
            </div>
            <div className="detail-card-content">
              {productFlowIds.length > 0 ? (
                <div className="flow-status-list-admin">
                  {productFlowIds.map((productId, index) => {
                    const label = productNameById.get(productId) || `Product #${productId}`;
                    const current = productFlowStatusMap[String(productId)] || 'pending';
                    const dates = productFlowDatesMap[String(productId)] || {};
                    return (
                      <div key={`flow-admin-${productId}`} className="flow-status-card-admin">
                        <div className="flow-status-head-admin">
                          <strong>{index + 1}. {label}</strong>
                          <span className={`flow-status-pill-admin flow-${current}`}>{current}</span>
                        </div>
                        <div className="flow-status-dates-admin">
                          <span>Pending: {formatDateTime(dates.pending) === '-' ? 'Not set' : formatDateTime(dates.pending)}</span>
                          <span>RajToCom: {formatDateTime(dates.rajtocom) === '-' ? 'Not set' : formatDateTime(dates.rajtocom)}</span>
                          <span>ComToRaj: {formatDateTime(dates.comtoraj) === '-' ? 'Not set' : formatDateTime(dates.comtoraj)}</span>
                          <span>Deliveryed: {formatDateTime(dates.deliveryed) === '-' ? 'Not set' : formatDateTime(dates.deliveryed)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="detail-value">No product flow status added</span>
              )}
            </div>
          </div>

          {/* Service Details */}
          <div className="detail-card service-details">
            <div className="detail-card-header">
              <FiHardDrive className="detail-card-icon" />
              <h4>Service Details</h4>
            </div>
            <div className="detail-card-content">
              <div className="detail-row full-width">
                <span className="detail-label">Issue Description:</span>
                <div className="detail-value issue-description">
                  {order.issue_description}
                </div>
              </div>
              {order.diagnosis_notes && (
                <div className="detail-row full-width">
                  <span className="detail-label">Diagnosis Notes:</span>
                  <div className="detail-value">
                    {order.diagnosis_notes}
                  </div>
                </div>
              )}
              {order.repair_notes && (
                <div className="detail-row full-width">
                  <span className="detail-label">Repair Notes:</span>
                  <div className="detail-value">
                    {order.repair_notes}
                  </div>
                </div>
              )}
              {order.technician_notes && (
                <div className="detail-row full-width">
                  <span className="detail-label">Technician Notes:</span>
                  <div className="detail-value">
                    {order.technician_notes}
                  </div>
                </div>
              )}
              {order.accessories && (
                <div className="detail-row">
                  <span className="detail-label">Accessories:</span>
                  <span className="detail-value">{order.accessories}</span>
                </div>
              )}
              {order.service_type && (
                <div className="detail-row">
                  <span className="detail-label">Service Type:</span>
                  <span className="detail-value">{order.service_type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Information */}
          <div className="detail-card financial-info">
            <div className="detail-card-header">
              <FiRupee className="detail-card-icon" />
              <h4>Financial Information</h4>
            </div>
            <div className="detail-card-content">
              <div className="detail-row">
                <span className="detail-label">Estimated Cost:</span>
                <span className="detail-value">
                  Rs. {parseFloat(order.estimated_cost || '0').toFixed(2)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Final Cost:</span>
                <span className="detail-value final-cost">
                  Rs. {parseFloat(order.final_cost || order.estimated_cost || '0').toFixed(2)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Deposit Amount:</span>
                <span className="detail-value deposit-amount">
                  Rs. {parseFloat(order.deposit_amount || '0').toFixed(2)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Payment Status:</span>
                <span className="detail-value">
                  {getPaymentIcon(order.payment_status)}
                  <span className={`payment-status ${order.payment_status}`}>
                    {order.payment_status.replace('_', ' ')}
                  </span>
                </span>
              </div>
              {order.payment_status === 'partially_paid' && (
                <div className="detail-row">
                  <span className="detail-label">Balance Due:</span>
                  <span className="detail-value balance-due">
                    Rs. {(parseFloat(order.final_cost || order.estimated_cost || '0') - 
                        parseFloat(order.deposit_amount || '0')).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline & Dates */}
          <div className="detail-card timeline-info">
            <div className="detail-card-header">
              <FiDate className="detail-card-icon" />
              <h4>Timeline & Dates</h4>
            </div>
            <div className="detail-card-content">
              <div className="detail-row">
                <span className="detail-label">Order Created:</span>
                <span className="detail-value">{formatDateTime(order.created_at)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last Updated:</span>
                <span className="detail-value">{formatDateTime(order.updated_at)}</span>
              </div>
              {order.estimated_delivery_date && (
                <div className="detail-row">
                  <span className="detail-label">Estimated Delivery:</span>
                  <span className="detail-value estimated-delivery">
                    {formatDate(order.estimated_delivery_date)}
                  </span>
                </div>
              )}
              {order.next_service_date && (
                <div className="detail-row">
                  <span className="detail-label">Next Service Date:</span>
                  <span className="detail-value next-service">
                    {formatDate(order.next_service_date)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Staff & Assignment */}
          <div className="detail-card staff-info">
            <div className="detail-card-header">
              <FiUserCheck className="detail-card-icon" />
              <h4>Staff Assignment</h4>
            </div>
            <div className="detail-card-content">
              <div className="detail-row">
                <span className="detail-label">Assigned Staff:</span>
                <span className="detail-value">
                  {order.staff_name || 'Not Assigned'}
                </span>
              </div>
              {order.staff_id && (
                <div className="detail-row">
                  <span className="detail-label">Staff ID:</span>
                  <span className="detail-value">#{order.staff_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          {order.notes && (
            <div className="detail-card additional-notes">
              <div className="detail-card-header">
                <FiMessageSquare className="detail-card-icon" />
                <h4>Additional Notes</h4>
              </div>
              <div className="detail-card-content">
                <div className="notes-content">
                  {order.notes}
                </div>
              </div>
            </div>
          )}

          {/* Customer Feedback */}
          {order.customer_feedback && (
            <div className="detail-card customer-feedback">
              <div className="detail-card-header">
                <FiStar className="detail-card-icon" />
                <h4>Customer Feedback</h4>
              </div>
              <div className="detail-card-content">
                <div className="feedback-content">
                  {order.customer_feedback}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="order-details-actions">
          <button className="btn btn-primary" onClick={onGenerateReceipt}>
            <FiDownload /> Download Receipt PDF
          </button>
          <button className="btn btn-secondary" onClick={onEdit}>
            <FiEdit /> Edit Order
          </button>
          <button className="btn btn-danger" onClick={onDelete}>
            <FiTrash2 /> Delete Order
          </button>
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Password Reset Modal Component
const ResetPasswordModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  onResetPassword: (userId: number, newPassword: string) => Promise<void>;
}> = ({ isOpen, onClose, userId, userName, onResetPassword }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordStrength = (() => {
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  })();

  const strengthLabel =
    passwordStrength <= 1 ? 'Weak' : passwordStrength <= 2 ? 'Medium' : passwordStrength === 3 ? 'Strong' : 'Very Strong';

  const strengthColor =
    passwordStrength <= 1 ? '#ef4444' : passwordStrength <= 2 ? '#f59e0b' : passwordStrength === 3 ? '#2563eb' : '#10b981';

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleClose = () => {
    onClose();
    setError(null);
    setSuccess(false);
    setLoading(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await onResetPassword(userId, newPassword);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Password" size="md">
      <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {success ? (
          <div
            className="success-message"
            style={{
              padding: '32px 24px',
              borderRadius: '24px',
              background: 'linear-gradient(180deg, rgba(240,253,244,0.96), rgba(220,252,231,0.88))',
              border: '1px solid rgba(34,197,94,0.18)',
              textAlign: 'center',
            }}
          >
            <FiCheckCircle className="success-icon" />
            <p>Password reset successfully!</p>
          </div>

        ) : (
          <form onSubmit={handleSubmit}>
            <div
              style={{
                borderRadius: '22px',
                padding: '18px',
                marginBottom: '18px',
                background: 'linear-gradient(180deg, rgba(239,246,255,0.95), rgba(224,242,254,0.88))',
                border: '1px solid rgba(37,99,235,0.14)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '18px',
                    background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '20px',
                  }}
                >
                  {userName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Password Security
                  </div>
                  <h4 style={{ margin: '4px 0 0', fontSize: '20px', color: '#0f172a' }}>{userName}</h4>
                </div>
              </div>
              <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
                Set a new password for this account. Use a strong password that the user can store safely.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="userName">User</label>
              <input type="text" id="userName" value={userName} disabled className="form-input" />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password *</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong password"
                className="form-input"
                required
                minLength={6}
              />
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#475569' }}>
                  <span>Password strength</span>
                  <strong style={{ color: strengthColor }}>{newPassword ? strengthLabel : 'Not set'}</strong>
                </div>
                <div
                  style={{
                    height: '8px',
                    borderRadius: '999px',
                    background: 'rgba(148,163,184,0.18)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(passwordStrength / 4) * 100}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: strengthColor,
                      transition: 'width 0.25s ease',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', padding: '6px 10px', borderRadius: '999px', background: 'rgba(148,163,184,0.12)' }}>6+ chars</span>
                  <span style={{ fontSize: '12px', color: '#64748b', padding: '6px 10px', borderRadius: '999px', background: 'rgba(148,163,184,0.12)' }}>Uppercase</span>
                  <span style={{ fontSize: '12px', color: '#64748b', padding: '6px 10px', borderRadius: '999px', background: 'rgba(148,163,184,0.12)' }}>Number</span>
                  <span style={{ fontSize: '12px', color: '#64748b', padding: '6px 10px', borderRadius: '999px', background: 'rgba(148,163,184,0.12)' }}>Symbol</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter the new password"
                className="form-input"
                required
                minLength={6}
              />
              {confirmPassword && (
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: passwordsMatch ? '#059669' : '#dc2626',
                  }}
                >
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </div>
              )}
            </div>

            {error && (
              <div
                className="form-error"
                style={{
                  marginTop: '8px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'rgba(254,242,242,0.92)',
                  border: '1px solid rgba(239,68,68,0.15)',
                }}
              >
                {error}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

// Main Component
const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  
  // State
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Check screen width on initial load
    return window.innerWidth >= 1024;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [loading, setLoading] = useState({
    dashboard: false,
    users: false,
    orders: false,
    replacementorders: false,
    clients: false,
    products: false,
    spareproducts: false,
    shopclaim: false,
    companyclaim: false,
    companys: false,
    suntocompany: false,
    companytosun: false,
    staff: false,
    revenue: false,
    analytics: false,
    deliveries: false,
    brandwiseoverallreport: false
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Data States
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sunToCompanyClaims, setSunToCompanyClaims] = useState<Product[]>([]);
  const [companyToSunClaims, setCompanyToSunClaims] = useState<Product[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [selectedStaffOrders, setSelectedStaffOrders] = useState<Order[]>([]);
  const notificationDropdownRef = useRef<HTMLDivElement | null>(null);
  
  // Selection States
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedDeliveries, setSelectedDeliveries] = useState<number[]>([]);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [filters, setFilters] = useState({
    users: {
      role: '',
      status: ''
    },
    orders: {
      status: '',
      priority: '',
      payment_status: ''
    },
    clients: {
      city: ''
    },
    replacementorders: {
      status: '',
      priority: ''
    },
    products: {
      category: '',
      status: ''
    },
    spareproducts: {
      category: '',
      status: ''
    },
    shopclaim: {},
    companyclaim: {},
    companys: {},
    suntocompany: {},
    companytosun: {},
    deliveries: {
      status: '',
      delivery_type: ''
    },
  });
  const [sortConfig, setSortConfig] = useState({
    key: '',
    direction: 'asc'
  });
  
  // Modal States
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editType, setEditType] = useState<'user' | 'order' | 'client' | 'product' | 'delivery'>('user');
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<{id: number; name: string} | null>(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<ReceiptTarget | null>(null);
  const [showStaffDetailsModal, setShowStaffDetailsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<DashboardOrder | Order | null>(null);
  const [deleteOrderPending, setDeleteOrderPending] = useState(false);
  
  // Form States
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    phone: '',
    department: 'general',
    is_active: true,
    profile_image: null as File | null,
    profile_image_url: ''
  });

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'process', label: 'Process' },
    { value: 'ready', label: 'Ready' },
    { value: 'completed', label: 'Completed' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const warrantyOptions = [
    { value: 'in_warranty', label: 'In Warranty' },
    { value: 'out_of_warranty', label: 'Out of Warranty' },
    { value: 'extended_warranty', label: 'Extended Warranty' }
  ];

  const paymentOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' },
    { value: 'refunded', label: 'Refunded' }
  ];

  const categoryOptions = [
    { value: 'laptop', label: 'Laptop' },
    { value: 'desktop', label: 'Desktop' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'other', label: 'Other' }
  ];

  const deliveryStatusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const deliveryTypeOptions = [
    { value: 'home_delivery', label: 'Home Delivery' },
    { value: 'pickup', label: 'Pickup' }
  ];
  void deliveryTypeOptions;
  
  const [newOrder, setNewOrder] = useState({
    company_id: '',
    company_ids: [] as string[],
    company_name: '',
    company_product_map: {} as Record<string, string[]>,
    client_id: '',
    client_name: '',
    client_phone: '',
    product_id: '',
    replacement_product_id: '',
    product_ids: [] as string[],
    product_status_map: {} as Record<string, string>,
    repairing_status_map: {} as Record<string, string>,
    replacement_product_ids: [] as string[],
    product_name: '',
    replacement_product_name: '',
    service_type: 'general',
    issue_description: '',
    warranty_status: 'out_of_warranty' as 'in_warranty' | 'out_of_warranty' | 'extended_warranty',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    status: 'pending' as 'pending' | 'scheduled' | 'process' | 'ready' | 'completed' | 'delivered' | 'cancelled',
    payment_status: 'pending' as 'pending' | 'partially_paid' | 'paid' | 'refunded',
    staff_id: '',
    estimated_cost: '',
    final_cost: '',
    deposit_amount: '0',
    estimated_delivery_date: '',
    notes: '',
  });
  
  const [newClient, setNewClient] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: ''
  });
  
  const getDefaultNewProduct = () => ({
    product_name: '',
    serial_number: '',
    is_spare_product: false,
    brand: '',
    model: '',
    category: 'laptop' as 'laptop' | 'desktop' | 'mobile' | 'tablet' | 'accessory' | 'other',
    claim_type: 'none',
    price: '0',
    stock_quantity: '0',
    min_stock_level: '5',
    purchase_date: new Date().toISOString().split('T')[0],
    warranty_period: '1 year',
    specifications: '',
    status: 'active' as 'active' | 'inactive' | 'discontinued'
  });

  const [newProduct, setNewProduct] = useState(getDefaultNewProduct);
  
  // API Configuration
  const API_BASE_URL = "http://localhost/raj_communication/api";
  
  // Check authentication and role
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      
      if (!token || !userData || isLoggedIn !== 'true') {
        navigate('/login');
        return;
      }
      
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (e) {
        navigate('/login');
      }
    };
    
    checkAuth();
    
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      
      // Auto-close sidebar on mobile/tablet, open on desktop
      if (width < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate]);
  
  // Load data based on active tab
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setError(null);
      const tabKey = activeTab as keyof typeof loading;
      setLoading(prev => ({ ...prev, [tabKey]: true }));
      
      try {
        switch (activeTab) {
          case 'dashboard':
            await loadDashboardData();
            await loadNotifications();
            await loadStaffForDropdown();
            await loadClientsForDropdown(); // Load clients for dropdown
            break;
          case 'users':
            await loadUsers();
            break;
          case 'orders':
          case 'replacementorders':
            await loadOrders();
            await loadStaffForDropdown();
            await loadClientsForDropdown(); // Load clients for dropdown
            await loadProducts(); // Load products for create/edit order modal
            break;
          case 'clients':
            await loadClients();
            break;
          case 'products':
          case 'spareproducts':
          case 'shopclaim':
          case 'companyclaim':
          case 'companys':
            await loadProducts();
            break;
          case 'suntocompany':
            await loadSunToCompanyClaims();
            break;
          case 'companytosun':
            await loadCompanyToSunClaims();
            break;
          case 'staff':
            await loadStaffPerformance();
            break;
          case 'revenue':
            break;
          case 'analytics':
            await loadAnalytics();
            break;
          case 'brandwiseoverallreport':
            await Promise.all([loadOrders(), loadProducts(), loadDeliveries()]);
            break;
          case 'deliveries':
            await loadDeliveries();
            break;
        }
      } catch (error: any) {
        console.error('Failed to load data:', error);
        setError(error.message || 'Failed to load data');
      } finally {
        setLoading(prev => ({ ...prev, [tabKey]: false }));
      }
    };
    
    loadData();
  }, [activeTab, user]);
  
  // API functions
  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  const summarizeServerBody = (rawBody: string) => {
    const clean = rawBody
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return '';
    return clean.length > 220 ? `${clean.slice(0, 220)}...` : clean;
  };

  const parseJsonText = (rawBody: string) => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  };
  
  const apiRequest = async (endpoint: string, method: string = 'GET', data: any = null) => {
    const token = getAuthToken();
    if (!token) {
      handleLogout();
      throw new Error('No authentication token');
    }
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const config: RequestInit = {
      method,
      headers,
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }
    
    const requestUrl = /^https?:\/\//i.test(endpoint) ? endpoint : `${API_BASE_URL}/${endpoint}`;
    console.log(`API Request: ${method} ${requestUrl}`, data);
    
    try {
      const response = await fetch(requestUrl, config);
      const responseText = await response.text();
      const trimmedText = responseText.trim();
      const parsedResult = trimmedText ? parseJsonText(trimmedText) : null;
      
      if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired');
      }
      
      if (!response.ok) {
        console.error('API Error Response:', trimmedText);

        if (parsedResult && typeof parsedResult === 'object') {
          const message = (parsedResult as any).message;
          throw new Error(message || `API error: ${response.status}`);
        }

        const preview = summarizeServerBody(trimmedText);
        throw new Error(preview || `API error: ${response.status}`);
      }

      if (!trimmedText) {
        return { success: true };
      }

      if (!parsedResult) {
        const preview = summarizeServerBody(trimmedText);
        throw new Error(
          preview
            ? `Server returned invalid JSON: ${preview}`
            : 'Server returned invalid JSON',
        );
      }

      console.log(`API Response from ${endpoint}:`, parsedResult);
      return parsedResult;
      
    } catch (error: any) {
      console.error('API request failed:', error);
      setError(error.message || 'Network error');
      throw error;
    }
  };
  
  // Data loading functions
  const loadDashboardData = async () => {
    try {
      // Load dashboard stats from API
      const data = await apiRequest('admin_api.php?action=dashboard_stats');
      
      if (data.success && data.stats) {
        console.log('Dashboard stats loaded:', data.stats);
        
        // Map API response to DashboardStats interface
        const stats: DashboardStats = {
          total_users: data.stats.total_users || 0,
          total_clients: data.stats.total_clients || 0,
          total_orders: data.stats.total_orders || 0,
          total_products: data.stats.total_products || 0,
          active_staff: data.stats.active_staff || 0,
          pending_orders: data.stats.pending_orders || 0,
          delivered_orders: data.stats.delivered_orders || 0,
          total_revenue: data.stats.total_revenue || 0,
          today_orders: data.stats.today_orders || 0,
          today_revenue: data.stats.today_revenue || 0,
          completed_orders: data.stats.completed_orders || 0,
          active_products: data.stats.active_products || 0,
          low_stock_products: data.stats.low_stock_products || 0,
          avg_order_value: data.stats.avg_order_value || 0
        };
        
        setDashboardStats(stats);
      } else {
        console.error('Failed to load dashboard stats:', data);
        // Fallback to manual calculations if API fails
        await fallbackDashboardData();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to manual calculations
      await fallbackDashboardData();
    }
  };
  
  const fallbackDashboardData = async () => {
    try {
      // Try to load individual data and calculate manually
      const usersData = await apiRequest('admin_api.php?action=get_users');
      const clientsData = await apiRequest('admin_api.php?action=get_clients');
      const ordersData = await apiRequest('admin_api.php?action=get_orders');
      const productsData = await apiRequest('admin_api.php?action=get_products');
      
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate today's orders and revenue
      const todayOrders = ordersData.orders ? 
        ordersData.orders.filter((o: any) => o.created_at && o.created_at.startsWith(today)) : [];
      
      const todayRevenue = todayOrders.reduce((sum: number, o: any) => 
        sum + parseFloat(o.final_cost || o.estimated_cost || '0'), 0);
      
      // FIXED: Correctly calculate pending orders - only orders with status 'pending'
      const pendingOrders = ordersData.orders ? 
        ordersData.orders.filter((o: any) => 
          (o.status && o.status.toString().toLowerCase() === 'pending')
        ).length : 0;
      
      // Calculate total revenue
      const totalRevenue = ordersData.orders ? 
        ordersData.orders.reduce((sum: number, o: any) => 
          sum + parseFloat(o.final_cost || o.estimated_cost || '0'), 0) : 0;
      
      // Calculate delivered orders
      const deliveredOrders = ordersData.orders ? 
        ordersData.orders.filter((o: any) => 
          o.status && o.status.toString().toLowerCase() === 'delivered'
        ).length : 0;
      
      // Calculate completed orders
      const completedOrders = ordersData.orders ? 
        ordersData.orders.filter((o: any) => 
          o.status && o.status.toString().toLowerCase() === 'completed'
        ).length : 0;
      
      // Calculate active staff
      const activeStaff = usersData.users ? 
        usersData.users.filter((u: any) => 
          (u.role !== 'admin') &&
          (u.is_active === '1' || u.is_active === 1 || u.is_active === true || u.is_active === 'true')
        ).length : 0;
      
      // Calculate active products
      const activeProducts = productsData.products ? 
        productsData.products.filter((p: any) => p.status === 'active').length : 0;
      
      // Calculate low stock products only when the API actually returns stock fields
      const lowStockProducts = productsData.products ? 
        productsData.products.filter((p: any) => 
          p.stock_quantity !== undefined &&
          p.min_stock_level !== undefined &&
          parseInt(p.stock_quantity || 0) <= parseInt(p.min_stock_level || 5)
        ).length : 0;
      
      // Calculate average order value
      const avgOrderValue = ordersData.orders && ordersData.orders.length > 0 ? 
        totalRevenue / ordersData.orders.length : 0;
      
      const stats: DashboardStats = {
        total_users: usersData.users ? usersData.users.length : 0,
        total_clients: clientsData.clients ? clientsData.clients.length : 0,
        total_orders: ordersData.orders ? ordersData.orders.length : 0,
        total_products: productsData.products ? productsData.products.length : 0,
        active_staff: activeStaff,
        pending_orders: pendingOrders, // This now correctly counts only 'pending' status orders
        delivered_orders: deliveredOrders,
        completed_orders: completedOrders,
        total_revenue: totalRevenue,
        today_orders: todayOrders.length,
        today_revenue: todayRevenue,
        active_products: activeProducts,
        low_stock_products: lowStockProducts,
        avg_order_value: avgOrderValue
      };
      
      console.log('Fallback dashboard stats calculated:', {
        pendingOrders,
        totalOrders: ordersData.orders ? ordersData.orders.length : 0,
        statusBreakdown: ordersData.orders ? ordersData.orders.map((o: any) => o.status) : []
      });
      
      setDashboardStats(stats);
      
    } catch (error) {
      console.error('Error in fallback dashboard data:', error);
      // Set empty stats
      setDashboardStats({
        total_users: 0,
        total_clients: 0,
        total_orders: 0,
        total_products: 0,
        active_staff: 0,
        pending_orders: 0,
        delivered_orders: 0,
        completed_orders: 0,
        total_revenue: 0,
        today_orders: 0,
        today_revenue: 0,
        active_products: 0,
        low_stock_products: 0,
        avg_order_value: 0
      });
    }
  };
  
  const loadUsers = async () => {
    try {
      const data = await apiRequest('admin_api.php?action=get_users');
      
      if (data.success && data.users) {
        const mappedUsers: User[] = data.users.map((user: any) => ({
          id: parseInt(user.id),
          name: user.name || 'Unknown',
          email: user.email || '',
          phone: user.phone || '',
          role: user.role as 'admin' | 'user',
          is_active: user.is_active === '1' || user.is_active === 1 || user.is_active === true,
          profile_image: user.profile_image || user.avatar,
          last_login: user.last_login || null,
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at,
          department: user.department || 'general'
        }));
        
        setUsers(mappedUsers);
        setSelectedUsers([]);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };
  
  const loadStaffForDropdown = async () => {
    try {
      const data = await apiRequest('admin_api.php?action=get_users');
      
      if (data.success && data.users) {
        const allUsers: User[] = data.users.map((user: any) => ({
          id: parseInt(user.id),
          name: user.name || 'Unknown',
          email: user.email || '',
          phone: user.phone || '',
          role: user.role as 'admin' | 'user',
          is_active: user.is_active === '1' || user.is_active === 1 || user.is_active === true,
          profile_image: user.profile_image,
          last_login: user.last_login,
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at,
          department: user.department || 'service'
        }));
        
        setStaffList(allUsers);
      } else {
        setStaffList(users);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      setStaffList(users);
    }
  };
  
  // Load clients specifically for dropdown in create order modal
  const loadClientsForDropdown = async () => {
    try {
      const data = await apiRequest('admin_api.php?action=get_clients');
      
      if (data.success && data.clients) {
        const mappedClients: Client[] = data.clients.map((client: any) => ({
          id: parseInt(client.id),
          client_code: client.client_code || `CLT${client.id}`,
          full_name: client.full_name || 'Unknown',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          zip_code: client.zip_code || '',
          notes: client.notes || '',
          created_at: client.created_at,
          updated_at: client.updated_at || client.created_at,
          total_orders: parseInt(client.total_orders) || 0,
          total_spent: parseFloat(client.total_spent) || 0,
          customer_since: client.created_at
        }));
        
        // Keep client list in sync for the order form dropdown.
        setClients(mappedClients);
        return mappedClients;
      } else {
        setClients([]);
        return [];
      }
    } catch (error) {
      console.error('Error loading clients for dropdown:', error);
      setClients([]);
      return [];
    }
  };
  
  const loadOrders = async () => {
    try {
      const data = await apiRequest('admin_api.php?action=get_orders');
      
      if (data.success && data.orders) {
        const toNumberArray = (value: unknown): number[] => {
          if (Array.isArray(value)) {
            return value
              .map((entry) => parseInt(String(entry), 10))
              .filter((entry) => Number.isFinite(entry) && entry > 0);
          }
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return [];
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                return parsed
                  .map((entry) => parseInt(String(entry), 10))
                  .filter((entry) => Number.isFinite(entry) && entry > 0);
              }
            } catch {
              // keep fallback below
            }
            return trimmed
              .split(',')
              .map((entry) => parseInt(entry.trim(), 10))
              .filter((entry) => Number.isFinite(entry) && entry > 0);
          }
          return [];
        };

        const toStringArray = (value: unknown): string[] => {
          if (Array.isArray(value)) {
            return value
              .map((entry) => String(entry || '').trim())
              .filter(Boolean);
          }
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return [];
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                return parsed
                  .map((entry) => String(entry || '').trim())
                  .filter(Boolean);
              }
            } catch {
              // keep fallback below
            }
            return trimmed
              .split(trimmed.includes('||') ? '||' : ',')
              .map((entry) => entry.trim())
              .filter(Boolean);
          }
          return [];
        };

        const mappedOrders: Order[] = data.orders.map((order: any) => {
          const parsedProductIds = toNumberArray(order.product_ids);
          const parsedReplacementProductIds = toNumberArray(order.replacement_product_ids);
          const parsedProductNames = toStringArray(order.product_names);
          const parsedReplacementProductNames = toStringArray(order.replacement_product_names);
          const parsedCompanyIds = toNumberArray(order.company_ids);
          const parsedCompanyNames = toStringArray(order.company_names);
          const primaryProductId = parseInt(String(order.product_id || ''), 10);
          const primaryReplacementProductId = parseInt(String(order.replacement_product_id || ''), 10);
          const primaryCompanyId = parseInt(String(order.company_id || ''), 10);
          const normalizedProductIds =
            parsedProductIds.length > 0
              ? parsedProductIds
              : Number.isFinite(primaryProductId) && primaryProductId > 0
                ? [primaryProductId]
                : [];
          const normalizedReplacementProductIds =
            parsedReplacementProductIds.length > 0
              ? parsedReplacementProductIds
              : Number.isFinite(primaryReplacementProductId) && primaryReplacementProductId > 0
                ? [primaryReplacementProductId]
                : [];
          const normalizedProductNames =
            parsedProductNames.length > 0
              ? parsedProductNames
              : order.product_name
                ? [order.product_name]
                : [];
          const normalizedReplacementProductNames =
            parsedReplacementProductNames.length > 0
              ? parsedReplacementProductNames
              : order.replacement_product_name
                ? [order.replacement_product_name]
                : [];
          const normalizedCompanyIds =
            parsedCompanyIds.length > 0
              ? parsedCompanyIds
              : Number.isFinite(primaryCompanyId) && primaryCompanyId > 0
                ? [primaryCompanyId]
                : [];
          const normalizedCompanyNames =
            parsedCompanyNames.length > 0
              ? parsedCompanyNames
              : toStringArray(order.company_name);
          const rawCompanyProductMap = normalizeCompanyProductMap(order.company_product_map || order.companies_products);
          const normalizedCompanyProductMap: Record<string, string[]> = Object.fromEntries(
            normalizedCompanyIds.map((companyId) => [companyId.toString(), rawCompanyProductMap[companyId.toString()] || []]),
          );
          if (normalizedCompanyIds.length > 0 && !Object.values(normalizedCompanyProductMap).some((ids) => ids.length > 0) && normalizedProductIds.length > 0) {
            normalizedCompanyProductMap[normalizedCompanyIds[0].toString()] = normalizedProductIds.map((id) => id.toString());
          }
          const incomingProductStatusMap = normalizeProductStatusMap(order.product_status_map);
          const normalizedProductStatusMap: Record<string, string> = Object.fromEntries(
            normalizedProductIds.map((id) => {
              const key = id.toString();
              return [key, normalizeProductFlowStatus(incomingProductStatusMap[key])];
            }),
          );
          const incomingRepairingStatusMap = normalizeRepairingStatusMap((order as any).repairing_status_map);
          const normalizedRepairingStatusMap: Record<string, string> = Object.fromEntries(
            normalizedProductIds.map((id) => {
              const key = id.toString();
              return [key, normalizeRepairingStatus(incomingRepairingStatusMap[key])];
            }),
          );

          return {
          ...order,
          id: parseInt(String(order.id), 10),
          order_code: order.order_code || `ORD${order.id}`,
          company_id: normalizedCompanyIds[0] || (order.company_id ? parseInt(order.company_id) : null),
          company_ids: normalizedCompanyIds,
          company_name: (normalizedCompanyNames.length > 0 ? normalizedCompanyNames.join(' || ') : (order.company_name || '')),
          company_names: normalizedCompanyNames,
          company_product_map: normalizedCompanyProductMap,
          client_id: parseInt(order.client_id) || 0,
          client_name: order.client_name || 'Unknown',
          client_phone: order.client_phone || '',
          client_email: order.client_email,
          client_address: order.client_address,
          product_id: normalizedProductIds[0] || (Number.isFinite(primaryProductId) ? primaryProductId : 0),
          product_name: normalizedProductNames[0] || order.product_name || 'Unknown',
          product_ids: normalizedProductIds,
          product_status_map: normalizedProductStatusMap,
          repairing_status_map: normalizedRepairingStatusMap,
          product_names: normalizedProductNames,
          replacement_product_id:
            normalizedReplacementProductIds[0] ||
            (Number.isFinite(primaryReplacementProductId) ? primaryReplacementProductId : null),
          replacement_product_name: normalizedReplacementProductNames[0] || order.replacement_product_name || '',
          replacement_product_ids: normalizedReplacementProductIds,
          replacement_product_names: normalizedReplacementProductNames,
          issue_description: order.issue_description || '',
          warranty_status: order.warranty_status || 'out_of_warranty',
          estimated_cost: order.estimated_cost || '0',
          final_cost: order.final_cost || order.estimated_cost || '0',
          deposit_amount: order.deposit_amount || '0',
          payment_status: order.payment_status || 'pending',
          estimated_delivery_date: order.estimated_delivery_date || '',
          status: order.status || 'pending',
          priority: order.priority || 'medium',
          notes: order.notes || '',
          created_at: order.created_at,
          updated_at: order.updated_at || order.created_at,
          staff_id: order.staff_id ? parseInt(order.staff_id) : undefined,
          staff_name: order.staff_name,
          brand: order.brand,
          model: order.model,
          product_brand: order.product_brand || order.brand,
          product_model: order.product_model || order.model,
          serial_number: order.serial_number,
          purchase_date: order.purchase_date,
          service_type: order.service_type,
          accessories: order.accessories,
          diagnosis_notes: order.diagnosis_notes,
          repair_notes: order.repair_notes,
          technician_notes: order.technician_notes,
          customer_feedback: order.customer_feedback,
          next_service_date: order.next_service_date
          };
        });
        
        setOrders(mappedOrders);
        setSelectedOrders([]);
        
        // Update pending orders count in dashboard stats after loading orders
        if (dashboardStats) {
          const pendingCount = mappedOrders.filter(order => 
            order.status && order.status.toString().toLowerCase() === 'pending'
          ).length;
          
          setDashboardStats(prev => prev ? {
            ...prev,
            pending_orders: pendingCount
          } : prev);
        }
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    }
  };
  
  const loadClients = async () => {
    try {
      const data = await apiRequest('admin_api.php?action=get_clients');
      
      if (data.success && data.clients) {
        const mappedClients: Client[] = data.clients.map((client: any) => ({
          id: parseInt(client.id),
          client_code: client.client_code || `CLT${client.id}`,
          full_name: client.full_name || 'Unknown',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          zip_code: client.zip_code || '',
          notes: client.notes || '',
          created_at: client.created_at,
          updated_at: client.updated_at || client.created_at,
          total_orders: parseInt(client.total_orders) || 0,
          total_spent: parseFloat(client.total_spent) || 0,
          customer_since: client.created_at
        }));
        
        setClients(mappedClients);
        setSelectedClients([]);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  };
  
  const loadProducts = async () => {
    try {
      const data = await apiRequest('admin_api.php?action=get_products');
      
      if (data.success && data.products) {
        const mappedProducts: Product[] = data.products.map((product: any) => ({
          id: parseInt(product.id),
          product_code: product.product_code || `PRD${product.id}`,
          product_name: product.product_name || 'Unknown',
          serial_number: product.serial_number || '',
          is_spare_product: product.is_spare_product ?? 0,
          brand: product.brand || '',
          model: product.model || '',
          category: (product.category as 'laptop' | 'desktop' | 'mobile' | 'tablet' | 'accessory' | 'other') || 'other',
          claim_type: product.claim_type || 'none',
          specifications: product.specifications || '',
          purchase_date: product.purchase_date || '',
          warranty_period: product.warranty_period || '',
          warranty_status: product.warranty_status || 'active',
          price: product.price || '0',
          stock_quantity: parseInt(product.stock_quantity) || 0,
          min_stock_level: parseInt(product.min_stock_level) || 5,
          status: (product.status as 'active' | 'inactive' | 'discontinued') || 'active',
          created_at: product.created_at,
          updated_at: product.updated_at || product.created_at
        }));
        
        setProducts(mappedProducts);
        setSelectedProducts([]);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    }
  };
  
  const loadDeliveries = async () => {
    try {
      const data = await apiRequest('deliveries.php');
      
      if (data.success && data.deliveries) {
        const mappedDeliveries: Delivery[] = data.deliveries.map((delivery: any) => ({
          id: parseInt(delivery.id),
          order_id: parseInt(delivery.order_id) || 0,
          order_code: delivery.order_code || '',
          delivery_code: delivery.delivery_code || `DEL${delivery.id}`,
          client_name: delivery.client_name || '',
          client_phone: delivery.client_phone || '',
          product_name: delivery.product_name || '',
          address: delivery.address || '',
          contact_person: delivery.contact_person || '',
          contact_phone: delivery.contact_phone || '',
          delivery_type: delivery.delivery_type === 'delivery' ? 'home_delivery' : 'pickup',
          scheduled_date: delivery.scheduled_date || '',
          scheduled_time: delivery.scheduled_time || '',
          delivery_person: delivery.delivery_person || '',
          status: delivery.status || 'scheduled',
          delivered_date: delivery.delivered_date || '',
          notes: delivery.notes || '',
          created_at: delivery.created_at || new Date().toISOString()
        }));
        
        setDeliveries(mappedDeliveries);
        setSelectedDeliveries([]);
      } else {
        setDeliveries([]);
      }
    } catch (error) {
      console.error('Error loading deliveries:', error);
      setDeliveries([]);
    }
  };
  
  const loadStaffPerformance = async () => {
    try {
      const data = await apiRequest('admin_api.php?action=staff_performance');
      
      if (data.success && data.staff) {
        const mappedStaff: StaffPerformance[] = data.staff.map((staff: any) => ({
          id: parseInt(staff.id),
          name: staff.name || 'Unknown',
          email: staff.email || '',
          phone: staff.phone || '',
          role: staff.role || 'user',
          avatar: staff.avatar || '',
          profile_image: staff.profile_image || staff.avatar || '',
          last_login: staff.last_login || null,
          last_login_formatted: staff.last_login_formatted || 'Never',
          is_active: staff.is_active === '1' || staff.is_active === 1 || staff.is_active === true,
          total_orders: parseInt(staff.total_orders) || 0,
          completed_orders: parseInt(staff.completed_orders) || 0,
          active_orders: parseInt(staff.active_orders) || 0,
          total_revenue: parseFloat(staff.total_revenue) || 0,
          avg_rating: parseFloat(staff.avg_rating) || 0,
          completion_rate: parseFloat(staff.completion_rate) || 0,
          avg_order_value: parseFloat(staff.avg_order_value) || 0,
          performance_score: parseFloat(staff.performance_score) || 0,
          department: staff.department || 'Service'
        }));
        
        setStaffPerformance(mappedStaff);
        console.log('Staff performance loaded:', mappedStaff.length, 'staff members');
      } else {
        setStaffPerformance([]);
      }
    } catch (error) {
      console.error('Error loading staff performance:', error);
      setStaffPerformance([]);
    }
  };
  
  const loadStaffOrders = async (staffId: number) => {
    try {
      const staffOrders = orders.filter(order => order.staff_id === staffId);
      setSelectedStaffOrders(staffOrders);
      return staffOrders;
    } catch (error) {
      console.error('Error loading staff orders:', error);
      return [];
    }
  };

  const loadSunToCompanyClaims = async () => {
    try {
      const query =
        dateRange.startDate && dateRange.endDate
          ? `?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
          : '';
      const data = await apiRequest(`suntocompany.php${query}`);
      if (data.success) {
        setSunToCompanyClaims((data.products || data.sunToCompanyClaims || []) as Product[]);
      } else {
        setSunToCompanyClaims([]);
      }
    } catch (error) {
      console.error('Error loading RajToCom products:', error);
      setSunToCompanyClaims([]);
    }
  };

  const loadCompanyToSunClaims = async () => {
    try {
      const query =
        dateRange.startDate && dateRange.endDate
          ? `?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
          : '';
      const data = await apiRequest(`companytosun.php${query}`);
      if (data.success) {
        const normalizedClaims = ((data.products || data.companyToSunClaims || []) as Product[]).map((product) => ({
          ...product,
          id: Number(product.id) || 0,
        }));
        setCompanyToSunClaims(normalizedClaims);
      } else {
        setCompanyToSunClaims([]);
      }
    } catch (error) {
      console.error('Error loading company-to-raj products:', error);
      setCompanyToSunClaims([]);
    }
  };

  const calculatePendingDays = useCallback((createdAt: string) => {
    const createdDate = new Date(createdAt);
    if (Number.isNaN(createdDate.getTime())) return 0;
    const diffMs = Date.now() - createdDate.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }, []);

  const buildPendingOrderNotifications = useCallback(
    (sourceOrders: Order[], previous: Notification[]) => {
      const existingByOrder = new Map<number, Notification>();
      previous.forEach((notification) => {
        if (notification.order_id) {
          existingByOrder.set(notification.order_id, notification);
        }
      });

      return sourceOrders
        .filter((order) => String(order.status || '').toLowerCase() === 'pending')
        .map((order) => {
          const pendingDays = calculatePendingDays(order.created_at);
          const existing = existingByOrder.get(order.id);
          const pendingMessage =
            pendingDays <= 0 ? 'Pending today' : `Pending for ${pendingDays} day${pendingDays === 1 ? '' : 's'}`;

        return {
          id: existing?.id ?? 1000000 + order.id,
          title: `Order ${order.order_code} pending`,
          message: pendingMessage,
          type: 'order',
          is_read: existing?.is_read ?? false,
          created_at: order.created_at || new Date().toISOString(),
          order_id: order.id,
          order_code: order.order_code,
          pending_days: pendingDays,
        };
      })
        .sort((a, b) => (b.pending_days || 0) - (a.pending_days || 0));
    },
    [calculatePendingDays],
  );
  
  const loadAnalytics = async () => {
    try {
      const data = await apiRequest('admin_api.php?action=analytics');
      
      if (data.success && data.analytics) {
        // Fallbacks from currently loaded orders when analytics API omits a dataset
        const priorityCounts: any = {};
        orders.forEach(order => {
          priorityCounts[order.priority] = (priorityCounts[order.priority] || 0) + 1;
        });
        
        const fallbackPriorityDistribution = Object.keys(priorityCounts).map(priority => ({
          priority,
          count: priorityCounts[priority],
          color: getPriorityColor(priority)
        }));
        
        const statusCounts: any = {};
        orders.forEach(order => {
          statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });
        
        const fallbackStatusDistribution = Object.keys(statusCounts).map(status => ({
          status,
          count: statusCounts[status],
          color: getStatusColor(status)
        }));

        const apiPriorityDistribution = Array.isArray(data.analytics.priority_distribution)
          ? data.analytics.priority_distribution.map((item: any) => ({
              priority: item.priority,
              count: Number(item.count) || 0,
              color: item.color || getPriorityColor(item.priority)
            }))
          : [];

        const apiStatusDistribution = Array.isArray(data.analytics.status_distribution)
          ? data.analytics.status_distribution.map((item: any) => ({
              status: item.status,
              count: Number(item.count) || 0,
              color: item.color || getStatusColor(item.status)
            }))
          : [];

        const apiCategoryDistribution = Array.isArray(data.analytics.category_distribution)
          ? data.analytics.category_distribution.map((item: any) => ({
              category: item.category,
              count: Number(item.count) || 0,
              value: Number(item.value) || 0
            }))
          : [];
        
        setAnalyticsData({
          monthly_revenue: data.analytics.monthly_revenue || [],
          order_trends: data.analytics.order_trends || [],
          category_distribution: apiCategoryDistribution,
          status_distribution: apiStatusDistribution.length > 0 ? apiStatusDistribution : fallbackStatusDistribution,
          priority_distribution: apiPriorityDistribution.length > 0 ? apiPriorityDistribution : fallbackPriorityDistribution
        });
        
        console.log('Analytics data loaded:', data.analytics);
      } else {
        // Fallback data - calculate from orders
        const priorityCounts: any = {};
        const statusCounts: any = {};
        
        orders.forEach(order => {
          priorityCounts[order.priority] = (priorityCounts[order.priority] || 0) + 1;
          statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });
        
        const priorityDistribution = Object.keys(priorityCounts).map(priority => ({
          priority,
          count: priorityCounts[priority],
          color: getPriorityColor(priority)
        }));
        
        const statusDistribution = Object.keys(statusCounts).map(status => ({
          status,
          count: statusCounts[status],
          color: getStatusColor(status)
        }));
        
        setAnalyticsData({
          monthly_revenue: [],
          order_trends: [],
          category_distribution: [],
          status_distribution: statusDistribution,
          priority_distribution: priorityDistribution
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Set fallback data from orders
      const priorityCounts: any = {};
      const statusCounts: any = {};
      
      orders.forEach(order => {
        priorityCounts[order.priority] = (priorityCounts[order.priority] || 0) + 1;
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      
      const priorityDistribution = Object.keys(priorityCounts).map(priority => ({
        priority,
        count: priorityCounts[priority],
        color: getPriorityColor(priority)
      }));
      
      const statusDistribution = Object.keys(statusCounts).map(status => ({
        status,
        count: statusCounts[status],
        color: getStatusColor(status)
      }));
      
      setAnalyticsData({
        monthly_revenue: [],
        order_trends: [],
        category_distribution: [],
        status_distribution: statusDistribution,
        priority_distribution: priorityDistribution
      });
    }
  };
  
  const loadNotifications = async () => {
    try {
      const data = await apiRequest('admin_api.php?action=notifications');
      
      if (data.success && data.notifications) {
        const mappedNotifications: Notification[] = data.notifications.map((notification: any) => ({
          id: notification.id,
          title: notification.title || 'Notification',
          message: notification.message || '',
          type: notification.type || 'info',
          is_read: notification.is_read || false,
          created_at: notification.created_at,
          icon: notification.type
        }));

        setNotifications((prev) => {
          const pendingNotifications = buildPendingOrderNotifications(orders, prev);
          const nonOrderNotifications = mappedNotifications.filter((notification) => !notification.order_id);
          return [...pendingNotifications, ...nonOrderNotifications];
        });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications((prev) => {
        const pendingNotifications = buildPendingOrderNotifications(orders, prev);
        return pendingNotifications;
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    const isReminder = notification.title.toLowerCase().includes('reminder');
    const isPendingOrder = Boolean(notification.order_id);

    if (!isReminder && !isPendingOrder) {
      setNotifications((prev) =>
        prev.map((entry) => (entry.id === notification.id ? { ...entry, is_read: true } : entry))
      );
    }

    if (notification.order_id || notification.order_code) {
      const matchedOrder =
        orders.find((order) => order.id === notification.order_id) ||
        orders.find((order) => order.order_code === notification.order_code);

      setActiveTab('orders');
      setFilters((prev) => ({
        ...prev,
        orders: {
          ...prev.orders,
          status: 'pending',
        },
      }));

      if (matchedOrder) {
        setSelectedOrderDetails(matchedOrder);
        setShowOrderDetailsModal(true);
      } else if (notification.order_code) {
        setSearchTerm(notification.order_code);
      }

      setShowNotifications(false);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((entry) => ({ ...entry, is_read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications((prev) =>
      prev
        .filter((entry) => entry.order_id)
        .map((entry) => ({
          ...entry,
          is_read: true,
        })),
    );
  };

  useEffect(() => {
    if (orders.length === 0) return;
    setNotifications((prev) => {
      const pendingNotifications = buildPendingOrderNotifications(orders, prev);
      const nonOrderNotifications = prev.filter((notification) => !notification.order_id);
      return [...pendingNotifications, ...nonOrderNotifications];
    });
  }, [orders, buildPendingOrderNotifications]);

  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 60 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!notificationDropdownRef.current) return;
      if (!notificationDropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);
  
  // Helper function for status colors
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'pending': return '#FFA500';
      case 'process': return '#3498db';
      case 'scheduled': return '#9b59b6';
      case 'ready': return '#2ecc71';
      case 'completed': return '#27ae60';
      case 'delivered': return '#16a085';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };
  
  // Helper function for priority colors
  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'low': return '#2ecc71';
      case 'medium': return '#f39c12';
      case 'high': return '#e74c3c';
      case 'urgent': return '#c0392b';
      default: return '#95a5a6';
    }
  };

  const getWarrantyColor = (warranty: string): string => {
    switch (warranty.toLowerCase()) {
      case 'in_warranty': return '#10b981';
      case 'extended_warranty': return '#3b82f6';
      case 'out_of_warranty': return '#6b7280';
      default: return '#6b7280';
    }
  };
  
  // Handle client selection for new order - UPDATED
  const handleClientSelect = async (clientId: string) => {
    if (clientId) {
      // If clients are already loaded, find the selected one
      let selectedClient = clients.find(client => client.id.toString() === clientId);
      
      // If clients not loaded yet, fetch from API
      if (!selectedClient && clients.length === 0) {
        try {
          const clientsData = await loadClientsForDropdown();
          selectedClient = clientsData.find(client => client.id.toString() === clientId);
        } catch (error) {
          console.error('Error loading client details:', error);
        }
      }
      
      if (selectedClient) {
        setNewOrder(prev => ({
          ...prev,
          client_id: clientId,
          client_name: selectedClient!.full_name,
          client_phone: selectedClient!.phone
        }));
      }
    } else {
      // Clear fields if no client selected
      setNewOrder(prev => ({
        ...prev,
        client_id: '',
        client_name: '',
        client_phone: ''
      }));
    }
  };

  const resetUserForm = (role: 'admin' | 'user' = 'user') => {
    setNewUser({
      name: '',
      email: '',
      password: '',
      role,
      phone: '',
      department: 'general',
      is_active: true,
      profile_image: null,
      profile_image_url: ''
    });
  };

  const ensureOrderFormDependencies = async () => {
    const requests: Promise<any>[] = [];

    if (products.length === 0) {
      requests.push(loadProducts());
    }

    if (staffList.length === 0) {
      requests.push(loadStaffForDropdown());
    }

    // Always refresh clients from API before opening order forms.
    requests.push(loadClientsForDropdown());

    if (requests.length > 0) {
      await Promise.all(requests);
    }
  };

  const openCreateOrderForm = async () => {
    try {
      await ensureOrderFormDependencies();
      setShowCreateOrder(true);
    } catch (error) {
      console.error('Error preparing create order form:', error);
      setShowCreateOrder(true);
    }
  };

  const openEditOrderForm = async (order: any) => {
    try {
      await ensureOrderFormDependencies();
      handleEdit('order', order);
    } catch (error) {
      console.error('Error preparing edit order form:', error);
      handleEdit('order', order);
    }
  };

  const openCreateUserForm = () => {
    resetUserForm('admin');
    setShowCreateStaff(false);
    setShowCreateUser(true);
  };

  const openCreateStaffForm = () => {
    resetUserForm('user');
    setShowCreateUser(false);
    setShowCreateStaff(true);
  };

  const handleUserFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const nextValue = type === 'checkbox' ? target.checked : value;

    if (showEditModal && editType === 'user') {
      setEditData((prev: any) => ({
        ...prev,
        [name]: nextValue
      }));
      return;
    }

    setNewUser((prev) => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const handleUserImageChange = (file: File, previewUrl: string) => {
    if (showEditModal && editType === 'user') {
      setEditData((prev: any) => ({
        ...prev,
        profile_image: file,
        profile_image_url: previewUrl
      }));
      return;
    }

    setNewUser((prev) => ({
      ...prev,
      profile_image: file,
      profile_image_url: previewUrl
    }));
  };

  const submitUserForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (showEditModal && editType === 'user') {
      void handleSaveEdit();
      return;
    }
    void handleCreateUser();
  };
  
  // Handle create user
  const handleCreateUser = async () => {
    try {
      if (!newUser.name || !newUser.email || !newUser.password) {
        setError('Please fill in all required fields (Name, Email, Password)');
        return;
      }

      const userData = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        phone: newUser.phone || '',
        is_active: newUser.is_active ? 1 : 0
      };

      console.log('Creating user with data:', userData);

      const data = await apiRequest('admin_api.php?action=create_user', 'POST', userData);

      if (data.success) {
        setSuccessMessage('User created successfully');
        await loadUsers();
        await loadDashboardData();
        setShowCreateUser(false);
        setShowCreateStaff(false);
        resetUserForm('user');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.message || 'Failed to create user');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create user');
    }
  };
  
  // Handle create order
  const handleCreateOrder = async () => {
    try {
      const hasProducts = (newOrder.product_ids?.length || 0) > 0 || !!newOrder.product_id || !!newOrder.product_name;
      if (!newOrder.client_name || !newOrder.client_phone || !hasProducts) {
        setError('Please fill in all required fields (Client Name, Client Phone, Product)');
        return;
      }

      const incomingProductStatusMap = normalizeProductStatusMap((newOrder as any).product_status_map);
      const productStatusMap = Object.fromEntries(
        (newOrder.product_ids || []).map((productId) => [
          productId,
          normalizeProductFlowStatus(incomingProductStatusMap[productId]),
        ]),
      );
      const incomingRepairingStatusMap = normalizeRepairingStatusMap((newOrder as any).repairing_status_map);
      const repairingStatusMap = Object.fromEntries(
        (newOrder.product_ids || []).map((productId) => [
          productId,
          normalizeRepairingStatus(incomingRepairingStatusMap[productId]),
        ]),
      );
      
      const orderData = {
        company_id: newOrder.company_id || '',
        company_ids: newOrder.company_ids || [],
        company_name: newOrder.company_name || '',
        company_product_map: newOrder.company_product_map || {},
        client_id: newOrder.client_id || '',
        client_name: newOrder.client_name,
        client_phone: newOrder.client_phone,
        product_id: newOrder.product_id || '',
        replacement_product_id: newOrder.replacement_product_id || '',
        product_ids: newOrder.product_ids || [],
        product_status_map: productStatusMap,
        repairing_status_map: repairingStatusMap,
        replacement_product_ids: newOrder.replacement_product_ids || [],
        product_name: newOrder.product_name,
        service_type: newOrder.service_type || 'general',
        issue_description: newOrder.issue_description.trim(),
        warranty_status: newOrder.warranty_status,
        priority: newOrder.priority,
        payment_status: newOrder.payment_status,
        staff_id: newOrder.staff_id || '',
        estimated_cost: newOrder.estimated_cost === '' ? '' : parseFloat(newOrder.estimated_cost) || 0,
        final_cost: newOrder.final_cost === '' ? '' : parseFloat(newOrder.final_cost) || 0,
        deposit_amount: parseFloat(newOrder.deposit_amount) || 0,
        estimated_delivery_date: newOrder.estimated_delivery_date || '',
        notes: newOrder.notes,
      };
      
      console.log('Creating order with data:', orderData);
      
      const data = await apiRequest('admin_api.php?action=create_order', 'POST', orderData);
      
      if (data.success) {
        setSuccessMessage('Order created successfully');
        await loadOrders();
        await loadDashboardData();
        setShowCreateOrder(false);
        setNewOrder({
          company_id: '',
          company_ids: [],
          company_name: '',
          company_product_map: {},
          client_id: '',
          client_name: '',
          client_phone: '',
          product_id: '',
          replacement_product_id: '',
          product_ids: [],
          product_status_map: {},
          repairing_status_map: {},
          replacement_product_ids: [],
          product_name: '',
          replacement_product_name: '',
          service_type: 'general',
          issue_description: '',
          warranty_status: 'out_of_warranty',
          priority: 'medium',
          status: 'pending',
          payment_status: 'pending',
          staff_id: '',
          estimated_cost: '',
          final_cost: '',
          deposit_amount: '0',
          estimated_delivery_date: '',
          notes: '',
        });
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.message || 'Failed to create order');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create order');
    }
  };
  
  // Handle create client
  const handleCreateClient = async () => {
    try {
      const clientData = {
        full_name: newClient.full_name.trim(),
        email: newClient.email.trim(),
        phone: newClient.phone.trim(),
        address: newClient.address.trim(),
        city: newClient.city.trim(),
        state: newClient.state.trim(),
        zip_code: newClient.zip_code.trim(),
        notes: newClient.notes.trim()
      };

      if (!clientData.full_name || !clientData.phone) {
        setError('Please fill in all required fields (Full Name, Phone)');
        return;
      }

      console.log('Creating client with data:', clientData);
      
      const data = await apiRequest('admin_api.php?action=create_client', 'POST', clientData);
      
      if (data.success) {
        setSuccessMessage('Client created successfully');
        await loadClients();
        await loadDashboardData();
        setShowCreateClient(false);
        setNewClient({
          full_name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          notes: ''
        });
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.message || 'Failed to create client');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create client');
    }
  };
  
  // Handle create product
  const handleCreateProduct = async (options?: { keepOpen?: boolean }) => {
    try {
      const parseResult = expandProductNameSerialPairs(newProduct.product_name, newProduct.serial_number);
      if (parseResult.error || parseResult.pairs.length === 0) {
        setError(parseResult.error || 'Product name is required');
        return;
      }

      const productRows = parseResult.pairs.map((pair) => ({
        product_name: pair.productName,
        serial_number: pair.serialNumber,
        is_spare_product: newProduct.is_spare_product ? 1 : 0,
        brand: newProduct.brand || '',
        model: newProduct.model || '',
        category: newProduct.category,
        claim_type: newProduct.claim_type || 'none',
        price: parseFloat(newProduct.price) || 0,
        purchase_date: newProduct.purchase_date,
        warranty_period: newProduct.warranty_period,
        status: newProduct.status,
        specifications: newProduct.specifications || ''
      }));

      const payload = productRows.length > 1 ? { products: productRows } : productRows[0];
      console.log('Creating product with data:', payload);

      const data = await apiRequest('Product.php', 'POST', payload);
      if (!(data.success || data.partial)) {
        setError(data.message || 'Failed to create product');
        return;
      }

      const createdCount = typeof data.created_count === 'number' ? data.created_count : productRows.length;
      const failedCount = typeof data.failed_count === 'number' ? data.failed_count : 0;

      await loadProducts();
      await loadDashboardData();

      if (options?.keepOpen) {
        setSuccessMessage(
          createdCount > 1
            ? `${createdCount} products created. Add the next product.`
            : 'Product created. Add the next product.',
        );
        setNewProduct((prev) => ({
          ...getDefaultNewProduct(),
          is_spare_product: Boolean(prev.is_spare_product),
          brand: prev.brand || '',
          model: prev.model || '',
          category: prev.category || 'laptop',
          claim_type: prev.claim_type || 'none',
          purchase_date: prev.purchase_date || '',
          warranty_period: prev.warranty_period || '',
          status: prev.status || 'active',
        }));
      } else {
        setSuccessMessage(
          createdCount > 1 ? `${createdCount} products created successfully` : 'Product created successfully',
        );
        setShowCreateProduct(false);
        setNewProduct(getDefaultNewProduct());
      }

      if (failedCount > 0) {
        const firstError = Array.isArray(data.errors) && data.errors.length > 0 ? data.errors[0]?.message : '';
        const details = firstError ? ` First error: ${firstError}` : '';
        setError(`${failedCount} product row(s) failed.${details}`);
      } else {
        setError(null);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to create product');
    }
  };
  
  const formatShortDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatAmount = (value?: string | number) => {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
  };

  // Handle delete operations
  const handleDeleteUser = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const data = await apiRequest(`admin_api.php?action=delete_user&id=${id}`, 'DELETE');
        
        if (data.success) {
          setSuccessMessage('User deleted successfully');
          await loadUsers();
          await loadDashboardData();
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          setError(data.message || 'Failed to delete user');
        }
      } catch (error: any) {
        setError(error.message);
      }
    }
  };
  
  const handleDeleteOrder = (order: DashboardOrder | Order) => {
    setDeleteOrderTarget(order);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteOrderTarget) return;
    setDeleteOrderPending(true);
    try {
      const data = await apiRequest(`admin_api.php?action=delete_order&id=${deleteOrderTarget.id}`, 'DELETE');
      
      if (data.success) {
        setSuccessMessage('Order deleted successfully');
        await loadOrders();
        await loadDashboardData();
        setDeleteOrderTarget(null);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.message || 'Failed to delete order');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setDeleteOrderPending(false);
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        const data = await apiRequest(`admin_api.php?action=delete_client&id=${id}`, 'DELETE');
        
        if (data.success) {
          setSuccessMessage('Client deleted successfully');
          await loadClients();
          await loadDashboardData();
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          setError(data.message || 'Failed to delete client');
        }
      } catch (error: any) {
        setError(error.message);
      }
    }
  };
  
  const handleDeleteProduct = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const data = await apiRequest(`admin_api.php?action=delete_product&id=${id}`, 'DELETE');
        
        if (data.success) {
          setSuccessMessage('Product deleted successfully');
          await loadProducts();
          await loadDashboardData();
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          setError(data.message || 'Failed to delete product');
        }
      } catch (error: any) {
        setError(error.message);
      }
    }
  };
  
  const handleDeleteDelivery = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this delivery?')) {
      try {
        const data = await apiRequest(`admin_api.php?action=delete_delivery&id=${id}`, 'DELETE');
        
        if (data.success) {
          setSuccessMessage('Delivery deleted successfully');
          await loadDeliveries();
          await loadDashboardData();
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          setError(data.message || 'Failed to delete delivery');
        }
      } catch (error: any) {
        setError(error.message);
      }
    }
  };
  
  // Handle edit operations
  const handleEdit = (type: 'user' | 'order' | 'client' | 'product' | 'delivery', data: any) => {
    if (type === 'user') {
      setEditType('user');
      setEditData(data);
      setShowCreateUser(false);
      setShowCreateStaff(false);
      setShowEditModal(true);
      return;
    }

    if (type === 'order') {
      setEditType('order');
      const productIds = normalizeStringIdList((data as any).product_ids);
      if (productIds.length === 0 && data.product_id) {
        productIds.push(String(data.product_id));
      }
      const replacementProductIds = normalizeStringIdList((data as any).replacement_product_ids);
      if (replacementProductIds.length === 0 && data.replacement_product_id) {
        replacementProductIds.push(String(data.replacement_product_id));
      }
      const companyIds: string[] = normalizeStringIdList((data as any).company_ids);
      if (companyIds.length === 0 && data.company_id) {
        companyIds.push(String(data.company_id));
      }
      const rawCompanyProductMap = normalizeCompanyProductMap((data as any).company_product_map || (data as any).companies_products);
      const companyProductMap: Record<string, string[]> = Object.fromEntries(
        companyIds.map((companyId) => [companyId, rawCompanyProductMap[companyId] || []]),
      );
      if (companyIds.length > 0 && !Object.values(companyProductMap).some((ids) => ids.length > 0) && productIds.length > 0) {
        companyProductMap[companyIds[0]] = productIds;
      }
      const incomingProductStatusMap = normalizeProductStatusMap((data as any).product_status_map);
      const productStatusMap: Record<string, string> = Object.fromEntries(
        productIds.map((productId) => [
          productId,
          normalizeProductFlowStatus(incomingProductStatusMap[productId]),
        ]),
      );
      const incomingRepairingStatusMap = normalizeRepairingStatusMap((data as any).repairing_status_map);
      const repairingStatusMap: Record<string, string> = Object.fromEntries(
        productIds.map((productId) => [
          productId,
          normalizeRepairingStatus(incomingRepairingStatusMap[productId]),
        ]),
      );
      setEditData({
        ...data,
        company_id: data.company_id ? String(data.company_id) : '',
        company_ids: companyIds,
        company_name: data.company_name || '',
        company_product_map: companyProductMap,
        client_id: data.client_id ? String(data.client_id) : '',
        product_id: productIds[0] || '',
        replacement_product_id: replacementProductIds[0] || '',
        product_ids: productIds,
        product_status_map: productStatusMap,
        repairing_status_map: repairingStatusMap,
        replacement_product_ids: replacementProductIds,
        replacement_product_name: data.replacement_product_name || '',
        staff_id: data.staff_id ? String(data.staff_id) : '',
      });
      setShowEditModal(true);
      return;
    }

    if (type === 'product') {
      const isSpareProduct =
        data.is_spare_product === true ||
        data.is_spare_product === 1 ||
        data.is_spare_product === '1' ||
        data.is_spare_product === 'true';

      setEditType('product');
      setEditData({
        ...data,
        claim_type: data.claim_type || 'none',
        serial_number: data.serial_number || '',
        is_spare_product: isSpareProduct,
        purchase_date: data.purchase_date || '',
        warranty_period: data.warranty_period || '',
        specifications: data.specifications || '',
        price: String(data.price ?? '0'),
        stock_quantity: String(data.stock_quantity ?? '0'),
        min_stock_level: String(data.min_stock_level ?? '5'),
        status: data.status || 'active',
      });
      setShowCreateProduct(false);
      setShowEditModal(true);
      return;
    }

    setEditType(type);
    setEditData(data);
    setShowEditModal(true);
  };
  
  const handleSaveEdit = async () => {
    try {
      let endpoint = 'admin_api.php';
      let method = 'POST';
      let requestData: any = {};
      
      switch (editType) {
        case 'user':
          endpoint += '?action=update_user';
          requestData = {
            id: editData.id,
            name: editData.name,
            email: editData.email,
            role: editData.role,
            phone: editData.phone || '',
            is_active: editData.is_active ? 1 : 0
          };
          break;
          
        case 'order':
          endpoint += '?action=update_order';
          const editProductStatusMapInput = normalizeProductStatusMap((editData as any)?.product_status_map);
          const editProductIds = Array.isArray((editData as any)?.product_ids)
            ? (editData as any).product_ids.map((id: unknown) => String(id))
            : [];
          const editProductStatusMap = Object.fromEntries(
            editProductIds.map((productId: string) => [
              productId,
              normalizeProductFlowStatus(editProductStatusMapInput[productId]),
            ]),
          );
          const editRepairingStatusMapInput = normalizeRepairingStatusMap((editData as any)?.repairing_status_map);
          const editRepairingStatusMap = Object.fromEntries(
            editProductIds.map((productId: string) => [
              productId,
              normalizeRepairingStatus(editRepairingStatusMapInput[productId]),
            ]),
          );
          requestData = {
            id: editData.id,
            company_id: editData.company_id || '',
            company_ids: editData.company_ids || [],
            company_name: editData.company_name || '',
            company_product_map: editData.company_product_map || {},
            client_id: editData.client_id || '',
            client_name: editData.client_name,
            client_phone: editData.client_phone,
            product_id: editData.product_id || '',
            replacement_product_id: editData.replacement_product_id || '',
            product_ids: editData.product_ids || [],
            product_status_map: editProductStatusMap,
            repairing_status_map: editRepairingStatusMap,
            replacement_product_ids: editData.replacement_product_ids || [],
            product_name: editData.product_name,
            service_type: editData.service_type || 'general',
            issue_description: editData.issue_description,
            warranty_status: editData.warranty_status,
            estimated_cost: editData.estimated_cost,
            final_cost: editData.final_cost,
            deposit_amount: editData.deposit_amount || '0',
            payment_status: editData.payment_status,
            estimated_delivery_date: editData.estimated_delivery_date,
            priority: editData.priority,
            notes: editData.notes,
            staff_id: editData.staff_id
          };
          break;
          
        case 'client':
          endpoint += '?action=update_client';
          requestData = {
            id: editData.id,
            full_name: editData.full_name,
            email: editData.email,
            phone: editData.phone,
            address: editData.address,
            city: editData.city,
            state: editData.state,
            zip_code: editData.zip_code,
            notes: editData.notes
          };
          break;
          
        case 'product':
          endpoint += '?action=update_product';
          requestData = {
            id: editData.id,
            product_name: editData.product_name,
            serial_number: editData.serial_number || '',
            is_spare_product: editData.is_spare_product ? 1 : 0,
            brand: editData.brand,
            model: editData.model,
            category: editData.category,
            claim_type: editData.claim_type || 'none',
            purchase_date: editData.purchase_date || '',
            warranty_period: editData.warranty_period || '',
            specifications: editData.specifications,
            price: parseFloat(editData.price || '0') || 0,
            stock_quantity: parseInt(editData.stock_quantity || '0', 10) || 0,
            min_stock_level: parseInt(editData.min_stock_level || '5', 10) || 5,
            status: editData.status
          };
          break;
          
        case 'delivery':
          endpoint += '?action=update_delivery';
          requestData = {
            id: editData.id,
            status: editData.status,
            delivery_person: editData.delivery_person,
            notes: editData.notes
          };
          break;
      }
      
      console.log(`Updating ${editType} with data:`, requestData);
      
      const response = await apiRequest(endpoint, method, requestData);
      
      if (response.success) {
        setSuccessMessage(`${editType.charAt(0).toUpperCase() + editType.slice(1)} updated successfully`);
        setShowEditModal(false);
        
        // Reload data based on active tab
        switch (activeTab) {
          case 'users':
            await loadUsers();
            break;
          case 'orders':
            await loadOrders();
            break;
          case 'clients':
            await loadClients();
            break;
          case 'products':
            await loadProducts();
            break;
          case 'deliveries':
            await loadDeliveries();
            break;
        }
        
        await loadDashboardData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.message || 'Failed to update');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };
  
  // Handle password reset
  const handleResetPassword = async (userId: number, newPassword: string) => {
    try {
      const response = await apiRequest('admin_api.php?action=reset_password', 'POST', {
        user_id: userId,
        new_password: newPassword
      });
      
      if (response.success) {
        return;
      } else {
        throw new Error(response.message || 'Failed to reset password');
      }
    } catch (error: any) {
      throw error;
    }
  };
  
  const openResetPasswordModal = (userId: number, userName: string) => {
      setSelectedUserForReset({ id: userId, name: userName });
    setShowResetPasswordModal(true);
  };

  const getFullStaffRecord = (staff: any) => {
    const matchedUser = users.find((user) => user.id === staff.id) || staffList.find((user) => user.id === staff.id);

    if (!matchedUser) {
      return staff;
    }

    return {
      ...staff,
      ...matchedUser,
      profile_image: staff.profile_image || matchedUser.profile_image || matchedUser.avatar,
      phone: matchedUser.phone || staff.phone || '',
      department: matchedUser.department || staff.department || 'general',
      is_active: matchedUser.is_active ?? staff.is_active ?? true,
    };
  };
  
  // Handle staff details view
  const handleViewStaffDetails = async (staff: any) => {
    setSelectedStaff(getFullStaffRecord(staff));
    const staffOrders = await loadStaffOrders(staff.id);
    setSelectedStaffOrders(staffOrders);
    setShowStaffDetailsModal(true);
  };
  
  // Handle order row click
  const handleOrderRowClick = (order: Order) => {
    setSelectedOrderDetails(order);
    setShowOrderDetailsModal(true);
  };
  
  // Handle order details actions
  const handleOrderDetailsEdit = () => {
    if (selectedOrderDetails) {
      handleEdit('order', selectedOrderDetails);
      setShowOrderDetailsModal(false);
    }
  };
  
  const handleOrderDetailsReceipt = () => {
    if (selectedOrderDetails) {
      openReceiptOptionsForOrder(selectedOrderDetails);
      setShowOrderDetailsModal(false);
    }
  };
  
  const handleOrderDetailsDelete = () => {
    if (selectedOrderDetails) {
      handleDeleteOrder(selectedOrderDetails);
      setShowOrderDetailsModal(false);
    }
  };
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const clearSearch = () => {
    setSearchTerm('');
  };
  
  // Handle sort
  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Handle filter change
  const handleFilterChange = (type: keyof typeof filters, key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: value
      }
    }));
  };

  const toISODate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ startDate: start, endDate: end });
  };

  const setDateRangePreset = (
    preset: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'thisYear'
  ) => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (preset) {
      case 'today':
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        endDate = new Date(startDate);
        break;
      case 'thisWeek':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisYear':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
    }

    setDateRange({
      startDate: toISODate(startDate.toISOString()),
      endDate: toISODate(endDate.toISOString())
    });
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      users: { role: '', status: '' },
      orders: { status: '', priority: '', payment_status: '' },
      clients: { city: '' },
      products: { category: '', status: '' },
      replacementorders: { status: '', priority: '' },
      spareproducts: { category: '', status: '' },
      shopclaim: {},
      companyclaim: {},
      companys: {},
      suntocompany: {},
      companytosun: {},
      deliveries: { status: '', delivery_type: '' }
    });
    setSortConfig({ key: '', direction: 'asc' });
    setSearchTerm('');
    setDateRange({ startDate: '', endDate: '' });
  };
  
  // Filter and sort data
  const getFilteredAndSortedData = () => {
    let data: any[] = [];
    
    switch (activeTab) {
      case 'users':
        data = [...users];
        break;
      case 'orders':
        data = [...orders];
        break;
      case 'clients':
        data = [...clients];
        break;
      case 'products':
        data = [...products];
        break;
      case 'deliveries':
        data = [...deliveries];
        break;
    }
    
    // Apply search filter
    if (searchTerm) {
      data = data.filter(item => {
        const searchableFields = Object.values(item)
          .map(val => String(val).toLowerCase())
          .join(' ');
        return searchableFields.includes(searchTerm.toLowerCase());
      });
    }
    
    // Apply filters
    const currentFilters = filters[activeTab as keyof typeof filters];
    if (currentFilters) {
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) {
          data = data.filter(item => {
            if (key === 'status' && activeTab === 'users') {
              const isActive = item.is_active === true || item.is_active === 1 || item.is_active === '1';
              return value === '1' ? isActive : !isActive;
            }
            return item[key] === value;
          });
        }
      });
    }
    
    // Apply sorting
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return data;
  };

  const matchesDateRange = (dateString: string) => {
    const normalized = toISODate(dateString);
    return (
      !dateRange.startDate ||
      !dateRange.endDate ||
      (normalized >= dateRange.startDate && normalized <= dateRange.endDate)
    );
  };

  const getOrderProductSearchBlob = (order: Order) => {
    const primaryNames =
      Array.isArray(order.product_names) && order.product_names.length
        ? order.product_names
        : order.product_name
          ? [order.product_name]
          : [];
    const replacementNames =
      Array.isArray(order.replacement_product_names) && order.replacement_product_names.length
        ? order.replacement_product_names
        : order.replacement_product_name
          ? [order.replacement_product_name]
          : [];
    return [...primaryNames, ...replacementNames]
      .map((name) => String(name || '').trim().toLowerCase())
      .filter(Boolean)
      .join(' ');
  };

  const filteredOrdersForDashboard = orders.filter((order) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      [
        order.order_code,
        order.client_name,
        order.client_phone,
        order.issue_description,
        order.staff_name || ''
      ].some((value) => String(value || '').toLowerCase().includes(search)) ||
      getOrderProductSearchBlob(order).includes(search);

    const matchesStatus = !filters.orders.status || order.status === filters.orders.status;
    const matchesPriority = !filters.orders.priority || order.priority === filters.orders.priority;
    const matchesPayment = !filters.orders.payment_status || order.payment_status === filters.orders.payment_status;

    return matchesSearch && matchesStatus && matchesPriority && matchesPayment && matchesDateRange(order.created_at);
  });

  const filteredReplacementOrdersForDashboard = orders.filter((order) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      [
        order.order_code,
        order.client_name,
        order.client_phone,
        order.issue_description,
        order.staff_name || ''
      ].some((value) => String(value || '').toLowerCase().includes(search)) ||
      getOrderProductSearchBlob(order).includes(search);

    const matchesStatus = !filters.orders.status || order.status === filters.orders.status;
    const matchesPriority = !filters.orders.priority || order.priority === filters.orders.priority;
    const matchesPayment = !filters.orders.payment_status || order.payment_status === filters.orders.payment_status;
    const hasReplacement = Boolean(order.replacement_product_id);

    return hasReplacement && matchesSearch && matchesStatus && matchesPriority && matchesPayment && matchesDateRange(order.created_at);
  });

  const filteredClientsForDashboard = clients.filter((client) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      [
        client.client_code,
        client.full_name,
        client.phone,
        client.email,
        client.city
      ].some((value) => String(value || '').toLowerCase().includes(search));

    const matchesCity = !filters.clients.city || client.city?.toLowerCase().includes(filters.clients.city.toLowerCase());
    return matchesSearch && matchesCity && matchesDateRange(client.created_at);
  });

  const filteredProductsForDashboard = products.filter((product) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      [
        product.product_code,
        product.product_name,
        product.brand,
        product.model,
        product.category
      ].some((value) => String(value || '').toLowerCase().includes(search));

    const matchesStatus = !filters.products.status || product.status === filters.products.status;
    const matchesCategory = !filters.products.category || product.category === filters.products.category;
    return matchesSearch && matchesStatus && matchesCategory && matchesDateRange(product.created_at);
  });

  const filteredSpareProductsForDashboard = products.filter((product) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      [
        product.product_code,
        product.product_name,
        product.serial_number || '',
        product.brand,
        product.model,
        product.category,
        product.claim_type || ''
      ].some((value) => String(value || '').toLowerCase().includes(search));

    const matchesStatus = !filters.products.status || product.status === filters.products.status;
    const matchesCategory = !filters.products.category || product.category === filters.products.category;
    return Boolean(Number(product.is_spare_product || 0)) && matchesSearch && matchesStatus && matchesCategory && matchesDateRange(product.created_at);
  });

  const filteredShopClaimsForDashboard = products.filter((product) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      [
        product.product_code,
        product.product_name,
        product.serial_number || '',
        product.brand,
        product.model,
        product.category,
        product.claim_type || ''
      ].some((value) => String(value || '').toLowerCase().includes(search));

    return product.claim_type === 'shop_claim' && matchesSearch && matchesDateRange(product.created_at);
  });

  const filteredCompanyClaimsForDashboard = products.filter((product) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      [
        product.product_code,
        product.product_name,
        product.serial_number || '',
        product.brand,
        product.model,
        product.category,
        product.claim_type || ''
      ].some((value) => String(value || '').toLowerCase().includes(search));

    return product.claim_type === 'company_claim' && matchesSearch && matchesDateRange(product.created_at);
  });

  const filteredSunToCompanyForDashboard = sunToCompanyClaims.filter((product) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      [
        product.product_code,
        product.product_name,
        product.serial_number || '',
        product.brand,
        product.model,
        product.category,
        product.claim_type || ''
      ].some((value) => String(value || '').toLowerCase().includes(search));

    return matchesSearch && matchesDateRange(product.created_at);
  });

  const filteredCompanyToSunForDashboard = companyToSunClaims.filter((product) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      [
        product.product_code,
        product.product_name,
        product.serial_number || '',
        product.brand,
        product.model,
        product.category,
        product.claim_type || ''
      ].some((value) => String(value || '').toLowerCase().includes(search));

    return matchesSearch && matchesDateRange(product.created_at);
  });

  const filteredDeliveriesForDashboard = deliveries.filter((delivery) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      [
        delivery.delivery_code,
        delivery.order_code,
        delivery.client_name,
        delivery.product_name,
        delivery.address,
        delivery.contact_person,
        delivery.contact_phone
      ].some((value) => String(value || '').toLowerCase().includes(search));

    const matchesStatus = !filters.deliveries.status || delivery.status === filters.deliveries.status;
    const matchesType = !filters.deliveries.delivery_type || delivery.delivery_type === filters.deliveries.delivery_type;
    return matchesSearch && matchesStatus && matchesType && matchesDateRange(delivery.created_at);
  });
  
  // Handle selection
  const handleSelectAll = (type: string) => {
    const filteredData = getFilteredAndSortedData();
    const allIds = filteredData.map(item => item.id);
    
    switch (type) {
      case 'users':
        setSelectedUsers(selectedUsers.length === allIds.length ? [] : allIds);
        break;
      case 'orders':
        setSelectedOrders(selectedOrders.length === allIds.length ? [] : allIds);
        break;
      case 'clients':
        setSelectedClients(selectedClients.length === allIds.length ? [] : allIds);
        break;
      case 'products':
        setSelectedProducts(selectedProducts.length === allIds.length ? [] : allIds);
        break;
      case 'deliveries':
        setSelectedDeliveries(selectedDeliveries.length === allIds.length ? [] : allIds);
        break;
    }
  };
  
  const handleSelectItem = (type: string, id: number) => {
    switch (type) {
      case 'users':
        setSelectedUsers(prev =>
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
        break;
      case 'orders':
        setSelectedOrders(prev =>
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
        break;
      case 'clients':
        setSelectedClients(prev =>
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
        break;
      case 'products':
        setSelectedProducts(prev =>
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
        break;
      case 'deliveries':
        setSelectedDeliveries(prev =>
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
        break;
    }
  };
  
  const handleRefresh = async () => {
    try {
      const tabKey = activeTab as keyof typeof loading;
      setLoading(prev => ({ ...prev, [tabKey]: true }));
      
      switch (activeTab) {
        case 'dashboard':
          await loadDashboardData();
          await loadNotifications();
          break;
        case 'users':
          await loadUsers();
          break;
        case 'orders':
        case 'replacementorders':
          await loadOrders();
          break;
        case 'clients':
          await loadClients();
          break;
        case 'products':
        case 'spareproducts':
        case 'shopclaim':
        case 'companyclaim':
        case 'companys':
          await loadProducts();
          break;
        case 'suntocompany':
          await loadSunToCompanyClaims();
          break;
        case 'companytosun':
          await loadCompanyToSunClaims();
          break;
        case 'staff':
          await loadStaffPerformance();
          break;
        case 'revenue':
          break;
        case 'analytics':
          await loadAnalytics();
          break;
        case 'brandwiseoverallreport':
          await Promise.all([loadOrders(), loadProducts(), loadDeliveries()]);
          break;
        case 'deliveries':
          await loadDeliveries();
          break;
      }
      setSuccessMessage('Data refreshed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError('Failed to refresh data');
    } finally {
      const tabKey = activeTab as keyof typeof loading;
      setLoading(prev => ({ ...prev, [tabKey]: false }));
    }
  };
  
  const handleLogout = () => {
    localStorage.clear();
    onLogout();
    navigate('/login');
  };
  
  // Export functions
  const serializeExportValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'object' ? JSON.stringify(entry) : String(entry)))
        .join(' | ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      setError('No data to export');
      return;
    }

    const headers = Array.from(
      new Set(
        data.flatMap((row) => Object.keys(row || {})),
      ),
    );
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => `"${serializeExportValue(row?.[header]).replace(/"/g, '""')}"`)
          .join(','),
      ),
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const exportToPDF = (data: any[], title: string, filename: string) => {
    if (!data || data.length === 0) {
      setError('No data to export');
      return;
    }

    const headers = Array.from(
      new Set(
        data.flatMap((row) => Object.keys(row || {})),
      ),
    );
    const readableHeaders = headers.map((header) =>
      header
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    );
    const tableData = data.map((row) =>
      headers.map((header) => {
        const serialized = serializeExportValue(row?.[header]);
        return serialized === '' ? 'N/A' : serialized;
      }),
    );

    exportStyledPdfReport({
      filename,
      title,
      subtitle: 'Structured export from the admin dashboard with current filtered data and table-ready records.',
      scopeLabel: `${data.length} rows across ${headers.length} columns`,
      accentColor: '#2563eb',
      orientation: headers.length > 6 ? 'landscape' : 'portrait',
      metrics: [
        { label: 'Rows', value: `${data.length}` },
        { label: 'Columns', value: `${headers.length}` },
        { label: 'Source', value: 'Admin Dashboard' },
        { label: 'Format', value: 'PDF Export' },
      ],
      head: [readableHeaders],
      body: tableData,
    });
  };
  
  const exportUsersToCSV = () => {
    const data = getFilteredAndSortedData();
    exportToCSV(data, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  const exportUsersToPDF = () => {
    const data = getFilteredAndSortedData();
    exportToPDF(data, 'Users Report', `users_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const exportOrdersToCSV = () => {
    if (!orders || orders.length === 0) {
      setError('No service orders to export');
      return;
    }

    const serviceOrderColumns = [
      'id',
      'order_code',
      'client_id',
      'companies_products',
      'company_id',
      'company_ids',
      'company_product_map',
      'product_id',
      'product_ids',
      'product_status_map',
      'repairing_status_map',
      'replacement_product_id',
      'replacement_product_ids',
      'staff_id',
      'service_type',
      'issue_description',
      'diagnosis_notes',
      'repair_notes',
      'warranty_status',
      'estimated_cost',
      'final_cost',
      'deposit_amount',
      'payment_status',
      'estimated_delivery_date',
      'actual_delivery_date',
      'handover_type',
      'handover_type_map',
      'priority',
      'rating',
      'notes',
      'created_at',
      'updated_at',
      'first_product_id',
      'status',
      'product_status_dates_map',
      // Helpful joined/derived fields for readability in exported sheet.
      'client_name',
      'client_phone',
      'client_email',
      'client_address',
      'product_name',
      'product_names',
      'replacement_product_name',
      'replacement_product_names',
      'staff_name',
      'company_name',
      'company_names',
      'company_names_text',
      'brand',
      'model',
      'serial_number',
      'purchase_date'
    ];

    const extraColumns = Array.from(
      new Set(
        orders.flatMap((order) => Object.keys(order || {})),
      ),
    ).filter((key) => !serviceOrderColumns.includes(key));

    const allColumns = [...serviceOrderColumns, ...extraColumns];

    const orderedRows = orders.map((order) => {
      const parseNumberArray = (value: unknown): number[] => {
        if (Array.isArray(value)) {
          return value
            .map((item) => Number(item))
            .filter((num) => Number.isInteger(num) && num > 0);
        }
        if (typeof value === 'number') {
          return Number.isInteger(value) && value > 0 ? [value] : [];
        }
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (!trimmed) return [];
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed
                .map((item) => Number(item))
                .filter((num) => Number.isInteger(num) && num > 0);
            }
          } catch {
            const single = Number(trimmed);
            return Number.isInteger(single) && single > 0 ? [single] : [];
          }
        }
        return [];
      };

      const parseFlowDatesMap = (value: unknown): Record<string, Record<string, string>> => {
        let raw: unknown = value;
        if (typeof raw === 'string') {
          const trimmed = raw.trim();
          if (!trimmed) return {};
          try {
            raw = JSON.parse(trimmed);
          } catch {
            return {};
          }
        }
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
        const map: Record<string, Record<string, string>> = {};
        Object.entries(raw as Record<string, unknown>).forEach(([productId, stages]) => {
          if (!stages || typeof stages !== 'object' || Array.isArray(stages)) return;
          map[productId] = {};
          Object.entries(stages as Record<string, unknown>).forEach(([stage, dt]) => {
            map[productId][stage] = String(dt ?? '');
          });
        });
        return map;
      };

      const parseCompanyNameList = (value: unknown): string[] => {
        if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean);
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (!trimmed) return [];
          if (trimmed.includes('||')) return trimmed.split('||').map((v) => v.trim()).filter(Boolean);
          if (trimmed.includes(',')) return trimmed.split(',').map((v) => v.trim()).filter(Boolean);
          return [trimmed];
        }
        return [];
      };

      const primaryIds = parseNumberArray((order as any).product_ids);
      const replacementIds = parseNumberArray((order as any).replacement_product_ids);
      const productStatusMap = normalizeProductStatusMap((order as any).product_status_map);
      const repairingStatusMap = normalizeRepairingStatusMap((order as any).repairing_status_map);
      const flowDatesMap = parseFlowDatesMap((order as any).product_status_dates_map);
      const companyMap = normalizeCompanyProductMap((order as any).company_product_map || (order as any).companies_products);

      const productNameById = new Map<number, string>(
        products.map((p) => [p.id, p.product_name || `Product #${p.id}`]),
      );
      const companyNameList = parseCompanyNameList((order as any).company_names || (order as any).company_names_text || (order as any).company_name);

      const primaryProductNames = primaryIds.map((id) => productNameById.get(id) || `Product #${id}`);
      const replacementProductNames = replacementIds.map((id) => productNameById.get(id) || `Product #${id}`);
      const companyProductDetails = Object.entries(companyMap).map(([companyId, productIds], index) => {
        const companyLabel = companyNameList[index] || `Company #${companyId}`;
        const names = productIds.map((pid) => {
          const numericId = Number(pid);
          return productNameById.get(numericId) || `Product #${pid}`;
        });
        return `${companyLabel}: ${names.join(' | ')}`;
      });

      const repairingSummary = [
        `ready=${Object.values(repairingStatusMap).filter((v) => v === 'ready').length}`,
        `replacement=${Object.values(repairingStatusMap).filter((v) => v === 'replacement').length}`,
        `not_ready=${Object.values(repairingStatusMap).filter((v) => v === 'not ready').length}`,
      ].join(', ');

      const productFlowTimelineText = Object.entries(flowDatesMap)
        .map(([pid, stages]) => {
          const stageText = Object.entries(stages || {})
            .map(([stage, dt]) => `${stage}:${dt}`)
            .join(' -> ');
          return `${pid}[${stageText}]`;
        })
        .join(' | ');

      const base = allColumns.reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = (order as any)?.[key];
        return acc;
      }, {});

      return {
        ...base,
        // Client Information
        client_info_name: (order as any).client_name || '',
        client_info_phone: (order as any).client_phone || '',
        client_info_email: (order as any).client_email || '',
        client_info_address: (order as any).client_address || '',
        // Product Information
        product_info_primary_ids: primaryIds,
        product_info_primary_names: primaryProductNames,
        product_info_replacement_ids: replacementIds,
        product_info_replacement_names: replacementProductNames,
        product_info_company_product_details: companyProductDetails,
        // Repairing Status
        repairing_status_summary: repairingSummary,
        repairing_status_map_full: repairingStatusMap,
        // Product Flow Status Timeline
        product_flow_status_map_full: productStatusMap,
        product_flow_timeline_full: flowDatesMap,
        product_flow_timeline_text: productFlowTimelineText,
        // Service Details
        service_details_type: (order as any).service_type || '',
        service_details_issue: (order as any).issue_description || '',
        service_details_diagnosis: (order as any).diagnosis_notes || '',
        service_details_repair_notes: (order as any).repair_notes || '',
        service_details_warranty: (order as any).warranty_status || '',
        service_details_priority: (order as any).priority || '',
        service_details_status: (order as any).status || '',
        // Financial Information
        financial_estimated_cost: (order as any).estimated_cost || '0',
        financial_final_cost: (order as any).final_cost || '0',
        financial_deposit_amount: (order as any).deposit_amount || '0',
        financial_balance_due:
          (Number((order as any).final_cost || (order as any).estimated_cost || 0) - Number((order as any).deposit_amount || 0)).toFixed(2),
        financial_payment_status: (order as any).payment_status || '',
        // Timeline & Dates
        timeline_created_at: (order as any).created_at || '',
        timeline_updated_at: (order as any).updated_at || '',
        timeline_estimated_delivery_date: (order as any).estimated_delivery_date || '',
        timeline_actual_delivery_date: (order as any).actual_delivery_date || '',
        timeline_next_service_date: (order as any).next_service_date || '',
      };
    });

    exportToCSV(orderedRows, `service_orders_full_export_${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  const exportOrdersToPDF = () => {
    const data = getFilteredAndSortedData();
    exportToPDF(data, 'Orders Report', `orders_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const exportClientsToCSV = () => {
    const data = getFilteredAndSortedData();
    exportToCSV(data, `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  const exportClientsToPDF = () => {
    const data = getFilteredAndSortedData();
    exportToPDF(data, 'Clients Report', `clients_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const exportProductsToCSV = () => {
    const data = getFilteredAndSortedData();
    exportToCSV(data, `products_export_${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  const exportProductsToPDF = () => {
    const data = getFilteredAndSortedData();
    exportToPDF(data, 'Products Report', `products_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const exportDeliveriesToCSV = () => {
    const data = getFilteredAndSortedData();
    exportToCSV(data, `deliveries_export_${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  const exportDeliveriesToPDF = () => {
    const data = getFilteredAndSortedData();
    exportToPDF(data, 'Deliveries Report', `deliveries_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  // Generate order receipt PDF (automatically downloads)
  const generateOrderReceipt = async (order: Order) => {
    try {
      await downloadReceiptPdf(
        createOrderReceiptMarkup(order as any, products as any),
        `order_receipt_${order.order_code}.pdf`,
      );
      setSuccessMessage('Receipt PDF downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to generate receipt');
    }
  };
  // Generate delivery receipt PDF (automatically downloads)
  const generateDeliveryReceipt = async (delivery: Delivery) => {
    try {
      await downloadReceiptPdf(
        createDeliveryReceiptMarkup(delivery as any),
        `delivery_receipt_${delivery.delivery_code || delivery.id}.pdf`,
      );
      setSuccessMessage('Delivery receipt PDF downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to generate delivery receipt');
    }
  };
  const downloadOrderReceiptPreview = async (order: Order) => {
    try {
      await downloadReceiptPdf(
        createOrderReceiptMarkup(order as any, products as any),
        `order_receipt_${order.order_code}.pdf`,
      );
      setSuccessMessage('Receipt PDF downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to generate receipt');
    }
  };

  const downloadDeliveryReceiptPreview = async (delivery: Delivery) => {
    try {
      await downloadReceiptPdf(
        createDeliveryReceiptMarkup(delivery as any),
        `delivery_receipt_${delivery.delivery_code || delivery.id}.pdf`,
      );
      setSuccessMessage('Delivery receipt PDF downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to generate delivery receipt');
    }
  };

  const printOrderReceiptPreview = (order: Order) => {
    const opened = openReceiptPrintWindow(
      `order_receipt_${order.order_code}`,
      createOrderReceiptMarkup(order as any, products as any),
    );
    if (!opened) {
      setError('Unable to open print window. Please allow pop-ups and try again.');
    }
  };

  const printDeliveryReceiptPreview = (delivery: Delivery) => {
    const deliveryCode = delivery.delivery_code || delivery.id;
    const opened = openReceiptPrintWindow(
      `delivery_receipt_${deliveryCode}`,
      createDeliveryReceiptMarkup(delivery as any),
    );
    if (!opened) {
      setError('Unable to open print window. Please allow pop-ups and try again.');
    }
  };

  const openReceiptOptionsForOrder = (order: Order) => {
    setReceiptTarget({ kind: 'order', order });
  };

  const openReceiptOptionsForDelivery = (delivery: Delivery) => {
    setReceiptTarget({ kind: 'delivery', delivery });
  };

  const confirmGenerateReceipt = () => {
    if (selectedOrderForReceipt) {
      void generateOrderReceipt(selectedOrderForReceipt);
      setShowReceiptModal(false);
      setSelectedOrderForReceipt(null);
    }
  };

  const normalizeProductIdList = (ids: string[]) =>
    Array.from(new Set(ids.map((id) => id.trim()).filter((id) => id && id !== '0')));
  const normalizeStringIdList = (value: unknown): string[] => {
    if (Array.isArray(value)) return normalizeProductIdList(value.map((entry) => String(entry)));
    if (typeof value !== 'string') return [];
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return normalizeProductIdList(parsed.map((entry) => String(entry)));
    } catch {
      return [];
    }
    return [];
  };
  const normalizeCompanyProductMap = (value: unknown): Record<string, string[]> => {
    if (!value) return {};
    let raw: unknown = value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return {};
      try {
        raw = JSON.parse(trimmed);
      } catch {
        return {};
      }
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const result: Record<string, string[]> = {};
    Object.entries(raw as Record<string, unknown>).forEach(([companyId, productIds]) => {
      const normalizedCompanyId = Number(companyId);
      if (!Number.isInteger(normalizedCompanyId) || normalizedCompanyId <= 0) return;
      if (Array.isArray(productIds)) {
        result[normalizedCompanyId.toString()] = normalizeProductIdList(productIds.map((entry) => String(entry)));
      } else {
        result[normalizedCompanyId.toString()] = [];
      }
    });
    return result;
  };

  const normalizeProductFlowStatus = (status: unknown): string => {
    const normalized = String(status ?? '').trim().toLowerCase();
    if (normalized === 'rajtocom') return 'rajtocom';
    if (normalized === 'comtoraj') return 'comtoraj';
    if (normalized === 'deliveryed' || normalized === 'delivered') return 'deliveryed';
    return 'pending';
  };

  const normalizeProductStatusMap = (value: unknown): Record<string, string> => {
    if (!value) return {};

    let raw: unknown = value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return {};
      try {
        raw = JSON.parse(trimmed);
      } catch {
        return {};
      }
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const result: Record<string, string> = {};
    Object.entries(raw as Record<string, unknown>).forEach(([productId, status]) => {
      const normalizedProductId = Number(productId);
      if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) return;
      result[normalizedProductId.toString()] = normalizeProductFlowStatus(status);
    });
    return result;
  };

  const normalizeRepairingStatus = (status: unknown): string => {
    const normalized = String(status ?? '').trim().toLowerCase().replaceAll(' ', '_');
    if (normalized === 'ready') return 'ready';
    if (normalized === 'replacement') return 'replacement';
    return 'not_ready';
  };

  const normalizeRepairingStatusMap = (value: unknown): Record<string, string> => {
    if (!value) return {};
    let raw: unknown = value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return {};
      try {
        raw = JSON.parse(trimmed);
      } catch {
        return {};
      }
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const result: Record<string, string> = {};
    Object.entries(raw as Record<string, unknown>).forEach(([productId, status]) => {
      const normalizedProductId = Number(productId);
      if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) return;
      result[normalizedProductId.toString()] = normalizeRepairingStatus(status);
    });
    return result;
  };

  const updateNewOrderProducts = (productIds: string[]) => {
    const normalized = normalizeProductIdList(productIds);
    const primaryId = normalized[0] || '';
    const primaryProduct = primaryId ? products.find((product) => product.id.toString() === primaryId) : null;
    setNewOrder(prev => ({
      ...prev,
      product_ids: normalized,
      product_id: primaryId,
      product_name: primaryProduct?.product_name || ''
    }));
  };

  const updateNewOrderReplacementProducts = (productIds: string[]) => {
    const normalized = normalizeProductIdList(productIds);
    const primaryId = normalized[0] || '';
    const primaryProduct = primaryId ? products.find((product) => product.id.toString() === primaryId) : null;
    setNewOrder(prev => ({
      ...prev,
      replacement_product_ids: normalized,
      replacement_product_id: primaryId,
      replacement_product_name: primaryProduct?.product_name || ''
    }));
  };

  const handleNewOrderChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'client_id') {
      void handleClientSelect(value);
      return;
    }

    if (name === 'payment_status') {
      setNewOrder(prev => ({
        ...prev,
        payment_status: value === 'partial' ? 'partially_paid' : value as typeof prev.payment_status
      }));
      return;
    }

    if (name === 'replacement_product_id') {
      updateNewOrderReplacementProducts(value ? [value] : []);
      return;
    }

    if (name === 'product_id') {
      updateNewOrderProducts(value ? [value] : []);
      return;
    }

    if (name === 'company_ids') {
      setNewOrder(prev => ({
        ...prev,
        company_ids: normalizeStringIdList(value)
      }));
      return;
    }

    if (name === 'company_product_map') {
      setNewOrder(prev => ({
        ...prev,
        company_product_map: normalizeCompanyProductMap(value)
      }));
      return;
    }

    if (name === 'product_status_map') {
      setNewOrder(prev => ({
        ...prev,
        product_status_map: normalizeProductStatusMap(value)
      }));
      return;
    }

    if (name === 'repairing_status_map') {
      setNewOrder(prev => ({
        ...prev,
        repairing_status_map: normalizeRepairingStatusMap(value)
      }));
      return;
    }

    setNewOrder(prev => ({
      ...prev,
      [name]: value
    }));
  };


  const updateEditOrderProducts = (productIds: string[]) => {
    if (!editData) return;
    const normalized = normalizeProductIdList(productIds);
    const primaryId = normalized[0] || '';
    const primaryProduct = primaryId ? products.find((product) => product.id.toString() === primaryId) : null;
    setEditData((prev: any) => ({
      ...prev,
      product_ids: normalized,
      product_id: primaryId,
      product_name: primaryProduct?.product_name || prev?.product_name || ''
    }));
  };

  const updateEditOrderReplacementProducts = (productIds: string[]) => {
    if (!editData) return;
    const normalized = normalizeProductIdList(productIds);
    const primaryId = normalized[0] || '';
    const primaryProduct = primaryId ? products.find((product) => product.id.toString() === primaryId) : null;
    setEditData((prev: any) => ({
      ...prev,
      replacement_product_ids: normalized,
      replacement_product_id: primaryId,
      replacement_product_name: primaryProduct?.product_name || prev?.replacement_product_name || ''
    }));
  };

  const handleEditOrderChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (!editData) return;

    if (name === 'client_id') {
      const selectedClient = clients.find((client) => client.id.toString() === value);
      setEditData((prev: any) => ({
        ...prev,
        client_id: value,
        client_name: selectedClient?.full_name || '',
        client_phone: selectedClient?.phone || ''
      }));
      return;
    }

    if (name === 'payment_status') {
      setEditData((prev: any) => ({
        ...prev,
        payment_status: value === 'partial' ? 'partially_paid' : value
      }));
      return;
    }

    if (name === 'replacement_product_id') {
      updateEditOrderReplacementProducts(value ? [value] : []);
      return;
    }

    if (name === 'product_id') {
      updateEditOrderProducts(value ? [value] : []);
      return;
    }

    if (name === 'company_ids') {
      setEditData((prev: any) => ({
        ...prev,
        company_ids: normalizeStringIdList(value)
      }));
      return;
    }

    if (name === 'company_product_map') {
      setEditData((prev: any) => ({
        ...prev,
        company_product_map: normalizeCompanyProductMap(value)
      }));
      return;
    }

    if (name === 'product_status_map') {
      setEditData((prev: any) => ({
        ...prev,
        product_status_map: normalizeProductStatusMap(value)
      }));
      return;
    }

    if (name === 'repairing_status_map') {
      setEditData((prev: any) => ({
        ...prev,
        repairing_status_map: normalizeRepairingStatusMap(value)
      }));
      return;
    }

    setEditData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };


  const submitNewOrderForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleCreateOrder();
  };

  const submitEditOrderForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleSaveEdit();
  };

  const handleNewClientChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewClient(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const submitNewClientForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleCreateClient();
  };

  const handleNewProductChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const nextValue = type === 'checkbox' ? target.checked : value;

    if (showEditModal && editType === 'product') {
      setEditData((prev: any) => ({
        ...prev,
        [name]: nextValue
      }));
      return;
    }

    setNewProduct(prev => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const submitNewProductForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (showEditModal && editType === 'product') {
      void handleSaveEdit();
      return;
    }
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const submitAction = submitter?.value || 'create_close';
    void handleCreateProduct({ keepOpen: submitAction === 'create_next' });
  };

  void handleDeleteDelivery;
  void handleOrderRowClick;
  void exportOrdersToCSV;
  void exportOrdersToPDF;
  void exportClientsToCSV;
  void exportClientsToPDF;
  void exportProductsToCSV;
  void exportProductsToPDF;
  void exportDeliveriesToCSV;
  void exportDeliveriesToPDF;
  void generateDeliveryReceipt;
  void openReceiptOptionsForOrder;
  
  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiHome />, color: 'blue' },
    { id: 'users', label: 'Users & Staff', icon: <FiUsers />, color: 'purple' },
    { id: 'orders', label: 'Orders', icon: <FiPackage />, color: 'green' },
    { id: 'replacementorders', label: 'Replacement Orders', icon: <FiPackage />, color: 'green' },
    { id: 'clients', label: 'Clients', icon: <FiUsers />, color: 'teal' },
    { id: 'products', label: 'Products', icon: <FiShoppingBag />, color: 'orange' },
    { id: 'spareproducts', label: 'Spare Products', icon: <FiPackage />, color: 'orange' },
    { id: 'companys', label: 'Companys', icon: <FiUsers />, color: 'teal' },
    { id: 'suntocompany', label: 'RajTo Company', icon: <FiShoppingBag />, color: 'indigo' },
    { id: 'companytosun', label: 'Company To Raj', icon: <FiShoppingBag />, color: 'teal' },
    { id: 'deliveries', label: 'Deliveries', icon: <FiTruck />, color: 'red' },
    { id: 'revenue', label: 'Revenue', icon: <FiDollarSign />, color: 'emerald' },
    { id: 'analytics', label: 'Analytics', icon: <FiBarChart2 />, color: 'indigo' },
    { id: 'brandwiseoverallreport', label: 'Brandwise Overall Report', icon: <FiBarChart2 />, color: 'blue' },
  ];

  const isLimitedRole = false;
  const hiddenForLimitedRoles = new Set<string>();
  const visibleNavItems = navItems;
  
  // Stats cards data - Updated to use real API data
  const statsCards = dashboardStats ? [
    {
      title: 'Total Products',
      value: dashboardStats.total_products?.toLocaleString() || '0',
      icon: <FiShoppingBag />,
      color: 'orange',
      description: 'Total products in inventory',
      onClick: () => {
        setActiveTab('products');
        setFilters(prev => ({...prev, products: {category: '', status: ''}}));
        setSearchTerm('');
      }
    },
    {
      title: "Today's Orders",
      value: dashboardStats.today_orders?.toLocaleString() || '0',
      icon: <FiPackage />,
      color: 'green',
      description: "Orders received today",
      onClick: () => {
        setActiveTab('orders');
        const today = new Date().toISOString().split('T')[0];
        setSearchTerm(today);
      }
    },
    {
      title: 'Total Users',
      value: dashboardStats.total_users?.toLocaleString() || '0',
      icon: <FiUsers />,
      color: 'blue',
      description: 'Active system users',
      onClick: () => {
        setActiveTab('users');
        setFilters(prev => ({...prev, users: {role: '', status: ''}}));
        setSearchTerm('');
      }
    },
    {
      title: 'Total Clients',
      value: dashboardStats.total_clients?.toLocaleString() || '0',
      icon: <FiUsers />,
      color: 'teal',
      description: 'Registered clients',
      onClick: () => {
        setActiveTab('clients');
        setFilters(prev => ({...prev, clients: {city: ''}}));
        setSearchTerm('');
      }
    },
    {
      title: 'Total Orders',
      value: dashboardStats.total_orders?.toLocaleString() || '0',
      icon: <FiPackage />,
      color: 'purple',
      description: 'All time orders',
      onClick: () => {
        setActiveTab('orders');
        setFilters(prev => ({...prev, orders: {status: '', priority: '', payment_status: ''}}));
        setSearchTerm('');
      }
    },
    {
      title: 'Active Staff',
      value: dashboardStats.active_staff?.toLocaleString() || '0',
      icon: <FiUserCheck />,
      color: 'pink',
      description: 'Active staff members',
      onClick: () => {
        setActiveTab('staff');
        setSearchTerm('');
      }
    },
    {
      title: 'Pending Orders',
      value: dashboardStats.pending_orders?.toLocaleString() || '0',
      icon: <FiClock />,
      color: 'orange',
      description: 'Awaiting processing',
      onClick: () => {
        setActiveTab('orders');
        setFilters(prev => ({...prev, orders: {status: 'pending', priority: '', payment_status: ''}}));
        setSearchTerm('');
      }
    },
    {
      title: 'Delivered Orders',
      value: dashboardStats.delivered_orders?.toLocaleString() || '0',
      icon: <FiCheckCircle />,
      color: 'green',
      description: 'Successfully delivered',
      onClick: () => {
        setActiveTab('deliveries');
        setFilters(prev => ({...prev, deliveries: {status: 'delivered', delivery_type: ''}}));
        setSearchTerm('');
      }
    },
    {
      title: 'Completed Orders',
      value: dashboardStats.completed_orders?.toLocaleString() || '0',
      icon: <FiCheck />,
      color: 'green',
      description: 'Completed services',
      onClick: () => {
        setActiveTab('orders');
        setFilters(prev => ({...prev, orders: {status: 'completed', priority: '', payment_status: ''}}));
        setSearchTerm('');
      }
    },
    {
      title: 'Today Revenue',
      value: `Rs. ${dashboardStats.today_revenue?.toLocaleString() || '0'}`,
      icon: <FiDollarSign />,
      color: 'green',
      description: "Today's revenue",
      onClick: () => {
        setActiveTab('analytics');
        setSearchTerm('');
      }
    },
    {
      title: 'Total Revenue',
      value: `Rs. ${dashboardStats.total_revenue?.toLocaleString() || '0'}`,
      icon: <FiDollarSign />,
      color: 'blue',
      description: 'Overall revenue',
      onClick: () => {
        setActiveTab('analytics');
        setSearchTerm('');
      }
    },
    {
      title: 'Active Products',
      value: dashboardStats.active_products?.toLocaleString() || '0',
      icon: <FiBox />,
      color: 'blue',
      description: 'Active in inventory',
      onClick: () => {
        setActiveTab('products');
        setFilters(prev => ({...prev, products: {category: '', status: 'active'}}));
        setSearchTerm('');
      }
    }
  ] : [];

  const visibleStatsCards = isLimitedRole
    ? statsCards.filter((stat) => stat.title !== 'Today Revenue' && stat.title !== 'Total Revenue')
    : statsCards;

  useEffect(() => {
    if (isLimitedRole && hiddenForLimitedRoles.has(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isLimitedRole]);

  const receiptModalConfig =
    receiptTarget?.kind === 'order'
      ? {
          kind: 'order' as const,
          code: receiptTarget.order.order_code,
          subtitle: `${receiptTarget.order.client_name} | ${receiptTarget.order.product_name}`,
          description: 'Preview and download the customer receipt PDF.',
          previewMarkup: createOrderReceiptMarkup(receiptTarget.order as any, products as any),
          summaryItems: [
            { label: 'Client', value: receiptTarget.order.client_name || 'N/A' },
            { label: 'Status', value: receiptTarget.order.status || 'Pending' },
            { label: 'Amount', value: `Rs. ${receiptTarget.order.final_cost || receiptTarget.order.estimated_cost || '0'}` },
          ],
          onDownload: () => void downloadOrderReceiptPreview(receiptTarget.order),
          onPrint: () => printOrderReceiptPreview(receiptTarget.order),
        }
      : receiptTarget?.kind === 'delivery'
        ? {
            kind: 'delivery' as const,
            code: receiptTarget.delivery.delivery_code,
            subtitle: `${receiptTarget.delivery.client_name || 'N/A'} | ${receiptTarget.delivery.product_name || 'N/A'}`,
            description: 'Preview and download the delivery receipt PDF.',
            previewMarkup: createDeliveryReceiptMarkup(receiptTarget.delivery as any),
            summaryItems: [
              { label: 'Client', value: receiptTarget.delivery.client_name || 'N/A' },
              { label: 'Status', value: receiptTarget.delivery.status || 'Pending' },
              {
                label: 'Scheduled',
                value: receiptTarget.delivery.scheduled_date
                  ? new Date(receiptTarget.delivery.scheduled_date).toLocaleDateString('en-IN')
                  : 'N/A',
              },
            ],
            onDownload: () => void downloadDeliveryReceiptPreview(receiptTarget.delivery),
            onPrint: () => printDeliveryReceiptPreview(receiptTarget.delivery),
          }
        : null;
  
  if (!user) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
        </div>
        <p className="loading-text">Loading Dashboard...</p>
      </div>
    );
  }
  
  return (
    <div className="super-admin-dashboard">
      {/* Alert Messages */}
      <div className="alert-container">
        {error && (
          <AlertMessage
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}
        
        {successMessage && (
          <AlertMessage
            type="success"
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
          />
        )}
      </div>
      
      {/* Sidebar */}
      <aside 
        className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'} ${isMobile ? 'mobile-sidebar' : ''} ${isTablet ? 'tablet-sidebar' : ''}`}
      >
        <div className="sidebar-header">
          <div className="brand-container">
            <div className="brand-logo">
              <FiShield />
            </div>
            <div className="brand-text">
              <h2>Sun Computers</h2>
              <p>Admin Dashboard</p>
            </div>
          </div>
          <button className="close-sidebar-btn" onClick={() => setSidebarOpen(false)}>
            <FiChevronLeft />
          </button>
        </div>
        
        <div className="user-profile-card">
          <div className="profile-avatar">
            {user.profile_image ? (
              <img 
                src={user.profile_image} 
                alt={user.name}
                className="profile-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`avatar-initial ${user.profile_image ? 'hidden' : ''}`}>
              {user.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
          <div className="profile-info">
            <h3>{user.name || 'Admin User'}</h3>
            <div className="role-badge">
              <FiShield /> {user.role || 'Admin'}
            </div>
            <span className="user-email">{user.email || 'admin@suncomputers.com'}</span>
          </div>
        </div>
        
        <nav className="sidebar-navigation">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile || isTablet) setSidebarOpen(false);
              }}
            >
              <span className={`nav-icon nav-icon-${item.color}`}>
                {item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
              <div className="nav-indicator"></div>
            </button>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <button className="btn btn-logout" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className={`main-content-wrapper ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left-section">
            <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <FiChevronLeft /> : <FiMenu />}
            </button>
            
            <div className="search-container">
              <FiSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={handleSearch}
              />
              {searchTerm && (
                <button className="clear-search-btn" onClick={clearSearch}>
                  <FiX />
                </button>
              )}
            </div>
          </div>
          
          <div className="header-right-section">
            <button 
              className="action-button" 
              onClick={handleRefresh} 
              title="Refresh"
              disabled={loading[activeTab as keyof typeof loading]}
            >
              <FiRefreshCw className={loading[activeTab as keyof typeof loading] ? 'spinning' : ''} />
            </button>
            
            <div className={`notification-dropdown${showNotifications ? ' open' : ''}`} ref={notificationDropdownRef}>
              <button className="action-button" title="Notifications" onClick={() => setShowNotifications((prev) => !prev)}>
                <FiBell />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="notification-badge">{notifications.filter(n => !n.is_read).length}</span>
                )}
              </button>
              <NotificationDropdown
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onClearAll={handleClearNotifications}
              />
            </div>
            
            {/* Logout button near notification icon */}
            <button 
              className="action-button logout-header-btn" 
              onClick={handleLogout}
              title="Logout"
            >
              <FiLogOut />
            </button>
            
            <div className="user-menu">
              <div className="user-avatar-small">
                {user.profile_image ? (
                  <img 
                    src={user.profile_image} 
                    alt={user.name}
                    className="profile-image-small"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`avatar-initial-small ${user.profile_image ? 'hidden' : ''}`}>
                  {user.name?.charAt(0).toUpperCase() || 'A'}
                </div>
              </div>
              <div className="user-details">
                <span className="user-name">{user.name || 'Admin User'}</span>
                <span className="user-role">{user.role || 'Admin'}</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="dashboard-main-content">
          {/* Loading Overlay */}
          {loading[activeTab as keyof typeof loading] && (
            <div className="loading-overlay-content">
              <div className="loading-spinner">
                <div className="spinner-ring"></div>
              </div>
              <p className="loading-text">Loading {activeTab} data...</p>
            </div>
          )}
          
          {/* Welcome Section */}
          <div className="welcome-section">
            <div className="welcome-content">
              <div className="welcome-greeting">
                <h1>
                  <span className="greeting-text">Welcome back,</span>
                  <span className="greeting-name"> {user.name?.split(' ')[0] || 'Admin'}!</span>
                </h1>
                <p className="greeting-subtitle">
                  Monitor and manage your entire Sun Computers ecosystem
                </p>
              </div>
              {dashboardStats && (
                <div className="quick-stats">
                  <div className="stat-item" onClick={() => setActiveTab('products')}>
                    <div className="stat-icon-small">
                      <FiShoppingBag />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value-small">{dashboardStats.total_products?.toLocaleString() || '0'}</span>
                      <span className="stat-label">Products</span>
                    </div>
                  </div>
                  <div className="stat-item" onClick={() => setActiveTab('orders')}>
                    <div className="stat-icon-small">
                      <FiPackage />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value-small">{dashboardStats.today_orders?.toLocaleString() || '0'}</span>
                      <span className="stat-label">Today's Orders</span>
                    </div>
                  </div>
                  <div className="stat-item" onClick={() => setActiveTab('users')}>
                    <div className="stat-icon-small">
                      <FiUsers />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value-small">{dashboardStats.total_users?.toLocaleString() || '0'}</span>
                      <span className="stat-label">Users</span>
                    </div>
                  </div>
                  {!isLimitedRole && (
                    <div className="stat-item" onClick={() => setActiveTab('analytics')}>
                      <div className="stat-icon-small">
                        <FiDollarSign />
                      </div>
                      <div className="stat-info">
                        <span className="stat-value-small">Rs. {dashboardStats.today_revenue?.toLocaleString() || '0'}</span>
                        <span className="stat-label">Today's Revenue</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="welcome-actions">
              <button 
                className="btn btn-secondary" 
                onClick={handleRefresh}
                disabled={loading[activeTab as keyof typeof loading]}
              >
                <FiRefreshCw className={loading[activeTab as keyof typeof loading] ? 'spinning' : ''} /> Refresh
              </button>
            </div>
          </div>
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-tab">
              <div className="stats-grid-container">
                {visibleStatsCards.map((stat, index) => (
                  <div 
                    key={index}
                    className="stat-card clickable"
                    onClick={stat.onClick}
                  >
                    <div className="stat-card-inner">
                      <div className={`stat-icon stat-icon-${stat.color}`}>
                        {stat.icon}
                      </div>
                      <div className="stat-content">
                        <h3 className="stat-value">{stat.value}</h3>
                        <p className="stat-title">{stat.title}</p>
                        {stat.description && (
                          <p className="stat-description">{stat.description}</p>
                        )}
                      </div>
                      <div className="stat-arrow">
                        <FiChevronRight />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Users Tab */}
          {activeTab === 'users' && (
            <UserTab
              users={users as any}
              loading={loading.users}
              selectedUserIds={selectedUsers}
              filteredUsers={getFilteredAndSortedData() as any}
              filterRole={filters.users.role}
              filterStatus={filters.users.status}
              sortConfig={sortConfig}
              onCreateUser={openCreateUserForm}
              onCreateStaff={openCreateStaffForm}
              onClearFilters={() => setFilters(prev => ({ ...prev, users: { role: '', status: '' } }))}
              onFilterRoleChange={(value) => handleFilterChange('users', 'role', value)}
              onFilterStatusChange={(value) => handleFilterChange('users', 'status', value)}
              onViewUser={(user) => {
                setSelectedUserDetails(user as any);
                setShowUserDetailsModal(true);
              }}
              onEditUser={(user) => handleEdit('user', user)}
              onResetPassword={(user) => openResetPasswordModal(user.id, user.name)}
              onDeleteUser={handleDeleteUser}
              onExportCSV={exportUsersToCSV}
              onExportPDF={exportUsersToPDF}
              onToggleSelectAll={() => handleSelectAll('users')}
              onToggleSelectUser={(id) => handleSelectItem('users', id)}
              onSort={handleSort}
            />
          )}
          
                    {/* Orders Tab */}
          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders as any}
              filteredOrders={filteredOrdersForDashboard as any}
              products={products as any}
              loading={loading.orders}
              searchTerm={searchTerm}
              filterStatus={filters.orders.status || 'all'}
              filterPriority={filters.orders.priority || 'all'}
              dateRange={dateRange}
              onSearchChange={setSearchTerm}
              onFilterStatusChange={(value) => handleFilterChange('orders', 'status', value === 'all' ? '' : value)}
              onFilterPriorityChange={(value) => handleFilterChange('orders', 'priority', value === 'all' ? '' : value)}
              onDateRangeChange={handleDateRangeChange}
              onPresetClick={setDateRangePreset}
              onViewOrder={(order) => {
                setSelectedOrderDetails(order as any);
                setShowOrderDetailsModal(true);
              }}
              onEditOrder={(order) => {
                void openEditOrderForm(order);
              }}
              onPrintReceipt={(order) => openReceiptOptionsForOrder(order as any)}
              onDeleteOrder={handleDeleteOrder}
              onCreateOrder={() => {
                void openCreateOrderForm();
              }}
              onClearFilters={clearAllFilters}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              getWarrantyColor={getWarrantyColor}
            />
          )}

          {activeTab === 'replacementorders' && (
            <ReplacementOrdersTab
              replacementOrders={filteredReplacementOrdersForDashboard as any}
              filteredReplacementOrders={filteredReplacementOrdersForDashboard as any}
              products={products as any}
              loading={loading.replacementorders}
              searchTerm={searchTerm}
              filterStatus={filters.orders.status || 'all'}
              filterPriority={filters.orders.priority || 'all'}
              dateRange={dateRange}
              onSearchChange={setSearchTerm}
              onFilterStatusChange={(value) => handleFilterChange('orders', 'status', value === 'all' ? '' : value)}
              onFilterPriorityChange={(value) => handleFilterChange('orders', 'priority', value === 'all' ? '' : value)}
              onDateRangeChange={handleDateRangeChange}
              onPresetClick={setDateRangePreset}
              onViewOrder={(order) => {
                setSelectedOrderDetails(order as any);
                setShowOrderDetailsModal(true);
              }}
              onEditOrder={(order) => {
                void openEditOrderForm(order);
              }}
              onPrintReceipt={(order) => openReceiptOptionsForOrder(order as any)}
              onDeleteOrder={handleDeleteOrder}
              onCreateOrder={() => {
                void openCreateOrderForm();
              }}
              onClearFilters={clearAllFilters}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              getWarrantyColor={getWarrantyColor}
            />
          )}
          
                    {/* Clients Tab */}
          {activeTab === 'clients' && (
            <ClientsTab
              clients={clients as any}
              orders={orders as any}
              filteredClients={filteredClientsForDashboard as any}
              loading={loading.clients}
              searchTerm={searchTerm}
              dateRange={dateRange}
              onSearchChange={setSearchTerm}
              onDateRangeChange={handleDateRangeChange}
              onPresetClick={setDateRangePreset}
              onEditClient={(client) => handleEdit('client', client)}
              onDeleteClient={handleDeleteClient}
              onCreateClient={() => setShowCreateClient(true)}
              onClearFilters={clearAllFilters}
            />
          )}
          
                    {/* Products Tab */}
          {activeTab === 'products' && (
            <ProductsTab
              products={products as any}
              orders={orders as any}
              filteredProducts={filteredProductsForDashboard as any}
              loading={loading.products}
              searchTerm={searchTerm}
              filterStatus={filters.products.status || 'all'}
              dateRange={dateRange}
              onSearchChange={setSearchTerm}
              onFilterStatusChange={(value) => handleFilterChange('products', 'status', value === 'all' ? '' : value)}
              onDateRangeChange={handleDateRangeChange}
              onPresetClick={setDateRangePreset}
              onEditProduct={(product) => handleEdit('product', product)}
              onDeleteProduct={handleDeleteProduct}
              onCreateProduct={() => {
                setShowCreateProduct(true);
              }}
              onClearFilters={clearAllFilters}
            />
          )}

          {activeTab === 'spareproducts' && (
            <SpareProductsTab
              spareProducts={filteredSpareProductsForDashboard as any}
              orders={orders as any}
              filteredSpareProducts={filteredSpareProductsForDashboard as any}
              loading={loading.spareproducts}
              searchTerm={searchTerm}
              dateRange={dateRange}
              onSearchChange={setSearchTerm}
              onDateRangeChange={handleDateRangeChange}
              onPresetClick={setDateRangePreset}
              onClearFilters={clearAllFilters}
            />
          )}

          {activeTab === 'shopclaim' && (
            <ShopclaimTab
              shopClaims={filteredShopClaimsForDashboard as any}
              orders={orders as any}
              filteredShopClaims={filteredShopClaimsForDashboard as any}
              loading={loading.shopclaim}
              searchTerm={searchTerm}
              dateRange={dateRange}
              onSearchChange={setSearchTerm}
              onDateRangeChange={handleDateRangeChange}
              onPresetClick={setDateRangePreset}
              onClearFilters={clearAllFilters}
            />
          )}

          {activeTab === 'companyclaim' && (
            <CompanyClaimTab
              companyClaims={filteredCompanyClaimsForDashboard as any}
              orders={orders as any}
              filteredCompanyClaims={filteredCompanyClaimsForDashboard as any}
              loading={loading.companyclaim}
              searchTerm={searchTerm}
              dateRange={dateRange}
              onSearchChange={setSearchTerm}
              onDateRangeChange={handleDateRangeChange}
              onPresetClick={setDateRangePreset}
              onClearFilters={clearAllFilters}
            />
          )}

          {activeTab === 'companys' && (
            <CompanysTab />
          )}

          {activeTab === 'suntocompany' && (
            <SunToCompanyTab
              sunToCompanyClaims={sunToCompanyClaims as any}
              orders={orders as any}
              filteredSunToCompanyClaims={filteredSunToCompanyForDashboard as any}
              loading={loading.suntocompany}
              searchTerm={searchTerm}
              dateRange={dateRange}
              onSearchChange={setSearchTerm}
              onDateRangeChange={handleDateRangeChange}
              onPresetClick={setDateRangePreset}
              onViewOrder={(order) => {
                setSelectedOrderDetails(order as any);
                setShowOrderDetailsModal(true);
              }}
              onEditOrder={(order) => {
                void openEditOrderForm(order);
              }}
              onPrintReceipt={(order) => openReceiptOptionsForOrder(order as any)}
              onDeleteOrder={handleDeleteOrder}
              onCreateOrder={() => {
                void openCreateOrderForm();
              }}
              onClearFilters={clearAllFilters}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              getWarrantyColor={getWarrantyColor}
            />
          )}

          {activeTab === 'companytosun' && (
            <CompanyToSunTab
              companyToSunClaims={companyToSunClaims as any}
              orders={orders as any}
              filteredCompanyToSunClaims={filteredCompanyToSunForDashboard as any}
              loading={loading.companytosun}
              searchTerm={searchTerm}
              dateRange={dateRange}
              onSearchChange={setSearchTerm}
              onDateRangeChange={handleDateRangeChange}
              onPresetClick={setDateRangePreset}
              onViewOrder={(order) => {
                setSelectedOrderDetails(order as any);
                setShowOrderDetailsModal(true);
              }}
              onEditOrder={(order) => {
                void openEditOrderForm(order);
              }}
              onPrintReceipt={(order) => openReceiptOptionsForOrder(order as any)}
              onDeleteOrder={handleDeleteOrder}
              onCreateOrder={() => {
                void openCreateOrderForm();
              }}
              onClearFilters={clearAllFilters}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              getWarrantyColor={getWarrantyColor}
            />
          )}
          
                    {/* Deliveries Tab */}
          {activeTab === 'deliveries' && (
            <DeliveryTab
              filteredDeliveries={filteredDeliveriesForDashboard as any}
              loading={loading.deliveries}
              searchTerm={searchTerm}
              dateRange={dateRange}
              onSearchChange={setSearchTerm}
              onDateRangeChange={handleDateRangeChange}
              onPresetClick={setDateRangePreset}
              onPrintDeliveryReceipt={(delivery) => openReceiptOptionsForDelivery(delivery as any)}
              onViewOrders={() => setActiveTab('orders')}
              onClearFilters={clearAllFilters}
            />
          )}
          
          {/* Staff Monitoring Tab */}
          {activeTab === 'staff' && (
            <StaffTab
              staffPerformance={staffPerformance as any}
              loading={loading.staff}
              onRefresh={handleRefresh}
              onCreateStaff={openCreateStaffForm}
              onViewStaff={(staff) => handleViewStaffDetails(staff)}
              onEditStaff={(staff) => handleEdit('user', getFullStaffRecord(staff))}
              onGoToOrders={(staff) => {
                setActiveTab('orders');
                setSearchTerm(staff.name);
              }}
            />
          )}

          {!isLimitedRole && activeTab === 'revenue' && (
            <RevenueTab />
          )}
          
          {/* Analytics Tab */}
          {!isLimitedRole && activeTab === 'analytics' && (
            <AnalyticsTab
              analyticsData={analyticsData as any}
              loading={loading.analytics}
              onRefresh={handleRefresh}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
            />
          )}
          {!isLimitedRole && activeTab === 'brandwiseoverallreport' && (
            <BrandwiseOverallReportTab
              orders={orders}
              products={products}
              deliveries={deliveries}
              loading={loading.brandwiseoverallreport}
            />
          )}
        </main>
        
        {/* Footer */}
        <footer className="dashboard-footer">
          <p className="footer-text">
            Copyright 2026 Jeevan Larosh. All rights reserved
          </p>
          <div className="system-status">
            <div className="status-indicator">
              <div className="status-pulse"></div>
              <div className="status-dot"></div>
            </div>
            <span>System Status: Operational</span>
            <span className="last-updated">
              <FiClock /> Last Updated: {new Date().toLocaleString()}
            </span>
          </div>
        </footer>
      </div>
      
      {/* Modals */}
      
      {/* User Form Modal */}
      <UserFormModal
        show={showCreateUser || (showEditModal && editType === 'user' && editData?.role === 'admin')}
        editMode={showEditModal && editType === 'user' && editData?.role === 'admin'}
        userForm={((showEditModal && editType === 'user' && editData?.role === 'admin') ? editData : newUser) as any}
        onClose={() => {
          setShowCreateUser(false);
          if (showEditModal && editType === 'user') {
            setShowEditModal(false);
            setEditData(null);
          }
        }}
        onChange={handleUserFormChange}
        onImageChange={handleUserImageChange}
        onSubmit={submitUserForm}
      />
      
      {/* Staff Form Modal */}
      <StaffFormModal
        show={showCreateStaff || (showEditModal && editType === 'user' && editData?.role !== 'admin')}
        editMode={showEditModal && editType === 'user' && editData?.role !== 'admin'}
        staffForm={((showEditModal && editType === 'user' && editData?.role !== 'admin') ? editData : newUser) as any}
        onClose={() => {
          setShowCreateStaff(false);
          if (showEditModal && editType === 'user') {
            setShowEditModal(false);
            setEditData(null);
          }
        }}
        onChange={handleUserFormChange}
        onImageChange={handleUserImageChange}
        onSubmit={submitUserForm}
      />
      
      {/* User Detail Modal */}
      <UserDetailModal
        show={showUserDetailsModal}
        user={selectedUserDetails as any}
        onClose={() => {
          setShowUserDetailsModal(false);
          setSelectedUserDetails(null);
        }}
        onEdit={(user) => {
          setShowUserDetailsModal(false);
          handleEdit('user', user);
        }}
        onResetPassword={(user) => {
          setShowUserDetailsModal(false);
          openResetPasswordModal(user.id, user.name);
        }}
        onDelete={handleDeleteUser}
      />
      
      {/* Create Order Modal */}
      <OrderFormModal
        show={showCreateOrder}
        editMode={false}
        orderForm={{
          ...newOrder,
          payment_status: newOrder.payment_status === 'partially_paid' ? 'partial' : newOrder.payment_status,
        }}
        users={staffList as any}
        clientsForDropdown={clients as any}
        products={products as any}
        loadingClientsForDropdown={loading.clients}
        onClose={() => setShowCreateOrder(false)}
        onChange={handleNewOrderChange}
        onProductsChange={updateNewOrderProducts}
        onReplacementProductsChange={updateNewOrderReplacementProducts}
        onSubmit={submitNewOrderForm}
      />

      <OrderFormModal
        show={showEditModal && editType === 'order'}
        editMode={true}
        orderForm={{
          ...(editData || {}),
          company_id: editData?.company_id || '',
          company_ids: editData?.company_ids || [],
          company_name: editData?.company_name || '',
          company_product_map: editData?.company_product_map || {},
          client_name: editData?.client_name || '',
          client_phone: editData?.client_phone || '',
          product_name: editData?.product_name || '',
          replacement_product_name: editData?.replacement_product_name || '',
          service_type: editData?.service_type || 'general',
          issue_description: editData?.issue_description || '',
          warranty_status: editData?.warranty_status || 'out_of_warranty',
          estimated_cost: String(editData?.estimated_cost ?? ''),
          final_cost: String(editData?.final_cost ?? ''),
          payment_status: editData?.payment_status === 'partially_paid' ? 'partial' : (editData?.payment_status || 'pending'),
          estimated_delivery_date: editData?.estimated_delivery_date || '',
          status: editData?.status || 'pending',
          priority: editData?.priority || 'medium',
          notes: editData?.notes || '',
          client_id: editData?.client_id || '',
          product_id: editData?.product_id || '',
          replacement_product_id: editData?.replacement_product_id || '',
          product_ids: editData?.product_ids || [],
          product_status_map: editData?.product_status_map || {},
          repairing_status_map: editData?.repairing_status_map || {},
          replacement_product_ids: editData?.replacement_product_ids || [],
          staff_id: editData?.staff_id || '',
          deposit_amount: String(editData?.deposit_amount ?? '0'),
        }}
        users={staffList as any}
        clientsForDropdown={clients as any}
        products={products as any}
        loadingClientsForDropdown={loading.clients}
        onClose={() => {
          setShowEditModal(false);
          setEditData(null);
        }}
        onChange={handleEditOrderChange}
        onProductsChange={updateEditOrderProducts}
        onReplacementProductsChange={updateEditOrderReplacementProducts}
        onSubmit={submitEditOrderForm}
      />
      
      {/* Create Client Modal */}
      <ClientFormModal
        show={showCreateClient}
        editMode={false}
        clientForm={newClient}
        onClose={() => setShowCreateClient(false)}
        onChange={handleNewClientChange}
        onSubmit={submitNewClientForm}
      />
      
      {/* Create Product Modal */}
      <ProductFormModal
        show={showCreateProduct}
        editMode={false}
        productForm={newProduct}
        onClose={() => {
          setShowCreateProduct(false);
        }}
        onChange={handleNewProductChange}
        onSubmit={submitNewProductForm}
      />

      {/* Edit Product Modal */}
      <ProductFormModal
        show={showEditModal && editType === 'product'}
        editMode={true}
        productForm={{
          product_name: editData?.product_name || '',
          serial_number: editData?.serial_number || '',
          is_spare_product:
            editData?.is_spare_product === true ||
            editData?.is_spare_product === 1 ||
            editData?.is_spare_product === '1' ||
            editData?.is_spare_product === 'true',
          brand: editData?.brand || '',
          model: editData?.model || '',
          category: editData?.category || 'laptop',
          claim_type: editData?.claim_type || 'none',
          specifications: editData?.specifications || '',
          purchase_date: editData?.purchase_date || '',
          warranty_period: editData?.warranty_period || '',
          price: String(editData?.price ?? '0'),
          status: editData?.status || 'active',
        }}
        onClose={() => {
          setShowEditModal(false);
          setEditData(null);
        }}
        onChange={handleNewProductChange}
        onSubmit={submitNewProductForm}
      />
      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal && editType !== 'user' && editType !== 'order' && editType !== 'product'}
        onClose={() => setShowEditModal(false)}
        title={`Edit ${editType.charAt(0).toUpperCase() + editType.slice(1)}`}
        size="lg"
      >
        {editData && (
          <div className="modal-form">
            {editType === 'user' ? (
              <>
                <div className="form-group full-width">
                  <label>Profile Image</label>
                  <div className="image-upload-container">
                    <div className="image-preview">
                      {editData.profile_image_url || editData.profile_image || editData.avatar ? (
                        <img 
                          src={editData.profile_image_url || editData.profile_image || editData.avatar} 
                          alt="Profile preview" 
                          className="image-preview-img"
                        />
                      ) : (
                        <div className="image-placeholder">
                          <FiCamera size={24} />
                          <span>Upload Image</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditData({
                              ...editData,
                              profile_image: file,
                              profile_image_url: reader.result as string
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="image-upload-input"
                      id="edit-profile-image-upload"
                    />
                    <label htmlFor="edit-profile-image-upload" className="btn btn-secondary">
                      <FiUpload /> Change Image
                    </label>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Role *</label>
                    <select
                      value={editData.role || 'user'}
                      onChange={(e) => setEditData({...editData, role: e.target.value})}
                      className="form-select"
                      required
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Active Status</label>
                    <div className="form-checkbox">
                      <input
                        type="checkbox"
                        checked={!!editData.is_active}
                        onChange={(e) => setEditData({...editData, is_active: e.target.checked})}
                        id="edit-is_active"
                      />
                      <label htmlFor="edit-is_active">User is active</label>
                    </div>
                  </div>
                </div>
              </>
            ) : editType === 'order' ? (
              <div className="form-grid">
                <div className="form-group">
                  <label>Client Name *</label>
                  <select
                    value={editData.client_id || ''}
                    onChange={(e) => {
                      const clientId = e.target.value;
                      if (clientId) {
                        const selectedClient = clients.find(client => client.id.toString() === clientId);
                        if (selectedClient) {
                          setEditData({
                            ...editData,
                            client_id: clientId,
                            client_name: selectedClient.full_name,
                            client_phone: selectedClient.phone
                          });
                        }
                      } else {
                        setEditData({
                          ...editData,
                          client_id: '',
                          client_name: '',
                          client_phone: ''
                        });
                      }
                    }}
                    className="form-select"
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.full_name} ({client.phone})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Client Phone *</label>
                  <input
                    type="tel"
                    value={editData.client_phone || ''}
                    onChange={(e) => setEditData({...editData, client_phone: e.target.value})}
                    className="form-input"
                    required
                    readOnly
                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                  />
                </div>
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={editData.product_name || ''}
                    onChange={(e) => setEditData({...editData, product_name: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Service Staff</label>
                  <select
                    value={editData.staff_id || ''}
                    onChange={(e) => setEditData({...editData, staff_id: e.target.value})}
                    className="form-select"
                  >
                    <option value="">Select Service Staff</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} ({staff.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Issue Description *</label>
                  <textarea
                    value={editData.issue_description || ''}
                    onChange={(e) => setEditData({...editData, issue_description: e.target.value})}
                    className="form-textarea"
                    rows={3}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Warranty Status *</label>
                  <select
                    value={editData.warranty_status || 'out_of_warranty'}
                    onChange={(e) => setEditData({...editData, warranty_status: e.target.value})}
                    className="form-select"
                    required
                  >
                    {warrantyOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Estimated Cost (Rs.)</label>
                  <input
                    type="number"
                    value={editData.estimated_cost || '0'}
                    onChange={(e) => setEditData({...editData, estimated_cost: e.target.value})}
                    className="form-input"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Final Cost (Rs.)</label>
                  <input
                    type="number"
                    value={editData.final_cost || editData.estimated_cost || '0'}
                    onChange={(e) => setEditData({...editData, final_cost: e.target.value})}
                    className="form-input"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Deposit Amount (Rs.)</label>
                  <input
                    type="number"
                    value={editData.deposit_amount || '0'}
                    onChange={(e) => setEditData({...editData, deposit_amount: e.target.value})}
                    className="form-input"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Payment Status</label>
                  <select
                    value={editData.payment_status || 'pending'}
                    onChange={(e) => setEditData({...editData, payment_status: e.target.value})}
                    className="form-select"
                  >
                    {paymentOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editData.status || 'pending'}
                    onChange={(e) => setEditData({...editData, status: e.target.value})}
                    className="form-select"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={editData.priority || 'medium'}
                    onChange={(e) => setEditData({...editData, priority: e.target.value})}
                    className="form-select"
                  >
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData({...editData, notes: e.target.value})}
                    className="form-textarea"
                    rows={3}
                  />
                </div>
              </div>
            ) : editType === 'client' ? (
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={editData.full_name || ''}
                    onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={editData.email || ''}
                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={editData.phone || ''}
                    onChange={(e) => setEditData({...editData, phone: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={editData.address || ''}
                    onChange={(e) => setEditData({...editData, address: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={editData.city || ''}
                    onChange={(e) => setEditData({...editData, city: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={editData.state || ''}
                    onChange={(e) => setEditData({...editData, state: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>ZIP Code</label>
                  <input
                    type="text"
                    value={editData.zip_code || ''}
                    onChange={(e) => setEditData({...editData, zip_code: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData({...editData, notes: e.target.value})}
                    className="form-textarea"
                    rows={2}
                  />
                </div>
              </div>
            ) : editType === 'product' ? (
              <div className="form-grid">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={editData.product_name || ''}
                    onChange={(e) => setEditData({...editData, product_name: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Brand</label>
                  <input
                    type="text"
                    value={editData.brand || ''}
                    onChange={(e) => setEditData({...editData, brand: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Model</label>
                  <input
                    type="text"
                    value={editData.model || ''}
                    onChange={(e) => setEditData({...editData, model: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={editData.category || 'other'}
                    onChange={(e) => setEditData({...editData, category: e.target.value})}
                    className="form-select"
                    required
                  >
                    {categoryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.price || '0'}
                    onChange={(e) => setEditData({...editData, price: e.target.value})}
                    className="form-input"
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    value={editData.stock_quantity || '0'}
                    onChange={(e) => setEditData({...editData, stock_quantity: e.target.value})}
                    className="form-input"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Minimum Stock Level</label>
                  <input
                    type="number"
                    value={editData.min_stock_level || '5'}
                    onChange={(e) => setEditData({...editData, min_stock_level: e.target.value})}
                    className="form-input"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Status *</label>
                  <select
                    value={editData.status || 'active'}
                    onChange={(e) => setEditData({...editData, status: e.target.value})}
                    className="form-select"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Specifications</label>
                  <textarea
                    value={editData.specifications || ''}
                    onChange={(e) => setEditData({...editData, specifications: e.target.value})}
                    className="form-textarea"
                    rows={3}
                  />
                </div>
              </div>
            ) : editType === 'delivery' ? (
              <div className="form-grid">
                <div className="form-group">
                  <label>Delivery Status</label>
                  <select
                    value={editData.status || 'scheduled'}
                    onChange={(e) => setEditData({...editData, status: e.target.value})}
                    className="form-select"
                  >
                    {deliveryStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Delivery Person</label>
                  <input
                    type="text"
                    value={editData.delivery_person || ''}
                    onChange={(e) => setEditData({...editData, delivery_person: e.target.value})}
                    className="form-input"
                    placeholder="Enter delivery person name"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData({...editData, notes: e.target.value})}
                    className="form-textarea"
                    rows={3}
                    placeholder="Additional delivery notes"
                  />
                </div>
              </div>
            ) : null}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedUserForReset(null);
        }}
        userId={selectedUserForReset?.id || 0}
        userName={selectedUserForReset?.name || ''}
        onResetPassword={handleResetPassword}
      />

      {receiptModalConfig && (
        <ReceiptActionModal
          kind={receiptModalConfig.kind}
          code={receiptModalConfig.code}
          subtitle={receiptModalConfig.subtitle}
          description={receiptModalConfig.description}
          summaryItems={receiptModalConfig.summaryItems}
          previewMarkup={receiptModalConfig.previewMarkup}
          onClose={() => setReceiptTarget(null)}
          onDownload={() => {
            receiptModalConfig.onDownload();
            setReceiptTarget(null);
          }}
          onPrint={() => {
            receiptModalConfig.onPrint();
          }}
        />
      )}
      
      {/* Receipt Confirmation Modal */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedOrderForReceipt(null);
        }}
        title="Download Receipt PDF"
        size="sm"
      >
        <div className="modal-form">
          <div className="receipt-confirmation">
            <FiDownload className="receipt-icon" />
            <h4>Download Receipt PDF</h4>
            <p className="receipt-order-code">
              {selectedOrderForReceipt?.order_code}
            </p>
            <p className="receipt-client">
              Client: {selectedOrderForReceipt?.client_name}
            </p>
            <p className="receipt-amount">
              Amount: Rs. {selectedOrderForReceipt?.final_cost || selectedOrderForReceipt?.estimated_cost || '0'}
            </p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedOrderForReceipt(null);
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmGenerateReceipt}>
                <FiDownload /> Download PDF
              </button>
            </div>
          </div>
        </div>
      </Modal>
      
      {/* Staff Details Modal */}
      <StaffDetailModal
        show={showStaffDetailsModal}
        onClose={() => {
          setShowStaffDetailsModal(false);
          setSelectedStaff(null);
          setSelectedStaffOrders([]);
        }}
        staff={selectedStaff}
        staffOrders={selectedStaffOrders}
        onEdit={(staff) => {
          setShowStaffDetailsModal(false);
          handleEdit('user', getFullStaffRecord(staff));
        }}
        onViewOrders={(staff) => {
          setShowStaffDetailsModal(false);
          setActiveTab('orders');
          setSearchTerm(staff.name);
        }}
      />
      
      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showOrderDetailsModal}
        onClose={() => {
          setShowOrderDetailsModal(false);
          setSelectedOrderDetails(null);
        }}
        order={selectedOrderDetails}
        products={products as any}
        onEdit={handleOrderDetailsEdit}
        onGenerateReceipt={handleOrderDetailsReceipt}
        onDelete={handleOrderDetailsDelete}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteOrderTarget)}
        title={deleteOrderTarget ? `Delete ${deleteOrderTarget.order_code}` : 'Delete Order'}
        description="This will permanently remove the order and its history."
        details={
          deleteOrderTarget
            ? [
                { label: 'Order Code', value: deleteOrderTarget.order_code },
                { label: 'Client', value: deleteOrderTarget.client_name || '-' },
                { label: 'Product', value: deleteOrderTarget.product_name || '-' },
                { label: 'Status', value: deleteOrderTarget.status || '-' },
                { label: 'Created', value: formatShortDate(deleteOrderTarget.created_at) },
                {
                  label: 'Amount',
                  value: `Rs. ${formatAmount(deleteOrderTarget.final_cost || deleteOrderTarget.estimated_cost)}`,
                },
              ]
            : []
        }
        confirmLabel="Delete Order"
        cancelLabel="Keep Order"
        isProcessing={deleteOrderPending}
        onConfirm={confirmDeleteOrder}
        onCancel={() => {
          if (!deleteOrderPending) setDeleteOrderTarget(null);
        }}
      />
    </div>
  );
};

export default AdminDashboard;




