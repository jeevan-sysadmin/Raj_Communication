import type React from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string;
  phone?: string;
  is_active?: string;
  last_login?: string;
  created_at?: string;
}

export interface DashboardStats {
  total_orders?: number;
  pending_orders?: number;
  total_clients?: number;
  total_products?: number;
  delivered_orders?: number;
  revenue?: number;
}

export interface Activity {
  activity: string;
  timestamp: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
  is_read: boolean;
  order_id?: number;
  order_code?: string;
  pending_days?: number;
}

export interface Order {
  id: number;
  order_code: string;
  company_id?: number | null;
  company_ids?: number[] | string[];
  company_name?: string;
  company_names?: string[];
  company_product_map?: Record<string, number[] | string[]>;
  companies_products?: Record<string, number[] | string[]>;
  client_id: number;
  client_name: string;
  client_phone: string;
  product_id: number;
  product_name: string;
  product_ids?: number[] | string[];
  product_status_map?: Record<string, string> | string;
  issue_description_map?: Record<string, string> | string;
  product_status_dates_map?: Record<string, { pending?: string | null; rajtocom?: string | null; comtoraj?: string | null; deliveryed?: string | null }> | string;
  handover_type?: string;
  handover_type_map?: Record<string, string> | string;
  repairing_status_map?: Record<string, string> | string;
  product_names?: string[];
  replacement_product_id?: number | null;
  replacement_product_name?: string;
  replacement_product_ids?: number[] | string[];
  replacement_product_names?: string[];
  serial_number?: string;
  replacement_serial_number?: string;
  product_serial_numbers?: string[];
  replacement_product_serial_numbers?: string[];
  issue_description: string;
  warranty_status: string;
  estimated_cost: string | number;
  final_cost: string | number;
  payment_status: string;
  estimated_delivery_date: string;
  status: string;
  priority: string;
  notes: string;
  created_at: string;
  client_address?: string;
  product_brand?: string;
  staff_id: number;
  staff_name: string;
  staff_email?: string;
  deposit_amount?: string | number;
  client_email?: string;
  product_model?: string;
  diagnosis_notes?: string;
  repair_notes?: string;
  rating?: string | number;
  actual_delivery_date?: string;
  service_type?: string;
}

export interface Client {
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
  total_orders?: number;
}

export interface Company {
  id: number;
  company_code: string;
  company_name: string;
  product: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  source_pdf?: string;
  created_at: string;
}

export interface Product {
  id: number;
  product_code: string;
  product_name: string;
  serial_number?: string;
  stock_quantity?: number | string;
  is_spare_product?: boolean | number | string;
  brand: string;
  model: string;
  category: string;
  claim_type?: string;
  specifications: string;
  purchase_date: string;
  warranty_period: string;
  price: string | number;
  status: string;
  created_at: string;
  total_orders?: number;
}

export interface Delivery {
  id: number;
  delivery_code?: string;
  serial_number?: string;
  delivery_serial_number?: string;
  product_serial_number?: string;
  product_serial_numbers?: string[] | string;
  delivery_item_product_ids?: string[] | string;
  delivery_item_product_names?: string[] | string;
  delivery_item_serial_numbers?: string[] | string;
  order_id: number;
  order_code?: string;
  client_name?: string;
  client_phone?: string;
  client_address?: string;
  product_name?: string;
  product_brand?: string;
  delivery_type: string;
  address: string;
  contact_person: string;
  contact_phone: string;
  scheduled_date: string;
  scheduled_date_formatted?: string;
  scheduled_time: string;
  scheduled_time_formatted?: string;
  delivery_person: string;
  notes: string;
  status: string;
  delivered_date: string;
  delivered_date_formatted?: string;
  created_at: string;
}

export interface LoadingState {
  orders: boolean;
  replacementOrders: boolean;
  clients: boolean;
  products: boolean;
  spareProducts: boolean;
  shopClaims: boolean;
  companyClaims: boolean;
  sunToCompanyClaims: boolean;
  companyToSunClaims: boolean;
  dashboard: boolean;
  user: boolean;
  deliveries: boolean;
  users: boolean;
  clientsForDropdown: boolean;
}

export interface OrderForm {
  // Company related fields
  company_id?: string;
  company_ids: string[];
  company_name?: string;
  company_product_map: Record<string, string[]>;
  companies_products?: Record<string, string[]>;
  
  // Client related fields
  client_name: string;
  client_phone: string;
  client_id: string;
  
  // Product related fields
  product_name: string;
  product_id: string;
  product_ids: string[];
  product_status_map?: Record<string, string> | string;
  issue_description_map?: Record<string, string> | string;
  handover_type?: string;
  handover_type_map?: Record<string, string> | string;
  repairing_status_map?: Record<string, string> | string;
  
  // Replacement product related fields
  replacement_product_name: string;
  replacement_product_id: string;
  replacement_product_ids: string[];
  
  // Service related fields
  service_type: string;
  issue_description: string;
  warranty_status: string;
  staff_id: string;
  
  // Financial fields
  estimated_cost: string;
  final_cost: string;
  deposit_amount: string;
  payment_status: string;
  
  // Schedule fields
  estimated_delivery_date: string;
  
  // Status fields
  status: string;
  priority: string;
  
  // Additional fields
  notes: string;
  diagnosis_notes?: string;
  repair_notes?: string;
  rating?: string;
  actual_delivery_date?: string;
  payment_method?: string;
  transaction_id?: string;
  payment_notes?: string;
}

export interface ClientForm {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
}

export interface ProductForm {
  id?: number | string;
  product_name: string;
  serial_number: string;
  stock_quantity: string;
  product_rows_json?: string;
  is_spare_product: boolean;
  brand: string;
  model: string;
  category: string;
  claim_type: string;
  specifications: string;
  purchase_date: string;
  warranty_period: string;
  price: string;
  status: string;
}

export interface CompanyForm {
  company_name: string;
  product: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  source_pdf: string;
}

export interface NavItem {
  icon: React.ReactNode;
  label: string;
  id: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  partial?: boolean;
  created_count?: number;
  failed_count?: number;
  created_products?: Array<{
    index: number;
    product_name: string;
    product_id: number;
    product_code: string;
  }>;
  errors?: Array<{
    index: number;
    product_name?: string;
    message: string;
  }>;
  stats?: DashboardStats;
  activities?: Activity[];
  user?: User;
  recent_orders?: Order[];
  orders?: Order[];
  replacementOrders?: Order[];
  data?: Client[] | User[];
  clients?: Client[];
  products?: Product[];
  companys?: Company[];
  spareProducts?: Product[];
  shopClaims?: Product[];
  companyClaims?: Product[];
  sunToCompanyClaims?: Product[];
  companyToSunClaims?: Product[];
  deliveries?: Delivery[];
  notifications?: Notification[];
  token?: string;
  order_id?: number;
  client_id?: number;
  product_id?: number;
  users?: User[];
  revenue?: number;
  count?: number;
  order?: Order;
  payments?: Payment[];
  payment_summary?: PaymentSummary;
}

export interface Payment {
  id: number;
  payment_code: string;
  order_id: number;
  amount: number;
  payment_method: string;
  payment_status: string;
  notes?: string;
  created_at: string;
  estimated_cost?: number;
  final_cost?: number;
  deposit_amount?: number;
  transaction_id?: string;
  created_by?: number;
}

export interface PaymentSummary {
  total_paid: number;
  final_cost: number;
  deposit_amount: number;
  balance: number;
}

export interface DashboardProps {
  onLogout: () => void;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Helper function to normalize company IDs from API response
export function normalizeCompanyIds(companyIds: any): string[] {
  if (!companyIds) return [];
  
  if (Array.isArray(companyIds)) {
    return companyIds.map(id => id.toString());
  }
  
  if (typeof companyIds === 'string') {
    try {
      const parsed = JSON.parse(companyIds);
      if (Array.isArray(parsed)) {
        return parsed.map(id => id.toString());
      }
    } catch (e) {
      // Not JSON, try comma separation
      return companyIds.split(',').filter(Boolean).map(id => id.trim());
    }
  }
  
  if (typeof companyIds === 'number') {
    return [companyIds.toString()];
  }
  
  return [];
}

// Helper function to normalize company product map from API response
export function normalizeCompanyProductMap(map: any): Record<string, string[]> {
  if (!map) return {};
  
  let parsedMap = map;
  if (typeof map === 'string') {
    try {
      parsedMap = JSON.parse(map);
    } catch (e) {
      return {};
    }
  }
  
  if (typeof parsedMap !== 'object' || parsedMap === null) {
    return {};
  }
  
  const normalized: Record<string, string[]> = {};
  for (const [companyId, productIds] of Object.entries(parsedMap)) {
    let ids: string[] = [];
    if (Array.isArray(productIds)) {
      ids = productIds.map(id => id.toString());
    } else if (typeof productIds === 'string') {
      ids = productIds.split(',').filter(Boolean).map(id => id.trim());
    } else if (typeof productIds === 'number') {
      ids = [productIds.toString()];
    }
    normalized[companyId] = ids;
  }
  
  return normalized;
}

// Helper function to normalize product IDs from API response
export function normalizeProductIds(productIds: any): string[] {
  if (!productIds) return [];
  
  if (Array.isArray(productIds)) {
    return productIds.map(id => id.toString());
  }
  
  if (typeof productIds === 'string') {
    try {
      const parsed = JSON.parse(productIds);
      if (Array.isArray(parsed)) {
        return parsed.map(id => id.toString());
      }
    } catch (e) {
      // Not JSON, try comma separation
      return productIds.split(',').filter(Boolean).map(id => id.trim());
    }
  }
  
  if (typeof productIds === 'number') {
    return [productIds.toString()];
  }
  
  return [];
}

// Helper function to convert OrderForm to API request body
export function orderFormToApiRequest(form: OrderForm): any {
  return {
    client_id: form.client_id,
    client_phone: form.client_phone,
    product_ids: form.product_ids.map(id => parseInt(id)),
    replacement_product_ids: form.replacement_product_ids.map(id => parseInt(id)),
    staff_id: form.staff_id ? parseInt(form.staff_id) : null,
    service_type: form.service_type,
    issue_description: form.issue_description,
    warranty_status: form.warranty_status,
    estimated_cost: parseFloat(form.estimated_cost) || 0,
    final_cost: parseFloat(form.final_cost) || 0,
    deposit_amount: parseFloat(form.deposit_amount) || 0,
    payment_status: form.payment_status,
    estimated_delivery_date: form.estimated_delivery_date || null,
    priority: form.priority,
    notes: form.notes,
    diagnosis_notes: form.diagnosis_notes || null,
    repair_notes: form.repair_notes || null,
    rating: form.rating ? parseInt(form.rating) : null,
    actual_delivery_date: form.actual_delivery_date || null,
    payment_method: form.payment_method || 'cash',
    transaction_id: form.transaction_id || null,
    payment_notes: form.payment_notes || null,
    company_ids: form.company_ids.map(id => parseInt(id)),
    company_product_map: Object.entries(form.company_product_map).reduce((acc, [key, value]) => {
      acc[key] = value.map(id => parseInt(id));
      return acc;
    }, {} as Record<string, number[]>),
    issue_description_map: form.issue_description_map || {},
    repairing_status_map: form.repairing_status_map || {},
    companies_products: Object.entries(form.company_product_map).reduce((acc, [key, value]) => {
      acc[key] = value.map(id => parseInt(id));
      return acc;
    }, {} as Record<string, number[]>)
  };
}

// Helper function to convert API response to OrderForm
export function apiResponseToOrderForm(order: Order): OrderForm {
  return {
    company_id: order.company_id?.toString() || '',
    company_ids: (order.company_ids || []).map(id => id.toString()),
    company_name: order.company_name || '',
    company_product_map: order.company_product_map ? 
      Object.entries(order.company_product_map).reduce((acc, [key, value]) => {
        acc[key] = (value || []).map(id => id.toString());
        return acc;
      }, {} as Record<string, string[]>) : {},
    companies_products: order.companies_products ? 
      Object.entries(order.companies_products).reduce((acc, [key, value]) => {
        acc[key] = (value || []).map(id => id.toString());
        return acc;
      }, {} as Record<string, string[]>) : {},
    client_name: order.client_name,
    client_phone: order.client_phone,
    client_id: order.client_id.toString(),
    product_name: order.product_name,
    product_id: order.product_id.toString(),
    product_ids: (order.product_ids || [order.product_id]).map(id => id.toString()),
    issue_description_map: order.issue_description_map || {},
    repairing_status_map: order.repairing_status_map || {},
    replacement_product_name: order.replacement_product_name || '',
    replacement_product_id: order.replacement_product_id?.toString() || '',
    replacement_product_ids: (order.replacement_product_ids || []).map(id => id.toString()),
    service_type: order.service_type || 'general',
    issue_description: order.issue_description || '',
    warranty_status: order.warranty_status,
    staff_id: order.staff_id?.toString() || '',
    estimated_cost: order.estimated_cost.toString(),
    final_cost: order.final_cost.toString(),
    deposit_amount: order.deposit_amount?.toString() || '0',
    payment_status: order.payment_status,
    estimated_delivery_date: order.estimated_delivery_date || '',
    status: order.status,
    priority: order.priority,
    notes: order.notes || '',
    diagnosis_notes: order.diagnosis_notes || '',
    repair_notes: order.repair_notes || '',
    rating: order.rating?.toString() || '',
    actual_delivery_date: order.actual_delivery_date || '',
    payment_method: 'cash',
    transaction_id: '',
    payment_notes: ''
  };
}
