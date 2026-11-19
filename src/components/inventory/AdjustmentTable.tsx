"use client";

/**
 * Adjustment rows, sized to the space available (see ResponsiveTable):
 *   narrow  cards: product, number and location, change and status
 *   @2xl    Adjustment, Product, Location, Change, Status (reason under the product)
 *   @4xl    + Requested
 *   @5xl    + Reason column
 */

import AdjustmentStatusBadge from "@/components/inventory/AdjustmentStatusBadge";
import Button from "@/components/ui/Button";
import {
  CardList,
  CardMessage,
  HIDE_FROM,
  MobileCard,
  ResponsiveTable,
  SHOW_FROM,
} from "@/components/ui/ResponsiveTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { ADJUSTMENT_REASON_LABEL, signedDelta } from "@/lib/inventory/adjustment-format";
import { formatDateTime, formatSignedQuantity } from "@/lib/inventory/stock-format";
import type { StockAdjustment } from "@/types/inventory/inventory";
import { type StockVariant } from "@/lib/inventory/stock-variants";

type AdjustmentTableProps = {
  rows: StockAdjustment[];
  /** By variant id: used to write quantities with the variant's base unit. */
  variantsById: Map<string, StockVariant>;
  loading: boolean;
  onOpen: (adjustment: StockAdjustment) => void;
};

const COLUMN_COUNT = 8;

const COL = {
  reason: SHOW_FROM["5xl"],
  requested: SHOW_FROM["4xl"],
};

function changeTone(adjustment: StockAdjustment) {
  return adjustment.direction === "INCREASE" ? "text-primary" : "text-red-600";
}

export default function AdjustmentTable({ rows, variantsById, loading, onOpen }: AdjustmentTableProps) {
  const emptyMessage = loading ? "Loading adjustments..." : "No adjustments match these filters.";

  function changeOf(adjustment: StockAdjustment) {
    const units = variantsById.get(adjustment.productId)?.units ?? [];
    return formatSignedQuantity(signedDelta(adjustment.direction, adjustment.quantity), units);
  }

  const cards =
    rows.length === 0 ? (
      <CardMessage title={emptyMessage} />
    ) : (
      <CardList>
        {rows.map((adjustment) => (
          <MobileCard
            key={adjustment.id}
            onOpen={() => onOpen(adjustment)}
            openLabel={`View adjustment ${adjustment.number}`}
            title={adjustment.productName}
            subtitle={
              <p className="truncate">
                {adjustment.number} · {adjustment.locationName}
              </p>
            }
            aside={
              <>
                <p className={cn("text-sm font-semibold tabular-nums", changeTone(adjustment))}>
                  {changeOf(adjustment)}
                </p>
                <AdjustmentStatusBadge status={adjustment.status} />
              </>
            }
          />
        ))}
      </CardList>
    );

  const table = (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Adjustment</TableHeaderCell>
          <TableHeaderCell>Product</TableHeaderCell>
          <TableHeaderCell>Location</TableHeaderCell>
          <TableHeaderCell>Change</TableHeaderCell>
          <TableHeaderCell className={COL.reason}>Reason</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell className={COL.requested}>Requested</TableHeaderCell>
          <TableHeaderCell className="text-right">
            <span className="sr-only">Actions</span>
          </TableHeaderCell>
        </tr>
      </TableHead>

      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}

        {rows.map((adjustment) => (
          <TableRow key={adjustment.id}>
            <TableCell className="whitespace-nowrap font-medium">{adjustment.number}</TableCell>

            <TableCell>
              <div className="max-w-52 @4xl:max-w-64 @6xl:max-w-80">
                <p className="truncate" title={adjustment.productName}>
                  {adjustment.productName}
                </p>
                <p className={cn("truncate text-xs text-muted-foreground", HIDE_FROM["5xl"])}>
                  {ADJUSTMENT_REASON_LABEL[adjustment.reason]}
                </p>
              </div>
            </TableCell>

            <TableCell>{adjustment.locationName}</TableCell>

            <TableCell className={cn("whitespace-nowrap font-semibold tabular-nums", changeTone(adjustment))}>
              {changeOf(adjustment)}
            </TableCell>

            <TableCell className={cn(COL.reason, "text-muted-foreground")}>
              {ADJUSTMENT_REASON_LABEL[adjustment.reason]}
            </TableCell>

            <TableCell>
              <AdjustmentStatusBadge status={adjustment.status} />
            </TableCell>

            <TableCell className={cn(COL.requested, "whitespace-nowrap text-muted-foreground")}>
              {formatDateTime(adjustment.createdAt)}
            </TableCell>

            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpen(adjustment)}
                aria-label={`View adjustment ${adjustment.number}`}
              >
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return <ResponsiveTable cards={cards} table={table} />;
}