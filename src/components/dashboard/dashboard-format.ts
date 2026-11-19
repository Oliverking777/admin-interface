/**
 * Formatting helpers and links shared by the dashboard components.
 * Money is whole FCFA; dates are shown in the business time zone.
 */
import { isApiError } from "@/lib/api/api-error";
import {
  DASHBOARD_TIME_ZONE,
  type AlertEntityType,
  type AlertSeverity,
  type ISODate,
} from "@/types/dashboard/dashboard";

const wholeNumber = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: DASHBOARD_TIME_ZONE,
});

export const formatCount = (value: number) => wholeNumber.format(value);
export const formatFcfa = (value: number) => `${wholeNumber.format(value)} FCFA`;
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

/** Today in the business time zone, "YYYY-MM-DD" (sv-SE formats dates that way). */
export function businessToday(): ISODate {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: DASHBOARD_TIME_ZONE }).format(new Date());
}

/** "just now", "5m ago", "3h ago", "2d ago". */
export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** "STOCK_ADJUSTMENT" or "ADJUSTMENT_APPROVED" -> "Stock adjustment" / "Adjustment approved". */
export function humanize(code: string): string {
  const text = code.replace(/[._]+/g, " ").trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A user-facing sentence for a dashboard widget that failed to load. */
export function dashboardErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.isForbidden) return "You can only see the dashboard for your own location.";
    if (error.status === 503) return "This part is unavailable right now. Try again in a moment.";
    return error.message;
  }
  return "Could not load this part of the dashboard.";
}

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  CRITICAL: "Critical",
  WARNING: "Warning",
  INFO: "Info",
};

export const SEVERITY_BADGE: Record<AlertSeverity, "danger" | "warning" | "neutral"> = {
  CRITICAL: "danger",
  WARNING: "warning",
  INFO: "neutral",
};

/** Where to go to deal with an alert's record. Lists are used where no detail page exists yet. */
export function alertHref(entityType: AlertEntityType): string {
  switch (entityType) {
    case "PRODUCT":
      return "/inventory/stock";
    case "ORDER":
      return "/orders";
    case "CREDIT_APPROVAL":
      return "/customers";
    case "STOCK_ADJUSTMENT":
      return "/inventory/adjustments";
    case "TRANSFER":
      return "/inventory/transfers";
    case "PURCHASE":
      return "/purchasing/purchases";
  }
}