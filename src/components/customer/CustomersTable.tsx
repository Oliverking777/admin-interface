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
import type { Customer, CustomerStatus, CustomerType } from "@/types/customer/customer";

/** What the current user is allowed to do. Controls are hidden when an action is not allowed. */
export type CustomerAbilities = {
  update: boolean;
  activate: boolean;
  deactivate: boolean;
};

type CustomersTableProps = {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  /** True when a search term or status filter is active (changes the empty message). */
  filtered: boolean;
  abilities: CustomerAbilities;
  /** Id of the customer whose status is being changed, to disable its button. */
  busyId: string | null;
  onRetry: () => void;
  onEdit: (customer: Customer) => void;
  onToggleStatus: (customer: Customer) => void;
};

const COLUMNS = 6;

const TYPE_LABELS: Record<CustomerType, string> = {
  INDIVIDUAL: "Individual",
  BUSINESS: "Business",
};

const STATUS: Record<CustomerStatus, { label: string; variant: BadgeVariant }> = {
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

export default function CustomersTable({
  customers,
  loading,
  error,
  filtered,
  abilities,
  busyId,
  onRetry,
  onEdit,
  onToggleStatus,
}: CustomersTableProps) {
  return (
    <Table aria-busy={loading || undefined} className="table-fixed">
      {/* Fixed column widths (they add up to 100%): the table always fits its card, long text is cut with "...". */}
      <colgroup>
        <col className="w-[22%]" />
        <col className="w-[11%]" />
        <col className="w-[10%]" />
        <col className="w-[24%]" />
        <col className="w-[9%]" />
        <col className="w-[24%]" />
      </colgroup>
      <TableHead>
        <tr>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Code</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
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
        ) : customers.length === 0 ? (
          <MessageRow>
            <p className="text-sm font-medium text-foreground">
              {filtered ? "No customers match your search" : "No customers yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered
                ? "Try a different search or status."
                : "Use New customer to add the first customer."}
            </p>
          </MessageRow>
        ) : (
          customers.map((customer) => {
            const status = STATUS[customer.status];
            const isActive = customer.status === "ACTIVE";
            // The walk-in customer is protected: it cannot be edited or deactivated.
            const canEdit = abilities.update && !customer.walkIn;
            // Phone and email share one line so every record stays on a single row.
            const contact = [customer.phone, customer.email].filter(Boolean).join(" · ");
            const canToggle = (isActive ? abilities.deactivate : abilities.activate) && !(customer.walkIn && isActive);

            return (
              <TableRow key={customer.id}>
                <TableCell className="overflow-hidden font-medium">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      href={`/customers/${customer.id}`}
                      title={customer.name}
                      className="min-w-0 truncate hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {customer.name}
                    </Link>
                    {customer.walkIn && <Badge className="shrink-0">Walk-in</Badge>}
                  </div>
                </TableCell>
                <TableCell className="truncate text-muted-foreground" title={customer.code}>
                  {customer.code}
                </TableCell>
                <TableCell className="truncate">
                  <Badge>{TYPE_LABELS[customer.type]}</Badge>
                </TableCell>
                <TableCell
                  className="truncate text-muted-foreground"
                  title={contact || undefined}
                >
                  {contact || <span aria-label="No contact details">-</span>}
                </TableCell>
                <TableCell className="truncate">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="px-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/business/customers/${customer.id}`}
                      aria-label={`View ${customer.name}`}
                      className="inline-flex items-center justify-center border border-transparent px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      View
                    </Link>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(customer)}
                        aria-label={`Edit ${customer.name}`}
                      >
                        Edit
                      </Button>
                    )}
                    {canToggle && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === customer.id}
                        onClick={() => onToggleStatus(customer)}
                        aria-label={`${isActive ? "Deactivate" : "Activate"} ${customer.name}`}
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