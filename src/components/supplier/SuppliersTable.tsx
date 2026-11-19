"use client";

import Link from "next/link";
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
} from "@/components/ui/Table";
import type { Supplier, SupplierStatus } from "@/types/purchase/supplier";

/** What the current user is allowed to do. Controls are hidden when an action is not allowed. */
export type SupplierAbilities = {
  update: boolean;
  activate: boolean;
  deactivate: boolean;
};

type SuppliersTableProps = {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  /** True when a search term or status filter is active (changes the empty message). */
  filtered: boolean;
  abilities: SupplierAbilities;
  /** Id of the supplier whose status is being changed, to disable its button. */
  busyId: string | null;
  onRetry: () => void;
  onEdit: (supplier: Supplier) => void;
  onToggleStatus: (supplier: Supplier) => void;
};

const COLUMNS = 6;

const STATUS: Record<SupplierStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "neutral" },
};

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
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

export default function SuppliersTable({
  suppliers,
  loading,
  error,
  filtered,
  abilities,
  busyId,
  onRetry,
  onEdit,
  onToggleStatus,
}: SuppliersTableProps) {
  return (
    <Table aria-busy={loading || undefined} className="table-fixed">
      {/* Fixed column widths (they add up to 100%): the table always fits its card, long text is cut with "...". */}
      <colgroup>
        <col className="w-[20%]" />
        <col className="w-[10%]" />
        <col className="w-[14%]" />
        <col className="w-[22%]" />
        <col className="w-[9%]" />
        <col className="w-[25%]" />
      </colgroup>
      <TableHead>
        <tr>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Code</TableHeaderCell>
          <TableHeaderCell>Contact person</TableHeaderCell>
          <TableHeaderCell>Contact</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
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
        ) : suppliers.length === 0 ? (
          <MessageRow>
            <p className="text-sm font-medium text-foreground">
              {filtered ? "No suppliers match your search" : "No suppliers yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered
                ? "Try a different search or status."
                : "Use New supplier to add the first supplier."}
            </p>
          </MessageRow>
        ) : (
          suppliers.map((supplier) => {
            const status = STATUS[supplier.status];
            const isActive = supplier.status === "ACTIVE";
            const canToggle = isActive ? abilities.deactivate : abilities.activate;
            // Phone and email share one line so every record stays on a single row.
            const contact = [supplier.phone, supplier.email].filter(Boolean).join(" · ");

            return (
              <TableRow key={supplier.id}>
                <TableCell className="overflow-hidden font-medium">
                  <Link
                    href={`/purchasing/suppliers/${supplier.id}`}
                    title={supplier.name}
                    className="block truncate hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {supplier.name}
                  </Link>
                </TableCell>
                <TableCell className="truncate text-muted-foreground" title={supplier.code}>
                  {supplier.code}
                </TableCell>
                <TableCell className="truncate text-muted-foreground" title={supplier.contactPerson ?? undefined}>
                  {supplier.contactPerson ?? <span aria-label="No contact person">-</span>}
                </TableCell>
                <TableCell className="truncate text-muted-foreground" title={contact || undefined}>
                  {contact || <span aria-label="No contact details">-</span>}
                </TableCell>
                <TableCell className="truncate">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="px-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/business/suppliers/${supplier.id}`}
                      aria-label={`View ${supplier.name}`}
                      className="inline-flex items-center justify-center border border-transparent px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      View
                    </Link>
                    {abilities.update && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(supplier)}
                        aria-label={`Edit ${supplier.name}`}
                      >
                        Edit
                      </Button>
                    )}
                    {canToggle && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === supplier.id}
                        onClick={() => onToggleStatus(supplier)}
                        aria-label={`${isActive ? "Deactivate" : "Activate"} ${supplier.name}`}
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