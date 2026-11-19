import Link from "next/link";

import { EmptyRow, ErrorRow, SkeletonRows } from "@/components/purchase/TableStates";
import OrderLocationBadge from "@/components/orders/OrderLocationBadge";
import { formatDateTime, formatFcfa, shortId } from "@/components/orders/order-display";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import type { OrderLookups } from "@/hooks/order/use-order-lookups";
import type { Order } from "@/types/order/order";

type ReceiptsTableProps = {
  /** COMPLETED orders: each has exactly one receipt. */
  sales: Order[];
  lookups: OrderLookups;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** A filter or search is active (changes the empty message). */
  filtered: boolean;
  showLocation: boolean;
  receiptHref?: (orderId: string) => string;
};

const linkClass =
  "font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Completed sales, newest first, each linking to its printable receipt. */
export default function ReceiptsTable({
  sales,
  lookups,
  loading,
  error,
  onRetry,
  filtered,
  showLocation,
  receiptHref = (id) => `/receipts/${id}`,
}: ReceiptsTableProps) {
  const columns = showLocation ? 7 : 6;

  return (
    <Table aria-busy={loading || undefined}>
      <TableHead>
        <tr>
          <TableHeaderCell>Order</TableHeaderCell>
          <TableHeaderCell>Completed</TableHeaderCell>
          {showLocation && <TableHeaderCell>Location</TableHeaderCell>}
          <TableHeaderCell>Customer</TableHeaderCell>
          <TableHeaderCell className="text-right">Total</TableHeaderCell>
          <TableHeaderCell className="text-right">On credit</TableHeaderCell>
          <TableHeaderCell className="text-right">
            <span className="sr-only">Receipt</span>
          </TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {loading && sales.length === 0 ? (
          <SkeletonRows columns={columns} />
        ) : error ? (
          <ErrorRow columns={columns} message={error} onRetry={onRetry} />
        ) : sales.length === 0 ? (
          <EmptyRow
            columns={columns}
            title={filtered ? "No sale matches" : "No completed sale"}
            hint={filtered ? "Try another period, location or search." : "Receipts appear once a sale is completed."}
          />
        ) : (
          sales.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <Link href={receiptHref(s.id)} className={linkClass}>
                  {s.orderNumber}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(s.completedAt ?? s.updatedAt)}
              </TableCell>
              {showLocation && (
                <TableCell>
                  <OrderLocationBadge name={lookups.locationName(s.locationId)} />
                </TableCell>
              )}
              <TableCell className="max-w-[14rem] truncate">
                {lookups.customerName(s.customerId) ?? `Customer ${shortId(s.customerId)}`}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatFcfa(s.totalAmount)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {s.amountDue ? (
                  <span className="text-amber-700 dark:text-amber-300">{formatFcfa(s.amountDue)}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Link href={receiptHref(s.id)} className={linkClass}>
                  View receipt
                </Link>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}