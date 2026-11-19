const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** "Oct 6, 2026, 3:15 PM" in the user's locale. Returns "Unknown" for an unreadable date. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Unknown" : dateTime.format(date);
}