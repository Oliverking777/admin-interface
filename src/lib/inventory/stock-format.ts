import type { MovementType, ReferenceType } from "@/types/inventory/inventory";
import type { VariantUnit } from "@/types/product/product";

const numberFormat = new Intl.NumberFormat("fr-FR");
const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
}

function baseUnit(units: VariantUnit[]): VariantUnit | undefined {
  return units.find((u) => u.isBase);
}

/** "126 Bottle". Quantities are base units; without unit data only the number is shown. */
export function formatQuantity(quantity: number, units: VariantUnit[]): string {
  const name = baseUnit(units)?.unitName;
  return name ? `${formatNumber(quantity)} ${name}` : formatNumber(quantity);
}

/** "+24 Bottle" / "−6 Bottle". */
export function formatSignedQuantity(delta: number, units: VariantUnit[]): string {
  return `${delta > 0 ? "+" : "−"}${formatQuantity(Math.abs(delta), units)}`;
}

/**
 * The quantity written in the variant's bigger units, e.g. "5 Carton + 6 Bottle".
 * Null when the variant has no bigger unit or the quantity is smaller than the smallest one.
 */
export function formatBreakdown(quantity: number, units: VariantUnit[]): string | null {
  if (quantity <= 0) return null;
  const bigger = units
    .filter((u) => u.status === "ACTIVE" && !u.isBase && u.conversionFactor > 1 && u.unitName)
    .sort((a, b) => b.conversionFactor - a.conversionFactor);

  let rest = quantity;
  const parts: string[] = [];
  for (const unit of bigger) {
    const count = Math.floor(rest / unit.conversionFactor);
    if (count > 0) {
      parts.push(`${formatNumber(count)} ${unit.unitName}`);
      rest -= count * unit.conversionFactor;
    }
  }
  if (parts.length === 0) return null;

  const baseName = baseUnit(units)?.unitName;
  if (rest > 0 && baseName) parts.push(`${formatNumber(rest)} ${baseName}`);
  return parts.join(" + ");
}

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  PURCHASE: "Purchase",
  TRANSFER_IN: "Transfer in",
  SALE_RETURN: "Sale return",
  TRANSFER_OUT: "Transfer out",
  SALE: "Sale",
  ADJUSTMENT: "Adjustment",
  INITIALIZATION: "Initial stock",
};

export const MOVEMENT_TYPES = Object.keys(MOVEMENT_LABEL) as MovementType[];

export const REFERENCE_LABEL: Record<ReferenceType, string> = {
  PURCHASE: "Purchase",
  TRANSFER: "Transfer",
  SALE: "Sale",
  ADJUSTMENT: "Adjustment",
  STOCK_INITIALIZATION: "Initialization",
};

/** First 8 characters of an id, enough to tell documents apart on screen. */
export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}