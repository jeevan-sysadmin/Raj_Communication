import type { Delivery, Order, Product } from "./types";
import { formatCurrency, formatDisplayDate } from "./utils";

type ReceiptPdfModules = {
  html2canvas: typeof import("html2canvas").default;
  jsPDF: typeof import("jspdf").jsPDF;
};

let receiptPdfModulesPromise: Promise<ReceiptPdfModules> | null = null;

const escapeReceiptHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildProductIndexes = (products: Product[]) => {
  const productById = new Map<number, Product>();
  const productByNormalizedName = new Map<string, Product>();

  products.forEach((product) => {
    productById.set(product.id, product);
    const normalizedName = String(product.product_name || "").trim().toLowerCase();
    if (normalizedName && !productByNormalizedName.has(normalizedName)) {
      productByNormalizedName.set(normalizedName, product);
    }
  });

  return { productById, productByNormalizedName };
};

const loadReceiptPdfModules = () => {
  if (!receiptPdfModulesPromise) {
    receiptPdfModulesPromise = Promise.all([import("html2canvas"), import("jspdf")]).then(
      ([{ default: html2canvas }, { jsPDF }]) => ({
        html2canvas,
        jsPDF,
      }),
    );
  }

  return receiptPdfModulesPromise;
};

export const createOrderReceiptMarkup = (order: Order, products: Product[] = []) => {
  const { productById, productByNormalizedName } = buildProductIndexes(products);

  const parseJsonArray = (value: string): unknown[] | null => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const normalizeNames = (value: unknown) => {
    const rawValues =
      Array.isArray(value)
        ? value
        : typeof value === "number"
          ? [value]
          : typeof value === "string"
            ? parseJsonArray(value.trim()) ??
              (value.includes("||") ? value.split("||") : value.split(","))
            : [];

    return Array.from(
      new Set(
        rawValues
          .map((entry) => String(entry ?? "").trim())
          .filter((entry) => {
            const normalized = entry.toLowerCase();
            return Boolean(normalized) && normalized !== "null" && normalized !== "undefined";
          }),
      ),
    );
  };

  const normalizeIds = (value: unknown) => {
    const rawValues =
      Array.isArray(value)
        ? value
        : typeof value === "number"
          ? [value]
          : typeof value === "string"
            ? parseJsonArray(value.trim()) ?? value.split(",")
            : [];

    return Array.from(
      new Set(
        rawValues
          .map((entry) => Number(entry))
          .filter((entry) => Number.isInteger(entry) && entry > 0),
      ),
    );
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

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, string>>((acc, [productId, text]) => {
      const key = String(productId || "").trim();
      if (!key) return acc;
      const issueText = String(text ?? "").trim();
      if (!issueText) return acc;
      acc[key] = issueText;
      return acc;
    }, {});
  };

  const withIdFallback = (names: string[], ids: number[], prefix: string) =>
    names.length > 0 ? names : ids.map((id) => `${prefix} #${id}`);

  const productNames = normalizeNames(order.product_names);
  const singleProductNames = normalizeNames(order.product_name);
  const replacementProductNames = normalizeNames(order.replacement_product_names);
  const singleReplacementProductNames = normalizeNames(order.replacement_product_name);
  const primaryIds = Array.from(new Set([...normalizeIds(order.product_ids), ...normalizeIds(order.product_id)]));
  const replacementIds = Array.from(
    new Set([...normalizeIds(order.replacement_product_ids), ...normalizeIds(order.replacement_product_id)]),
  );
  const primaryNames = withIdFallback(
    productNames.length > 0 ? productNames : singleProductNames,
    primaryIds,
    "Product",
  );
  const replacementNames = withIdFallback(
    replacementProductNames.length > 0 ? replacementProductNames : singleReplacementProductNames,
    replacementIds,
    "Replacement Product",
  );
  const primarySerials = normalizeNames(order.product_serial_numbers);
  const replacementSerials = normalizeNames(order.replacement_product_serial_numbers);
  const issueDescriptionMap = normalizeIssueDescriptionMap((order as Order & { issue_description_map?: unknown }).issue_description_map);
  const legacyIssueDescription = String(order.issue_description || "").trim();

  const formatEntryList = (names: string[], serials: string[], fallbackSerial: string) =>
    names.map((name, index) => `${index + 1}. ${name}${serials[index] ? ` (SN: ${serials[index]})` : (index === 0 && fallbackSerial ? ` (SN: ${fallbackSerial})` : "")}`);

  const replacementList = formatEntryList(replacementNames, replacementSerials, order.replacement_serial_number || "");
  const serialByProductName = new Map<string, string>();
  const modelByProductName = new Map<string, string>();
  const serialByProductId = new Map<number, string>();
  const modelByProductId = new Map<number, string>();
  primaryNames.forEach((name, index) => {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return;
    const productId = primaryIds[index];
    const matchedProduct = productId ? productById.get(productId) : undefined;
    const serial = String(primarySerials[index] || (index === 0 ? order.serial_number || "" : "")).trim();
    if (serial && !serialByProductName.has(key)) {
      serialByProductName.set(key, serial);
    }
    if (productId && serial && !serialByProductId.has(productId)) {
      serialByProductId.set(productId, serial);
    }
    const model = String(matchedProduct?.model || (index === 0 ? order.product_model || "" : "")).trim();
    if (model && !modelByProductName.has(key)) {
      modelByProductName.set(key, model);
    }
    if (productId && model && !modelByProductId.has(productId)) {
      modelByProductId.set(productId, model);
    }
  });
  const renderNumberedProductRows = (
    names: string[],
    serials: string[],
    fallbackSerial: string,
    fallbackModel: string,
    ids: number[] = [],
    includeIssueDescription = false,
  ) =>
    names.length > 0
      ? names
          .map((name, index) => {
            const key = String(name || "").trim().toLowerCase();
            const id = ids[index];
            const byNameProduct = productByNormalizedName.get(key);
            const serial = String(
              serials[index] ||
                (id ? serialByProductId.get(id) || "" : "") ||
                serialByProductName.get(key) ||
                byNameProduct?.serial_number ||
                (index === 0 ? fallbackSerial : "") ||
                "",
            ).trim();
            const model = String(
              (id ? modelByProductId.get(id) || "" : "") ||
                modelByProductName.get(key) ||
                byNameProduct?.model ||
                (index === 0 ? fallbackModel : "") ||
                "",
            ).trim();
            const issueText = includeIssueDescription
              ? String((id ? issueDescriptionMap[String(id)] : "") || legacyIssueDescription || "Issue details not provided.").trim()
              : "";
            return `
              <div style="margin-bottom:8px;">
                <div style="font-size:14px;line-height:1.55;color:#334155;">${index + 1}. ${escapeReceiptHtml(name)}</div>
                <div style="font-size:13px;line-height:1.5;color:#64748b;margin-left:16px;">Serial Number: ${escapeReceiptHtml(serial || "N/A")}</div>
                <div style="font-size:13px;line-height:1.5;color:#64748b;margin-left:16px;">Model Number: ${escapeReceiptHtml(model || "N/A")}</div>
                ${
                  includeIssueDescription
                    ? `<div style="font-size:13px;line-height:1.6;color:#334155;margin-left:16px;"><strong>Issue:</strong> ${escapeReceiptHtml(issueText)}</div>`
                    : ""
                }
              </div>
            `;
          })
          .join("")
      : `<div style="font-size:14px;line-height:1.65;color:#64748b;">Not added</div>`;
  const isReplacementReceipt =
    replacementList.length > 0 ||
    replacementIds.length > 0 ||
    singleReplacementProductNames.length > 0;
  const receiptHeading = isReplacementReceipt ? "Replacement Order Receipt" : "RMA Receipt";
  const receiptSubtitle = isReplacementReceipt
    ? "Replacement order summary for customer handover and records."
    : "Professional repair order summary for customer handover and records.";
  const generatedReceiptLabel = isReplacementReceipt ? "replacement order receipt" : "RMA receipt";

  const companyWiseProductsMarkup = `
    <div style="font-size:14px;line-height:1.7;color:#334155;margin-bottom:10px;"><strong>Main Products:</strong></div>
    <div>${renderNumberedProductRows(primaryNames, primarySerials, order.serial_number || "", order.product_model || "", primaryIds, true)}</div>
  `;

  const finalAmount = formatCurrency(order.final_cost || order.estimated_cost);
  const createdDate = formatDisplayDate(order.created_at);
  const deliveryDate = formatDisplayDate(order.estimated_delivery_date);
  const showExpectedDelivery =
    !!deliveryDate &&
    deliveryDate.trim() !== "" &&
    deliveryDate.trim() !== "-" &&
    deliveryDate.trim().toLowerCase() !== "n/a";

  return `
    <div style="font-family:Arial,sans-serif;background:linear-gradient(180deg,#eff6ff 0%,#ffffff 28%);padding:32px;color:#0f172a;">
      <div style="background:#ffffff;border:1px solid #dbeafe;border-radius:24px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,0.08);">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 55%,#0f172a 100%);color:#ffffff;">
          <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
            <div>
              <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.8;margin-bottom:8px;">Raj Communication</div>
              <h1 style="margin:0;font-size:32px;line-height:1.1;">${escapeReceiptHtml(receiptHeading)}</h1>
              <p style="margin:10px 0 0;font-size:14px;opacity:0.88;">${escapeReceiptHtml(receiptSubtitle)}</p>
            </div>
            <div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);padding:16px 18px;border-radius:18px;min-width:220px;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.3px;opacity:0.75;">Receipt No</div>
              <div style="font-size:24px;font-weight:700;margin-top:6px;">${escapeReceiptHtml(order.order_code)}</div>
              <div style="font-size:12px;margin-top:8px;opacity:0.8;">Created ${escapeReceiptHtml(createdDate)}</div>
            </div>
          </div>
        </div>
        <div style="padding:28px 32px 32px;">
          <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px;margin-bottom:22px;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:20px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:14px;">Customer Details</div>
              <div style="font-size:22px;font-weight:700;margin-bottom:6px;">${escapeReceiptHtml(order.client_name)}</div>
              <div style="font-size:14px;color:#334155;margin-bottom:4px;">${escapeReceiptHtml(order.client_phone)}</div>
              <div style="font-size:14px;color:#64748b;">${escapeReceiptHtml(order.client_email || "No email provided")}</div>
            </div>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:18px;padding:20px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#1d4ed8;margin-bottom:14px;">Service Status</div>
              <div style="display:flex;flex-wrap:wrap;gap:10px;">
                <span style="background:#ffffff;border:1px solid #cbd5e1;color:#0f172a;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;text-transform:capitalize;">${escapeReceiptHtml(order.status)}</span>
                <span style="background:#ffffff;border:1px solid #cbd5e1;color:#0f172a;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;text-transform:capitalize;">${escapeReceiptHtml(order.priority)} Priority</span>
                <span style="background:#ffffff;border:1px solid #cbd5e1;color:#0f172a;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;text-transform:capitalize;">${escapeReceiptHtml((order.warranty_status || "N/A").replaceAll("_", " "))}</span>
              </div>
              <div style="margin-top:16px;font-size:14px;color:#334155;"><strong>Assigned Staff:</strong> ${escapeReceiptHtml(order.staff_name || "Not assigned")}</div>
              ${
                showExpectedDelivery
                  ? `<div style="margin-top:8px;font-size:14px;color:#334155;"><strong>Expected Delivery:</strong> ${escapeReceiptHtml(deliveryDate)}</div>`
                  : ""
              }
            </div>
          </div>
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:22px;margin-bottom:22px;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:14px;">Device & Issue</div>
            <div style="font-size:22px;font-weight:700;margin-bottom:10px;">${escapeReceiptHtml(primaryNames[0] || order.product_name || "Not added")}</div>
            ${companyWiseProductsMarkup}
            <div style="font-size:14px;line-height:1.7;color:#334155;margin-bottom:8px;"><strong>Replacement Products:</strong></div>
            <div style="margin-bottom:10px;">
              ${
                replacementNames.length > 0
                  ? renderNumberedProductRows(replacementNames, replacementSerials, order.replacement_serial_number || "", "", replacementIds)
                  : `<div style="font-size:14px;line-height:1.65;color:#64748b;">No replacement</div>`
              }
            </div>
            ${
              order.notes
                ? `<div style="margin-top:14px;padding-top:14px;border-top:1px dashed #cbd5e1;font-size:14px;color:#475569;"><strong>Notes:</strong> ${escapeReceiptHtml(order.notes)}</div>`
                : ""
            }
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.4px;color:#64748b;margin-bottom:8px;">Estimated Cost</div>
              <div style="font-size:24px;font-weight:700;">Rs. ${escapeReceiptHtml(formatCurrency(order.estimated_cost))}</div>
            </div>
            <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:16px;padding:18px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.4px;color:#166534;margin-bottom:8px;">Final Amount</div>
              <div style="font-size:24px;font-weight:700;color:#15803d;">Rs. ${escapeReceiptHtml(finalAmount)}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr;gap:16px;margin-top:18px;">
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.4px;color:#64748b;margin-bottom:8px;">Service Type</div>
              <div style="font-size:18px;font-weight:700;color:#0f172a;">${escapeReceiptHtml((order.service_type || "general").replaceAll("_", " "))}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:24px;">
            <div style="padding:16px 0 0;border-top:2px solid #cbd5e1;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.4px;color:#64748b;margin-bottom:10px;">Customer Signature</div>
              <div style="height:34px;"></div>
              <div style="font-size:13px;color:#475569;">Name & Signature</div>
            </div>
            <div style="padding:16px 0 0;border-top:2px solid #cbd5e1;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.4px;color:#64748b;margin-bottom:10px;">Authorized By</div>
              <div style="height:34px;"></div>
              <div style="font-size:13px;color:#475569;">Raj Communication</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b;">
            <div>Payment Status: <strong style="color:#0f172a;text-transform:capitalize;">${escapeReceiptHtml(order.payment_status)}</strong></div>
            <div>This is a computer-generated ${escapeReceiptHtml(generatedReceiptLabel)}.</div>
          </div>
        </div>
      </div>
    </div>
  `;
};

export const createDeliveryReceiptMarkup = (delivery: Delivery) => {
  const extendedDelivery = delivery as Delivery & {
    order_product_ids?: number[] | string[] | string;
    delivered_product_names?: string[] | string;
    delivered_product_models?: string[] | string;
    delivered_product_serial_numbers?: string[] | string;
    delivery_item_product_ids?: number[] | string[] | string;
    delivery_item_product_names?: string[] | string;
    delivery_item_models?: string[] | string;
    delivery_item_serial_numbers?: string[] | string;
    product_names?: string[] | string;
    product_models?: string[] | string;
    product_ids?: number[] | string[] | string;
    product_serial_numbers?: string[] | string;
    serial_numbers?: string[] | string;
    product_status_map?: Record<string, string> | string;
    replacement_product_name?: string;
    replacement_product_names?: string[] | string;
    company_name?: string;
    company_names?: string[] | string;
    company_product_name_map?: Record<string, { company_name?: string; product_names?: string[] | string }>;
  };

  const parseNames = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((entry) => String(entry ?? "").trim()).filter(Boolean);
        }
      } catch {
        return trimmed
          .split("||")
          .flatMap((part) => part.split(","))
          .map((part) => part.trim())
          .filter(Boolean);
      }
      return [];
    }
    return [];
  };

  const parseIds = (value: unknown): number[] => {
    if (Array.isArray(value)) return value.map((entry) => Number(entry)).filter((id) => Number.isInteger(id) && id > 0);
    if (typeof value === "number") return Number.isInteger(value) && value > 0 ? [value] : [];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((entry) => Number(entry)).filter((id) => Number.isInteger(id) && id > 0);
      } catch {
        return trimmed
          .split(",")
          .map((entry) => Number(entry.trim()))
          .filter((id) => Number.isInteger(id) && id > 0);
      }
    }
    return [];
  };

  const parseStatusMap = (value: unknown): Record<string, string> => {
    if (!value) return {};
    let raw: unknown = value;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        return {};
      }
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.entries(raw as Record<string, unknown>).reduce<Record<string, string>>((acc, [productId, status]) => {
      const normalized = String(status || "").trim().toLowerCase();
      if (!normalized) return acc;
      acc[productId] = normalized === "delivered" ? "deliveryed" : normalized;
      return acc;
    }, {});
  };

  const findListIndexByName = (names: string[], targetName: string) => {
    const normalizedTarget = String(targetName || "").trim().toLowerCase();
    if (!normalizedTarget) return -1;
    return names.findIndex((entry) => String(entry || "").trim().toLowerCase() === normalizedTarget);
  };

  const findListValueByName = (names: string[], values: string[], targetName: string) => {
    const matchedIndex = findListIndexByName(names, targetName);
    if (matchedIndex < 0) return "";
    return String(values[matchedIndex] || "").trim();
  };

  const parseTypeMap = (value: unknown): Record<string, string> => {
    if (!value) return {};
    let raw: unknown = value;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        return {};
      }
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.entries(raw as Record<string, unknown>).reduce<Record<string, string>>((acc, [productId, type]) => {
      const normalized = String(type || "").trim();
      if (!normalized) return acc;
      acc[productId] = normalized;
      return acc;
    }, {});
  };

  const humanizeDeliveryType = (value?: string) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "Standard";
    if (normalized === "inhand") return "In Hand";
    if (normalized === "parcelservice") return "Parcel Service";
    if (normalized === "courier") return "Courier";
    return normalized.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const deliveryCode = delivery.delivery_code || `DEL${String(delivery.id).padStart(3, "0")}`;
  const orderCode = delivery.order_code || `ORD${String(delivery.order_id).padStart(3, "0")}`;
  const scheduledDate = delivery.scheduled_date_formatted || formatDisplayDate(delivery.scheduled_date);
  const deliveredDate = delivery.delivered_date_formatted || formatDisplayDate(delivery.delivered_date);
  const address = delivery.address || delivery.client_address || "Store Pickup";
  const contactName = delivery.contact_person || delivery.client_name || "N/A";
  const contactPhone = delivery.contact_phone || delivery.client_phone || "N/A";
  const status =
    delivery.status === "delivered" || (delivery.delivered_date && delivery.delivered_date !== "0000-00-00 00:00:00")
      ? "Delivered"
      : delivery.status || "Pending";
  const deliveryFinalCost = formatCurrency(
    (extendedDelivery as Delivery & { final_cost?: string | number; estimated_cost?: string | number; amount?: string | number }).final_cost ||
      (extendedDelivery as Delivery & { final_cost?: string | number; estimated_cost?: string | number; amount?: string | number }).estimated_cost ||
      (extendedDelivery as Delivery & { final_cost?: string | number; estimated_cost?: string | number; amount?: string | number }).amount ||
      0,
  );
  const primaryProducts = parseNames(extendedDelivery.product_names);
  if (primaryProducts.length === 0 && extendedDelivery.product_name) {
    primaryProducts.push(String(extendedDelivery.product_name));
  }
  const replacementProducts = parseNames(extendedDelivery.replacement_product_names);
  if (replacementProducts.length === 0 && extendedDelivery.replacement_product_name) {
    replacementProducts.push(String(extendedDelivery.replacement_product_name));
  }
  const orderProductIds = parseIds(extendedDelivery.order_product_ids);
  const deliveredProductIds = (() => {
    const itemIds = parseIds(extendedDelivery.delivery_item_product_ids);
    if (itemIds.length > 0) return itemIds;
    return parseIds(extendedDelivery.product_ids);
  })();
  const orderProductIdsResolved = orderProductIds.length > 0 ? orderProductIds : deliveredProductIds;
  const orderProductNames = primaryProducts;
  const orderProductModels = parseNames(extendedDelivery.product_models);
  const orderProductSerials = (() => {
    const direct = parseNames(extendedDelivery.product_serial_numbers);
    if (direct.length > 0) return direct;
    return parseNames(extendedDelivery.serial_numbers);
  })();
  const deliveredProductNames = (() => {
    const itemNames = parseNames(extendedDelivery.delivery_item_product_names);
    if (itemNames.length > 0) return itemNames;
    return parseNames(extendedDelivery.delivered_product_names);
  })();
  const deliveredProductModels = (() => {
    const itemModels = parseNames(extendedDelivery.delivery_item_models);
    if (itemModels.length > 0) return itemModels;
    return parseNames(extendedDelivery.delivered_product_models);
  })();
  const deliveredProductSerials = (() => {
    const itemSerials = parseNames(extendedDelivery.delivery_item_serial_numbers);
    if (itemSerials.length > 0) return itemSerials;
    return parseNames(extendedDelivery.delivered_product_serial_numbers);
  })();
  const productStatuses = parseStatusMap(extendedDelivery.product_status_map);
  const deliveryTypeMap = parseTypeMap(extendedDelivery.delivery_type_map);
  const allProducts =
    primaryProducts.length > 0 ? primaryProducts : (extendedDelivery.product_name ? [String(extendedDelivery.product_name)] : []);
  const orderProductsById = new Map<number, { name: string; serial: string; model: string }>();
  orderProductIdsResolved.forEach((id, index) => {
    if (id <= 0) return;
    orderProductsById.set(id, {
      name: orderProductNames[index] || `Product ${index + 1}`,
      serial: orderProductSerials[index] || "",
      model: orderProductModels[index] || "",
    });
  });

  const resolveOrderProductDetail = (id: number, name: string, field: "serial" | "model") => {
    const byId = id > 0 ? orderProductsById.get(id) : undefined;
    const directValue = String(byId?.[field] || "").trim();
    if (directValue && directValue !== "N/A") return directValue;

    const fallbackByName =
      field === "serial"
        ? findListValueByName(orderProductNames, orderProductSerials, name)
        : findListValueByName(orderProductNames, orderProductModels, name);
    if (fallbackByName && fallbackByName !== "N/A") return fallbackByName;

    return "";
  };

  const resolveDeliveredFieldByIndex = (index: number, name: string, field: "serial" | "model") => {
    const directList = field === "serial" ? deliveredProductSerials : deliveredProductModels;
    const orderList = field === "serial" ? orderProductSerials : orderProductModels;
    const directValue = String(directList[index] || "").trim();
    if (directValue && directValue !== "N/A") return directValue;

    const orderValue = String(orderList[index] || "").trim();
    if (orderValue && orderValue !== "N/A") return orderValue;

    const matchedIndex = findListIndexByName(orderProductNames, name);
    if (matchedIndex >= 0) {
      const matchedValue = String(orderList[matchedIndex] || "").trim();
      if (matchedValue && matchedValue !== "N/A") return matchedValue;
    }

    const fallbackByName =
      field === "serial"
        ? findListValueByName(orderProductNames, orderProductSerials, name)
        : findListValueByName(orderProductNames, orderProductModels, name);
    if (fallbackByName && fallbackByName !== "N/A") return fallbackByName;

    if (field === "serial") {
      return index === 0
        ? String(delivery.delivery_serial_number || delivery.product_serial_number || delivery.serial_number || "").trim() || "N/A"
        : "N/A";
    }

    return index === 0 ? String(delivery.product_model || "").trim() || "N/A" : "N/A";
  };

  const productRows = allProducts.map((name, index) => {
    const pid = orderProductIdsResolved[index];
    const serial = orderProductSerials[index] || "";
    const statusById = pid ? productStatuses[String(pid)] : "";
    const fallbackStatus = String(extendedDelivery.status || "").trim().toLowerCase();
    const statusValue = statusById || (fallbackStatus === "delivered" ? "deliveryed" : fallbackStatus || "pending");
    return {
      id: pid || 0,
      name,
      serial,
      model: orderProductModels[index] || (index === 0 ? String(delivery.product_model || "").trim() : ""),
      deliveryType: pid ? humanizeDeliveryType(deliveryTypeMap[String(pid)] || delivery.delivery_type) : humanizeDeliveryType(delivery.delivery_type),
      status: statusValue,
    };
  });
  const deliveredRows = (() => {
    if (deliveredProductIds.length > 0) {
      return deliveredProductIds.map((id, index) => {
        const orderMatch = orderProductsById.get(id);
        const fallbackOrderRow = productRows[orderProductIdsResolved.findIndex((entry) => entry === id)];
        const resolvedName =
          deliveredProductNames[index] || orderMatch?.name || fallbackOrderRow?.name || (id > 0 ? `Product #${id}` : "N/A");
        return {
          id,
          name: resolvedName,
          serial:
            deliveredProductSerials[index] ||
            orderMatch?.serial ||
            fallbackOrderRow?.serial ||
            resolveOrderProductDetail(id, resolvedName, "serial") ||
            (index === 0
              ? String(delivery.delivery_serial_number || delivery.product_serial_number || delivery.serial_number || "").trim()
              : "") ||
            "N/A",
          model:
            deliveredProductModels[index] ||
            orderMatch?.model ||
            fallbackOrderRow?.model ||
            resolveOrderProductDetail(id, resolvedName, "model") ||
            String(delivery.product_model || "").trim() ||
            "N/A",
          deliveryType: humanizeDeliveryType(deliveryTypeMap[String(id)] || fallbackOrderRow?.deliveryType || delivery.delivery_type),
          status: "Delivered",
        };
      });
    }

    const maxLength = Math.max(
      deliveredProductNames.length,
      deliveredProductSerials.length,
      deliveredProductModels.length,
      delivery.product_name ? 1 : 0,
    );

    if (maxLength > 0) {
      return Array.from({ length: maxLength }, (_, index) => {
        const name = deliveredProductNames[index] || orderProductNames[index] || (index === 0 ? String(delivery.product_name || "N/A") : `Product ${index + 1}`);
        return {
          id: 0,
          name,
          serial: resolveDeliveredFieldByIndex(index, name, "serial"),
          model: resolveDeliveredFieldByIndex(index, name, "model"),
          deliveryType: humanizeDeliveryType(delivery.delivery_type),
          status: "Delivered",
        };
      }).filter((entry) => entry.name !== "N/A" || entry.serial !== "N/A" || entry.model !== "N/A");
    }

    return productRows
      .filter((row) => row.status === "deliveryed")
      .map((row) => ({
        ...row,
        status: "Delivered",
        model: row.model || "N/A",
        serial: row.serial || "N/A",
      }));
  })();
  const pendingRows = (() => {
    const deliveredIdSet = new Set(deliveredRows.map((row) => row.id).filter((id) => id > 0));
    const deliveredNameCount = new Map<string, number>();

    deliveredRows.forEach((row) => {
      const key = String(row.name || "").trim().toLowerCase();
      if (!key) return;
      deliveredNameCount.set(key, (deliveredNameCount.get(key) || 0) + 1);
    });

    return productRows.filter((row) => {
      if (row.id > 0 && deliveredIdSet.has(row.id)) return false;
      const key = String(row.name || "").trim().toLowerCase();
      if (!key) return true;
      const current = deliveredNameCount.get(key) || 0;
      if (current <= 0) return true;
      deliveredNameCount.set(key, current - 1);
      return false;
    });
  })();
  const formatProductLine = (
    row: { id?: number; name: string; serial: string; model?: string; deliveryType?: string },
    index: number,
  ) =>
    [
      `${index + 1}. ${row.name}`,
      row.model ? `Model Number: ${row.model}` : "",
      row.serial ? `Serial Number: ${row.serial}` : "",
      row.deliveryType ? `Delivery Type: ${row.deliveryType}` : "",
    ]
      .filter(Boolean)
      .join(" | ");


  return `
    <div style="font-family:Arial,sans-serif;background:linear-gradient(180deg,#f5f3ff 0%,#ffffff 28%);padding:32px;color:#0f172a;">
      <div style="background:#ffffff;border:1px solid #ddd6fe;border-radius:24px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,0.08);">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#7c3aed 0%,#8b5cf6 55%,#4c1d95 100%);color:#ffffff;">
          <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
            <div>
              <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.8;margin-bottom:8px;">Raj Communication</div>
              <h1 style="margin:0;font-size:32px;line-height:1.1;">Delivery Receipt</h1>
              <p style="margin:10px 0 0;font-size:14px;opacity:0.88;">Clean handover summary for delivery records, client confirmation, and internal follow-up.</p>
            </div>
            <div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);padding:16px 18px;border-radius:18px;min-width:220px;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.3px;opacity:0.75;">Delivery No</div>
              <div style="font-size:24px;font-weight:700;margin-top:6px;">${escapeReceiptHtml(deliveryCode)}</div>
              <div style="font-size:12px;margin-top:8px;opacity:0.8;">Order ${escapeReceiptHtml(orderCode)}</div>
            </div>
          </div>
        </div>
        <div style="padding:28px 32px 32px;">
          <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:20px;margin-bottom:22px;">
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:18px;padding:20px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#7c3aed;margin-bottom:14px;">Client & Contact</div>
              <div style="font-size:22px;font-weight:700;margin-bottom:6px;">${escapeReceiptHtml(delivery.client_name || "N/A")}</div>
              <div style="font-size:14px;color:#334155;margin-bottom:4px;"><strong>Contact:</strong> ${escapeReceiptHtml(contactName)}</div>
              <div style="font-size:14px;color:#334155;">${escapeReceiptHtml(contactPhone)}</div>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:20px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:14px;">Delivery Status</div>
              <div style="display:flex;flex-wrap:wrap;gap:10px;">
                <span style="background:#ffffff;border:1px solid #d8b4fe;color:#6d28d9;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;">${escapeReceiptHtml(status)}</span>
                <span style="background:#ffffff;border:1px solid #cbd5e1;color:#0f172a;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;">${escapeReceiptHtml(humanizeDeliveryType(delivery.delivery_type))}</span>
              </div>
              <div style="margin-top:16px;font-size:14px;color:#334155;"><strong>Delivery Person:</strong> ${escapeReceiptHtml(delivery.delivery_person || "Not Assigned")}</div>
              <div style="margin-top:8px;font-size:14px;color:#334155;"><strong>Scheduled Date:</strong> ${escapeReceiptHtml(scheduledDate)}</div>
              <div style="margin-top:8px;font-size:14px;color:#334155;"><strong>Delivered Date:</strong> ${escapeReceiptHtml(deliveredDate)}</div>
              <div style="margin-top:8px;font-size:14px;color:#334155;"><strong>Final Cost:</strong> Rs. ${escapeReceiptHtml(deliveryFinalCost)}</div>
            </div>
          </div>
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:22px;margin-bottom:22px;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:14px;">Order & Product</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
              <div>
                <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px;">Order Code</div>
                <div style="font-size:20px;font-weight:700;color:#0f172a;">${escapeReceiptHtml(orderCode)}</div>
              </div>
            </div>
            <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              <div style="padding:12px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:#166534;margin-bottom:8px;"><strong>Delivered Products</strong></div>
                <div style="font-size:14px;line-height:1.7;color:#14532d;">
                  ${
                    deliveredRows.length > 0
                      ? deliveredRows.map((row, index) => escapeReceiptHtml(formatProductLine(row, index))).join("<br/>")
                      : "No delivered products"
                  }
                </div>
              </div>
              <div style="padding:12px;border:1px solid #fecaca;background:#fef2f2;border-radius:12px;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:#991b1b;margin-bottom:8px;"><strong>Remaining Pending Products</strong></div>
                <div style="font-size:14px;line-height:1.7;color:#7f1d1d;">
                  ${
                    pendingRows.length > 0
                      ? pendingRows.map((row, index) => escapeReceiptHtml(formatProductLine(row, index))).join("<br/>")
                      : "No pending products"
                  }
                </div>
              </div>
            </div>
            <div style="margin-top:14px;font-size:14px;line-height:1.7;color:#334155;"><strong>Replacement Products:</strong> ${escapeReceiptHtml(replacementProducts.length > 0 ? replacementProducts.join(", ") : "No replacement")}</div>
          </div>
          <div style="background:linear-gradient(135deg,#f8fafc 0%,#ffffff 100%);border:1px solid #e2e8f0;border-radius:18px;padding:22px;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:14px;">Delivery Address</div>
            <div style="font-size:15px;line-height:1.8;color:#334155;">${escapeReceiptHtml(address)}</div>
            ${
              delivery.notes
                ? `<div style="margin-top:14px;padding-top:14px;border-top:1px dashed #cbd5e1;font-size:14px;color:#475569;"><strong>Notes:</strong> ${escapeReceiptHtml(delivery.notes)}</div>`
                : ""
            }
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:24px;">
            <div style="padding:16px 0 0;border-top:2px solid #cbd5e1;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.4px;color:#64748b;margin-bottom:10px;">Received By</div>
              <div style="height:34px;"></div>
              <div style="font-size:13px;color:#475569;">Client Signature</div>
            </div>
            <div style="padding:16px 0 0;border-top:2px solid #cbd5e1;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.4px;color:#64748b;margin-bottom:10px;">Delivered By</div>
              <div style="height:34px;"></div>
              <div style="font-size:13px;color:#475569;">Raj Communication</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b;">
            <div>Receipt generated for delivery confirmation and service records.</div>
            <div>This is a computer-generated delivery receipt.</div>
          </div>
        </div>
      </div>
    </div>
  `;
};

export const downloadReceiptPdf = async (markup: string, filename: string) => {
  const { html2canvas, jsPDF } = await loadReceiptPdfModules();
  const receiptDiv = document.createElement("div");
  receiptDiv.style.position = "fixed";
  receiptDiv.style.left = "-9999px";
  receiptDiv.style.top = "0";
  receiptDiv.style.width = "900px";
  receiptDiv.style.backgroundColor = "white";
  receiptDiv.innerHTML = markup;
  document.body.appendChild(receiptDiv);

  try {
    const canvas = await html2canvas(receiptDiv, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, 190, (canvas.height * 190) / canvas.width);
    pdf.save(filename);
  } finally {
    document.body.removeChild(receiptDiv);
  }
};

export const warmReceiptPdfRenderer = () => {
  void loadReceiptPdfModules();
};

export const openReceiptPrintWindow = (title: string, markup: string) => {
  const printDocument = `
    <!doctype html>
    <html>
      <head>
        <title>${escapeReceiptHtml(title)}</title>
        <style>
          @page {
            size: A4;
            margin: 6mm;
          }

          html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: #e2e8f0;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }

          * {
            box-sizing: border-box;
          }

          img, svg, canvas {
            max-width: 100%;
          }

          @media print {
            html, body {
              background: #ffffff;
              width: 210mm;
            }

            * {
              animation: none !important;
              transition: none !important;
              box-shadow: none !important;
              filter: none !important;
              text-shadow: none !important;
            }

            body > div {
              padding: 8px !important;
              margin: 0 !important;
              background: #ffffff !important;
            }

            body > div > div {
              border: 1px solid #ddd6fe !important;
              box-shadow: none !important;
              border-radius: 18px !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: none !important;
              overflow: hidden !important;
            }

            body > div > div > div {
              padding: 12px 14px 14px !important;
            }
          }
        </style>
      </head>
      <body>
        ${markup}
      </body>
    </html>
  `;

  try {
    const printWindow = window.open("", "receipt_print_window", "width=960,height=1080");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printDocument);
      printWindow.document.close();

      const triggerPrint = () => {
        printWindow.focus();
        printWindow.print();
      };

      if (printWindow.document.readyState === "complete") {
        requestAnimationFrame(triggerPrint);
      } else {
        printWindow.onload = () => requestAnimationFrame(triggerPrint);
      }

      return true;
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const cleanup = () => {
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 200);
    };

    const printFrame = iframe.contentWindow;
    const frameDocument = iframe.contentDocument || printFrame?.document;

    if (!printFrame || !frameDocument) {
      cleanup();
      throw new Error("Print iframe unavailable");
    }

    iframe.onload = () => {
      requestAnimationFrame(() => {
        printFrame.focus();
        printFrame.print();
        cleanup();
      });
    };

    frameDocument.open();
    frameDocument.write(printDocument);
    frameDocument.close();

    return true;
  } catch {
    const printWindow = window.open("", "_blank", "width=960,height=1080");
    if (!printWindow) return false;

    printWindow.document.write(printDocument);
    printWindow.document.close();
    printWindow.onload = () => {
      requestAnimationFrame(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      });
    };

    return true;
  }
};


