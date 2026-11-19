"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import {
  formatFcfa,
  parseWholeNumber,
  type ProductOption,
  type UnitLabel,
} from "@/components/purchase/purchase-display";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import type { PurchaseItem } from "@/types/purchase/purchase";
import type { ChangePurchaseItemRequest, PurchaseLineRequest } from "@/types/purchase/purchase-dto";

type PurchaseItemModalProps = {
  open: boolean;
  /** Must be a stable function (useCallback). */
  onClose: () => void;
  /** The line being changed (quantity and price only), or null to add a line. */
  item: PurchaseItem | null;
  /** Purchasable products with their units. Only used when adding. */
  products: ProductOption[];
  /** The purchase's current lines, so the same product + unit cannot be added twice. */
  existingItems: PurchaseItem[];
  unitLabel?: UnitLabel;
  /** Should reject on failure; the error is shown in the form. */
  onAdd: (request: PurchaseLineRequest) => Promise<unknown>;
  /** Should reject on failure; the error is shown in the form. */
  onUpdate: (purchaseItemId: string, request: ChangePurchaseItemRequest) => Promise<unknown>;
};

type Field = "product" | "unit" | "quantity" | "unitPrice";
type Errors = Partial<Record<Field | "form", string>>;

export default function PurchaseItemModal({
  open,
  onClose,
  item,
  products,
  existingItems,
  unitLabel,
  onAdd,
  onUpdate,
}: PurchaseItemModalProps) {
  const formId = useId();
  const [productId, setProductId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = item !== null;

  useEffect(() => {
    setProductId(open ? (item?.productId ?? "") : "");
    setUnitId(open ? (item?.unitId ?? "") : "");
    setQuantity(open && item ? String(item.orderedQuantity) : "");
    setUnitPrice(open && item ? String(item.unitPurchasePrice) : "");
    setErrors({});
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  const product = products.find((p) => p.id === productId);
  const units = product?.units ?? [];
  const q = parseWholeNumber(quantity);
  const p = parseWholeNumber(unitPrice);
  const preview = q >= 1 && p >= 1 ? q * p : null;

  function changeProduct(id: string) {
    setProductId(id);
    const nextUnits = products.find((x) => x.id === id)?.units ?? [];
    setUnitId(nextUnits.length === 1 ? nextUnits[0].id : "");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const next: Errors = {};
    if (!isEdit) {
      if (!productId) next.product = "Choose a product.";
      if (!unitId) next.unit = "Choose a unit.";
      else if (existingItems.some((x) => x.productId === productId && x.unitId === unitId)) {
        next.unit = "This product is already ordered in this unit. Change that line instead.";
      }
    }
    if (!(q >= 1)) next.quantity = "Enter a whole number, 1 or more.";
    if (!(p >= 1)) next.unitPrice = "Enter a whole amount in FCFA, 1 or more.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      if (item) {
        if (q !== item.orderedQuantity || p !== item.unitPurchasePrice) {
          await onUpdate(item.id, { quantity: q, unitPrice: p });
        }
      } else {
        await onAdd({ productId, unitId, quantity: q, unitPrice: p });
      }
      onClose();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setErrors({
          product: error.fieldError("productId"),
          unit: error.fieldError("unitId"),
          quantity: error.fieldError("quantity"),
          unitPrice: error.fieldError("unitPrice"),
          form: error.message,
        });
      } else {
        setErrors({ form: getErrorMessage(error, "Could not save the line.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const productFieldId = `${formId}-product`;
  const unitFieldId = `${formId}-unit`;
  const quantityFieldId = `${formId}-quantity`;
  const priceFieldId = `${formId}-price`;
  const describedBy = (id: string, error?: string) => (error ? `${id}-error` : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      title={isEdit ? "Change line" : "Add line"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {isEdit ? "Save line" : "Add line"}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {item ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{item.productName ?? "Unknown product"}</span>
            {" · "}
            {unitLabel?.(item.unitId) ?? "Unit"}
            {item.conversionFactor > 1 && ` (x${item.conversionFactor})`}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={productFieldId} label="Product" error={errors.product}>
              <Select
                id={productFieldId}
                value={productId}
                onChange={(e) => changeProduct(e.target.value)}
                invalid={!!errors.product}
                aria-describedby={describedBy(productFieldId, errors.product)}
              >
                <option value="">Choose a product</option>
                {products.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id={unitFieldId} label="Unit" error={errors.unit}>
              <Select
                id={unitFieldId}
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                disabled={!productId}
                invalid={!!errors.unit}
                aria-describedby={describedBy(unitFieldId, errors.unit)}
              >
                <option value="">Choose a unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.conversionFactor && u.conversionFactor > 1 ? `${u.name} (x${u.conversionFactor})` : u.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={quantityFieldId} label="Quantity" error={errors.quantity}>
            <Input
              id={quantityFieldId}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              invalid={!!errors.quantity}
              aria-describedby={describedBy(quantityFieldId, errors.quantity)}
            />
          </FormField>
          <FormField id={priceFieldId} label="Unit price (FCFA)" error={errors.unitPrice}>
            <Input
              id={priceFieldId}
              inputMode="numeric"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              invalid={!!errors.unitPrice}
              aria-describedby={describedBy(priceFieldId, errors.unitPrice)}
            />
          </FormField>
        </div>

        <p className="text-sm text-muted-foreground">
          Line total{" "}
          <span className="ml-1 font-semibold text-foreground tabular-nums">
            {preview === null ? "-" : formatFcfa(preview)}
          </span>
        </p>

        {errors.form && (
          <p role="alert" className="text-sm text-red-600">
            {errors.form}
          </p>
        )}
      </form>
    </Modal>
  );
}
