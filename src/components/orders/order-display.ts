/**
 * Display helpers for the order screens: money, dates in the business time zone, and status styles.
 */
import { SALES_TIME_ZONE, type OrderStatus, type SalesPaymentMethod } from "@/types/order/order";

const wholeNumber = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: SALES_TIME_ZONE });
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: SALES_TIME_ZONE,
});

export const formatFcfa = (value: number) => `${wholeNumber.format(value)} FCFA`;
export const formatCount = (value: number) => wholeNumber.format(value);
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => `${formatDate(iso)} · ${formatTime(iso)}`;

/** Today in the business time zone, "YYYY-MM-DD" (sv-SE formats dates that way). */
export function businessToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: SALES_TIME_ZONE }).format(new Date());
}

/** Last 6 characters of an id, for when no name is known. */
export const shortId = (id: string) => `…${id.slice(-6)}`;

export type StatusConfig = {
  title: string;
  /** Column header and status chip. */
  headerClass: string;
  badge: "neutral" | "success" | "warning" | "danger";
};

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  PENDING: {
    title: "Pending",
    headerClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    badge: "warning",
  },
  COMPLETED: { title: "Completed", headerClass: "bg-primary/15 text-primary", badge: "success" },
  CANCELLED: { title: "Cancelled", headerClass: "bg-muted text-muted-foreground", badge: "neutral" },
};

/** Columns of the board, left to right. */
export const ORDER_BOARD_STATUSES: OrderStatus[] = ["PENDING", "COMPLETED", "CANCELLED"];

export const PAYMENT_METHOD_LABEL: Record<SalesPaymentMethod, string> = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile money",
};