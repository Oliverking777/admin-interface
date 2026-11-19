"use client";

/**
 * Lines of a purchase, sized to the space available (see ResponsiveTable).
 * Before delivery:
 *   narrow  cards: product and unit, ordered, line total and unit price; Change / Remove under it
 *   @2xl    Product, Ordered, Line total (price under the total)
 *   @4xl    + Unit price
 * Once delivered, Accepted is added, then from @3xl a "Not kept" column (rejected and missing; under Accepted
 * when narrower). The reason given for a line that differs shows under the product.
 */

import Button from "@/components/ui/Button";
import {
  CardList,
  CardMessage,
  HIDE_FROM,
  MobileCard,
  ResponsiveTable,
  SHOW_FROM,
} from "@/components/ui/ResponsiveTable";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import {
  REJECTION_TYPE_LABEL,
  formatFcfa,
  formatQuantity,
  type UnitLabel,
} from "@/components/purchase/purchase-display";
import { EmptyRow } from "@/components/purchase/TableStates";
import { cn } from "@/lib/cn";
import type { PurchaseItem } from "@/types/purchase/purchase";

type PurchaseItemsTableProps = {
  items: PurchaseItem[];
  totalAmount: number;
  /** True once the delivery is confirmed: shows what was accepted, rejected and missing. */
  delivered: boolean;
  /** True for a purchase still waiting for delivery that the user may change: shows Change and Remove. */
  editable: boolean;
  unitLabel?: UnitLabel;
  /** Id of the line being removed, to disable its buttons. */
  busyItemId?: string | null;
  onEdit?: (item: PurchaseItem) => void;
  onRemove?: (item: PurchaseItem) => void;
};

const COL = {
  notKept: SHOW_FROM["3xl"],
  price: SHOW_FROM["4xl"],
};

/** "2 rejected (damaged) · 1 missing", or null when the line arrived as ordered. */
function notKept(item: PurchaseItem): string | null {
  const parts: string[] = [];
  if (item.rejectedQuantity) {
    const why = item.rejectionType ? ` (${REJECTION_TYPE_LABEL[item.rejectionType].toLowerCase()})` : "";
    parts.push(`${formatQuantity(item.rejectedQuantity)} rejected${why}`);
  }
  if (item.missingQuantity) parts.push(`${formatQuantity(item.missingQuantity)} missing`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default function PurchaseItemsTable({
  items,
  totalAmount,
  delivered,
  editable,
  unitLabel,
  busyItemId = null,
  onEdit,
  onRemove,
}: PurchaseItemsTableProps) {
  const columns = 3 + (delivered ? 2 : 0) + 1 + (editable ? 1 : 0);
  // The last line cannot be removed: the purchase is cancelled instead.
  const canRemove = items.length > 1;

  const nameOf = (item: PurchaseItem) => item.productName ?? "Unknown product";

  function unitLine(item: PurchaseItem) {
    const unit = unitLabel?.(item.unitId);
    if (!unit && item.conversionFactor <= 1) return null;
    return (
      <>
        {unit ?? "Unit"}
        {item.conversionFactor > 1 && ` · ${item.conversionFactor} base units each`}
      </>
    );
  }

  function lineButtons(item: PurchaseItem) {
    if (!editable) return null;
    const name = nameOf(item);
    return (
      <>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busyItemId === item.id}
            onClick={() => onEdit(item)}
            aria-label={`Change ${name}`}
          >
            Change
          </Button>
        )}
        {onRemove && canRemove && (
          <Button
            variant="ghost"
            size="sm"
            loading={busyItemId === item.id}
            onClick={() => onRemove(item)}
            aria-label={`Remove ${name}`}
          >
            Remove
          </Button>
        )}
      </>
    );
  }

  const total = (
    <div className="flex items-baseline justify-end gap-6">
      <span className="font-medium text-muted-foreground">Total ordered</span>
      <span className="font-semibold tabular-nums text-foreground">{formatFcfa(totalAmount)}</span>
    </div>
  );

  const cards =
    items.length === 0 ? (
      <CardMessage title="No lines" />
    ) : (
      <CardList footer={total}>
        {items.map((item) => {
          const unit = unitLine(item);
          const problems = delivered ? notKept(item) : null;
          return (
            <MobileCard
              key={item.id}
              title={nameOf(item)}
              subtitle={
                <>
                  {unit && <p className="truncate">{unit}</p>}
                  <p className="truncate tabular-nums">
                    Ordered {formatQuantity(item.orderedQuantity)}
                    {delivered && ` · Accepted ${formatQuantity(item.acceptedQuantity ?? 0)}`}
                  </p>
                  {problems && <p className="truncate text-amber-700 dark:text-amber-300">{problems}</p>}
                  {item.discrepancyReason && <p className="truncate">{item.discrepancyReason}</p>}
                </>
              }
              aside={
                <>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatFcfa(item.lineTotal)}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatFcfa(item.unitPurchasePrice)} each
                  </p>
                </>
              }
              actions={lineButtons(item) ?? undefined}
            />
          );
        })}
      </CardList>
    );

  const table = (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Product</TableHeaderCell>
          <TableHeaderCell className="text-right">Ordered</TableHeaderCell>
          {delivered && <TableHeaderCell className="text-right">Accepted</TableHeaderCell>}
          {delivered && <TableHeaderCell className={cn(COL.notKept, "whitespace-nowrap")}>Not kept</TableHeaderCell>}
          <TableHeaderCell className={cn(COL.price, "whitespace-nowrap text-right")}>Unit price</TableHeaderCell>
          <TableHeaderCell className="whitespace-nowrap text-right">Line total</TableHeaderCell>
          {editable && (
            <TableHeaderCell className="text-right">
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          )}
        </tr>
      </TableHead>

      <TableBody>
        {items.length === 0 ? (
          <EmptyRow columns={columns} title="No lines" />
        ) : (
          items.map((item) => {
            const name = nameOf(item);
            const unit = unitLine(item);
            const problems = delivered ? notKept(item) : null;
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="max-w-56 @5xl:max-w-72">
                    <p className="truncate font-medium" title={name}>
                      {name}
                    </p>
                    {unit && <p className="truncate text-xs text-muted-foreground">{unit}</p>}
                    {item.discrepancyReason && (
                      <p className="truncate text-xs text-muted-foreground" title={item.discrepancyReason}>
                        {item.discrepancyReason}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatQuantity(item.orderedQuantity)}</TableCell>
                {delivered && (
                  <TableCell className="text-right tabular-nums">
                    <span className="font-medium">{formatQuantity(item.acceptedQuantity ?? 0)}</span>
                    {problems && (
                      <span
                        className={cn(
                          "block whitespace-nowrap text-xs text-amber-700 dark:text-amber-300",
                          HIDE_FROM["3xl"],
                        )}
                      >
                        {problems}
                      </span>
                    )}
                  </TableCell>
                )}
                {delivered && (
                  <TableCell className={cn(COL.notKept, "whitespace-nowrap")}>
                    {problems ? (
                      <span className="text-amber-700 dark:text-amber-300">{problems}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
                <TableCell className={cn(COL.price, "whitespace-nowrap text-right tabular-nums")}>
                  {formatFcfa(item.unitPurchasePrice)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatFcfa(item.lineTotal)}
                  <span className={cn("block text-xs text-muted-foreground", HIDE_FROM["4xl"])}>
                    {formatFcfa(item.unitPurchasePrice)} each
                  </span>
                </TableCell>
                {editable && (
                  <TableCell className="px-2 text-right">
                    <div className="flex justify-end gap-1">{lineButtons(item)}</div>
                  </TableCell>
                )}
              </TableRow>
            );
          })
        )}
      </TableBody>

      {items.length > 0 && (
        <tfoot className="border-t border-border bg-muted/40">
          <tr>
            {/* one cell across the row, so it stays right whichever columns are shown */}
            <td colSpan={columns} className="px-4 py-3 text-sm">
              {total}
            </td>
          </tr>
        </tfoot>
      )}
    </Table>
  );

  return <ResponsiveTable cards={cards} table={table} />;
}