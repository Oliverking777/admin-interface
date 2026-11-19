/**
 * Labels, badge colours and formatting shared by the Purchasing components.
 * Option types describe what the components need from other modules (suppliers, locations, catalog),
 * so they never import those modules directly: the page maps its data to these shapes.
 */
import type { BadgeVariant } from "@/components/ui/Badge";
import type { PurchaseStatus, RejectionType } from "@/types/purchase/purchase";

type StatusDisplay = { label: string; variant: BadgeVariant };

const PURCHASE_STATUS_DISPLAY: Record<PurchaseStatus, StatusDisplay> = {
  SUBMITTED: { label: "Ordered", variant: "warning" },
  CONFIRMED: { label: "Delivered", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};

/** One badge per purchase: a delivery with rejected or missing goods says so instead of "Delivered". */
export function purchaseStatusDisplay(status: PurchaseStatus, hasDiscrepancy = false): StatusDisplay {
  if (status === "CONFIRMED" && hasDiscrepancy) return { label: "Delivered with problems", variant: "warning" };
  return PURCHASE_STATUS_DISPLAY[status];
}

export const REJECTION_TYPE_LABEL: Record<RejectionType, string> = {
  DAMAGED: "Damaged",
  WRONG_PRODUCT: "Wrong product",
  EXCESS: "More than ordered",
  OTHER: "Other",
};
export const REJECTION_TYPES: RejectionType[] = ["DAMAGED", "WRONG_PRODUCT", "EXCESS", "OTHER"];

/* ------------------------------------------------------------------ options */

/** A supplier or location in a dropdown. */
export type NamedOption = { id: string; name: string };
export type UnitOption = { id: string; name: string; conversionFactor?: number };
/** A purchasable product with the units it can be bought in. */
export type ProductOption = { id: string; name: string; units: UnitOption[] };
/** Turns a unit id into its name. Undefined when the unit is not known. */
export type UnitLabel = (unitId: string) => string | undefined;

/* --------------------------------------------------------------- formatting */

const wholeNumber = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatQuantity = (value: number) => wholeNumber.format(value);
export const formatFcfa = (value: number) => `${wholeNumber.format(value)} FCFA`;

/** "2026-11-05" -> "05 Nov 2026". Read as a local date so it never moves by a day. */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "-";
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}

export function formatDateTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return "-";
  const date = new Date(isoDateTime);
  return Number.isNaN(date.getTime()) ? isoDateTime : dateTimeFormat.format(date);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today as "YYYY-MM-DD" in the user's time zone (for date inputs). */
export function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function startOfLocalDay(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Days picked in the UI (both included) to the list query's `from` (inclusive) and `to` (exclusive),
 * as ISO instants at the user's local midnight.
 */
export function dayRangeToQuery(fromDay: string, toDay: string): { from?: string; to?: string } {
  const range: { from?: string; to?: string } = {};
  if (fromDay) range.from = startOfLocalDay(fromDay).toISOString();
  if (toDay) {
    const end = startOfLocalDay(toDay);
    end.setDate(end.getDate() + 1);
    range.to = end.toISOString();
  }
  return range;
}

/** A whole number typed by the user, or NaN when it is not one. */
export function parseWholeNumber(value: string): number {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : Number.NaN;
}