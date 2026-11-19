import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type SortDirection = "asc" | "desc";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function TableHead({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("border-b border-border bg-muted/40", className)} {...props} />;
}

export function TableBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b border-border last:border-b-0 hover:bg-accent/40", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle text-foreground", className)} {...props} />;
}

type TableHeaderCellProps = ComponentProps<"th"> & {
  /** Current direction if this column is the sorted one, otherwise null. */
  sortDirection?: SortDirection | null;
  /** Makes the header a sort button. */
  onSort?: () => void;
};

function SortIcon({ direction }: { direction: SortDirection | null | undefined }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M8 10l4-4 4 4" opacity={direction === "asc" ? 1 : 0.35} />
      <path d="M8 14l4 4 4-4" opacity={direction === "desc" ? 1 : 0.35} />
    </svg>
  );
}

export function TableHeaderCell({
  sortDirection,
  onSort,
  className,
  children,
  ...props
}: TableHeaderCellProps) {
  const ariaSort = onSort
    ? sortDirection === "asc"
      ? "ascending"
      : sortDirection === "desc"
        ? "descending"
        : "none"
    : undefined;

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn("px-4 py-2.5 text-left text-xs font-medium text-muted-foreground", className)}
      {...props}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className="-mx-1 inline-flex items-center gap-1 px-1 py-0.5 transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          {children}
          <SortIcon direction={sortDirection} />
        </button>
      ) : (
        children
      )}
    </th>
  );
}