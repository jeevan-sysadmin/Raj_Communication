import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertCircle, FiBriefcase, FiCalendar, FiCheck, FiChevronDown, FiClock, FiCreditCard, FiDollarSign, FiPackage, FiPhone, FiPlus, FiSave, FiSearch, FiStar, FiUser, FiUsers, FiX } from "react-icons/fi";
import type { Client, Company, OrderForm, Product, User } from "../types";

interface OrderFormModalProps {
  show: boolean;
  editMode: boolean;
  orderForm: OrderForm;
  users: User[];
  clientsForDropdown: Client[];
  products: Product[];
  loadingClientsForDropdown: boolean;
  onClose: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onProductsChange: (productIds: string[]) => void;
  onReplacementProductsChange: (productIds: string[]) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

const isSpareProduct = (product: Product) => {
  if (typeof product.is_spare_product === "boolean") return product.is_spare_product;
  if (typeof product.is_spare_product === "number") return product.is_spare_product === 1;
  const normalized = String(product.is_spare_product ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const COMPANY_API_CANDIDATES = [
  "http://localhost/raj_communication/api/companys.php",
  "http://localhost/raj_communication/api/companys.php",
];

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

const normalizeUniqueIds = (ids: string[]) =>
  Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

const flattenCompanyProductIds = (companyIds: string[], companyProductMap: Record<string, string[]>) =>
  normalizeUniqueIds(
    companyIds.flatMap((companyId) => companyProductMap[companyId] || []),
  );

type ProductFlowStatus = "pending" | "rajtocom" | "comtoraj" | "deliveryed";
type RepairingStatus = "ready" | "not_ready" | "replacement";

const PRODUCT_FLOW_STATUS_OPTIONS: Array<{ value: ProductFlowStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "rajtocom", label: "RajToCom" },
  { value: "comtoraj", label: "ComToRaj" },
  { value: "deliveryed", label: "Deliveryed" },
];

const normalizeProductFlowStatus = (status: unknown): ProductFlowStatus => {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "rajtocom") return "rajtocom";
  if (normalized === "comtoraj") return "comtoraj";
  if (normalized === "deliveryed") return "deliveryed";
  return "pending";
};

const normalizeProductStatusMap = (value: unknown): Record<string, ProductFlowStatus> => {
  if (!value) return {};

  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return {};
    }
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

  const normalized: Record<string, ProductFlowStatus> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, status]) => {
    const key = productId.trim();
    if (!key) return;
    normalized[key] = normalizeProductFlowStatus(status);
  });

  return normalized;
};

const normalizeRepairingStatus = (status: unknown): RepairingStatus => {
  const normalized = String(status ?? "").trim().toLowerCase().replaceAll(" ", "_");
  if (normalized === "ready") return "ready";
  if (normalized === "replacement") return "replacement";
  return "not_ready";
};

const normalizeRepairingStatusMap = (value: unknown): Record<string, RepairingStatus> => {
  if (!value) return {};
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
    } catch {
      return {};
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  const normalized: Record<string, RepairingStatus> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, status]) => {
    const key = productId.trim();
    if (!key) return;
    normalized[key] = normalizeRepairingStatus(status);
  });
  return normalized;
};

const parseJsonResponseSafely = async <T,>(response: Response): Promise<T | null> => {
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();
  if (!trimmedBody) return null;

  try {
    return JSON.parse(trimmedBody) as T;
  } catch {
    return null;
  }
};

const OrderFormModal = ({ show, editMode, orderForm, users, clientsForDropdown, products, loadingClientsForDropdown, onClose, onChange, onProductsChange, onReplacementProductsChange, onSubmit }: OrderFormModalProps) => {
  void users;
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [replacementSearchTerm, setReplacementSearchTerm] = useState("");
  const [showReplacementDropdown, setShowReplacementDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showReplacementProducts, setShowReplacementProducts] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [companyProductMap, setCompanyProductMap] = useState<Record<string, string[]>>({});
  const [productStatusMap, setProductStatusMap] = useState<Record<string, ProductFlowStatus>>({});
  const [repairingStatusMapState, setRepairingStatusMapState] = useState<Record<string, RepairingStatus>>({});
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [companySelectValue, setCompanySelectValue] = useState("");
  const companySelectRef = useRef<HTMLSelectElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const replacementSearchInputRef = useRef<HTMLInputElement>(null);
  const skipNextProductFocusOpenRef = useRef(false);
  const skipNextReplacementFocusOpenRef = useRef(false);
  const initializedFromOrderRef = useRef(false);

  useEffect(() => {
    if (orderForm.client_id) setSelectedClient(clientsForDropdown.find((c) => c.id.toString() === orderForm.client_id) || null);
    else setSelectedClient(null);
  }, [orderForm.client_id, clientsForDropdown]);
  
  useEffect(() => {
    setClientSearchTerm(selectedClient ? `${selectedClient.full_name} - ${selectedClient.phone}` : "");
  }, [selectedClient]);
  
  useEffect(() => {
    if (!show) {
      setShowClientDropdown(false);
      setShowReplacementProducts(false);
      setShowProductDropdown(false);
      setShowReplacementDropdown(false);
      setProductSearchTerm("");
      setReplacementSearchTerm("");
      setSelectedCompanyIds([]);
      setCompanyProductMap({});
      setProductStatusMap({});
      setRepairingStatusMapState({});
      setActiveCompanyId("");
      setCompanySelectValue("");
      initializedFromOrderRef.current = false;
    }
  }, [show]);
  
  useEffect(() => {
    if (!show || initializedFromOrderRef.current) return;
    
    // Load initial data from orderForm
    const initialCompanyIds = normalizeUniqueIds([
      ...(orderForm.company_ids || []),
      ...(orderForm.company_id ? [orderForm.company_id] : []),
    ]);
    
    const initialProductIds = normalizeUniqueIds(orderForm.product_ids || []);
    
    let initialCompanyProductMap: Record<string, string[]> = {};
    
    // Try to load from company_product_map first
    if (orderForm.company_product_map && Object.keys(orderForm.company_product_map).length > 0) {
      initialCompanyProductMap = { ...orderForm.company_product_map };
    } 
    // Then try companies_products
    else if (orderForm.companies_products && Object.keys(orderForm.companies_products).length > 0) {
      initialCompanyProductMap = { ...orderForm.companies_products };
    }
    // Otherwise initialize from company_ids and product_ids
    else if (initialCompanyIds.length > 0 && initialProductIds.length > 0) {
      initialCompanyProductMap[initialCompanyIds[0]] = initialProductIds;
    }
    
    // Normalize the map to ensure all company IDs have arrays
    const normalizedMap: Record<string, string[]> = {};
    initialCompanyIds.forEach((companyId) => {
      normalizedMap[companyId] = normalizeUniqueIds(initialCompanyProductMap[companyId] || []);
    });
    
    setSelectedCompanyIds(initialCompanyIds);
    setCompanyProductMap(normalizedMap);
    setActiveCompanyId(initialCompanyIds[0] || "");
    setCompanySelectValue("");
    
    // Sync products to parent component
    const allProductIds = flattenCompanyProductIds(initialCompanyIds, normalizedMap);
    const incomingProductStatusMap = normalizeProductStatusMap((orderForm as any).product_status_map);
    const incomingRepairingStatusMap = normalizeRepairingStatusMap((orderForm as any).repairing_status_map);
    const normalizedProductStatusMap: Record<string, ProductFlowStatus> = {};
    const normalizedRepairingStatusMap: Record<string, RepairingStatus> = {};
    allProductIds.forEach((productId) => {
      normalizedProductStatusMap[productId] = normalizeProductFlowStatus(incomingProductStatusMap[productId]);
      normalizedRepairingStatusMap[productId] = normalizeRepairingStatus(incomingRepairingStatusMap[productId]);
    });

    setProductStatusMap(normalizedProductStatusMap);
    setRepairingStatusMapState(normalizedRepairingStatusMap);
    onChange({
      target: { name: "product_status_map", value: JSON.stringify(normalizedProductStatusMap) }
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "repairing_status_map", value: JSON.stringify(normalizedRepairingStatusMap) }
    } as ChangeEvent<HTMLInputElement>);

    if (allProductIds.length > 0 && initialProductIds.length === 0) {
      onProductsChange(allProductIds);
    }
    
    initializedFromOrderRef.current = true;
  }, [orderForm.company_id, orderForm.company_ids, orderForm.company_product_map, orderForm.companies_products, orderForm.product_ids, show, onProductsChange]);
  
  useEffect(() => {
    const hasReplacementProducts =
      orderForm.replacement_product_ids.length > 0 ||
      Boolean(orderForm.replacement_product_id) ||
      Boolean(orderForm.replacement_product_name?.trim());
    setShowReplacementProducts(hasReplacementProducts);
  }, [orderForm.replacement_product_id, orderForm.replacement_product_ids, orderForm.replacement_product_name]);
  
  useEffect(() => {
    if (!show) return;
    let mounted = true;
    const controller = new AbortController();

    const loadCompanies = async () => {
      setLoadingCompanies(true);
      try {
        let loadedRows: Company[] = [];
        for (const url of COMPANY_API_CANDIDATES) {
          try {
            const response = await fetch(url, {
              method: "GET",
              headers: { Accept: "application/json" },
              signal: controller.signal,
            });
            if (!response.ok) continue;
            const payload = await parseJsonResponseSafely<{ success?: boolean; companys?: unknown[] }>(response);
            if (payload?.success) {
              loadedRows = Array.isArray(payload.companys) ? payload.companys.map(normalizeCompany) : [];
              break;
            }
          } catch {
            // try next endpoint candidate
          }
        }
        if (mounted) setCompanies(loadedRows);
      } finally {
        if (mounted) setLoadingCompanies(false);
      }
    };

    void loadCompanies();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [show]);

  const flattenedCompanyProductIds = useMemo(
    () => flattenCompanyProductIds(selectedCompanyIds, companyProductMap),
    [companyProductMap, selectedCompanyIds],
  );
  
  const effectiveProductIds = selectedCompanyIds.length > 0
    ? flattenedCompanyProductIds
    : normalizeUniqueIds(orderForm.product_ids || []);
  
  const filteredProducts = useMemo(() => {
    const search = productSearchTerm.trim().toLowerCase();
    const selectedIds = new Set(effectiveProductIds.map((id) => id.toString()));
    const sourceProducts = products.filter((p) => !isSpareProduct(p) && !selectedIds.has(p.id.toString()));
    if (!search) return sourceProducts.slice(0, 10);
    return sourceProducts.filter((p) => [p.product_name, p.serial_number, p.brand, p.model, p.product_code].some((v) => v?.toLowerCase().includes(search)));
  }, [effectiveProductIds, productSearchTerm, products]);
  
  const filteredClients = useMemo(() => {
    const search = clientSearchTerm.trim().toLowerCase();
    if (!search) return clientsForDropdown;
    return clientsForDropdown
      .filter((client) =>
        [client.full_name, client.phone, client.email]
          .some((value) => value?.toLowerCase().includes(search)),
      );
  }, [clientSearchTerm, clientsForDropdown]);
  
  const filteredReplacementProducts = useMemo(() => {
    const search = replacementSearchTerm.trim().toLowerCase();
    const selectedIds = new Set(orderForm.replacement_product_ids.map((id) => id.toString()));
    const sourceProducts = products.filter((p) => isSpareProduct(p) && !selectedIds.has(p.id.toString()));
    if (!search) return sourceProducts.slice(0, 8);
    return sourceProducts.filter((p) => [p.product_name, p.serial_number, p.brand, p.model, p.product_code].some((v) => v?.toLowerCase().includes(search))).slice(0, 12);
  }, [orderForm.replacement_product_ids, replacementSearchTerm, products]);
  
  const shouldShowProductDropdown = showProductDropdown;
  const shouldShowClientDropdown = showClientDropdown;
  const shouldShowReplacementDropdown = showReplacementDropdown && showReplacementProducts;

  const selectedProducts = useMemo(
    () => effectiveProductIds.map((id) => products.find((p) => p.id.toString() === id)).filter(Boolean) as Product[],
    [effectiveProductIds, products],
  );
  const repairingStatusMap = repairingStatusMapState;
  
  const selectedReplacementProducts = useMemo(() => orderForm.replacement_product_ids.map((id) => products.find((p) => p.id.toString() === id)).filter(Boolean) as Product[], [orderForm.replacement_product_ids, products]);
  
  const selectedCompanies = useMemo(
    () =>
      selectedCompanyIds
        .map((companyId) => companies.find((company) => company.id.toString() === companyId))
        .filter(Boolean) as Company[],
    [companies, selectedCompanyIds],
  );
  
  const selectedCompanyNamesPreview = selectedCompanies.map((company) => company.company_name).join(", ");
  const activeCompany = useMemo(
    () => selectedCompanies.find((company) => company.id.toString() === activeCompanyId) || null,
    [activeCompanyId, selectedCompanies],
  );
  
  const selectedProduct = selectedProducts[0] || null;
  const selectedReplacementProduct = selectedReplacementProducts[0] || null;
  const productPreview = selectedProduct
    ? `${selectedProduct.product_name}${selectedProducts.length > 1 ? ` +${selectedProducts.length - 1}` : ""}`
    : orderForm.product_name || "Choose a product for service";
  const replacementPreview = selectedReplacementProduct
    ? `${selectedReplacementProduct.product_name}${selectedReplacementProducts.length > 1 ? ` +${selectedReplacementProducts.length - 1}` : ""}`
    : "";
  const previewPrimaryItems = selectedProducts.map((product) =>
    product.serial_number ? `${product.product_name} (SN: ${product.serial_number})` : product.product_name,
  );
  const previewReplacementItems = selectedReplacementProducts.map((product) =>
    product.serial_number ? `${product.product_name} (SN: ${product.serial_number})` : product.product_name,
  );
  const previewRepairingItems = selectedProducts.map((product) => {
    const status = (repairingStatusMap[product.id.toString()] || "not_ready").replaceAll("_", " ");
    return `${product.product_name}: ${status}`;
  });
  const estimatedCost = Number.parseFloat(orderForm.estimated_cost || "0") || 0;
  const depositAmount = Number.parseFloat(orderForm.deposit_amount || "0") || 0;
  const finalCost = Number.parseFloat(orderForm.final_cost || orderForm.estimated_cost || "0") || 0;
  const remainingBalance = Math.max(finalCost - depositAmount, 0);
  const completionCount = [orderForm.client_id, orderForm.client_phone, effectiveProductIds.length > 0 ? "filled" : "", orderForm.issue_description, orderForm.estimated_cost, orderForm.priority].filter((v) => String(v || "").trim().length > 0).length;

  const getPriorityColor = (priority: string) => ({ urgent: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#10b981" }[priority] || "#10b981");
  const getProductFlowStatusColor = (status: ProductFlowStatus) => ({ pending: "#f59e0b", rajtocom: "#3b82f6", comtoraj: "#8b5cf6", deliveryed: "#10b981" }[status] || "#f59e0b");
  
  const syncOrderCompanyAndProducts = (companyIds: string[], map: Record<string, string[]>, statusMapOverride?: Record<string, ProductFlowStatus>) => {
    const dedupedCompanyIds = normalizeUniqueIds(companyIds);
    const primaryCompanyId = dedupedCompanyIds[0] || "";
    
    // Get company names for display
    const selectedNames = dedupedCompanyIds
      .map((companyId) => companies.find((company) => company.id.toString() === companyId)?.company_name)
      .filter(Boolean) as string[];
    
    // Calculate all product IDs from the map
    const allProductIds = flattenCompanyProductIds(dedupedCompanyIds, map);
    const sourceProductStatusMap = statusMapOverride || productStatusMap;
    const sourceRepairingStatusMap = repairingStatusMapState;
    const nextProductStatusMap: Record<string, ProductFlowStatus> = {};
    const nextRepairingStatusMap: Record<string, RepairingStatus> = {};
    allProductIds.forEach((productId) => {
      nextProductStatusMap[productId] = normalizeProductFlowStatus(sourceProductStatusMap[productId]);
      nextRepairingStatusMap[productId] = normalizeRepairingStatus(sourceRepairingStatusMap[productId]);
    });
    
    // Update all related fields
    onChange({
      target: { name: "company_id", value: primaryCompanyId }
    } as ChangeEvent<HTMLInputElement>);
    
    onChange({
      target: { name: "company_name", value: selectedNames.join(" || ") }
    } as ChangeEvent<HTMLInputElement>);
    
    onChange({
      target: { name: "company_ids", value: JSON.stringify(dedupedCompanyIds) }
    } as ChangeEvent<HTMLInputElement>);
    
    // Store company_product_map
    onChange({
      target: { name: "company_product_map", value: JSON.stringify(map) }
    } as ChangeEvent<HTMLInputElement>);
    
    // Also store companies_products for backward compatibility
    onChange({
      target: { name: "companies_products", value: JSON.stringify(map) }
    } as ChangeEvent<HTMLInputElement>);

    onChange({
      target: { name: "product_status_map", value: JSON.stringify(nextProductStatusMap) }
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "repairing_status_map", value: JSON.stringify(nextRepairingStatusMap) }
    } as ChangeEvent<HTMLInputElement>);
    
    // Update product list
    setProductStatusMap(nextProductStatusMap);
    setRepairingStatusMapState(nextRepairingStatusMap);
    onProductsChange(allProductIds);
  };
  
  const addProduct = (productId: string) => {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId || effectiveProductIds.includes(normalizedProductId)) return;
    const targetCompanyId = activeCompanyId || selectedCompanyIds[0] || "";
    if (!targetCompanyId) return;
    if (!selectedCompanyIds.includes(targetCompanyId)) {
      setSelectedCompanyIds((prev) => normalizeUniqueIds([...prev, targetCompanyId]));
    }
    if (!activeCompanyId) {
      setActiveCompanyId(targetCompanyId);
    }
    const nextMap: Record<string, string[]> = {
      ...companyProductMap,
      [targetCompanyId]: normalizeUniqueIds([
        ...(companyProductMap[targetCompanyId] || []),
        normalizedProductId,
      ]),
    };
    const nextStatusMap: Record<string, ProductFlowStatus> = {
      ...productStatusMap,
      [normalizedProductId]: normalizeProductFlowStatus(productStatusMap[normalizedProductId]),
    };
    setCompanyProductMap(nextMap);
    setProductStatusMap(nextStatusMap);
    syncOrderCompanyAndProducts(normalizeUniqueIds([...selectedCompanyIds, targetCompanyId]), nextMap, nextStatusMap);
  };
  
  const removeProduct = (productId: string, companyId?: string) => {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) return;
    const nextMap: Record<string, string[]> = { ...companyProductMap };
    if (companyId) {
      nextMap[companyId] = (nextMap[companyId] || []).filter((id) => id !== normalizedProductId);
    } else {
      selectedCompanyIds.forEach((selectedId) => {
        nextMap[selectedId] = (nextMap[selectedId] || []).filter((id) => id !== normalizedProductId);
      });
    }
    setCompanyProductMap(nextMap);
    syncOrderCompanyAndProducts(selectedCompanyIds, nextMap);
  };
  
  const addReplacementProduct = (productId: string) => {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId || orderForm.replacement_product_ids.includes(normalizedProductId)) return;
    onReplacementProductsChange([...orderForm.replacement_product_ids, normalizedProductId]);
  };
  
  const removeReplacementProduct = (productId: string) => {
    onReplacementProductsChange(orderForm.replacement_product_ids.filter((id) => id !== productId));
  };

  const updateProductStatus = (productId: string, status: string) => {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) return;
    const normalizedStatus = normalizeProductFlowStatus(status);
    const nextStatusMap: Record<string, ProductFlowStatus> = {
      ...productStatusMap,
      [normalizedProductId]: normalizedStatus,
    };
    setProductStatusMap(nextStatusMap);
    onChange({
      target: { name: "product_status_map", value: JSON.stringify(nextStatusMap) }
    } as ChangeEvent<HTMLInputElement>);
  };

  const updateRepairingStatus = (productId: string, status: string) => {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) return;
    const normalizedStatus = normalizeRepairingStatus(status);
    const nextStatusMap: Record<string, RepairingStatus> = {
      ...repairingStatusMap,
      [normalizedProductId]: normalizedStatus,
    };
    setRepairingStatusMapState(nextStatusMap);
    onChange({
      target: { name: "repairing_status_map", value: JSON.stringify(nextStatusMap) }
    } as ChangeEvent<HTMLInputElement>);
  };
  
  const addCompany = (companyId: string) => {
    const normalizedCompanyId = companyId.trim();
    if (!normalizedCompanyId) return;
    if (selectedCompanyIds.includes(normalizedCompanyId)) {
      setActiveCompanyId(normalizedCompanyId);
      return;
    }
    const nextCompanyIds = [...selectedCompanyIds, normalizedCompanyId];
    const nextMap: Record<string, string[]> = {
      ...companyProductMap,
      [normalizedCompanyId]: companyProductMap[normalizedCompanyId] || [],
    };
    setSelectedCompanyIds(nextCompanyIds);
    setCompanyProductMap(nextMap);
    setActiveCompanyId(normalizedCompanyId);
    syncOrderCompanyAndProducts(nextCompanyIds, nextMap);
    setCompanySelectValue("");
    window.setTimeout(() => {
      productSearchInputRef.current?.focus();
      setShowProductDropdown(true);
    }, 0);
  };
  
  const removeCompany = (companyId: string) => {
    const nextCompanyIds = selectedCompanyIds.filter((id) => id !== companyId);
    const nextMap: Record<string, string[]> = { ...companyProductMap };
    delete nextMap[companyId];
    setSelectedCompanyIds(nextCompanyIds);
    setCompanyProductMap(nextMap);
    if (activeCompanyId === companyId) {
      setActiveCompanyId(nextCompanyIds[0] || "");
    }
    syncOrderCompanyAndProducts(nextCompanyIds, nextMap);
  };
  
  const clearCompanies = () => {
    setSelectedCompanyIds([]);
    setCompanyProductMap({});
    setActiveCompanyId("");
    onChange({
      target: { name: "company_id", value: "" },
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "company_name", value: "" },
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "company_ids", value: JSON.stringify([]) },
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "company_product_map", value: JSON.stringify({}) },
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "companies_products", value: JSON.stringify({}) },
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "product_status_map", value: JSON.stringify({}) },
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "repairing_status_map", value: JSON.stringify({}) },
    } as ChangeEvent<HTMLInputElement>);
    setProductStatusMap({});
    setRepairingStatusMapState({});
    onProductsChange([]);
  };
  
  const clearAllCompanyProducts = () => {
    const nextMap: Record<string, string[]> = {};
    selectedCompanyIds.forEach((companyId) => {
      nextMap[companyId] = [];
    });
    setCompanyProductMap(nextMap);
    syncOrderCompanyAndProducts(selectedCompanyIds, nextMap);
  };
  
  const handleCompanyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setCompanySelectValue(selectedId);
    if (selectedId) addCompany(selectedId);
  };
  
  const openAddCompany = () => {
    setCompanySelectValue("");
    window.setTimeout(() => {
      companySelectRef.current?.focus();
    }, 0);
  };
  
  const openAddProduct = (companyId?: string) => {
    const targetCompanyId = companyId || activeCompanyId;
    if (!targetCompanyId) return;
    setActiveCompanyId(targetCompanyId);
    window.setTimeout(() => {
      productSearchInputRef.current?.focus();
      setShowProductDropdown(true);
    }, 0);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay-enhanced" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="modal-content-enhanced order-modal-content" initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header-enhanced order-modal-header">
            <div className="modal-header-left">
              <div className="modal-icon-wrapper"><div className="modal-icon-bg"><FiPackage /></div></div>
              <div className="modal-title-enhanced">
                <h2>{editMode ? "Edit Service Order" : "Create New Service Order"}</h2>
                <p>{editMode ? "Refresh order progress, payment details, and service notes in one focused workspace." : "Create a service order with client, product, financial, and repair details in one polished flow."}</p>
              </div>
            </div>
            <motion.button className="close-btn-enhanced" onClick={onClose} whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}><FiX /></motion.button>
          </div>

          <form onSubmit={onSubmit} className="service-form-enhanced order-form-enhanced">
            <div className="order-form-shell">
              <aside className="order-form-aside">
                <div className="order-preview-card">
                  <span className="order-preview-badge">{editMode ? "Live Order Snapshot" : "New Order Snapshot"}</span>
                  <h3>{selectedClient?.full_name || "Select a client"}</h3>
                  <p>{productPreview}</p>
                  {previewPrimaryItems.length > 0 && (
                    <p className="order-preview-products" title={previewPrimaryItems.join(", ")}>
                      Products: {previewPrimaryItems.join(", ")}
                    </p>
                  )}
                  <div className="order-preview-meta">
                    <span>{orderForm.client_phone || "Phone pending"}</span>
                    <span>{selectedCompanyNamesPreview || orderForm.company_name || "No company selected"}</span>
                    <span>{orderForm.estimated_delivery_date || "No delivery date"}</span>
                    {(selectedReplacementProduct || orderForm.replacement_product_name) && (
                      <span>Replacement: {replacementPreview || orderForm.replacement_product_name}</span>
                    )}
                    {previewReplacementItems.length > 0 && (
                      <span title={previewReplacementItems.join(", ")}>
                        Replacement List: {previewReplacementItems.join(", ")}
                      </span>
                    )}
                    {previewRepairingItems.length > 0 && (
                      <span title={previewRepairingItems.join(", ")}>
                        Repairing: {previewRepairingItems.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="order-progress-card">
                  <div className="order-progress-header"><strong>Form completeness</strong><span>{completionCount}/6</span></div>
                  <div className="order-progress-track"><div className="order-progress-fill" style={{ width: `${(completionCount / 6) * 100}%` }} /></div>
                  <p>Client, phone, and product are the essentials. The rest improves repair tracking and billing clarity.</p>
                </div>
                <div className="order-payment-card">
                  <div className="order-payment-card-header"><FiCreditCard /><strong>Financial snapshot</strong></div>
                  <div className="order-payment-metric"><span>Estimated</span><strong>Rs. {estimatedCost.toLocaleString()}</strong></div>
                  <div className="order-payment-metric"><span>Deposit</span><strong className="text-success">Rs. {depositAmount.toLocaleString()}</strong></div>
                  <div className="order-payment-metric"><span>Final</span><strong>Rs. {finalCost.toLocaleString()}</strong></div>
                  <div className="order-payment-divider" />
                  <div className="order-payment-metric total"><span>Balance</span><strong className="text-warning">Rs. {remainingBalance.toLocaleString()}</strong></div>
                </div>
              </aside>

              <div className="order-form-main">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="form-grid-enhanced order-form-grid">
                  <div className="form-group-enhanced full-width order-section-heading"><div className="summary-title">Basic Info</div><p>Identify the customer, device, and service owner clearly.</p></div>

                  <div className="form-group-enhanced">
                    <label className="form-label"><FiUser className="label-icon" /><span>Client Name <span className="required-star">*</span></span></label>
                    {loadingClientsForDropdown ? <div className="loading-dropdown-enhanced"><div className="loading-spinner-small-enhanced"></div><span>Loading clients...</span></div> : <div className="product-search-container">
                      <div className="search-wrapper">
                        <FiSearch className="search-icon-enhanced" />
                        <input type="text" id="client_search" value={clientSearchTerm} onChange={(e) => { setClientSearchTerm(e.target.value); onChange({ target: { name: "client_id", value: "" } } as ChangeEvent<HTMLInputElement>); setShowClientDropdown(true); }} onFocus={() => setShowClientDropdown(true)} placeholder="Search client by name, phone, or email" className="product-search-input" autoComplete="off" />
                        {clientSearchTerm && <button type="button" className="clear-search" onClick={() => { setClientSearchTerm(""); onChange({ target: { name: "client_id", value: "" } } as ChangeEvent<HTMLInputElement>); setShowClientDropdown(false); }}><FiX /></button>}
                      </div>
                      {!clientSearchTerm.trim() && <div className="input-hint info"><FiSearch /> Client list opens automatically</div>}
                      <AnimatePresence>
                        {shouldShowClientDropdown && <motion.div className="product-dropdown-enhanced" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                          {filteredClients.length > 0 ? filteredClients.map((client, index) => <motion.button key={client.id} type="button" className="product-item" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} onClick={() => { setClientSearchTerm(`${client.full_name} - ${client.phone}`); onChange({ target: { name: "client_id", value: client.id.toString() } } as ChangeEvent<HTMLInputElement>); setShowClientDropdown(false); }}>
                            <div className="product-item-icon"><FiUser /></div>
                            <div className="product-item-info">
                              <div className="product-item-name">{client.full_name}</div>
                              <div className="product-item-details">
                                <span className="product-serial">{client.phone}</span>
                                {client.email && <span className="product-brand">{client.email}</span>}
                                {client.city && <span className="product-model">{client.city}</span>}
                              </div>
                            </div>
                            {orderForm.client_id === client.id.toString() && <FiCheck className="product-check" />}
                          </motion.button>) : <div className="no-products"><FiAlertCircle /><span>No matching clients found</span></div>}
                        </motion.div>}
                      </AnimatePresence>
                    </div>}
                    {selectedClient && <div className="selected-info"><div className="info-chip"><FiUsers /><span>{selectedClient.full_name}</span></div>{selectedClient.email && <div className="info-chip"><span>{selectedClient.email}</span></div>}</div>}
                  </div>

                  <div className="form-group-enhanced">
                    <label className="form-label"><FiPhone className="label-icon" /><span>Client Phone <span className="required-star">*</span></span></label>
                    <input type="tel" id="client_phone" name="client_phone" value={orderForm.client_phone} onChange={onChange} placeholder="Will be auto-filled when you select a client" required readOnly={Boolean(orderForm.client_id)} className={`enhanced-input ${orderForm.client_id ? "auto-filled" : ""}`} />
                    {orderForm.client_id && <div className="input-hint success"><FiCheck /> Phone auto-filled from selected client</div>}
                  </div>

                  <div className="form-group-enhanced">
                    <label className="form-label"><FiBriefcase className="label-icon" /><span>Company</span></label>
                    <div className="enhanced-dropdown">
                      <select
                        ref={companySelectRef}
                        id="company_id"
                        name="company_id"
                        value={companySelectValue}
                        onChange={handleCompanyChange}
                        className="enhanced-select"
                        disabled={loadingCompanies}
                      >
                        <option value="">{loadingCompanies ? "Loading companies..." : "Select Company (Optional)"}</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.company_name} {company.product ? `- ${company.product}` : ""}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown className="dropdown-icon" />
                    </div>
                    {selectedCompanies.length > 0 && (
                      <div className="selected-info">
                        <button type="button" className="selected-products-clear" onClick={openAddCompany}>
                          <FiPlus /> Add Company
                        </button>
                        <button type="button" className="selected-products-clear" onClick={() => openAddProduct()}>
                          <FiPlus /> Add Product
                        </button>
                      </div>
                    )}
                    {selectedCompanies.length > 0 && (
                      <div className="selected-products-box">
                        <div className="selected-products-header">
                          <div className="selected-products-title">
                            <strong>Company + Products</strong>
                            <span>{selectedCompanies.length} item{selectedCompanies.length > 1 ? "s" : ""} added</span>
                          </div>
                          <button type="button" className="selected-products-clear" onClick={clearCompanies}>
                            Clear all
                          </button>
                        </div>
                        <div className="selected-products-grid">
                          {selectedCompanies.map((company, index) => (
                            <div
                              key={company.id}
                              className="selected-product-card"
                              onClick={() => setActiveCompanyId(company.id.toString())}
                              style={{
                                borderColor: activeCompanyId === company.id.toString() ? "#3b82f6" : undefined,
                                cursor: "pointer",
                              }}
                            >
                              <div className="selected-product-index">{index + 1}</div>
                              <div className="selected-product-content">
                                <div className="selected-product-name">{company.company_name}</div>
                                <div className="selected-product-meta">
                                  {company.company_code && <span>Code: {company.company_code}</span>}
                                  {company.product && <span>Product: {company.product}</span>}
                                  {company.phone && <span>{company.phone}</span>}
                                </div>
                                <div className="selected-product-meta">
                                  <span>
                                    Products: {
                                      (companyProductMap[company.id.toString()] || [])
                                        .map((productId) => products.find((product) => product.id.toString() === productId)?.product_name)
                                        .filter(Boolean)
                                        .join(", ") || "No products added"
                                    }
                                  </span>
                                </div>
                                <div className="selected-info">
                                  <button type="button" className="selected-products-clear" onClick={(event) => { event.stopPropagation(); openAddProduct(company.id.toString()); }}>
                                    <FiPlus /> Add Product
                                  </button>
                                </div>
                              </div>
                              <button type="button" className="selected-product-remove" onClick={(event) => { event.stopPropagation(); removeCompany(company.id.toString()); }}>
                                <FiX />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="input-hint info"><FiCheck /> Select company first, then click Add Product for that company.</div>
                  </div>

                  <div className="form-group-enhanced">
                    <label className="form-label"><FiPackage className="label-icon" /><span>Product <span className="required-star">*</span></span></label>
                    <div className="input-hint info">
                      <FiCheck /> {activeCompany ? `Adding products for ${activeCompany.company_name}` : "Select a company first, then add products."}
                    </div>
                    <div className="product-search-container">
                      <div className="search-wrapper">
                        <FiSearch className="search-icon-enhanced" />
                        <input ref={productSearchInputRef} type="text" id="product_search" value={productSearchTerm} onChange={(e) => { setProductSearchTerm(e.target.value); setShowProductDropdown(true); }} onFocus={() => { if (skipNextProductFocusOpenRef.current) { skipNextProductFocusOpenRef.current = false; return; } setShowProductDropdown(true); }} onClick={() => { if (skipNextProductFocusOpenRef.current) { skipNextProductFocusOpenRef.current = false; return; } setShowProductDropdown(true); }} placeholder="Type to search products by name, serial, brand, or model" className="product-search-input" autoComplete="off" />
                        {productSearchTerm && <button type="button" className="clear-search" onClick={() => { setProductSearchTerm(""); setShowProductDropdown(false); }}><FiX /></button>}
                      </div>
                      {!productSearchTerm.trim() && <div className="input-hint info"><FiSearch /> Click Add Product or type to search products</div>}
                      <AnimatePresence>
                        {shouldShowProductDropdown && <motion.div className="product-dropdown-enhanced" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                          {filteredProducts.length > 0 ? filteredProducts.map((product, index) => <motion.button key={product.id} type="button" className="product-item" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} onClick={() => { addProduct(product.id.toString()); setProductSearchTerm(""); skipNextProductFocusOpenRef.current = true; setShowProductDropdown(false); productSearchInputRef.current?.blur(); }}>
                            <div className="product-item-icon"><FiPackage /></div>
                            <div className="product-item-info">
                              <div className="product-item-name">{product.product_name}</div>
                              <div className="product-item-details">
                                {product.serial_number && <span className="product-serial">SN: {product.serial_number}</span>}
                                {product.brand && <span className="product-brand">{product.brand}</span>}
                                {product.model && <span className="product-model">{product.model}</span>}
                              </div>
                            </div>
                            {effectiveProductIds.includes(product.id.toString()) && <FiCheck className="product-check" />}
                          </motion.button>) : <div className="no-products"><FiAlertCircle /><span>No matching products found</span></div>}
                        </motion.div>}
                      </AnimatePresence>
                    </div>
                    {selectedProducts.length > 0 ? (
                      <div className="selected-products-box">
                        <div className="selected-products-header">
                          <div className="selected-products-title">
                            <strong>Selected Products</strong>
                            <span>{selectedProducts.length} item{selectedProducts.length > 1 ? "s" : ""} added</span>
                          </div>
                          <button type="button" className="selected-products-clear" onClick={clearAllCompanyProducts}>
                            Clear all
                          </button>
                        </div>
                        <div className="selected-products-grid">
                          {selectedProducts.map((product, index) => (
                            <div key={product.id} className="selected-product-card">
                              <div className="selected-product-index">{index + 1}</div>
                              <div className="selected-product-content">
                                <div className="selected-product-name">{product.product_name}</div>
                                <div className="selected-product-meta">
                                  {product.product_code && <span>Code: {product.product_code}</span>}
                                  {product.serial_number && <span>SN: {product.serial_number}</span>}
                                  {product.brand && <span>{product.brand}</span>}
                                  {product.model && <span>{product.model}</span>}
                                </div>
                                <div className="enhanced-dropdown" style={{ marginTop: "10px" }}>
                                  <select
                                    value={productStatusMap[product.id.toString()] || "pending"}
                                    onChange={(e) => updateProductStatus(product.id.toString(), e.target.value)}
                                    className="enhanced-select"
                                    style={{ borderLeftColor: getProductFlowStatusColor(productStatusMap[product.id.toString()] || "pending") }}
                                  >
                                    {PRODUCT_FLOW_STATUS_OPTIONS.map((statusOption) => (
                                      <option key={statusOption.value} value={statusOption.value}>
                                        {statusOption.label}
                                      </option>
                                    ))}
                                  </select>
                                  <FiChevronDown className="dropdown-icon" />
                                </div>
                                <div className="enhanced-dropdown" style={{ marginTop: "10px" }}>
                                  <select
                                    value={repairingStatusMap[product.id.toString()] || "not_ready"}
                                    onChange={(e) => updateRepairingStatus(product.id.toString(), e.target.value)}
                                    className="enhanced-select"
                                  >
                                    <option value="ready">Ready</option>
                                    <option value="not_ready">Not ready</option>
                                    <option value="replacement">Replacement</option>
                                  </select>
                                  <FiChevronDown className="dropdown-icon" />
                                </div>
                              </div>
                              <button type="button" className="selected-product-remove" onClick={() => removeProduct(product.id.toString())}>
                                <FiX />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="input-hint info"><FiCheck /> Select at least one product</div>
                    )}
                  </div>

                  <div className="form-group-enhanced">
                    <label className="form-label"><FiPackage className="label-icon" /><span>Replacement Product</span></label>
                    <label className="order-replacement-toggle">
                      <input
                        type="checkbox"
                        checked={showReplacementProducts}
                        onChange={(e) => {
                          setShowReplacementProducts(e.target.checked);
                          setShowReplacementDropdown(e.target.checked);
                          if (!e.target.checked) {
                            setReplacementSearchTerm("");
                            onReplacementProductsChange([]);
                          }
                        }}
                      />
                      <span className="order-replacement-toggle-box">
                        <FiCheck />
                      </span>
                      <span className="order-replacement-toggle-copy">
                        <strong>Replacement Product</strong>
                        <small>{showReplacementProducts ? "Showing spare products only. You can add multiple items." : "Turn on to pick from spare products"}</small>
                      </span>
                    </label>
                    {showReplacementProducts && (
                      <div className="product-search-container">
                        <div className="search-wrapper">
                          <FiSearch className="search-icon-enhanced" />
                          <input ref={replacementSearchInputRef} type="text" id="replacement_product_search" value={replacementSearchTerm} onChange={(e) => { setReplacementSearchTerm(e.target.value); setShowReplacementDropdown(true); }} onFocus={() => { if (skipNextReplacementFocusOpenRef.current) { skipNextReplacementFocusOpenRef.current = false; return; } setShowReplacementDropdown(true); }} onClick={() => setShowReplacementDropdown(true)} placeholder="Search spare products by name, serial, brand, or model" className="product-search-input" autoComplete="off" />
                          {replacementSearchTerm && <button type="button" className="clear-search" onClick={() => { setReplacementSearchTerm(""); setShowReplacementDropdown(false); }}><FiX /></button>}
                        </div>
                        <div className="input-hint info">
                          <FiCheck /> Spare products only are shown. Select one, then click again to add more.
                        </div>
                        <AnimatePresence>
                          {shouldShowReplacementDropdown && <motion.div className="product-dropdown-enhanced" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            {filteredReplacementProducts.length > 0 ? filteredReplacementProducts.map((product, index) => <motion.button key={product.id} type="button" className="product-item" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} onClick={() => { addReplacementProduct(product.id.toString()); setReplacementSearchTerm(""); skipNextReplacementFocusOpenRef.current = true; setShowReplacementDropdown(false); replacementSearchInputRef.current?.blur(); }}>
                              <div className="product-item-icon"><FiPackage /></div>
                              <div className="product-item-info">
                                <div className="product-item-name">{product.product_name}</div>
                                <div className="product-item-details">
                                  {product.serial_number && <span className="product-serial">SN: {product.serial_number}</span>}
                                  {product.brand && <span className="product-brand">{product.brand}</span>}
                                  {product.model && <span className="product-model">{product.model}</span>}
                                  <span className="product-brand">Spare</span>
                                </div>
                              </div>
                              {orderForm.replacement_product_ids.includes(product.id.toString()) && <FiCheck className="product-check" />}
                            </motion.button>) : <div className="no-products"><FiAlertCircle /><span>No matching spare products found</span></div>}
                          </motion.div>}
                        </AnimatePresence>
                      </div>
                    )}
                    {selectedReplacementProducts.length > 0 && (
                      <div className="selected-products-box replacement">
                        <div className="selected-products-header">
                          <div className="selected-products-title">
                            <strong>Replacement Products</strong>
                            <span>{selectedReplacementProducts.length} item{selectedReplacementProducts.length > 1 ? "s" : ""} selected</span>
                          </div>
                          <button type="button" className="selected-products-clear" onClick={() => onReplacementProductsChange([])}>
                            Clear all
                          </button>
                        </div>
                        <div className="selected-products-grid">
                          {selectedReplacementProducts.map((product, index) => (
                            <div key={product.id} className="selected-product-card">
                              <div className="selected-product-index">{index + 1}</div>
                              <div className="selected-product-content">
                                <div className="selected-product-name">{product.product_name}</div>
                                <div className="selected-product-meta">
                                  {product.product_code && <span>Code: {product.product_code}</span>}
                                  {product.serial_number && <span>SN: {product.serial_number}</span>}
                                  {product.brand && <span>{product.brand}</span>}
                                  {product.model && <span>{product.model}</span>}
                                  <span>Spare</span>
                                </div>
                              </div>
                              <button type="button" className="selected-product-remove" onClick={() => removeReplacementProduct(product.id.toString())}>
                                <FiX />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group-enhanced">
                    <label className="form-label"><FiBriefcase className="label-icon" /><span>Service Type</span></label>
                    <div className="enhanced-dropdown">
                      <select id="service_type" name="service_type" value={orderForm.service_type} onChange={onChange} className="enhanced-select">
                        <option value="general">General</option>
                        <option value="repair">Repair</option>
                        <option value="sales">Sales</option>
                        <option value="water">Water</option>
                        <option value="inverter">Inverter</option>
                      </select>
                      <FiChevronDown className="dropdown-icon" />
                    </div>
                    <div className="input-hint info"><FiCheck /> Used by income, salary, and expense reporting.</div>
                  </div>

                  <div className="form-group-enhanced">
                    <label className="form-label"><FiClock className="label-icon" /><span>Warranty Status</span></label>
                    <div className="enhanced-dropdown"><select id="warranty_status" name="warranty_status" value={orderForm.warranty_status} onChange={onChange} className="enhanced-select"><option value="in_warranty">In Warranty</option><option value="extended_warranty">Extended Warranty</option><option value="out_of_warranty">Out of Warranty</option></select><FiChevronDown className="dropdown-icon" /></div>
                  </div>

                  <div className="form-group-enhanced">
                    <label className="form-label"><FiStar className="label-icon" /><span>Priority Level</span></label>
                    <div className="enhanced-dropdown"><select id="priority" name="priority" value={orderForm.priority} onChange={onChange} className="enhanced-select" style={{ borderLeftColor: getPriorityColor(orderForm.priority) }}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select><FiChevronDown className="dropdown-icon" /></div>
                    <div className="priority-indicator" style={{ background: getPriorityColor(orderForm.priority) }} />
                  </div>

                  <div className="form-group-enhanced">
                    <label className="form-label"><FiCalendar className="label-icon" /><span>Estimated Delivery</span></label>
                    <input type="date" id="estimated_delivery_date" name="estimated_delivery_date" value={orderForm.estimated_delivery_date} onChange={onChange} className="enhanced-input" min={new Date().toISOString().split("T")[0]} />
                  </div>

                  <div className="form-group-enhanced full-width order-section-heading"><div className="summary-title">Financial</div><p>Capture pricing, deposits, and payment status with a clearer breakdown.</p></div>

                  <div className="form-group-enhanced"><label className="form-label"><FiDollarSign className="label-icon" /><span>Estimated Cost</span></label><div className="currency-input"><span className="currency-symbol">Rs.</span><input type="number" id="estimated_cost" name="estimated_cost" value={orderForm.estimated_cost} onChange={onChange} placeholder="0.00" min="0" step="0.01" className="enhanced-input currency-field" /></div></div>
                  <div className="form-group-enhanced"><label className="form-label"><FiCreditCard className="label-icon" /><span>Deposit Amount</span></label><div className="currency-input"><span className="currency-symbol">Rs.</span><input type="number" id="deposit_amount" name="deposit_amount" value={orderForm.deposit_amount} onChange={onChange} placeholder="0.00" min="0" step="0.01" className="enhanced-input currency-field" /></div><div className="input-hint info"><FiCheck /> Advance payment received, if any</div></div>
                  <div className="form-group-enhanced"><label className="form-label"><FiDollarSign className="label-icon" /><span>Final Cost</span></label><div className="currency-input"><span className="currency-symbol">Rs.</span><input type="number" id="final_cost" name="final_cost" value={orderForm.final_cost} onChange={onChange} placeholder="0.00" min="0" step="0.01" className="enhanced-input currency-field" /></div></div>
                  <div className="form-group-enhanced"><label className="form-label"><FiCreditCard className="label-icon" /><span>Payment Status</span></label><div className="enhanced-dropdown"><select id="payment_status" name="payment_status" value={orderForm.payment_status === "partial" ? "partially_paid" : orderForm.payment_status} onChange={onChange} className="enhanced-select"><option value="pending">Pending</option><option value="paid">Paid</option><option value="partially_paid">Partially Paid</option><option value="refunded">Refunded</option></select><FiChevronDown className="dropdown-icon" /></div></div>
                  <div className="financial-summary order-financial-summary"><div className="summary-title">Payment Summary</div><div className="summary-item"><span>Estimated Cost:</span><strong>Rs. {estimatedCost.toLocaleString()}</strong></div><div className="summary-item"><span>Deposit Paid:</span><strong className="text-success">- Rs. {depositAmount.toLocaleString()}</strong></div><div className="summary-divider"></div><div className="summary-item total"><span>Remaining Balance:</span><strong className="text-warning">Rs. {remainingBalance.toLocaleString()}</strong></div></div>

                  <div className="form-group-enhanced full-width order-section-heading"><div className="summary-title">Details & Notes</div><p>Describe the issue well so technicians and front-desk staff stay aligned.</p></div>
                  <div className="form-group-enhanced full-width"><label className="form-label"><FiAlertCircle className="label-icon" /><span>Issue Description</span></label><textarea id="issue_description" name="issue_description" value={orderForm.issue_description} onChange={onChange} placeholder="Describe the issue in detail. Include symptoms, user-reported problems, or any visible faults..." rows={5} className="enhanced-textarea" /><div className="char-count">{orderForm.issue_description?.length || 0} characters</div></div>
                  <div className="form-group-enhanced full-width"><label className="form-label"><FiPackage className="label-icon" /><span>Additional Notes</span></label><textarea id="notes" name="notes" value={orderForm.notes} onChange={onChange} placeholder="Special instructions, promised accessories, approval notes, or internal comments..." rows={4} className="enhanced-textarea" /></div>
                </motion.div>
              </div>
            </div>

            <div className="form-actions-enhanced order-form-actions">
              <input type="hidden" name="product_status_map" value={JSON.stringify(productStatusMap)} />
              <input type="hidden" name="repairing_status_map" value={JSON.stringify(repairingStatusMapState)} />
              <div className="order-form-actions-note">Required: client, phone, and product. The remaining fields help with service quality, internal clarity, and billing.</div>
              <div className="order-form-actions-buttons">
                <motion.button type="button" className="btn-secondary-enhanced" onClick={onClose} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancel</motion.button>
                <motion.button type="submit" className="btn-primary-enhanced" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><FiSave />{editMode ? "Update Order" : "Create Order"}</motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderFormModal;
