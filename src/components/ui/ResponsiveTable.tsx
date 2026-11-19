"use client";

/**
 * Pieces that let a table fit the space it actually gets, without horizontal scrolling.
 *
 * ResponsiveTable is a size container (Tailwind container queries, not the viewport, so a
 * sidebar never breaks the layout). Below its switch point it shows a card list; above it
 * shows the table, where less important columns appear as room grows:
 *
 *   <TableHeaderCell className={SHOW_FROM["4xl"]}>Updated</TableHeaderCell>
 *   <TableCell className={SHOW_FROM["4xl"]}>...</TableCell>
 *   <p className={HIDE_FROM["4xl"]}>...</p>   // stands in for the column while it is hidden
 *
 * Container widths: @lg 32rem, @2xl 42rem, @3xl 48rem, @4xl 56rem, @5xl 64rem.
 * Class names are written out in full so Tailwind can find them.
 */

import Link from "next/link";
import type { ReactNode } from "react";

import Button from "@/components/ui/Button";
import { TableCell, TableRow } from "@/components/ui/Table";
import { cn } from "@/lib/cn";

/** A column (header and cells) that only appears once the container is at least this wide. */
export const SHOW_FROM = {
  "3xl": "hidden @3xl:table-cell",
  "4xl": "hidden @4xl:table-cell",
  "5xl": "hidden @5xl:table-cell",
} as const;

/** Inline content that stands in for a hidden column, and goes away when the column appears. */
export const HIDE_FROM = {
  "3xl": "@3xl:hidden",
  "4xl": "@4xl:hidden",
  "5xl": "@5xl:hidden",
} as const;

const SWITCH = {
  lg: { cards: "@lg:hidden", table: "hidden @lg:block" },
  "2xl": { cards: "@2xl:hidden", table: "hidden @2xl:block" },
} as const;

type ResponsiveTableProps = {
  /** Shown while the container is narrower than the switch point. */
  cards: ReactNode;
  table: ReactNode;
  /** Container width from which the table replaces the cards. Default 2xl (42rem). */
  switchAt?: keyof typeof SWITCH;
};

export function ResponsiveTable({ cards, table, switchAt = "2xl" }: ResponsiveTableProps) {
  return (
    <div className="@container">
      <div className={SWITCH[switchAt].cards}>{cards}</div>
      <div className={SWITCH[switchAt].table}>{table}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Table states                                                              */
/* -------------------------------------------------------------------------- */

/** Placeholder rows while loading. One class per column, so cells hide along with their column. */
export function SkeletonRows({ cells, rows = 4 }: { cells: readonly string[]; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {cells.map((cellClass, j) => (
            <TableCell key={j} className={cellClass}>
              <div className="h-4 w-24 max-w-full animate-pulse bg-muted motion-reduce:animate-none" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cards                                                                      */
/* -------------------------------------------------------------------------- */

export function CardList({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <>
      <ul className="divide-y divide-border">{children}</ul>
      {footer && <div className="border-t border-border bg-muted/40 px-4 py-3 text-sm">{footer}</div>}
    </>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-40 max-w-full animate-pulse bg-muted motion-reduce:animate-none" />
            <div className="h-3 w-24 animate-pulse bg-muted motion-reduce:animate-none" />
          </div>
          <div className="h-5 w-16 animate-pulse bg-muted motion-reduce:animate-none" />
        </li>
      ))}
    </ul>
  );
}

type CardMessageProps = {
  title: string;
  hint?: string;
  /** True for an error, so screen readers announce it. */
  alert?: boolean;
  onRetry?: () => void;
};

/** Loading, empty and error messages in card mode. */
export function CardMessage({ title, hint, alert, onRetry }: CardMessageProps) {
  return (
    <div className="px-4 py-12 text-center">
      <p role={alert ? "alert" : undefined} className="text-sm font-medium text-foreground">
        {title}
      </p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
          Try again
        </Button>
      )}
    </div>
  );
}

type MobileCardProps = {
  title: ReactNode;
  /** One or more lines under the title; give each line its own <p className="truncate">. */
  subtitle?: ReactNode;
  /** Thumbnail or icon on the left. */
  leading?: ReactNode;
  /** Right-hand column: a quantity, an amount, a status badge. */
  aside?: ReactNode;
  /** The whole card opens this page... */
  href?: string;
  /** ...or runs this. Without either, the card is not clickable. */
  onOpen?: () => void;
  /** Accessible name of the open action, e.g. "View transfer TR-0004". */
  openLabel?: string;
  /** Buttons under the card (kept outside the clickable area). */
  actions?: ReactNode;
  className?: string;
};

export function MobileCard({
  title,
  subtitle,
  leading,
  aside,
  href,
  onOpen,
  openLabel,
  actions,
  className,
}: MobileCardProps) {
  const body = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle && <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {aside && <div className="flex shrink-0 flex-col items-end gap-1 text-right">{aside}</div>}
    </>
  );

  const base = "flex w-full items-center gap-3 px-4 py-3 text-left";
  const interactive =
    "transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none";

  return (
    <li className={className}>
      {href ? (
        <Link href={href} aria-label={openLabel} className={cn(base, interactive)}>
          {body}
        </Link>
      ) : onOpen ? (
        <button type="button" onClick={onOpen} aria-label={openLabel} className={cn(base, interactive)}>
          {body}
        </button>
      ) : (
        <div className={base}>{body}</div>
      )}
      {actions && <div className="-mt-1 flex justify-end gap-1 px-2 pb-2">{actions}</div>}
    </li>
  );
}