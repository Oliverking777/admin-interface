"use client";

/** One variant being entered: its name, then its units and prices (ProductUnitsEditor), with Remove. */

import { useId } from "react";
import ProductUnitsEditor from "@/components/product/products/ProductUnitsEditor";
import type { VariantDraft, VariantDraftErrors } from "@/components/product/products/variant-draft";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { VARIANT_NAME_MAX_LENGTH } from "@/types/product/product";
import type { Unit } from "@/types/product/unit";

type VariantDraftEditorProps = {
  draft: VariantDraft;
  onChange: (draft: VariantDraft) => void;
  /** Hidden when the variant cannot be removed (the only one, or already saved). */
  onRemove?: () => void;
  /** False only while the form has a single variant: it may stay unnamed (a product sold in one form). */
  nameRequired: boolean;
  /** Active units of the catalog. */
  units: Unit[];
  unitsLoading: boolean;
  showPrices: boolean;
  /** True once the variant exists: only the prices not saved yet can still change. */
  locked: boolean;
  pricedUnitIds: Set<string>;
  errors: VariantDraftErrors;
  disabled?: boolean;
};

export default function VariantDraftEditor({
  draft,
  onChange,
  onRemove,
  nameRequired,
  units,
  unitsLoading,
  showPrices,
  locked,
  pricedUnitIds,
  errors,
  disabled = false,
}: VariantDraftEditorProps) {
  const nameId = useId();
  const label = draft.name.trim() || undefined;

  return (
    <section aria-label={label ? `Variant ${label}` : "Variant"} className="flex flex-col gap-3 border border-border p-3">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor={nameId} className="text-sm font-medium text-foreground">
            {nameRequired ? "Variant name" : "Variant name (optional)"}
          </label>
          <Input
            id={nameId}
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder={nameRequired ? "e.g. 50 kg 10% broken" : "Leave empty if it is sold in one form"}
            autoComplete="off"
            maxLength={VARIANT_NAME_MAX_LENGTH}
            disabled={disabled || locked}
            invalid={!!errors.name}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
          />
          {errors.name && (
            <p id={`${nameId}-error`} role="alert" className="text-sm text-red-600">
              {errors.name}
            </p>
          )}
        </div>
        {onRemove && !locked && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-7"
            onClick={onRemove}
            disabled={disabled}
            aria-label={label ? `Remove the variant ${label}` : "Remove this variant"}
          >
            Remove
          </Button>
        )}
      </div>

      <ProductUnitsEditor
        units={units}
        unitsLoading={unitsLoading}
        draft={draft}
        onChange={onChange}
        showPrices={showPrices}
        locked={locked}
        pricedUnitIds={pricedUnitIds}
        errors={errors}
        disabled={disabled}
        variantLabel={label}
      />
    </section>
  );
}