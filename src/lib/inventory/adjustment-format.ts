import type { BadgeVariant } from "@/components/ui/Badge";
import type {
  AdjustmentDirection,
  AdjustmentReason,
  AdjustmentStatus,
} from "@/types/inventory/inventory";

export const ADJUSTMENT_STATUSES: AdjustmentStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export const ADJUSTMENT_STATUS_LABEL: Record<AdjustmentStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const ADJUSTMENT_STATUS_VARIANT: Record<AdjustmentStatus, BadgeVariant> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export const ADJUSTMENT_REASONS: AdjustmentReason[] = [
  "DAMAGE",
  "LOSS",
  "SUPPLIER_RETURN",
  "OPENING_STOCK",
  "COUNT_CORRECTION",
  "OTHER",
];

export const ADJUSTMENT_REASON_LABEL: Record<AdjustmentReason, string> = {
  DAMAGE: "Damaged goods",
  LOSS: "Lost goods",
  SUPPLIER_RETURN: "Returned to supplier",
  OPENING_STOCK: "Opening stock",
  COUNT_CORRECTION: "Count correction",
  OTHER: "Other",
};

export const DIRECTION_LABEL: Record<AdjustmentDirection, string> = {
  INCREASE: "Add stock",
  DECREASE: "Remove stock",
};

/** Positive when stock is added, negative when it is removed. */
export function signedDelta(direction: AdjustmentDirection, quantity: number): number {
  return direction === "INCREASE" ? quantity : -quantity;
}

/** A whole number, 0 or more, from a text field. Null when the text is anything else. */
export function parseQuantity(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}