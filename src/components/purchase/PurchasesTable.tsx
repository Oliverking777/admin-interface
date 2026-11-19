"use client";

/**
 * Purchases, sized to the space available (see ResponsiveTable):
 *   narrow  cards: number, supplier, place and expected date, total and status; Confirm delivery under it
 *   @2xl    Number, Supplier, Total, Status (delivery place under the supplier)
 *   @3xl    + Expected
 *   @4xl    + Deliver to column
 * Long names are cut with "..." (full text on hover).
 */

import Link from "next/link";
import Button from "@/components/ui/Button";
import {
  CardList,
  CardMessage,
  CardSkeleton,
  HIDE_FROM,
  MobileCard,
  ResponsiveTable,
  SHOW_FROM,
  SkeletonRows,
} from "@/components/ui/ResponsiveTable";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { formatDate, formatFcfa } from "@/components/purchase/purchase-display";
import { PurchaseStatusBadge } from "@/components/purchase/StatusBadges";
import { EmptyRow, ErrorRow } from "@/components/purchase/TableStates";
import { cn } from "@/lib/cn";
import { isPurchaseOpen, type Purchase } from "@/types/purchase/purchase";

type PurchasesTableProps = {
  purchases: Purchase[];
  loading: boolean;
  error: string | null;
  /** True when a filter is active (changes the empty message). */
  filtered: boolean;
  onRetry: () => void;
  /** Shows "Confirm delivery" on purchases still waiting for their goods. Leave out for users who may not confirm. */
  onConfirmDelivery?: (purchase: Purchase) => void;
  /** Link of a purchase's page. */
  purchaseHref?: (purchaseId: string) => string;
};

const COL = {
  location: SHOW_FROM["4xl"],
  expected: SHOW_FROM["3xl"],
};

/** One class per column, in header order. */
const CELLS = ["", "", COL.location, COL.expected, "text-right", "", ""] as const;

const defaultHref = (id: string) => `/purchasing/purchases/${id}`;

export default function PurchasesTable({
  purchases,
  loading,
  error,
  filtered,
  onRetry,
  onConfirmDelivery,
  purchaseHref = defaultHref,
}: PurchasesTableProps) {
  const emptyTitle = filtered ? "No purchases match these filters" : "No purchases yet";
  const emptyHint = filtered
    ? "Try a different tab, supplier or date range."
    : "Use New order to order from a supplier.";

  function confirmButton(purchase: Purchase) {
    if (!onConfirmDelivery || !isPurchaseOpen(purchase.status)) return null;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onConfirmDelivery(purchase)}
        aria-label={`Confirm the delivery of ${purchase.code}`}
      >
        Confirm delivery
      </Button>
    );
  }

  const cards = loading ? (
    <CardSkeleton />
  ) : error ? (
    <CardMessage title={error} alert onRetry={onRetry} />
  ) : purchases.length === 0 ? (
    <CardMessage title={emptyTitle} hint={emptyHint} />
  ) : (
    <CardList>
      {purchases.map((purchase) => (
        <MobileCard
          key={purchase.id}
          href={purchaseHref(purchase.id)}
          title={purchase.code}
          subtitle={
            <>
              <p className="truncate">{purchase.supplierName ?? "Unknown supplier"}</p>
              <p className="truncate">
                {purchase.locationName ?? "-"} · expected {formatDate(purchase.expectedDeliveryDate)}
              </p>
            </>
          }
          aside={
            <>
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatFcfa(purchase.totalAmount)}</p>
              <PurchaseStatusBadge status={purchase.status} hasDiscrepancy={purchase.hasDiscrepancy} />
            </>
          }
          actions={confirmButton(purchase) ?? undefined}
        />
      ))}
    </CardList>
  );

  const table = (
    <Table aria-busy={loading || undefined}>
      <TableHead>
        <tr>
          <TableHeaderCell>Number</TableHeaderCell>
          <TableHeaderCell>Supplier</TableHeaderCell>
          <TableHeaderCell className={cn(COL.location, "whitespace-nowrap")}>Deliver to</TableHeaderCell>
          <TableHeaderCell className={COL.expected}>Expected</TableHeaderCell>
          <TableHeaderCell className="text-right">Total</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell className="text-right">
            <span className="sr-only">Actions</span>
          </TableHeaderCell>
        </tr>
      </TableHead>

      <TableBody>
        {loading ? (
          <SkeletonRows cells={CELLS} />
        ) : error ? (
          <ErrorRow columns={CELLS.length} message={error} onRetry={onRetry} />
        ) : purchases.length === 0 ? (
          <EmptyRow columns={CELLS.length} title={emptyTitle} hint={emptyHint} />
        ) : (
          purchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell className="whitespace-nowrap font-medium">
                <Link
                  href={purchaseHref(purchase.id)}
                  className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {purchase.code}
                </Link>
              </TableCell>
              <TableCell>
                <div className="max-w-48 @5xl:max-w-64">
                  <p className="truncate" title={purchase.supplierName ?? undefined}>
                    {purchase.supplierName ?? <span className="text-muted-foreground">Unknown supplier</span>}
                  </p>
                  {purchase.locationName && (
                    <p
                      className={cn("truncate text-xs text-muted-foreground", HIDE_FROM["4xl"])}
                      title={purchase.locationName}
                    >
                      {purchase.locationName}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className={cn(COL.location, "text-muted-foreground")}>
                <span className="block max-w-40 truncate @5xl:max-w-56" title={purchase.locationName ?? undefined}>
                  {purchase.locationName ?? "-"}
                </span>
              </TableCell>
              <TableCell className={cn(COL.expected, "whitespace-nowrap text-muted-foreground")}>
                {formatDate(purchase.expectedDeliveryDate)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right tabular-nums">
                {formatFcfa(purchase.totalAmount)}
              </TableCell>
              <TableCell>
                <PurchaseStatusBadge status={purchase.status} hasDiscrepancy={purchase.hasDiscrepancy} />
              </TableCell>
              <TableCell className="px-2 text-right">{confirmButton(purchase)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return <ResponsiveTable cards={cards} table={table} />;
}