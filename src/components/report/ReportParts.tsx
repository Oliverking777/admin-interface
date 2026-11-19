import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatAsOf } from "@/components/report/report-format";
import { isApiError } from "@/lib/api/api-error";
import { cn } from "@/lib/cn";

/** Pieces shared by every report view. */

/** One headline figure above a report table. */
export function SummaryTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "warning";
}) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-xl font-semibold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "warning" && "text-amber-700 dark:text-amber-300",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function SummaryGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

/** A user-facing sentence for a report failure. */
export function reportErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.isForbidden) return "You can only see reports for your own location.";
    if (error.isServerError && error.status === 503) {
      return "Part of the data is unavailable right now, so the report was not built. Try again in a moment.";
    }
    return error.message;
  }
  return "Could not load the report.";
}

/** Loading placeholder, error with retry, or empty message, in the report's card. */
export function ReportState({
  loading,
  error,
  onRetry,
  empty,
  emptyTitle = "Nothing to show",
  emptyHint,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  empty: boolean;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-6" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-4 animate-pulse bg-muted motion-reduce:animate-none" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-6 py-12 text-center">
        <p role="alert" className="text-sm text-foreground">
          {reportErrorMessage(error)}
        </p>
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
          Try again
        </Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        {emptyHint && <p className="mt-1 text-sm text-muted-foreground">{emptyHint}</p>}
      </div>
    );
  }
  return null;
}

/** "Built 27 Oct 2026, 21:40" under a report, plus a hint while new filters load. */
export function ReportFootnote({ asOf, refreshing }: { asOf?: string; refreshing?: boolean }) {
  if (!asOf) return null;
  return (
    <p className="text-xs text-muted-foreground" aria-live="polite">
      Built {formatAsOf(asOf)}
      {refreshing && " · updating…"}
    </p>
  );
}