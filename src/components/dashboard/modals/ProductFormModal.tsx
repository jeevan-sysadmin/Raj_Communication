import { Fragment, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { motion } from "framer-motion";
import {
  FiBox,
  FiCheckSquare,
  FiCpu,
  FiCreditCard,
  FiDisc,
  FiFileText,
  FiLoader,
  FiLayers,
  FiPackage,
  FiSave,
  FiTag,
  FiX,
  FiZap,
} from "react-icons/fi";
import type { ProductForm } from "../types";
import { splitBatchValues, splitSerialValues } from "../productBatch";

interface ProductFormModalProps {
  show: boolean;
  editMode: boolean;
  productForm: ProductForm;
  onClose: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isSubmitting?: boolean;
}

interface ProductIdentityPair {
  id: number;
  productName: string;
  serialNumber: string;
}

const PDF_CATEGORY_OPTIONS = [
  "CAMERA",
  "DVR",
  "NVR",
  "HARDDISK",
  "SOLAR CAMERA",
  "PTCAMERA",
  "SD CARD",
  "SSD",
  "POWER SUPPLY",
  "MONITOR",
  "EXTENDER",
  "MEDIA CONVERTER",
  "PTZCAMERA",
  "POE SWITCH",
  "DESKTOP SWITCH",
  "TV",
  "UPS",
  "OTHERS",
];
 
const ProductFormModal = ({
  show,
  editMode,
  productForm,
  onClose,
  onChange,
  onSubmit,
  isSubmitting = false,
}: ProductFormModalProps) => {
  const serialInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const productNameInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pairSeedRef = useRef(0);
  const wasVisibleRef = useRef(false);
  const syncingLocalChangeRef = useRef(false);
  const asText = (value: unknown) => (typeof value === "string" ? value : String(value ?? ""));
  const emitProductFieldChange = (name: "product_name" | "serial_number", value: string) =>
    onChange({
      target: {
        name,
        value,
      },
    } as ChangeEvent<HTMLInputElement>);
  const emitFormFieldChange = (name: string, value: string) =>
    onChange({
      target: {
        name,
        value,
      },
    } as ChangeEvent<HTMLInputElement>);

  const safeProductForm: ProductForm = {
    id: productForm?.id,
    product_name: asText(productForm?.product_name),
    serial_number: asText(productForm?.serial_number),
    stock_quantity: asText(productForm?.stock_quantity),
    product_rows_json: asText(productForm?.product_rows_json),
    is_spare_product: Boolean(productForm?.is_spare_product),
    brand: asText(productForm?.brand),
    model: asText(productForm?.model),
    category: asText(productForm?.category) || "cctv",
    claim_type: asText(productForm?.claim_type) || "none",
    specifications: asText(productForm?.specifications),
    purchase_date: asText(productForm?.purchase_date),
    warranty_period: asText(productForm?.warranty_period),
    price: asText(productForm?.price),
    status: asText(productForm?.status) || "active",
  };
  const buildPairsFromForm = (): ProductIdentityPair[] => {
    const productNames = splitBatchValues(safeProductForm.product_name);
    const serialNumbers = splitSerialValues(safeProductForm.serial_number);
    const pairCount = Math.max(productNames.length, serialNumbers.length, 1);

    return Array.from({ length: pairCount }, (_, index) => ({
      id: pairSeedRef.current++,
      productName: productNames[index] || "",
      serialNumber: serialNumbers[index] || "",
    }));
  };

  const [productPairs, setProductPairs] = useState<ProductIdentityPair[]>(() => buildPairsFromForm());

  const serializePairsForSubmission = (pairs: ProductIdentityPair[]) => {
    const productNames: string[] = [];
    const serialNumbers: string[] = [];

    pairs.forEach((pair) => {
      const productName = pair.productName.trim();
      const serialInput = pair.serialNumber.trim();

      if (editMode) {
        if (productName.length > 0) productNames.push(productName);
        if (serialInput.length > 0) serialNumbers.push(serialInput);
        return;
      }

      const serialEntries = splitSerialValues(serialInput);
      if (serialEntries.length > 0) {
        if (productName.length > 0) {
          serialEntries.forEach((serial) => {
            productNames.push(productName);
            serialNumbers.push(serial);
          });
        } else {
          serialEntries.forEach((serial) => serialNumbers.push(serial));
        }
        return;
      }

      if (productName.length > 0) productNames.push(productName);
    });

    return { productNames, serialNumbers };
  };

  const syncFormFromPairs = (pairs: ProductIdentityPair[]) => {
    const { productNames, serialNumbers } = serializePairsForSubmission(pairs);

    syncingLocalChangeRef.current = true;
    emitProductFieldChange("product_name", productNames.join("\n"));
    emitProductFieldChange("serial_number", serialNumbers.join("\n"));
    window.setTimeout(() => {
      syncingLocalChangeRef.current = false;
    }, 0);
  };

  useEffect(() => {
    if (!show) {
      wasVisibleRef.current = false;
      return;
    }

    if (!wasVisibleRef.current) {
      const initialPairs = buildPairsFromForm();
      setProductPairs(initialPairs);
      syncFormFromPairs(initialPairs);
      wasVisibleRef.current = true;

      if (!editMode) {
        const timer = window.setTimeout(() => {
          productNameInputRefs.current[0]?.focus();
        }, 160);
        return () => window.clearTimeout(timer);
      }
    }

    wasVisibleRef.current = show;
  }, [show, editMode, safeProductForm.product_name, safeProductForm.serial_number]);

  useEffect(() => {
    if (!show || !wasVisibleRef.current || syncingLocalChangeRef.current) return;

    const externalNames = splitBatchValues(safeProductForm.product_name);
    const externalSerials = splitSerialValues(safeProductForm.serial_number);
    const { productNames: localNames, serialNumbers: localSerials } = serializePairsForSubmission(productPairs);
    const isSame =
      externalNames.length === localNames.length &&
      externalSerials.length === localSerials.length &&
      externalNames.every((value, index) => value === localNames[index]) &&
      externalSerials.every((value, index) => value === localSerials[index]);

    if (!isSame) {
      setProductPairs(buildPairsFromForm());
    }
  }, [show, productPairs, safeProductForm.product_name, safeProductForm.serial_number]);

  useEffect(() => {
    if (!show || editMode) return;
    const serialCount = splitSerialValues(safeProductForm.serial_number).length;
    if (serialCount <= 0) return;
    const nextQuantity = String(serialCount);
    if (safeProductForm.stock_quantity !== nextQuantity) {
      emitFormFieldChange("stock_quantity", nextQuantity);
    }
  }, [show, editMode, safeProductForm.serial_number, safeProductForm.stock_quantity]);

  const handlePairChange = (
    index: number,
    field: "productName" | "serialNumber",
    value: string,
  ) => {
    setProductPairs((prev) => {
      const next = prev.map((pair, pairIndex) =>
        pairIndex === index ? { ...pair, [field]: value } : pair,
      );
      syncFormFromPairs(next);
      return next;
    });
  };

  const removeProductPair = (indexToRemove: number) => {
    setProductPairs((prev) => {
      if (prev.length <= 1) {
        const cleared = [{ ...prev[0], productName: "", serialNumber: "" }];
        syncFormFromPairs(cleared);
        return cleared;
      }

      const next = prev.filter((_, index) => index !== indexToRemove);
      syncFormFromPairs(next);
      return next;
    });
  };

  if (!show) return null;

  const serialEntries = splitSerialValues(safeProductForm.serial_number);
  const serialValue =
    serialEntries.length > 0
      ? `${serialEntries.length} Serial Number${serialEntries.length > 1 ? "s" : ""}`
      : "Ready for barcode scanner";
  const productSerialGroups = productPairs
      .map((pair) => ({
      productName: pair.productName.trim(),
      serialNumbers: splitSerialValues(pair.serialNumber),
    }))
    .filter((entry) => entry.productName.length > 0);
  const progressCount = [
    safeProductForm.product_name,
    safeProductForm.serial_number,
    safeProductForm.brand,
    safeProductForm.model,
    safeProductForm.specifications,
    safeProductForm.purchase_date,
    safeProductForm.warranty_period,
    safeProductForm.price,
  ].filter((value) => value.trim().length > 0).length;

  try {
    return (
      <motion.div
        className="modal-overlay-enhanced"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-content-enhanced product-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 32 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header-enhanced product-modal-header">
            <div className="modal-header-left">
              <div className="modal-icon-wrapper">
                <div className="modal-icon-bg">
                  <FiPackage />
                </div>
              </div>
              <div className="modal-title-enhanced">
                <h2>{editMode ? "Edit Product" : "Create New Product"}</h2>
                <p>
                  {editMode
                    ? "Update product, serial, claim, and spare-part details in one place."
                    : "Register products fast with scanner-friendly serial entry and clean inventory fields."}
                </p>
              </div>
            </div>
            <motion.button
              className="close-btn-enhanced"
              onClick={onClose}
              whileHover={{ rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <FiX />
            </motion.button>
          </div>

          <form onSubmit={onSubmit} className="service-form-enhanced product-form-enhanced" autoComplete="off">
            <div className="product-form-shell">
              <aside className="product-form-aside">
                <div className="product-identity-card">
                  <div className="product-identity-icon">
                    <FiBox />
                  </div>
                  <span className="product-identity-badge">
                    {safeProductForm.is_spare_product ? "Spare Product" : "Standard Product"}
                  </span>
                  <div className="product-identity-meta">
                    <span>{serialValue}</span>
                    <span>{safeProductForm.category || "Category not set"}</span>
                  </div>
                  {productSerialGroups.length > 0 && (
                    <div className="product-serial-bubbles compact">
                      {productSerialGroups.map((entry, groupIndex) => (
                        <div key={`${entry.productName}-${groupIndex}`} className="product-serial-group">
                          <strong>{`Product Name * ${entry.productName}`}</strong>
                          {entry.serialNumbers.map((serial, serialIndex) => (
                            <span
                              key={`${entry.productName}-${serial}-${serialIndex}`}
                              className="product-serial-bubble"
                            >
                              {`Serial Number ${serialIndex + 1}: ${serial}`}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="product-scan-card">
                  <div className="product-scan-header">
                    <FiZap />
                    <strong>Barcode scanner ready</strong>
                  </div>
                  <p>Click into Serial Number and scan with your hardware barcode scanner.</p>
                  <button
                    type="button"
                    className="product-scan-focus-btn"
                    onClick={() => serialInputRef.current?.focus()}
                  >
                    Focus Serial Number
                  </button>
                </div>

                <div className="product-progress-card">
                  <div className="product-progress-header">
                    <strong>Form completeness</strong>
                    <span>{progressCount}/8</span>
                  </div>
                  <div className="product-progress-track">
                    <div className="product-progress-fill" style={{ width: `${(progressCount / 8) * 100}%` }} />
                  </div>
                  <p>Best results come from product name, serial number, and category.</p>
                </div>

                {!editMode && (
                  <div className="product-progress-card">
                    <div className="product-progress-header">
                      <strong>Multiple new products</strong>
                      <span>Quick flow</span>
                    </div>
                    <p>Use Create & Add Another to keep this modal open and quickly enter the next product.</p>
                  </div>
                )}
              </aside>

              <div className="product-form-main">
                <section className="product-form-panel">
                  <div className="product-form-panel-header">
                    <div>
                      <h3>Identity & Scanner</h3>
                      <p>Fast entry for product name, serial number, and spare-product tagging.</p>
                    </div>
                    <span className="product-form-badge required">Core details</span>
                  </div>

                  <div className="form-grid product-form-grid">
                    {productPairs.map((pair, index) => (
                      <Fragment key={pair.id}>
                        <div className="form-group product-form-group">
                          {index === 0 ? (
                            <label htmlFor={`product_name_${pair.id}`}>
                              <FiPackage /> Product Name *
                            </label>
                          ) : (
                            <label htmlFor={`product_name_${pair.id}`} className="sr-only">
                              Product Name
                            </label>
                          )}
                          <div className="product-input-wrap">
                            <FiPackage className="product-input-icon" />
                            <input
                              ref={(element) => {
                                productNameInputRefs.current[index] = element;
                              }}
                              type="text"
                              id={`product_name_${pair.id}`}
                              value={pair.productName}
                              onChange={(e) => handlePairChange(index, "productName", e.target.value)}
                              placeholder={`Product Name ${index + 1}`}
                              required={index === 0}
                              className="product-input has-icon"
                            />
                          </div>
                        </div>

                        <div className="form-group product-form-group">
                          <label htmlFor={`serial_number_${pair.id}`}>
                            <FiZap /> Serial Number
                          </label>
                          <div className="product-input-wrap">
                            <FiZap className="product-input-icon textarea-icon" />
                            <textarea
                              ref={(element) => {
                                if (index === 0) serialInputRef.current = element;
                              }}
                              id={`serial_number_${pair.id}`}
                              value={pair.serialNumber}
                              onChange={(e) => handlePairChange(index, "serialNumber", e.target.value)}
                              placeholder={`Serial Number ${index + 1} (space, comma, or new line for multiple)`}
                              autoComplete="off"
                              rows={2}
                              className="product-input product-textarea has-icon scanner-input"
                            />
                          </div>
                          <small className="product-field-help">
                            Add multiple serial numbers in this box using space, comma, semicolon, or new line.
                          </small>
                          <button
                            type="button"
                            className="product-pair-cancel-btn"
                            onClick={() => removeProductPair(index)}
                            title={`Cancel Product Name ${index + 1}`}
                          >
                            <FiX />
                            Cancel Product Name
                          </button>
                        </div>
                      </Fragment>
                    ))}

                    {!editMode && (
                      <div className="form-group full-width product-form-group">
                        <small className="product-field-help">
                          Use one box for many serials.
                        </small>
                      </div>
                    )}

                    <div className="form-group product-form-group">
                      <label htmlFor="stock_quantity">
                        <FiPackage /> Quantity
                      </label>
                      <div className="product-input-wrap">
                        <FiPackage className="product-input-icon" />
                        <input
                          type="number"
                          id="stock_quantity"
                          name="stock_quantity"
                          value={safeProductForm.stock_quantity}
                          onChange={onChange}
                          placeholder="1"
                          min="0"
                          step="1"
                          className="product-input has-icon"
                        />
                      </div>
                    </div>

                    <div className="form-group full-width product-form-group">
                      <label className="product-checkbox-card">
                        <input
                          type="checkbox"
                          id="is_spare_product"
                          name="is_spare_product"
                          checked={safeProductForm.is_spare_product}
                          onChange={onChange}
                        />
                        <span className="product-checkbox-visual">
                          <FiCheckSquare />
                        </span>
                        <span className="product-checkbox-copy">
                          <strong>Mark as Replacement Product</strong>
                          <small>Use this for spare parts, stock items, and replacement components.</small>
                        </span>
                      </label>
                    </div>
                  </div>
                </section>

                <section className="product-form-panel">
                  <div className="product-form-panel-header">
                    <div>
                      <h3>Classification</h3>
                      <p>Define how this product should be organized and tracked.</p>
                    </div>
                    <span className="product-form-badge optional">Operational</span>
                  </div>

                  <div className="form-grid product-form-grid">
                    <div className="form-group product-form-group">
                      <label htmlFor="brand">
                        <FiTag /> Brand
                      </label>
                      <div className="product-input-wrap">
                        <FiTag className="product-input-icon" />
                        <input
                          type="text"
                          id="brand"
                          name="brand"
                          value={safeProductForm.brand}
                          onChange={onChange}
                          placeholder="Brand"
                          className="product-input has-icon"
                        />
                      </div>
                    </div>

                    <div className="form-group product-form-group">
                      <label htmlFor="model">
                        <FiDisc /> Model
                      </label>
                      <div className="product-input-wrap">
                        <FiDisc className="product-input-icon" />
                        <input
                          type="text"
                          id="model"
                          name="model"
                          value={safeProductForm.model}
                          onChange={onChange}
                          placeholder="Model"
                          className="product-input has-icon"
                        />
                      </div>
                    </div>

                    <div className="form-group product-form-group">
                      <label htmlFor="category">
                        <FiLayers /> Category
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={safeProductForm.category || "cctv"}
                        onChange={onChange}
                        className="product-input"
                      >
                        {PDF_CATEGORY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group product-form-group">
                      <label htmlFor="status">
                        <FiCheckSquare /> Status
                      </label>
                      <select id="status" name="status" value={safeProductForm.status || "active"} onChange={onChange} className="product-input">
                        <option value="active">Active</option>
                        <option value="handover">Handover</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="product-form-panel">
                  <div className="product-form-panel-header">
                    <div>
                      <h3>Commercial & Technical</h3>
                      <p>Optional pricing, warranty, purchase, and specification details.</p>
                    </div>
                    <span className="product-form-badge soft">Optional</span>
                  </div>

                  <div className="form-grid product-form-grid">
                    <div className="form-group product-form-group">
                      <label htmlFor="price">
                        <FiCreditCard /> Price (Rs.)
                      </label>
                      <div className="product-input-wrap">
                        <FiCreditCard className="product-input-icon" />
                        <input
                          type="number"
                          id="price"
                          name="price"
                          value={safeProductForm.price}
                          onChange={onChange}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="product-input has-icon"
                        />
                      </div>
                    </div>

                    <div className="form-group product-form-group">
                      <label htmlFor="purchase_date">
                        <FiDisc /> Purchase Date
                      </label>
                      <input
                        type="date"
                        id="purchase_date"
                        name="purchase_date"
                        value={safeProductForm.purchase_date}
                        onChange={onChange}
                        className="product-input"
                      />
                    </div>

                    <div className="form-group product-form-group">
                      <label htmlFor="warranty_period">
                        <FiCpu /> Warranty Period
                      </label>
                      <div className="product-input-wrap">
                        <FiCpu className="product-input-icon" />
                        <select
                          id="warranty_period"
                          name="warranty_period"
                          value={safeProductForm.warranty_period}
                          onChange={onChange}
                          className="product-input has-icon"
                        >
                          <option value="">Select Warranty Period</option>
                          <option value="1 year">1 Year</option>
                          <option value="2 years">2 Years</option>
                          <option value="3 years">3 Years</option>
                          <option value="4 years">4 Years</option>
                          <option value="5 years">5 Years</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group full-width product-form-group">
                      <label htmlFor="specifications">
                        <FiFileText /> Specifications
                      </label>
                      <div className="product-input-wrap">
                        <FiFileText className="product-input-icon textarea-icon" />
                        <textarea
                          id="specifications"
                          name="specifications"
                          value={safeProductForm.specifications}
                          onChange={onChange}
                          placeholder="Important specifications, compatibility notes, hardware details, or spare-part remarks..."
                          rows={4}
                          className="product-input product-textarea has-icon"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="form-actions-enhanced product-form-actions">
              <div className="product-form-actions-note">Tip: use Create & Add Another for rapid sequential product entry.</div>
              <div className="product-form-actions-buttons">
                <motion.button
                  type="button"
                  className="btn-secondary-enhanced"
                  onClick={onClose}
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                {!editMode && (
                  <motion.button
                    type="submit"
                    className="btn-secondary-enhanced"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    name="submit_action"
                    value="create_next"
                  >
                    <FiSave />
                    Create & Add Another
                  </motion.button>
                )}
                <motion.button
                  type="submit"
                  className="btn-primary-enhanced"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  name="submit_action"
                  value={editMode ? "update" : "create_close"}
                >
                  {isSubmitting ? <FiLoader className="btn-loading-spinner" /> : <FiSave />}
                  {isSubmitting ? "Saving..." : editMode ? "Update Product" : "Create Product"}
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
  } catch (error) {
    console.error("ProductFormModal render error:", error);
    return (
      <div className="modal-overlay-enhanced" onClick={onClose}>
        <div className="modal-content-enhanced product-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header-enhanced product-modal-header">
            <div className="modal-title-enhanced">
              <h2>{editMode ? "Edit Product" : "Create New Product"}</h2>
              <p>Recovered from a render error. Please continue with basic fields.</p>
            </div>
            <button type="button" className="close-btn-enhanced" onClick={onClose}>
              <FiX />
            </button>
          </div>
          <form onSubmit={onSubmit} className="service-form-enhanced product-form-enhanced" autoComplete="off">
            <div className="form-grid product-form-grid">
              <div className="form-group product-form-group">
                <label htmlFor="product_name_fallback">Product Name *</label>
                <input
                  id="product_name_fallback"
                  name="product_name"
                  className="product-input"
                  value={safeProductForm.product_name}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="form-group product-form-group">
                <label htmlFor="price_fallback">Price</label>
                <input
                  id="price_fallback"
                  name="price"
                  type="number"
                  className="product-input"
                  value={safeProductForm.price}
                  onChange={onChange}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group product-form-group">
                <label htmlFor="stock_quantity_fallback">Quantity</label>
                <input
                  id="stock_quantity_fallback"
                  name="stock_quantity"
                  type="number"
                  className="product-input"
                  value={safeProductForm.stock_quantity}
                  onChange={onChange}
                  min="0"
                  step="1"
                />
              </div>
            </div>
            <div className="product-form-actions-buttons">
              <button type="button" className="btn-secondary-enhanced" onClick={onClose}>
                Cancel
              </button>
              {!editMode && (
                <button type="submit" name="submit_action" value="create_next" className="btn-secondary-enhanced">
                  <FiSave /> Create & Add Another
                </button>
              )}
              <button type="submit" name="submit_action" value={editMode ? "update" : "create_close"} className="btn-primary-enhanced">
                <FiSave /> {editMode ? "Update Product" : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
};

export default ProductFormModal;



