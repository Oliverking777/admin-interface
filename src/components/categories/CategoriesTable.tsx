"use client";

import type { ReactNode } from "react";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type SortDirection,
} from "@/components/ui/Table";
import type { Category, CategoryStatus } from "@/types/business/category";

export type CategorySortKey = "name" | "updatedAt";
export type CategorySortState = { key: CategorySortKey; direction: SortDirection };

/** What the current user is allowed to do. Controls are hidden when an action is not allowed. */
export type CategoryAbilities = {
  update: boolean;
  activate: boolean;
  deactivate: boolean;
};

type CategoriesTableProps = {
  categories: Category[];
  loading: boolean;
  error: string | null;
  /** True when a search term or status filter is active (changes the empty message). */
  filtered: boolean;
  sort: CategorySortState;
  abilities: CategoryAbilities;
  /** Id of the category whose status is being changed, to disable its button. */
  busyId: string | null;
  onSort: (key: CategorySortKey) => void;
  onRetry: () => void;
  onEdit: (category: Category) => void;
  onToggleStatus: (category: Category) => void;
};

const COLUMNS = 5;

const STATUS: Record<CategoryStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "neutral" },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {Array.from({ length: COLUMNS }, (_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-24 animate-pulse bg-muted motion-reduce:animate-none" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS} className="py-12 text-center">
        {children}
      </TableCell>
    </TableRow>
  );
}

export default function CategoriesTable({
  categories,
  loading,
  error,
  filtered,
  sort,
  abilities,
  busyId,
  onSort,
  onRetry,
  onEdit,
  onToggleStatus,
}: CategoriesTableProps) {
  const directionFor = (key: CategorySortKey) => (sort.key === key ? sort.direction : null);

  return (
    <Table aria-busy={loading || undefined} className="table-fixed">
      {/* Fixed column widths (they add up to 100%): the table always fits its card, long text is cut with "...". */}
      <colgroup>
        <col className="w-[25%]" />
        <col className="w-[31%]" />
        <col className="w-[12%]" />
        <col className="w-[14%]" />
        <col className="w-[18%]" />
      </colgroup>
      <TableHead>
        <tr>
          <TableHeaderCell onSort={() => onSort("name")} sortDirection={directionFor("name")}>
            Name
          </TableHeaderCell>
          <TableHeaderCell>Description</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell onSort={() => onSort("updatedAt")} sortDirection={directionFor("updatedAt")}>
            Last updated
          </TableHeaderCell>
          <TableHeaderCell className="text-right">
            <span className="sr-only">Actions</span>
          </TableHeaderCell>
        </tr>
      </TableHead>

      <TableBody>
        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <MessageRow>
            <p role="alert" className="text-sm text-foreground">
              {error}
            </p>
            <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
              Try again
            </Button>
          </MessageRow>
        ) : categories.length === 0 ? (
          <MessageRow>
            <p className="text-sm font-medium text-foreground">
              {filtered ? "No categories match your search" : "No categories yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered
                ? "Try a different name or status."
                : "Use New category to create the first one."}
            </p>
          </MessageRow>
        ) : (
          categories.map((category) => {
            const status = STATUS[category.status];
            const isActive = category.status === "ACTIVE";
            const canToggle = isActive ? abilities.deactivate : abilities.activate;

            return (
              <TableRow key={category.id}>
                <TableCell className="truncate font-medium" title={category.name}>
                  {category.name}
                </TableCell>
                <TableCell className="truncate text-muted-foreground" title={category.description ?? undefined}>
                  {category.description ?? "—"}
                </TableCell>
                <TableCell className="truncate">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="truncate text-muted-foreground">
                  {dateFormat.format(new Date(category.updatedAt))}
                </TableCell>
                <TableCell className="px-2 text-right">
                  <div className="flex justify-end gap-1">
                    {abilities.update && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(category)}
                        aria-label={`Edit ${category.name}`}
                      >
                        Edit
                      </Button>
                    )}
                    {canToggle && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === category.id}
                        onClick={() => onToggleStatus(category)}
                        aria-label={`${isActive ? "Deactivate" : "Activate"} ${category.name}`}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}