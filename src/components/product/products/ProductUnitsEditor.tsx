"use client";

/**
 * The units of one variant being entered: its base unit, its other units with how many base units each one holds,
 * and one optional price per unit (quantity tiers and dated prices are set on the Pricing page).
 * Once the variant exists (after a save that stopped at a price), `locked` freezes the units and the prices
 * already saved, so saving again never changes what is on record.
 */

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { newUnitDraft, type UnitDraft, type VariantDraft, type VariantDraftErrors } from "@/components/product/products/variant-draft";
import { cn } from "@/lib/cn";
import { MAX_NEW_VARIANT_UNITS, MIN_CONVERSION_FACTOR } from "@/types/product/product";
import type { Unit } from "@/types/product/unit";

type ProductUnitsEditorProps = {
  /** Active units of the catalog. */
  units: Unit[];
  unitsLoading: boolean;
  draft: VariantDraft;
  onChange: (draft: VariantDraft) => void;
  /** Shows the price column (needs PRICE_RULE_CREATE). */
  showPrices: boolean;
  /** True once the variant exists: its units can no longer change here. */
  locked: boolean;
  /** Units whose price is already saved. */
  pricedUnitIds: Set<string>;
  errors: VariantDraftErrors;
  disabled?: boolean;
  /** Names the variant in the fields' labels when a form has several, e.g. "50 kg". */
  variantLabel?: string;
};

export default function ProductUnitsEditor({
  units,
  unitsLoading,
  draft,
  onChange,
  showPrices,
  locked,
  pricedUnitIds,
  errors,
  disabled = false,
  variantLabel,
}: ProductUnitsEditorProps) {
  const { baseUnitId, basePrice, others } = draft;
  const of = variantLabel ? ` of ${variantLabel}` : "";
  const unitName = (id: string) => units.find((u) => u.id === id)?.name ?? "";
  const baseName = unitName(baseUnitId) || "base units";

  // a unit can be on the variant once
  const used = new Set([baseUnitId, ...others.map((o) => o.unitId)].filter(Boolean));
  const canAddMore = units.some((u) => !used.has(u.id)) && others.length < MAX_NEW_VARIANT_UNITS;

  function setOthers(next: UnitDraft[]) {
    onChange({ ...draft, others: next });
  }

  function patch(key: string, change: Partial<UnitDraft>) {
    setOthers(others.map((o) => (o.key === key ? { ...o, ...change } : o)));
  }

  const columns = showPrices
    ? "sm:grid-cols-[minmax(0,1fr)_9rem_8rem_5rem]"
    : "sm:grid-cols-[minmax(0,1fr)_9rem_5rem]";

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("hidden gap-2 text-xs font-medium text-muted-foreground sm:grid", columns)} aria-hidden="true">
        <span>Unit</span>
        <span>Contains</span>
        {showPrices && <span>Price (FCFA)</span>}
        <span />
      </div>

      <ul className="flex flex-col gap-3">
        <li className={cn("grid items-start gap-2", columns)}>
          <Select
            aria-label={`Base unit${of}`}
            value={baseUnitId}
            onChange={(e) => onChange({ ...draft, baseUnitId: e.target.value })}
            disabled={disabled || locked || unitsLoading}
            invalid={!!errors.baseUnit}
          >
            <option value="">{unitsLoading ? "Loading units..." : "Choose the base unit"}</option>
            {units
              .filter((u) => u.id === baseUnitId || !others.some((o) => o.unitId === u.id))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
          </Select>
          <p className="py-2 text-sm text-muted-foreground">Base unit</p>
          {showPrices && (
            <Input
              inputMode="numeric"
              placeholder="Optional"
              aria-label={`Price of one base unit${of}, in FCFA`}
              value={basePrice}
              onChange={(e) => onChange({ ...draft, basePrice: e.target.value })}
              disabled={disabled || pricedUnitIds.has(baseUnitId)}
              invalid={!!errors.basePrice}
              autoComplete="off"
            />
          )}
          <span aria-hidden="true" />
          {(errors.baseUnit || errors.basePrice) && (
            <p role="alert" className="col-span-full text-sm text-red-600">
              {errors.baseUnit ?? errors.basePrice}
            </p>
          )}
        </li>

        {others.map((row, index) => {
          const name = unitName(row.unitId) || `line ${index + 2}`;
          const error = errors.rows?.[row.key];

          return (
            <li key={row.key} className={cn("grid items-start gap-2", columns)}>
              <Select
                aria-label={`Unit${of}, line ${index + 2}`}
                value={row.unitId}
                onChange={(e) => patch(row.key, { unitId: e.target.value })}
                disabled={disabled || locked || unitsLoading}
                invalid={!!error}
              >
                <option value="">Choose a unit</option>
                {units
                  .filter((u) => u.id === row.unitId || !used.has(u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
              </Select>

              <div className="flex items-center gap-2">
                <div className="w-16 shrink-0">
                  <Input
                    inputMode="numeric"
                    placeholder={`${MIN_CONVERSION_FACTOR}+`}
                    aria-label={`How many ${baseName} in one ${name}${of}`}
                    value={row.factor}
                    onChange={(e) => patch(row.key, { factor: e.target.value })}
                    disabled={disabled || locked}
                    invalid={!!error}
                    autoComplete="off"
                  />
                </div>
                <span className="truncate text-sm text-muted-foreground" title={baseName}>
                  {baseName}
                </span>
              </div>

              {showPrices && (
                <Input
                  inputMode="numeric"
                  placeholder="Optional"
                  aria-label={`Price of one ${name}${of}, in FCFA`}
                  value={row.price}
                  onChange={(e) => patch(row.key, { price: e.target.value })}
                  disabled={disabled || pricedUnitIds.has(row.unitId)}
                  invalid={!!error}
                  autoComplete="off"
                />
              )}

              {locked ? (
                <span aria-hidden="true" />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOthers(others.filter((o) => o.key !== row.key))}
                  disabled={disabled}
                  aria-label={`Remove line ${index + 2}${of}`}
                >
                  Remove
                </Button>
              )}

              {error && (
                <p role="alert" className="col-span-full text-sm text-red-600">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {!locked && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOthers([...others, newUnitDraft()])}
            disabled={disabled || !baseUnitId || !canAddMore}
          >
            + Add a unit
          </Button>
        </div>
      )}
    </div>
  );
}