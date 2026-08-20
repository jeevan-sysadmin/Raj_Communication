import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertCircle, FiBriefcase, FiCalendar, FiCheck, FiChevronDown, FiClock, FiCreditCard, FiDollarSign, FiLoader, FiPackage, FiPhone, FiPlus, FiSave, FiSearch, FiStar, FiUser, FiUsers, FiX } from "react-icons/fi";
import type { Client, Company, OrderForm, Product, User } from "../types";
import { buildApiUrl } from "../../../config/runtime";

interface OrderFormModalProps {
  show: boolean;
  editMode: boolean;
  isSubmitting?: boolean;
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
  buildApiUrl("companys.php"),
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

const normalizeNames = (value: unknown) => {
  const rawValues =
    Array.isArray(value)
      ? value
      : typeof value === "string"
        ? (() => {
            const trimmed = value.trim();
            if (!trimmed) return [];
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) return parsed;
            } catch {
              // keep fallback below
            }
            return trimmed.includes("||") ? trimmed.split("||") : trimmed.split(",");
          })()
        : [];

  return Array.from(
    new Set(
      rawValues
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean),
    ),
  );
};

const flattenCompanyProductIds = (companyIds: string[], companyProductMap: Record<string, string[]>) =>
  normalizeUniqueIds(
    companyIds.flatMap((companyId) => companyProductMap[companyId] || []),
  );

const orderCompanyIdsByProductSequence = (
  companyIds: string[],
  companyProductMap: Record<string, string[]>,
  productIds: string[],
) => {
  const dedupedCompanyIds = normalizeUniqueIds([
    ...companyIds,
    ...Object.keys(companyProductMap || {}),
  ]);
  if (dedupedCompanyIds.length <= 1) return dedupedCompanyIds;

  const companyIndexMap = new Map(dedupedCompanyIds.map((companyId, index) => [companyId, index]));
  const firstProductIndexByCompany = new Map<string, number>();

  productIds.forEach((productId, productIndex) => {
    const companyId = dedupedCompanyIds.find((candidateCompanyId) =>
      (companyProductMap[candidateCompanyId] || []).includes(productId),
    );
    if (!companyId || firstProductIndexByCompany.has(companyId)) return;
    firstProductIndexByCompany.set(companyId, productIndex);
  });

  return [...dedupedCompanyIds].sort((left, right) => {
    const leftIndex = firstProductIndexByCompany.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = firstProductIndexByCompany.get(right) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return (companyIndexMap.get(left) ?? 0) - (companyIndexMap.get(right) ?? 0);
  });
};

const buildCompanyProductNameMap = (
  companyIds: string[],
  companyProductMap: Record<string, string[]>,
  companies: Company[],
  products: Product[],
) =>
  Object.fromEntries(
    companyIds.map((companyId) => {
      const company = companies.find((item) => item.id.toString() === companyId);
      const productNames = (companyProductMap[companyId] || [])
        .map((productId) => products.find((product) => product.id.toString() === productId)?.product_name || `Product #${productId}`);
      return [
        companyId,
        {
          company_name: company?.company_name || `Company #${companyId}`,
          product_names: productNames,
        },
      ];
    }),
  );

const parseCompanyProductNameMap = (
  value: unknown,
): Record<string, { company_name?: string; product_names?: string[] | string }> => {
  if (!value) return {};
  let parsed = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return {};
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  return parsed as Record<string, { company_name?: string; product_names?: string[] | string }>;
};

interface CompanyProductDisplayEntry {
  productId?: string;
  label: string;
  serialNumber: string;
  code: string;
  brand: string;
  model: string;
  quantity: number;
  isResolvedFromCatalog: boolean;
}

type ProductFlowStatus = "pending" | "rajtocom" | "comtoraj" | "deliveryed";
type RepairingStatus = "ready" | "not_ready" | "replacement";
type AccessoryType = "without_box" | "with_box";
type HandoverType = "inhand" | "courier" | "parcelservice";

const PRODUCT_FLOW_STATUS_OPTIONS: Array<{ value: ProductFlowStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "rajtocom", label: "RajToCom" },
  { value: "comtoraj", label: "ComToRaj" },
  { value: "deliveryed", label: "Deliveryed" },
];

const DELIVERY_TYPE_OPTIONS: Array<{ value: HandoverType; label: string }> = [
  { value: "inhand", label: "In Hand" },
  { value: "courier", label: "Courier" },
  { value: "parcelservice", label: "Parcel Service" },
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

const normalizeProductStatusDatesMap = (
  value: unknown,
): Record<string, { pending?: string; rajtocom?: string; comtoraj?: string; deliveryed?: string }> => {
  if (!value) return {};

  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
    } catch {
      const trimmed = value.trim();
      const legacyMatch = trimmed.match(/^\{\s*"(\d+)"\s*\.\s*(\d+)\s*\}$/);
      if (!legacyMatch) return {};
      parsed = { [legacyMatch[1]]: Number.parseInt(legacyMatch[2], 10) };
    }
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

  const normalized: Record<string, { pending?: string; rajtocom?: string; comtoraj?: string; deliveryed?: string }> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, dates]) => {
    const key = productId.trim();
    if (!key || typeof dates !== "object" || dates === null || Array.isArray(dates)) return;
    const row = dates as Record<string, unknown>;
    normalized[key] = {
      pending: row.pending ? String(row.pending) : "",
      rajtocom: row.rajtocom ? String(row.rajtocom) : "",
      comtoraj: row.comtoraj ? String(row.comtoraj) : "",
      deliveryed: row.deliveryed ? String(row.deliveryed) : "",
    };
  });

  return normalized;
};

const getIndiaTimestampString = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

const normalizeIssueDescriptionMap = (value: unknown): Record<string, string> => {
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
  const normalized: Record<string, string> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, text]) => {
    const key = productId.trim();
    if (!key) return;
    normalized[key] = String(text ?? "").trim();
  });
  return normalized;
};

const normalizeAccessoryType = (value: unknown): AccessoryType | "" => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "without_box" || normalized === "withoutbox") return "without_box";
  if (normalized === "with_box" || normalized === "withbox") return "with_box";
  return "";
};

const normalizeAccessoryTypeMap = (value: unknown): Record<string, AccessoryType> => {
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
  const normalized: Record<string, AccessoryType> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, accessory]) => {
    const key = productId.trim();
    const normalizedAccessory = normalizeAccessoryType(accessory);
    if (!key || !normalizedAccessory) return;
    normalized[key] = normalizedAccessory;
  });
  return normalized;
};

const normalizeResultTextMap = (value: unknown): Record<string, string> => normalizeIssueDescriptionMap(value);

const normalizeProductQuantityMap = (value: unknown): Record<string, number> => {
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
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const normalized: Record<string, number> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, qty]) => {
    const key = productId.trim();
    if (!key) return;
    normalized[key] = Math.max(1, Number.parseInt(String(qty ?? "1"), 10) || 1);
  });
  return normalized;
};

const normalizeHandoverTypeValue = (value: unknown): HandoverType => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "courier") return "courier";
  if (normalized === "parcelservice" || normalized === "parcel_service" || normalized === "delivery") return "parcelservice";
  return "inhand";
};

const normalizeHandoverTypeMap = (value: unknown): Record<string, HandoverType> => {
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
  const normalized: Record<string, HandoverType> = {};
  Object.entries(parsed as Record<string, unknown>).forEach(([productId, handoverType]) => {
    const key = productId.trim();
    if (!key) return;
    normalized[key] = normalizeHandoverTypeValue(handoverType);
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

const OrderFormModal = ({ show, editMode, isSubmitting = false, orderForm, users, clientsForDropdown, products, loadingClientsForDropdown, onClose, onChange, onProductsChange, onReplacementProductsChange, onSubmit }: OrderFormModalProps) => {
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
  const [issueDescriptionMapState, setIssueDescriptionMapState] = useState<Record<string, string>>({});
  const [accessoryTypeMapState, setAccessoryTypeMapState] = useState<Record<string, AccessoryType>>({});
  const [resultTextMapState, setResultTextMapState] = useState<Record<string, string>>({});
  const [handoverTypeMapState, setHandoverTypeMapState] = useState<Record<string, HandoverType>>({});
  const [productQuantityMapState, setProductQuantityMapState] = useState<Record<string, number>>({});
  const formRef = useRef<HTMLFormElement | null>(null);
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
    if (selectedClient) {
      setClientSearchTerm(`${selectedClient.full_name} - ${selectedClient.phone}`);
      return;
    }
    if (editMode && String(orderForm.client_name || "").trim()) {
      setClientSearchTerm(String(orderForm.client_name || "").trim());
      return;
    }
    setClientSearchTerm("");
  }, [selectedClient, editMode, orderForm.client_name]);
  
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
      setIssueDescriptionMapState({});
      setAccessoryTypeMapState({});
      setResultTextMapState({});
      setProductQuantityMapState({});
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
    
    const orderedCompanyIds = orderCompanyIdsByProductSequence(initialCompanyIds, normalizedMap, initialProductIds);
    setSelectedCompanyIds(orderedCompanyIds);
    setCompanyProductMap(normalizedMap);
    setActiveCompanyId(orderedCompanyIds[0] || "");
    setCompanySelectValue("");
    
    // Sync products to parent component
    const allProductIds = flattenCompanyProductIds(orderedCompanyIds, normalizedMap);
    const incomingProductStatusMap = normalizeProductStatusMap((orderForm as any).product_status_map);
    const incomingRepairingStatusMap = normalizeRepairingStatusMap((orderForm as any).repairing_status_map);
    const incomingIssueDescriptionMap = normalizeIssueDescriptionMap((orderForm as any).issue_description_map);
    const incomingAccessoryTypeMap = normalizeAccessoryTypeMap((orderForm as any).accessory_type_map);
    const incomingResultTextMap = normalizeResultTextMap((orderForm as any).result_text_map);
    const incomingHandoverTypeMap = normalizeHandoverTypeMap((orderForm as any).handover_type_map);
    const incomingProductQuantityMap = normalizeProductQuantityMap((orderForm as any).product_quantity_map);
    const normalizedProductStatusMap: Record<string, ProductFlowStatus> = {};
    const normalizedRepairingStatusMap: Record<string, RepairingStatus> = {};
    const normalizedIssueDescriptionMap: Record<string, string> = {};
    const normalizedAccessoryTypeMap: Record<string, AccessoryType> = {};
    const normalizedResultTextMap: Record<string, string> = {};
    const normalizedHandoverTypeMap: Record<string, HandoverType> = {};
    const normalizedProductQuantityMap: Record<string, number> = {};
    allProductIds.forEach((productId) => {
      normalizedProductStatusMap[productId] = normalizeProductFlowStatus(incomingProductStatusMap[productId]);
      normalizedRepairingStatusMap[productId] = normalizeRepairingStatus(incomingRepairingStatusMap[productId]);
      normalizedIssueDescriptionMap[productId] = String(incomingIssueDescriptionMap[productId] || "").trim();
      const accessoryValue = normalizeAccessoryType(incomingAccessoryTypeMap[productId]);
      if (accessoryValue) {
        normalizedAccessoryTypeMap[productId] = accessoryValue;
      }
      normalizedResultTextMap[productId] = String(incomingResultTextMap[productId] || "").trim();
      normalizedHandoverTypeMap[productId] = normalizeHandoverTypeValue(incomingHandoverTypeMap[productId] || (orderForm as any).handover_type);
      normalizedProductQuantityMap[productId] = Math.max(1, Number(incomingProductQuantityMap[productId] || 1));
    });

    setProductStatusMap(normalizedProductStatusMap);
    setRepairingStatusMapState(normalizedRepairingStatusMap);
    setIssueDescriptionMapState(normalizedIssueDescriptionMap);
    setAccessoryTypeMapState(normalizedAccessoryTypeMap);
    setResultTextMapState(normalizedResultTextMap);
    setHandoverTypeMapState(normalizedHandoverTypeMap);
    setProductQuantityMapState(normalizedProductQuantityMap);
    onChange({
      target: { name: "product_status_map", value: JSON.stringify(normalizedProductStatusMap) }
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "repairing_status_map", value: JSON.stringify(normalizedRepairingStatusMap) }
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "issue_description_map", value: JSON.stringify(normalizedIssueDescriptionMap) }
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "accessory_type_map", value: JSON.stringify(normalizedAccessoryTypeMap) }
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "result_text_map", value: JSON.stringify(normalizedResultTextMap) }
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "handover_type_map", value: JSON.stringify(normalizedHandoverTypeMap) }
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "product_quantity_map", value: JSON.stringify(normalizedProductQuantityMap) }
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
  const companyProductNameMap = useMemo(
    () => parseCompanyProductNameMap(orderForm.company_product_name_map),
    [orderForm.company_product_name_map],
  );
  const selectedCompanyProductGroups = useMemo(
    () =>
      selectedCompanies.map((company) => ({
        company,
        entries: (() => {
          const mappedIds = companyProductMap[company.id.toString()] || [];
          const idEntries: CompanyProductDisplayEntry[] = mappedIds.map((productId) => {
            const matchedProduct = products.find((product) => product.id.toString() === productId);
            return {
              productId,
              label: matchedProduct?.product_name || `Product #${productId}`,
              serialNumber: matchedProduct?.serial_number || "",
              code: matchedProduct?.product_code || "",
              brand: matchedProduct?.brand || "",
              model: matchedProduct?.model || "",
              quantity: productQuantityMapState[productId] ?? 1,
              isResolvedFromCatalog: Boolean(matchedProduct),
            };
          });
          const existingLabels = new Set(
            idEntries.map((entry) => entry.label.trim().toLowerCase()).filter(Boolean),
          );
          const nameOnlyEntries: CompanyProductDisplayEntry[] = normalizeNames(
            companyProductNameMap[company.id.toString()]?.product_names || [],
          )
            .filter((productName: string) => !existingLabels.has(productName.trim().toLowerCase()))
            .map((productName: string) => {
              const matchedProduct = products.find(
                (product) => product.product_name.trim().toLowerCase() === productName.trim().toLowerCase(),
              );
              return {
                productId: matchedProduct?.id?.toString(),
                label: productName,
                serialNumber: matchedProduct?.serial_number || "",
                code: matchedProduct?.product_code || "",
                brand: matchedProduct?.brand || "",
                model: matchedProduct?.model || "",
                quantity: matchedProduct?.id ? (productQuantityMapState[matchedProduct.id.toString()] ?? 1) : 1,
                isResolvedFromCatalog: Boolean(matchedProduct),
              };
            });
          return [...idEntries, ...nameOnlyEntries];
        })(),
      })),
    [companyProductMap, companyProductNameMap, productQuantityMapState, products, selectedCompanies],
  );
  const selectedProductDisplayEntries = useMemo(
    () =>
      selectedCompanyProductGroups.length > 0
        ? selectedCompanyProductGroups.flatMap(({ entries }) => entries)
        : selectedProducts.map((product) => ({
            productId: product.id.toString(),
            label: product.product_name,
            serialNumber: product.serial_number || "",
            code: product.product_code || "",
            brand: product.brand || "",
            model: product.model || "",
            quantity: productQuantityMapState[product.id.toString()] ?? 1,
            isResolvedFromCatalog: true,
          })),
    [productQuantityMapState, selectedCompanyProductGroups, selectedProducts],
  );
  
  const selectedCompanyNamesPreview = selectedCompanies.map((company) => company.company_name).join(", ");
  const activeCompany = useMemo(
    () => selectedCompanies.find((company) => company.id.toString() === activeCompanyId) || null,
    [activeCompanyId, selectedCompanies],
  );
  
  const selectedReplacementProduct = selectedReplacementProducts[0] || null;
  const selectedProductDisplayCount = selectedProductDisplayEntries.length;
  const selectedProductDisplay = selectedProductDisplayEntries[0] || null;
  const productPreview = selectedProductDisplay
    ? `${selectedProductDisplay.label}${selectedProductDisplayCount > 1 ? ` +${selectedProductDisplayCount - 1}` : ""}`
    : orderForm.product_name || "Choose a product for service";
  const replacementPreview = selectedReplacementProduct
    ? `${selectedReplacementProduct.product_name}${selectedReplacementProducts.length > 1 ? ` +${selectedReplacementProducts.length - 1}` : ""}`
    : "";
  const previewPrimaryItems = selectedProductDisplayEntries.map((product) =>
    product.serialNumber ? `${product.label} (SN: ${product.serialNumber})` : product.label,
  );
  const previewCompanyItems = selectedCompanyProductGroups.map(({ company, entries }) => ({
    companyName: company.company_name,
    productLines: entries.map((product) =>
      product.serialNumber ? `${product.label} (SN: ${product.serialNumber})` : product.label,
    ),
  }));
  const previewReplacementItems = selectedReplacementProducts.map((product) =>
    product.serial_number ? `${product.product_name} (SN: ${product.serial_number})` : product.product_name,
  );
  const previewRepairingItems = selectedProductDisplayEntries.map((product) => {
    if (!product.productId) return `${product.label}: saved in order`;
    const status = (repairingStatusMap[product.productId] || "not_ready").replaceAll("_", " ");
    return `${product.label}: ${status}`;
  });
  const estimatedCost = Number.parseFloat(orderForm.estimated_cost || "0") || 0;
  const depositAmount = Number.parseFloat(orderForm.deposit_amount || "0") || 0;
  const finalCost = Number.parseFloat(orderForm.final_cost || orderForm.estimated_cost || "0") || 0;
  const remainingBalance = Math.max(finalCost - depositAmount, 0);
  const completionCount = [orderForm.client_id, orderForm.client_phone, effectiveProductIds.length > 0 ? "filled" : "",  orderForm.estimated_cost, orderForm.priority].filter((v) => String(v || "").trim().length > 0).length;

  const getPriorityColor = (priority: string) => ({ urgent: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#10b981" }[priority] || "#10b981");
  const getProductFlowStatusColor = (status: ProductFlowStatus) => ({ pending: "#f59e0b", rajtocom: "#3b82f6", comtoraj: "#8b5cf6", deliveryed: "#10b981" }[status] || "#f59e0b");
  
  const syncOrderCompanyAndProducts = (companyIds: string[], map: Record<string, string[]>, statusMapOverride?: Record<string, ProductFlowStatus>) => {
    const normalizedCompanyIds = normalizeUniqueIds(companyIds);
    const dedupedCompanyIds = orderCompanyIdsByProductSequence(
      normalizedCompanyIds,
      map,
      flattenCompanyProductIds(normalizedCompanyIds, map),
    );
    const primaryCompanyId = dedupedCompanyIds[0] || "";
    
    // Get company names for display
    const selectedNames = dedupedCompanyIds
      .map((companyId) => companies.find((company) => company.id.toString() === companyId)?.company_name)
      .filter(Boolean) as string[];
    
    // Calculate all product IDs from the map
    const allProductIds = flattenCompanyProductIds(dedupedCompanyIds, map);
    const sourceProductStatusMap = statusMapOverride || productStatusMap;
    const sourceRepairingStatusMap = repairingStatusMapState;
    const sourceIssueDescriptionMap = issueDescriptionMapState;
    const sourceProductQuantityMap = productQuantityMapState;
    const nextProductStatusMap: Record<string, ProductFlowStatus> = {};
    const nextRepairingStatusMap: Record<string, RepairingStatus> = {};
    const nextIssueDescriptionMap: Record<string, string> = {};
    const nextProductQuantityMap: Record<string, number> = {};
    allProductIds.forEach((productId) => {
      nextProductStatusMap[productId] = normalizeProductFlowStatus(sourceProductStatusMap[productId]);
      nextRepairingStatusMap[productId] = normalizeRepairingStatus(sourceRepairingStatusMap[productId]);
      nextIssueDescriptionMap[productId] = String(sourceIssueDescriptionMap[productId] || "").trim();
      nextProductQuantityMap[productId] = Math.max(1, Number(sourceProductQuantityMap[productId] || 1));
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

    onChange({
      target: {
        name: "company_product_name_map",
        value: JSON.stringify(buildCompanyProductNameMap(dedupedCompanyIds, map, companies, products)),
      }
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
    onChange({
      target: { name: "issue_description_map", value: JSON.stringify(nextIssueDescriptionMap) }
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "product_quantity_map", value: JSON.stringify(nextProductQuantityMap) }
    } as ChangeEvent<HTMLInputElement>);
    
    // Update product list
    setProductStatusMap(nextProductStatusMap);
    setRepairingStatusMapState(nextRepairingStatusMap);
    setIssueDescriptionMapState(nextIssueDescriptionMap);
    setProductQuantityMapState(nextProductQuantityMap);
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
    const currentTimestamp = getIndiaTimestampString();
    const existingDatesMap = normalizeProductStatusDatesMap((orderForm as unknown as { product_status_dates_map?: unknown }).product_status_dates_map);
    const currentDates = existingDatesMap[normalizedProductId] || {};
    const nextDatesMap = {
      ...existingDatesMap,
      [normalizedProductId]: {
        pending: currentDates.pending || "",
        rajtocom:
          normalizedStatus === "rajtocom"
            ? currentTimestamp
            : (currentDates.rajtocom || ""),
        comtoraj:
          normalizedStatus === "comtoraj"
            ? currentTimestamp
            : (currentDates.comtoraj || ""),
        deliveryed:
          normalizedStatus === "deliveryed"
            ? currentTimestamp
            : (currentDates.deliveryed || ""),
      },
    };
    setProductStatusMap(nextStatusMap);
    onChange({
      target: { name: "product_status_map", value: JSON.stringify(nextStatusMap) }
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "product_status_dates_map", value: JSON.stringify(nextDatesMap) }
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

  const updateProductIssueDescription = (productId: string, issueText: string) => {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) return;
    const nextIssueMap: Record<string, string> = {
      ...issueDescriptionMapState,
      [normalizedProductId]: issueText,
    };
    setIssueDescriptionMapState(nextIssueMap);
    onChange({
      target: { name: "issue_description_map", value: JSON.stringify(nextIssueMap) }
    } as ChangeEvent<HTMLInputElement>);
  };

  const updateAccessoryType = (productId: string, accessoryType: string) => {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) return;
    const normalizedAccessory = normalizeAccessoryType(accessoryType);
    const nextAccessoryMap = { ...accessoryTypeMapState };
    if (normalizedAccessory) {
      nextAccessoryMap[normalizedProductId] = normalizedAccessory;
    } else {
      delete nextAccessoryMap[normalizedProductId];
    }
    setAccessoryTypeMapState(nextAccessoryMap);
    onChange({
      target: { name: "accessory_type_map", value: JSON.stringify(nextAccessoryMap) }
    } as ChangeEvent<HTMLInputElement>);
  };

  const updateResultText = (productId: string, resultText: string) => {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) return;
    const nextResultMap: Record<string, string> = {
      ...resultTextMapState,
      [normalizedProductId]: resultText,
    };
    setResultTextMapState(nextResultMap);
    onChange({
      target: { name: "result_text_map", value: JSON.stringify(nextResultMap) }
    } as ChangeEvent<HTMLInputElement>);
  };

  const updateProductQuantity = (productId: string, quantity: string) => {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) return;
    const normalizedQuantity = Math.max(1, Number.parseInt(String(quantity || "1"), 10) || 1);
    const nextQuantityMap: Record<string, number> = {
      ...productQuantityMapState,
      [normalizedProductId]: normalizedQuantity,
    };
    setProductQuantityMapState(nextQuantityMap);
    onChange({
      target: { name: "product_quantity_map", value: JSON.stringify(nextQuantityMap) }
    } as ChangeEvent<HTMLInputElement>);
  };

  const updateHandoverType = (productId: string, handoverType: string) => {
    const normalizedProductId = productId.trim();
    if (!normalizedProductId) return;
    const normalizedType = normalizeHandoverTypeValue(handoverType);
    const nextHandoverMap: Record<string, HandoverType> = {
      ...handoverTypeMapState,
      [normalizedProductId]: normalizedType,
    };
    setHandoverTypeMapState(nextHandoverMap);
    onChange({
      target: { name: "handover_type_map", value: JSON.stringify(nextHandoverMap) }
    } as ChangeEvent<HTMLInputElement>);
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    const form = formRef.current || e.currentTarget;
    const syncHiddenField = (name: string, value: string) => {
      const field = form.elements.namedItem(name) as HTMLInputElement | RadioNodeList | null;
      if (field && "value" in field) {
        field.value = value;
      }
      onChange({
        target: { name, value },
      } as ChangeEvent<HTMLInputElement>);
    };

    syncHiddenField("product_status_map", JSON.stringify(productStatusMap));
    syncHiddenField("repairing_status_map", JSON.stringify(repairingStatusMapState));
    syncHiddenField("issue_description_map", JSON.stringify(issueDescriptionMapState));
    syncHiddenField("accessory_type_map", JSON.stringify(accessoryTypeMapState));
    syncHiddenField("result_text_map", JSON.stringify(resultTextMapState));
    syncHiddenField("handover_type_map", JSON.stringify(handoverTypeMapState));
    syncHiddenField("product_quantity_map", JSON.stringify(productQuantityMapState));

    onSubmit(e);
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
    onChange({
      target: { name: "issue_description_map", value: JSON.stringify({}) },
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "accessory_type_map", value: JSON.stringify({}) },
    } as ChangeEvent<HTMLInputElement>);
    onChange({
      target: { name: "result_text_map", value: JSON.stringify({}) },
    } as ChangeEvent<HTMLInputElement>);
    setProductStatusMap({});
    setRepairingStatusMapState({});
    setIssueDescriptionMapState({});
    setAccessoryTypeMapState({});
    setResultTextMapState({});
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

          <form ref={formRef} autoComplete="off" onSubmit={handleFormSubmit} className="service-form-enhanced order-form-enhanced">
            <div className="order-form-shell">
              <aside className="order-form-aside">
                <div className="order-preview-card">
                  <span className="order-preview-badge">{editMode ? "Live Order Snapshot" : "New Order Snapshot"}</span>
                  <h3>{selectedClient?.full_name || "Select a client"}</h3>
                  <p>{productPreview}</p>
                  {previewCompanyItems.length > 0 ? (
                    <div className="order-preview-groups">
                      {previewCompanyItems.map((group, index) => (
                        <div key={`preview-company-${group.companyName}-${index}`} className="order-preview-group">
                          <strong>{group.companyName}:</strong>
                          {group.productLines.length > 0 ? (
                            <div className="order-preview-group-lines">
                              {group.productLines.map((line, lineIndex) => (
                                <span key={`preview-line-${group.companyName}-${lineIndex}`}>
                                  {lineIndex + 1}. {line}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="order-preview-group-lines">
                              <span>No products added</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : previewPrimaryItems.length > 0 && (
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
                    {(selectedClient || String(orderForm.client_name || "").trim()) && (
                      <div className="selected-info">
                        <div className="info-chip">
                          <FiUsers />
                          <span>{selectedClient?.full_name || String(orderForm.client_name || "").trim()}</span>
                        </div>
                        {selectedClient?.email && <div className="info-chip"><span>{selectedClient.email}</span></div>}
                      </div>
                    )}
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
                    <div className="input-hint info"><FiCheck /> Select at least one product</div>
                  </div>

                  <div className="form-group-enhanced full-width order-company-products-stage">
                    <div className="order-inline-toolbar">
                      <div className="order-inline-toolbar-copy">
                        <strong>Company and product workspace</strong>
                        <span>Manage each company, add products, and update service progress from one place.</span>
                      </div>
                      <div className="order-inline-toolbar-actions">
                        <button type="button" className="selected-products-clear" onClick={openAddCompany}>
                          <FiPlus /> Add Company
                        </button>
                        <button type="button" className="selected-products-clear" onClick={() => openAddProduct()}>
                          <FiPlus /> Add Product
                        </button>
                        {selectedCompanies.length > 0 && (
                          <button type="button" className="selected-products-clear danger-clear" onClick={clearCompanies}>
                            Clear Companies
                          </button>
                        )}
                        {selectedProductDisplayCount > 0 && (
                          <button type="button" className="selected-products-clear danger-clear" onClick={clearAllCompanyProducts}>
                            Clear Products
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedCompanies.length > 0 && (
                      <div className="selected-products-box">
                        <div className="selected-products-header">
                          <div className="selected-products-title">
                            <strong>Company + Products</strong>
                            <span>{selectedCompanies.length} item{selectedCompanies.length > 1 ? "s" : ""} added</span>
                          </div>
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
                                      selectedCompanyProductGroups
                                        .find((group) => group.company.id === company.id)
                                        ?.entries.map((entry) => entry.label)
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

                    {selectedProductDisplayCount > 0 ? (
                      <div className="selected-products-box">
                        <div className="selected-products-header">
                          <div className="selected-products-title">
                            <strong>Selected Products by Company</strong>
                            <span>{selectedProductDisplayCount} item{selectedProductDisplayCount > 1 ? "s" : ""} added</span>
                          </div>
                        </div>
                        <div className="selected-products-grid">
                          {selectedCompanyProductGroups.map(({ company, entries: companyProducts }, companyIndex) => (
                            <div key={`company-group-${company.id}`} className="selected-product-card" style={{ gridColumn: "1 / -1" }}>
                              <div className="selected-product-index">{companyIndex + 1}</div>
                              <div className="selected-product-content">
                                <div className="selected-product-name">{company.company_name}</div>
                                <div className="selected-product-meta">
                                  <span>{companyProducts.length} product{companyProducts.length !== 1 ? "s" : ""}</span>
                                  {company.company_code && <span>Code: {company.company_code}</span>}
                                </div>
                                {companyProducts.length > 0 ? (
                                  <div className="selected-products-grid" style={{ marginTop: "12px" }}>
                                    {companyProducts.map((product) => (
                                      <div key={`company-${company.id}-product-${product.productId || product.label}`} className="selected-product-card">
                                        <div className="selected-product-content">
                                          <div className="selected-product-name">{product.label}</div>
                                          <div className="selected-product-meta">
                                            {product.code && <span>Code: {product.code}</span>}
                                            {product.serialNumber && <span>SN: {product.serialNumber}</span>}
                                            <span>Qty: {product.quantity}</span>
                                            {product.brand && <span>{product.brand}</span>}
                                            {product.model && <span>{product.model}</span>}
                                          </div>
                                          {product.productId ? (
                                            <>
                                              <div style={{ marginTop: "10px" }}>
                                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: "#475569" }}>
                                                  Qty
                                                </label>
                                                <input
                                                  type="number"
                                                  min="1"
                                                  step="1"
                                                  value={product.quantity}
                                                  onChange={(e) => updateProductQuantity(product.productId!, e.target.value)}
                                                  className="enhanced-input"
                                                />
                                              </div>
                                              <div className="enhanced-dropdown" style={{ marginTop: "10px" }}>
                                                <select
                                                  value={productStatusMap[product.productId] || "pending"}
                                                  onChange={(e) => updateProductStatus(product.productId!, e.target.value)}
                                                  className="enhanced-select"
                                                  style={{ borderLeftColor: getProductFlowStatusColor(productStatusMap[product.productId] || "pending") }}
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
                                                  value={repairingStatusMap[product.productId] || "not_ready"}
                                                  onChange={(e) => updateRepairingStatus(product.productId!, e.target.value)}
                                                  className="enhanced-select"
                                                >
                                                  <option value="ready">Ready</option>
                                                  <option value="not_ready">Not ready</option>
                                                  <option value="replacement">Replacement</option>
                                                </select>
                                                <FiChevronDown className="dropdown-icon" />
                                              </div>
                                              <textarea
                                                value={issueDescriptionMapState[product.productId] || ""}
                                                onChange={(e) => updateProductIssueDescription(product.productId!, e.target.value)}
                                                placeholder="Issue Description for this product"
                                                rows={2}
                                                className="enhanced-textarea"
                                                style={{ marginTop: "10px" }}
                                              />
                                              {productStatusMap[product.productId] === "rajtocom" && (
                                                <div className="enhanced-dropdown" style={{ marginTop: "10px" }}>
                                                  <select
                                                    value={accessoryTypeMapState[product.productId] || ""}
                                                    onChange={(e) => updateAccessoryType(product.productId!, e.target.value)}
                                                    className="enhanced-select"
                                                  >
                                                    <option value="">Select Accessory</option>
                                                    <option value="without_box">Without Box</option>
                                                    <option value="with_box">With Box</option>
                                                  </select>
                                                  <FiChevronDown className="dropdown-icon" />
                                                </div>
                                              )}
                                              {productStatusMap[product.productId] === "deliveryed" && (
                                                <div className="enhanced-dropdown" style={{ marginTop: "10px" }}>
                                                  <select
                                                    value={handoverTypeMapState[product.productId] || "inhand"}
                                                    onChange={(e) => updateHandoverType(product.productId!, e.target.value)}
                                                    className="enhanced-select"
                                                  >
                                                    {DELIVERY_TYPE_OPTIONS.map((option) => (
                                                      <option key={option.value} value={option.value}>
                                                        {option.label}
                                                      </option>
                                                    ))}
                                                  </select>
                                                  <FiChevronDown className="dropdown-icon" />
                                                </div>
                                              )}
                                              {(productStatusMap[product.productId] === "comtoraj" || productStatusMap[product.productId] === "deliveryed") && (
                                                <textarea
                                                  value={resultTextMapState[product.productId] || ""}
                                                  onChange={(e) => updateResultText(product.productId!, e.target.value)}
                                                  placeholder="Enter Result"
                                                  rows={2}
                                                  className="enhanced-textarea"
                                                  style={{ marginTop: "10px" }}
                                                />
                                              )}
                                            </>
                                          ) : (
                                            <div className="input-hint info" style={{ marginTop: "10px" }}>
                                              <FiCheck /> This saved product is shown from order history. Add or map the catalog product if you want per-product editing here.
                                            </div>
                                          )}
                                        </div>
                                        {product.productId && (
                                          <button
                                            type="button"
                                            className="selected-product-remove"
                                            onClick={() => removeProduct(product.productId!, company.id.toString())}
                                          >
                                            <FiX />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="input-hint info" style={{ marginTop: "10px" }}>
                                    <FiCheck /> No products added for this company yet.
                                  </div>
                                )}
                              </div>
                              <button type="button" className="selected-product-remove" onClick={() => removeCompany(company.id.toString())}>
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

                  {editMode ? (
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
                  ) : null}

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
                  <div className="form-group-enhanced"><label className="form-label"><FiCreditCard className="label-icon" /><span>Company Service Cost</span></label><div className="currency-input"><span className="currency-symbol">Rs.</span><input type="number" id="deposit_amount" name="deposit_amount" value={orderForm.deposit_amount} onChange={onChange} placeholder="0.00" min="0" step="0.01" className="enhanced-input currency-field" /></div><div className="input-hint info"><FiCheck /> Company service cost amount</div></div>
                  <div className="form-group-enhanced"><label className="form-label"><FiDollarSign className="label-icon" /><span>Final Cost</span></label><div className="currency-input"><span className="currency-symbol">Rs.</span><input type="number" id="final_cost" name="final_cost" value={orderForm.final_cost} onChange={onChange} placeholder="0.00" min="0" step="0.01" className="enhanced-input currency-field" /></div></div>
                  <div className="form-group-enhanced"><label className="form-label"><FiCreditCard className="label-icon" /><span>Payment Status</span></label><div className="enhanced-dropdown"><select id="payment_status" name="payment_status" value={["pending", "paid", "refunded"].includes(String(orderForm.payment_status).toLowerCase()) ? String(orderForm.payment_status).toLowerCase() : "pending"} onChange={onChange} className="enhanced-select"><option value="pending">Pending</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select><FiChevronDown className="dropdown-icon" /></div></div>
                  <div className="financial-summary order-financial-summary"><div className="summary-title">Payment Summary</div><div className="summary-item"><span>Estimated Cost:</span><strong>Rs. {estimatedCost.toLocaleString()}</strong></div><div className="summary-item"><span>Company Service Cost:</span><strong className="text-success">- Rs. {depositAmount.toLocaleString()}</strong></div><div className="summary-divider"></div><div className="summary-item total"><span>Remaining Balance:</span><strong className="text-warning">Rs. {remainingBalance.toLocaleString()}</strong></div></div>

                  <div className="form-group-enhanced full-width order-section-heading"><div className="summary-title">Details & Notes</div><p>Describe the issue well so technicians and front-desk staff stay aligned.</p></div>                  <div className="form-group-enhanced full-width"><label className="form-label"><FiPackage className="label-icon" /><span>Additional Notes</span></label><textarea id="notes" name="notes" value={orderForm.notes} onChange={onChange} placeholder="Special instructions, promised accessories, approval notes, or internal comments..." rows={4} className="enhanced-textarea" /></div>
                </motion.div>
              </div>
            </div>

            <div className="form-actions-enhanced order-form-actions">
              <input type="hidden" name="product_status_map" value={JSON.stringify(productStatusMap)} />
              <input type="hidden" name="repairing_status_map" value={JSON.stringify(repairingStatusMapState)} />
              <input type="hidden" name="issue_description_map" value={JSON.stringify(issueDescriptionMapState)} />
              <input type="hidden" name="accessory_type_map" value={JSON.stringify(accessoryTypeMapState)} />
              <input type="hidden" name="result_text_map" value={JSON.stringify(resultTextMapState)} />
              <input type="hidden" name="handover_type_map" value={JSON.stringify(handoverTypeMapState)} />
              <input type="hidden" name="product_quantity_map" value={JSON.stringify(productQuantityMapState)} />
              <div className="order-form-actions-note">Required: client, phone, and product. The remaining fields help with service quality, internal clarity, and billing.</div>
              <div className="order-form-actions-buttons">
              <motion.button type="button" className="btn-secondary-enhanced" onClick={onClose} disabled={isSubmitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancel</motion.button>
                <motion.button type="submit" className="btn-primary-enhanced" disabled={isSubmitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>{isSubmitting ? <FiLoader className="spinning" /> : <FiSave />}{isSubmitting ? (editMode ? "Updating Order..." : "Creating Order...") : (editMode ? "Update Order" : "Create Order")}</motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderFormModal;

