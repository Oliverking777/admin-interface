import type { BadgeVariant } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/inventory/stock-format";
import type { Transfer, TransferStatus } from "@/types/inventory/transfer";

export const TRANSFER_STATUSES: TransferStatus[] = ["SUBMITTED", "RECEIVED", "CANCELLED"];

/** Label of the status alone (filters, history). For a transfer's badge use transferBadge. */
export const TRANSFER_STATUS_LABEL: Record<TransferStatus, string> = {
  SUBMITTED: "In transit",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export const TRANSFER_STATUS_VARIANT: Record<TransferStatus, BadgeVariant> = {
  SUBMITTED: "warning",
  RECEIVED: "success",
  CANCELLED: "neutral",
};

/**
 * The badge of one transfer: its status, plus the receipt outcome. A receipt with damaged or missing goods
 * reads "Received with issues" in the danger colour.
 */
export function transferBadge(transfer: Pick<Transfer, "status" | "hasDiscrepancy">): {
  label: string;
  variant: BadgeVariant;
} {
  if (transfer.status === "RECEIVED" && transfer.hasDiscrepancy) {
    return { label: "Received with issues", variant: "danger" };
  }
  return { label: TRANSFER_STATUS_LABEL[transfer.status], variant: TRANSFER_STATUS_VARIANT[transfer.status] };
}

/** History labels: what each event means to the user. Unknown types fall back to humanize. */
const TRANSFER_EVENT_LABEL: Record<string, string> = {
  SUBMITTED: "Sent",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export function transferEventLabel(type: string): string {
  return TRANSFER_EVENT_LABEL[type] ?? humanize(type);
}

/** "5" or "—" when the step has not happened yet. */
export function formatQuantityOrDash(quantity: number | null): string {
  return quantity === null ? "—" : formatNumber(quantity);
}

/** "STOCK_ADJUSTED" -> "Stock adjusted". The backend sends some types as plain strings. */
export function humanize(value: string): string {
  const text = value.replace(/_/g, " ").toLowerCase().trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatProductCount(count: number): string {
  return `${count} ${count === 1 ? "product" : "products"}`;
}

/** A whole number, 0 or more, from a text field. Null when the text is anything else. */
export function parseWholeNumber(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** Local midnight of a "YYYY-MM-DD" date, as an ISO date-time (the `from` filter is inclusive). */
export function startOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

/** Local midnight of the day after a "YYYY-MM-DD" date (the `to` filter is exclusive, so the picked day is included). */
export function startOfNextDayIso(date: string): string {
  const day = new Date(`${date}T00:00:00`);
  day.setDate(day.getDate() + 1);
  return day.toISOString();
}

/* -------------------------------------------------------------------------- */
/*  Status filter: the same five states the badges show                        */
/* -------------------------------------------------------------------------- */

/** "" means all. "RECEIVED" is received in full; "RECEIVED_WITH_ISSUES" is the discrepancy review list. */
export type TransferStatusFilter = "" | "IN_TRANSIT" | "RECEIVED" | "RECEIVED_WITH_ISSUES" | "CANCELLED";

export const TRANSFER_STATUS_FILTERS: { value: Exclude<TransferStatusFilter, "">; label: string }[] = [
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "RECEIVED", label: "Received" },
  { value: "RECEIVED_WITH_ISSUES", label: "Received with issues" },
  { value: "CANCELLED", label: "Cancelled" },
];

/** The list query parameters for a status filter. */
export function statusFilterQuery(filter: TransferStatusFilter): {
  status?: TransferStatus;
  hasDiscrepancy?: boolean;
} {
  switch (filter) {
    case "IN_TRANSIT":
      return { status: "SUBMITTED" };
    case "RECEIVED":
      return { status: "RECEIVED", hasDiscrepancy: false };
    case "RECEIVED_WITH_ISSUES":
      return { status: "RECEIVED", hasDiscrepancy: true };
    case "CANCELLED":
      return { status: "CANCELLED" };
    default:
      return {};
  }
}