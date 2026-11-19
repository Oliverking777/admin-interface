/**
 * Formatting and period helpers shared by the report components.
 * Periods are local days ("YYYY-MM-DD") in the business time zone, both included, like the backend.
 */
import { REPORT_PERIOD_MAX_DAYS, REPORT_TIME_ZONE } from "@/types/report/report";

const wholeNumber = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: REPORT_TIME_ZONE,
});

export const formatCount = (value: number) => wholeNumber.format(value);
export const formatFcfa = (value: number) => `${wholeNumber.format(value)} FCFA`;

/** "2026-10-05" -> "05 Oct 2026". Read as a calendar day, so it never moves. */
export function formatDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return dayFormat.format(new Date(y, m - 1, d));
}

/** When a report was built, in the business time zone. */
export const formatAsOf = (isoDateTime: string) => dateTimeFormat.format(new Date(isoDateTime));

/* -------------------------------------------------------------------------- */
/*  Periods                                                                   */
/* -------------------------------------------------------------------------- */

export type Period = { from: string; to: string };

/** Today in the business time zone, "YYYY-MM-DD" (sv-SE formats dates that way). */
export function businessToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: REPORT_TIME_ZONE }).format(new Date());
}

function shiftDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export type PeriodPreset = "TODAY" | "LAST_7_DAYS" | "THIS_MONTH" | "LAST_MONTH";

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
];

export function presetPeriod(preset: PeriodPreset): Period {
  const today = businessToday();
  const [y, m] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (preset) {
    case "TODAY":
      return { from: today, to: today };
    case "LAST_7_DAYS":
      return { from: shiftDays(today, -6), to: today };
    case "THIS_MONTH":
      return { from: `${y}-${pad(m)}-01`, to: today };
    case "LAST_MONTH": {
      const firstOfThisMonth = `${y}-${pad(m)}-01`;
      const lastOfPrevious = shiftDays(firstOfThisMonth, -1);
      return { from: `${lastOfPrevious.slice(0, 7)}-01`, to: lastOfPrevious };
    }
  }
}

/** The preset matching this period, if any (to highlight it). */
export function matchingPreset(period: Period): PeriodPreset | null {
  return PERIOD_PRESETS.find((p) => {
    const candidate = presetPeriod(p.value);
    return candidate.from === period.from && candidate.to === period.to;
  })?.value ?? null;
}

/** Days covered, both dates included. */
export function periodDays({ from, to }: Period): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

/** Same rules as the backend ReportPeriod. Null when the period is valid. */
export function periodError(period: Period): string | null {
  if (!period.from || !period.to) return "Choose a start and an end date.";
  if (period.from > period.to) return "The start date must be on or before the end date.";
  if (periodDays(period) > REPORT_PERIOD_MAX_DAYS) return `A report can cover at most ${REPORT_PERIOD_MAX_DAYS} days.`;
  return null;
}