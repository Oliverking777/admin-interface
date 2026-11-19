"use client";

/**
 * One stock initialization, read-only: where, when, who, and every product line with the counted quantity,
 * the unit's conversion factor and the quantity that entered the stock (in base units).
 * An initialization can never be edited or deleted: later corrections go through adjustments.
 */

import InitializationStatusBadge from "@/components/inventory/InitializationStatusBadge";
import Drawer from "@/components/ui/Drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { useStockInitialization } from "@/hooks/inventory/use-inventory";
import { formatDateTime, formatNumber, shortId } from "@/lib/inventory/stock-format";

type InitializationDetailDrawerProps = {
  /** The initialization to show. Null closes the drawer. */
  initializationId: string | null;
  /** Pass a stable function (useCallback). */
  onClose: () => void;
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

export default function InitializationDetailDrawer({
  initializationId,
  onClose,
}: InitializationDetailDrawerProps) {
  const query = useStockInitialization(initializationId ?? undefined);
  const initialization = query.data ?? null;

  return (
    <Drawer
      open={initializationId !== null}
      onClose={onClose}
      title={initialization?.number ?? "Initialization"}
      className="sm:max-w-2xl"
    >
      {query.isLoading && <p className="text-sm text-muted-foreground">Loading initialization...</p>}

      {query.error && (
        <p role="alert" className="text-sm text-red-600">
          {query.error.message}
        </p>
      )}

      {initialization && (
        <div className="flex flex-col gap-6">
          <section aria-label="Summary" className="flex flex-col gap-4">
            <InitializationStatusBadge status={initialization.status} />

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Detail label="Location" value={initialization.locationName ?? "—"} />
              <Detail label="Done by" value={`User ${shortId(initialization.initializedBy)}`} />
              <Detail label="Created" value={formatDateTime(initialization.createdAt)} />
              {initialization.completedAt && (
                <Detail label="Completed" value={formatDateTime(initialization.completedAt)} />
              )}
            </dl>
          </section>

          <section aria-label="Products" className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-foreground">Products</h3>
            <div className="border border-border">
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Product</TableHeaderCell>
                    <TableHeaderCell className="text-right">Counted</TableHeaderCell>
                    <TableHeaderCell className="text-right">Unit size</TableHeaderCell>
                    <TableHeaderCell className="text-right">In stock (base units)</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {initialization.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName ?? "Unknown product"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(item.countedQuantity)} {item.unitName ?? ""}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {item.conversionFactor === 1
                          ? "Base unit"
                          : `1 = ${formatNumber(item.conversionFactor)} base`}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatNumber(item.baseQuantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <p className="text-sm text-muted-foreground">
            This initialization cannot be edited. If a quantity was wrong, correct it with a stock adjustment.
          </p>
        </div>
      )}
    </Drawer>
  );
}
