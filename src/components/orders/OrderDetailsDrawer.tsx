"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Drawer from "@/components/ui/Drawer";
import OrderCardActions from "@/components/orders/OrderCardActions";
import OrderLocationBadge from "@/components/orders/OrderLocationBadge";
import {
  ORDER_STATUS_CONFIG,
  formatDateTime,
  formatFcfa,
  shortId,
} from "@/components/orders/order-display";
import type { OrderCardPermissions } from "@/components/orders/OrderCard";
import { useOrder, useOrderHistory, useSaleReceipt } from "@/hooks/order/use-order";
import type { OrderLookups } from "@/hooks/order/use-order-lookups";
import { getErrorMessage } from "@/lib/api/api-error";
import { isFullyPriced, type Order, type OrderEventType } from "@/types/order/order";

const EVENT_LABEL: Record<OrderEventType, string> = {
  CREATED: "Created",
  UPDATED: "Edited",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

type OrderDetailsDrawerProps = {
  /** The order picked on the board (shown at once); the drawer then loads the latest version. */
  order: Order | null;
  lookups: OrderLookups;
  permissions: OrderCardPermissions;
  onClose: () => void;
  onCancel: (order: Order) => void;
  onComplete: (order: Order) => void;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums text-foreground">{children}</span>
    </div>
  );
}

export default function OrderDetailsDrawer({
  order: picked,
  lookups,
  permissions,
  onClose,
  onCancel,
  onComplete,
}: OrderDetailsDrawerProps) {
  const query = useOrder(picked?.id, { enabled: !!picked });
  const order = query.data ?? picked;
  const history = useOrderHistory(picked?.id, { enabled: !!picked });
  const receipt = useSaleReceipt(picked?.id, { enabled: order?.status === "COMPLETED" });

  const customer = order ? (lookups.customerName(order.customerId) ?? `Customer ${shortId(order.customerId)}`) : "";
  const config = order ? ORDER_STATUS_CONFIG[order.status] : null;

  return (
    <Drawer
      open={picked !== null}
      onClose={onClose}
      title={order?.orderNumber ?? "Order"}
      footer={
        order?.status === "PENDING" ? (
          <OrderCardActions
            className="flex gap-2"
            canCancel={permissions.canCancel(order)}
            canComplete={permissions.canComplete(order)}
            onCancel={() => onCancel(order)}
            onComplete={() => onComplete(order)}
          />
        ) : undefined
      }
    >
      {order && config && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <OrderLocationBadge name={lookups.locationName(order.locationId)} />
            <Badge variant={config.badge}>{config.title}</Badge>
          </div>

          {query.isError && (
            <p role="alert" className="text-sm text-red-600">
              {getErrorMessage(query.error, "Could not load the latest version of this order.")}
            </p>
          )}

          <div className="space-y-1.5">
            <Row label="Customer">{customer}</Row>
            <Row label="Created">{formatDateTime(order.createdAt)}</Row>
            {order.completedAt && <Row label="Completed">{formatDateTime(order.completedAt)}</Row>}
            {receipt.data && (
              <Row label="Receipt">
                <Link href={`/receipts/${order.id}`} className="text-primary hover:underline">
                  {receipt.data.receiptNumber} · Print
                </Link>
              </Row>
            )}
          </div>

          {order.note && (
            <div>
              <p className="text-sm text-muted-foreground">Note</p>
              <p className="text-sm text-foreground">{order.note}</p>
            </div>
          )}
          {order.cancelReason && (
            <div>
              <p className="text-sm text-muted-foreground">Cancel reason</p>
              <p className="text-sm text-foreground">{order.cancelReason}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm text-muted-foreground">Lines</p>
            {order.status === "PENDING" && !isFullyPriced(order.items) && (
              <p className="mb-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                Lines without a price must get one before the sale can be completed.
              </p>
            )}
            <ul className="divide-y divide-border border border-border">
              {order.items.map((item) => (
                <li key={item.id} className="px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-foreground">
                      {lookups.productName(item.productId) ?? `Product ${shortId(item.productId)}`}
                      <span className="block text-xs text-muted-foreground">
                        {item.quantity} {lookups.unitName(item.productId, item.unitId) ?? "unit(s)"}
                        {item.unitPrice !== null && ` × ${formatFcfa(item.unitPrice)}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      {item.unitPrice === null ? (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">No price</span>
                      ) : (
                        <>
                          <span className="text-foreground">{formatFcfa(item.lineTotal)}</span>
                          {item.discountAmount > 0 && (
                            <span className="block text-xs text-muted-foreground">
                              −{formatFcfa(item.discountAmount)} discount
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5 border-t border-border pt-3">
            {order.discountTotal > 0 && (
              <>
                <Row label="Subtotal">{formatFcfa(order.subtotal)}</Row>
                <Row label="Discounts">−{formatFcfa(order.discountTotal)}</Row>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-base font-semibold tabular-nums text-foreground">
                {formatFcfa(order.totalAmount)}
              </span>
            </div>
            {order.amountPaid !== null && <Row label="Paid">{formatFcfa(order.amountPaid)}</Row>}
            {order.amountDue !== null && order.amountDue > 0 && (
              <Row label="On credit">{formatFcfa(order.amountDue)}</Row>
            )}
            {order.status === "PENDING" && (
              <p className="text-xs text-muted-foreground">
                Estimated: prices are checked again when the sale is completed.
              </p>
            )}
          </div>

          {history.data && history.data.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">History</p>
              <ol className="space-y-1.5">
                {history.data.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-foreground">
                      {EVENT_LABEL[e.eventType]}
                      {e.note && <span className="block text-muted-foreground">{e.note}</span>}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{formatDateTime(e.occurredAt)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}