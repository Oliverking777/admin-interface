import Link from "next/link";
import type { ReactNode } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { dashboardErrorMessage } from "@/components/dashboard/dashboard-format";

/** Pieces shared by the dashboard widgets. */

/** A dashboard card with a title and an optional link on the right. */
export function WidgetCard({
  title,
  link,
  children,
  className,
}: {
  title: string;
  link?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {link && (
          <Link href={link.href} className="shrink-0 text-xs font-medium text-primary transition hover:underline">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}

/** Loading lines, an error with retry, or an empty message. Renders nothing when there is data to show. */
export function WidgetState({
  loading,
  error,
  onRetry,
  empty,
  emptyText = "Nothing to show.",
  lines = 3,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  empty: boolean;
  emptyText?: string;
  lines?: number;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-2" aria-busy="true">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse bg-muted motion-reduce:animate-none"
            style={{ width: `${92 - i * 14}%` }}
          />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-6 text-center">
        <p role="alert" className="text-sm text-foreground">
          {dashboardErrorMessage(error)}
        </p>
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
          Try again
        </Button>
      </div>
    );
  }
  if (empty) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return null;
}

/** Note shown when some sources could not be read. */
export function PartialDataNote({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <p className="mt-2 text-xs text-muted-foreground" role="status">
      Some data is missing right now ({names.join(", ")}). It will come back on the next refresh.
    </p>
  );
}