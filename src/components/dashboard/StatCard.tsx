import Link from "next/link";

import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export type StatTone = "default" | "warning" | "danger";

export type DashboardStat = {
  id: string;
  label: string;
  /** Null when the section could not be loaded: shows a dash and "Unavailable". */
  value: string | null;
  /** Small line under the value, e.g. "12 completed sales". */
  hint?: string;
  /** Colors the value when something needs attention. */
  tone?: StatTone;
  /** Makes the card a link to the page where the user acts on it. */
  href?: string;
};

const toneClass: Record<StatTone, string> = {
  default: "text-foreground",
  warning: "text-amber-700 dark:text-amber-300",
  danger: "text-red-600 dark:text-red-400",
};

export default function StatCard({ label, value, hint, tone = "default", href }: DashboardStat) {
  const unavailable = value === null;

  const body = (
    <Card className={cn("flex h-full flex-col gap-1", href && "transition hover:bg-accent")}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums", unavailable ? "text-muted-foreground" : toneClass[tone])}>
        {unavailable ? "—" : value}
      </p>
      {(unavailable || hint) && (
        <p className="text-xs text-muted-foreground">{unavailable ? "Unavailable" : hint}</p>
      )}
    </Card>
  );

  if (!href) return body;
  return (
    <Link
      href={href}
      className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {body}
    </Link>
  );
}

/** Same size as a StatCard, while the summary loads. */
export function StatCardSkeleton() {
  return (
    <Card className="flex flex-col gap-2" aria-hidden="true">
      <div className="h-4 w-2/3 animate-pulse bg-muted motion-reduce:animate-none" />
      <div className="h-7 w-1/2 animate-pulse bg-muted motion-reduce:animate-none" />
      <div className="h-3 w-3/4 animate-pulse bg-muted motion-reduce:animate-none" />
    </Card>
  );
}