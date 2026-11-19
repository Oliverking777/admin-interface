import Card from "@/components/ui/Card";
import OrderCardActions from "@/components/orders/OrderCardActions";
import OrderLocationBadge from "@/components/orders/OrderLocationBadge";
import { formatFcfa, formatTime, shortId } from "@/components/orders/order-display";
import type { OrderLookups } from "@/hooks/order/use-order-lookups";
import { isFullyPriced, type Order } from "@/types/order/order";

export type OrderCardPermissions = {
  canCancel: (order: Order) => boolean;
  canComplete: (order: Order) => boolean;
};

type OrderCardProps = {
  order: Order;
  lookups: OrderLookups;
  /** Show the location (only useful when several locations are listed). */
  showLocation: boolean;
  permissions: OrderCardPermissions;
  onOpenDetails: (order: Order) => void;
  onCancel: (order: Order) => void;
  onComplete: (order: Order) => void;
};

export default function OrderCard({
  order,
  lookups,
  showLocation,
  permissions,
  onOpenDetails,
  onCancel,
  onComplete,
}: OrderCardProps) {
  const itemCount = order.items.length;
  const unpriced = !isFullyPriced(order.items);
  const time = order.status === "COMPLETED" && order.completedAt ? order.completedAt : order.createdAt;

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenDetails(order)}
          className="text-left text-xs font-medium text-primary hover:underline"
        >
          {itemCount} line{itemCount === 1 ? "" : "s"} · View details
        </button>
        <span className="shrink-0 text-xs text-muted-foreground">{formatTime(time)}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {showLocation && <OrderLocationBadge name={lookups.locationName(order.locationId)} />}
          <span className="truncate text-sm font-semibold text-foreground">{order.orderNumber}</span>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {formatFcfa(order.totalAmount)}
        </span>
      </div>

      <p className="truncate text-sm text-muted-foreground">
        {lookups.customerName(order.customerId) ?? `Customer ${shortId(order.customerId)}`}
      </p>

      {order.status === "PENDING" && unpriced && (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Some lines have no price yet</p>
      )}
      {order.status === "COMPLETED" && order.amountDue !== null && order.amountDue > 0 && (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
          {formatFcfa(order.amountDue)} on credit
        </p>
      )}
      {order.status === "CANCELLED" && order.cancelReason && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{order.cancelReason}</p>
      )}

      {order.status === "PENDING" && (
        <OrderCardActions
          canCancel={permissions.canCancel(order)}
          canComplete={permissions.canComplete(order)}
          onCancel={() => onCancel(order)}
          onComplete={() => onComplete(order)}
        />
      )}
    </Card>
  );
}