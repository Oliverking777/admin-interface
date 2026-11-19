"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Drawer from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { MIN_PRICE_AMOUNT, MIN_PRICE_QUANTITY, type Price } from "@/types/product/price";
import type { ChangeProductPriceRequest, CreateProductPriceRequest } from "@/types/product/price-dto";
import type { VariantUnit } from "@/types/product/product";

type PriceDrawerProps = {
  open: boolean;
  /** Must be a stable function (useCallback): Drawer re-focuses its close button whenever this changes. */
  onClose: () => void;
  /** The price being changed, or null to create a new one. */
  price: Price | null;
  /** Every unit of the variant being priced. Only the active ones can be chosen for a new price. */
  units: VariantUnit[];
  /** Unit preselected when adding a price from a unit's card. */
  defaultUnitId?: string;
  /** Should reject on failure; the error is shown in the form. */
  onCreate: (request: CreateProductPriceRequest) => Promise<unknown>;
  /** Should reject on failure; the error is shown in the form. */
  onChange: (priceId: string, request: ChangeProductPriceRequest) => Promise<unknown>;
};

type Field = "unitId" | "price" | "minimumQuantity" | "maximumQuantity" | "effectiveTo";
type Errors = Partial<Record<Field | "range" | "form", string>>;

const WHOLE_NUMBER = /^\d+$/;

/** A date picked in the UI becomes midnight UTC. */
function toUtcStart(date: string): string {
  return `${date}T00:00:00Z`;
}

export default function PriceDrawer({
  open,
  onClose,
  price,
  units,
  defaultUnitId,
  onCreate,
  onChange,
}: PriceDrawerProps) {
  const formId = useId();
  const [unitId, setUnitId] = useState("");
  const [amount, setAmount] = useState("");
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = price !== null;
  const activeUnits = units.filter((u) => u.status === "ACTIVE");
  const editedUnit = price ? units.find((u) => u.unitId === price.unitId) : undefined;

  useEffect(() => {
    setUnitId(open ? (price?.unitId ?? defaultUnitId ?? "") : "");
    setAmount(open && price ? String(price.amount) : "");
    setMinimum(open ? String(price?.minimumQuantity ?? MIN_PRICE_QUANTITY) : "");
    setMaximum(open && price?.maximumQuantity != null ? String(price.maximumQuantity) : "");
    setFrom("");
    setTo("");
    setErrors({});
    setSubmitting(false);
  }, [open, price, defaultUnitId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const next: Errors = {};
    const amountText = amount.trim();
    const minText = minimum.trim();
    const maxText = maximum.trim();

    if (!isEdit && !unitId) next.unitId = "Choose a unit.";

    const amountValue = Number(amountText);
    if (!WHOLE_NUMBER.test(amountText) || amountValue < MIN_PRICE_AMOUNT) {
      next.price = `Enter a whole price of at least ${MIN_PRICE_AMOUNT} FCFA.`;
    }

    const minValue = Number(minText);
    if (!WHOLE_NUMBER.test(minText) || minValue < MIN_PRICE_QUANTITY) {
      next.minimumQuantity = `At least ${MIN_PRICE_QUANTITY}.`;
    }

    let maxValue: number | null = null;
    if (maxText) {
      maxValue = Number(maxText);
      if (!WHOLE_NUMBER.test(maxText) || maxValue < MIN_PRICE_QUANTITY) {
        next.maximumQuantity = `At least ${MIN_PRICE_QUANTITY}.`;
      } else if (!next.minimumQuantity && maxValue < minValue) {
        next.maximumQuantity = "Cannot be below the minimum.";
      }
    }

    if (!isEdit && from && to && to <= from) next.effectiveTo = "Must be after the start date.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      if (price) {
        // Only send what changed. A new range always goes as minimum + maximum together (backend rule).
        const request: ChangeProductPriceRequest = {};
        if (amountValue !== price.amount) request.price = amountValue;
        if (minValue !== price.minimumQuantity || maxValue !== price.maximumQuantity) {
          request.minimumQuantity = minValue;
          if (maxValue !== null) request.maximumQuantity = maxValue;
        }
        if (Object.keys(request).length > 0) await onChange(price.id, request);
      } else {
        await onCreate({
          unitId,
          price: amountValue,
          minimumQuantity: minValue,
          ...(maxValue !== null ? { maximumQuantity: maxValue } : {}),
          ...(from ? { effectiveFrom: toUtcStart(from) } : {}),
          ...(to ? { effectiveTo: toUtcStart(to) } : {}),
        });
      }
      onClose();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setErrors({
          unitId: error.fieldError("unitId"),
          price: error.fieldError("price"),
          minimumQuantity: error.fieldError("minimumQuantity"),
          maximumQuantity: error.fieldError("maximumQuantity"),
          effectiveTo: error.fieldError("effectiveTo"),
          form: error.message,
        });
      } else if (isApiError(error) && error.isConflict) {
        // The page already blocks inactive products, variants and units, so a 409 here is almost always an overlap.
        setErrors({ range: error.message });
      } else {
        setErrors({ form: getErrorMessage(error, "Could not save the price.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const unitFieldId = `${formId}-unit`;
  const amountId = `${formId}-amount`;
  const minId = `${formId}-min`;
  const maxId = `${formId}-max`;
  const rangeInvalid = !!errors.range;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Change price" : "Add price"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {isEdit ? "Save new price" : "Create price"}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {isEdit && (
          <p className="border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Saving keeps the old price in the history, closes it, and creates a new price with these values.
          </p>
        )}

        <FormField id={unitFieldId} label="Unit" error={errors.unitId}>
          {isEdit ? (
            <Input id={unitFieldId} value={editedUnit?.unitName ?? ""} readOnly disabled />
          ) : (
            <Select
              id={unitFieldId}
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              invalid={!!errors.unitId}
              aria-describedby={errors.unitId ? `${unitFieldId}-error` : undefined}
            >
              <option value="">Select a unit</option>
              {activeUnits.map((u) => (
                <option key={u.unitId} value={u.unitId}>
                  {u.unitName ?? "Unknown unit"}
                  {u.unitCode ? ` (${u.unitCode})` : ""}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField id={amountId} label="Price per unit (FCFA)" error={errors.price}>
          <Input
            id={amountId}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoComplete="off"
            invalid={!!errors.price}
            aria-describedby={errors.price ? `${amountId}-error` : undefined}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField id={minId} label="Minimum quantity" error={errors.minimumQuantity}>
            <Input
              id={minId}
              inputMode="numeric"
              value={minimum}
              onChange={(e) => setMinimum(e.target.value)}
              autoComplete="off"
              invalid={!!errors.minimumQuantity || rangeInvalid}
              aria-describedby={errors.minimumQuantity ? `${minId}-error` : undefined}
            />
          </FormField>
          <FormField
            id={maxId}
            label="Maximum quantity"
            error={errors.maximumQuantity}
            hint="Empty means no upper limit."
          >
            <Input
              id={maxId}
              inputMode="numeric"
              value={maximum}
              onChange={(e) => setMaximum(e.target.value)}
              autoComplete="off"
              invalid={!!errors.maximumQuantity || rangeInvalid}
              aria-describedby={errors.maximumQuantity ? `${maxId}-error` : undefined}
            />
          </FormField>
        </div>
        {errors.range && (
          <p role="alert" className="text-sm text-red-600">
            {errors.range}
          </p>
        )}

        {!isEdit && (
          <div className="flex flex-col gap-2">
            <DatePicker label="Starts" value={from} onChange={setFrom} />
            <p className="text-sm text-muted-foreground">Leave empty to start now.</p>
            <DatePicker label="Ends" value={to} onChange={setTo} min={from || undefined} />
            {errors.effectiveTo ? (
              <p role="alert" className="text-sm text-red-600">
                {errors.effectiveTo}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Leave empty for no end date.</p>
            )}
          </div>
        )}

        {errors.form && (
          <p role="alert" className="text-sm text-red-600">
            {errors.form}
          </p>
        )}
      </form>
    </Drawer>
  );
}