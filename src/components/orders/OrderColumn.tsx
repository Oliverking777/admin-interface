import OrderCard, { type OrderCardPermissions } from "@/components/orders/OrderCard";
import { ORDER_STATUS_CONFIG, formatCount, formatFcfa } from "@/components/orders/order-display";
import type { OrderLookups } from "@/hooks/order/use-order-lookups";
import { cn } from "@/lib/cn";
import type { Order, OrderStatus } from "@/types/order/order";

export type OrderColumnData = {
  status: OrderStatus;
  orders: Order[];
  /** Every order with this status for the filters (the column may show only the first ones). */
  total: number;
  /** The column failed to load. */
  error?: string | null;
};

type OrderColumnProps = OrderColumnData & {
  lookups: OrderLookups;
  showLocation: boolean;
  permissions: OrderCardPermissions;
  /** A search is active: the counts then refer to what matches. */
  filtered: boolean;
  onOpenDetails: (order: Order) => void;
  onCancel: (order: Order) => void;
  onComplete: (order: Order) => void;
};

export default function OrderColumn({
  status,
  orders,
  total,
  error,
  filtered,
  lookups,
  showLocation,
  permissions,
  onOpenDetails,
  onCancel,
  onComplete,
}: OrderColumnProps) {
  const config = ORDER_STATUS_CONFIG[status];
  const amount = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <section aria-label={config.title} className="flex min-w-[260px] flex-1 flex-col border border-border">
      <div className={cn("flex items-center justify-between px-3 py-2 text-sm font-semibold", config.headerClass)}>
        <span>{config.title}</span>
        <span className="tabular-nums">{formatCount(filtered ? orders.length : total)}</span>
      </div>
      {status === "COMPLETED" && orders.length > 0 && (
        <p className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
          {formatFcfa(amount)} {orders.length < total && !filtered ? "in the orders shown" : "in sales"}
        </p>
      )}

      <div className="flex-1 space-y-2 bg-background p-2">
        {error ? (
          <p role="alert" className="py-6 text-center text-xs text-red-600">
            {error}
          </p>
        ) : orders.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{filtered ? "No match" : "No orders"}</p>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              lookups={lookups}
              showLocation={showLocation}
              permissions={permissions}
              onOpenDetails={onOpenDetails}
              onCancel={onCancel}
              onComplete={onComplete}
            />
          ))
        )}
        {!filtered && total > orders.length && (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Showing the latest {formatCount(orders.length)} of {formatCount(total)}
          </p>
        )}
      </div>
    </section>
  );
}