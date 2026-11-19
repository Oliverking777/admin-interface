/**
 * A variant being entered in a form (the new-product form, or Add a variant on the product page): its name, its
 * base unit and other units, and one optional price per unit. Numbers stay text until the form is validated.
 */

import { MIN_PRICE_AMOUNT } from "@/types/product/price";
import { MAX_NEW_VARIANT_UNITS, MIN_CONVERSION_FACTOR, variantNameKey } from "@/types/product/product";
import type { NewVariantRequest } from "@/types/product/product-dto";

/** One other unit of a variant. */
export type UnitDraft = { key: string; unitId: string; factor: string; price: string };

export type VariantDraft = {
  key: string;
  name: string;
  baseUnitId: string;
  basePrice: string;
  others: UnitDraft[];
};

export function newUnitDraft(): UnitDraft {
  return { key: crypto.randomUUID(), unitId: "", factor: "", price: "" };
}

/** A new variant, counted in `baseUnitId` when given (handy when every variant is counted in bags). */
export function newVariantDraft(baseUnitId = ""): VariantDraft {
  return { key: crypto.randomUUID(), name: "", baseUnitId, basePrice: "", others: [] };
}

export type VariantDraftErrors = {
  name?: string;
  baseUnit?: string;
  basePrice?: string;
  /** By line key. */
  rows?: Record<string, string>;
};

export const hasErrors = (e: VariantDraftErrors) =>
  !!(e.name || e.baseUnit || e.basePrice || (e.rows && Object.keys(e.rows).length > 0));

/** What a valid draft sends: the variant with its units, and the prices to create once it exists. */
export type ReadVariant = { request: NewVariantRequest; prices: { unitId: string; price: number }[] };

const WHOLE_NUMBER = /^\d+$/;

function parseWhole(text: string): number | null {
  const trimmed = text.trim();
  return WHOLE_NUMBER.test(trimmed) ? Number(trimmed) : null;
}

/** A price field: empty means "set it later". */
function readPrice(text: string, withPrices: boolean): { value: number | null; error?: string } {
  if (!withPrices || text.trim() === "") return { value: null };
  const value = parseWhole(text);
  return value === null || value < MIN_PRICE_AMOUNT
    ? { value: null, error: `Enter a whole price of at least ${MIN_PRICE_AMOUNT} FCFA, or leave it empty.` }
    : { value };
}

/**
 * Checks a draft and turns it into a request. A fully empty line of other units is ignored.
 *
 * @param nameRequired false only for the single variant of a simple product
 * @param withPrices   false when the user may not set prices: price fields are ignored
 */
export function readVariantDraft(
  draft: VariantDraft,
  { nameRequired, withPrices }: { nameRequired: boolean; withPrices: boolean },
): { errors: VariantDraftErrors; value: ReadVariant | null } {
  const errors: VariantDraftErrors = {};
  const name = draft.name.trim();
  if (nameRequired && !name) errors.name = "Name this variant, for example 50 kg 10% broken.";
  if (!draft.baseUnitId) errors.baseUnit = "Choose the base unit.";

  const base = readPrice(draft.basePrice, withPrices);
  if (base.error) errors.basePrice = base.error;

  const units: { unitId: string; conversionFactor: number }[] = [];
  const prices: { unitId: string; price: number }[] = [];
  if (draft.baseUnitId && base.value !== null) prices.push({ unitId: draft.baseUnitId, price: base.value });

  const rows: Record<string, string> = {};
  for (const row of draft.others) {
    if (!row.unitId && !row.factor.trim() && !row.price.trim()) continue;
    const factor = parseWhole(row.factor);
    const price = readPrice(row.price, withPrices);
    if (!row.unitId) rows[row.key] = "Choose a unit, or remove this line.";
    else if (factor === null || factor < MIN_CONVERSION_FACTOR) {
      rows[row.key] = `Enter how many base units it holds: a whole number of at least ${MIN_CONVERSION_FACTOR}.`;
    } else if (price.error) rows[row.key] = price.error;
    else {
      units.push({ unitId: row.unitId, conversionFactor: factor });
      if (price.value !== null) prices.push({ unitId: row.unitId, price: price.value });
    }
  }
  if (units.length > MAX_NEW_VARIANT_UNITS) {
    errors.baseUnit = `A variant can have at most ${MAX_NEW_VARIANT_UNITS} other units.`;
  }
  if (Object.keys(rows).length > 0) errors.rows = rows;

  if (hasErrors(errors)) return { errors, value: null };
  return {
    errors,
    value: {
      request: { ...(name ? { variantName: name } : {}), baseUnitId: draft.baseUnitId, units },
      prices,
    },
  };
}

/** Marks a second variant with the same name (names are compared ignoring case and spaces). */
export function duplicateNameErrors(drafts: VariantDraft[]): Record<string, string> {
  const seen = new Set<string>();
  const out: Record<string, string> = {};
  for (const draft of drafts) {
    const key = variantNameKey(draft.name.trim());
    if (!key) continue;
    if (seen.has(key)) out[draft.key] = "Another variant already has this name.";
    seen.add(key);
  }
  return out;
}

/**
 * Puts an error on the line of the unit it is about: the base price when it is the base unit, else the other
 * unit's line. Returns null when the unit is not on the draft.
 */
export function errorForUnit(draft: VariantDraft, unitId: string, message: string): VariantDraftErrors | null {
  if (unitId === draft.baseUnitId) return { basePrice: message };
  const row = draft.others.find((o) => o.unitId === unitId);
  return row ? { rows: { [row.key]: message } } : null;
}