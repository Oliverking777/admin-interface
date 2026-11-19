"use client";

/**
 * Orders board: every order by default, one column per status. Picking a date narrows the board to that
 * business day; "All dates" goes back to every order.
 * Users tied to one location only ever see that location (the backend enforces it); users who work
 * everywhere get location tabs. Search filters the orders already loaded (the API has no text search).
 */

import { useCallback, useMemo, useState } from "react";

import CompleteSaleModal from "@/components/orders/CompleteSaleModal";
import OrderDateFilter from "@/components/orders/OrderDateFilter";
import OrderDetailsDrawer from "@/components/orders/OrderDetailsDrawer";
import OrderLocationTabs from "@/components/orders/OrderLocationTabs";
import OrderSearchBar from "@/components/orders/OrderSearchBar";
import OrdersBoard from "@/components/orders/OrdersBoard";
import OrdersSkeleton from "@/components/orders/OrdersSkeleton";
import type { OrderColumnData } from "@/components/orders/OrderColumn";
import { ORDER_BOARD_STATUSES, formatFcfa } from "@/components/orders/order-display";
import ReasonDialog from "@/components/purchase/ReasonDialog";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/hooks/iam/use-auth";
import { useCancelOrder, useCompleteSale, useOrderAbilities, useOrders } from "@/hooks/order/use-order";
import { useOrderLookups } from "@/hooks/order/use-order-lookups";
import { getErrorMessage } from "@/lib/api/api-error";
import {
  businessDayRange,
  canCancelOrder,
  isOrderCompletable,
  type Order,
  type OrderStatus,
} from "@/types/order/order";
import type { CompleteSaleRequest } from "@/types/order/order-dto";

/** How many orders each column loads (newest first). */
const COLUMN_SIZE = 50;

export default function OrdersPage() {
  const { user } = useAuth();
  const abilities = useOrderAbilities();
  const lookups = useOrderLookups();
  const { toast } = useToast();

  /** "" = every day; a "YYYY-MM-DD" narrows the board to that business day. */
  const [day, setDay] = useState("");
  const [location, setLocation] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [toComplete, setToComplete] = useState<Order | null>(null);
  const [toCancel, setToCancel] = useState<Order | null>(null);

  const range = day ? businessDayRange(day, day) : {};
  const locationId = lookups.anyLocation && location !== "all" ? location : undefined;
  const filters = { ...range, locationId, size: COLUMN_SIZE };
  const enabled = lookups.ready;

  // One query per column, so each status shows its own total.
  const pending = useOrders({ ...filters, status: "PENDING" }, { enabled });
  const completed = useOrders({ ...filters, status: "COMPLETED" }, { enabled });
  const cancelled = useOrders({ ...filters, status: "CANCELLED" }, { enabled });
  const queries: Record<OrderStatus, typeof pending> = { PENDING: pending, COMPLETED: completed, CANCELLED: cancelled };

  const cancelOrder = useCancelOrder();
  const completeSale = useCompleteSale();

  const term = search.trim().toLowerCase();
  const columns: OrderColumnData[] = useMemo(
    () =>
      ORDER_BOARD_STATUSES.map((status) => {
        const q = queries[status];
        const all = q.data?.content ?? [];
        const orders = term
          ? all.filter(
              (o) =>
                o.orderNumber.toLowerCase().includes(term) ||
                (lookups.customerName(o.customerId) ?? "").toLowerCase().includes(term),
            )
          : all;
        return {
          status,
          orders,
          total: q.data?.totalElements ?? 0,
          error: q.isError ? getErrorMessage(q.error, "Could not load these orders.") : null,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending.data, completed.data, cancelled.data, pending.error, completed.error, cancelled.error, term, lookups],
  );

  const permissions = useMemo(
    () => ({
      canCancel: (o: Order) => canCancelOrder(o, user?.userId, abilities.can),
      canComplete: (o: Order) => abilities.complete && isOrderCompletable(o.status),
    }),
    [user?.userId, abilities.can, abilities.complete],
  );

  const closeComplete = useCallback(() => setToComplete(null), []);
  const closeCancel = useCallback(() => setToCancel(null), []);

  const handleComplete = useCallback(
    async (request: CompleteSaleRequest) => {
      if (!toComplete) throw new Error("No order selected");
      const receipt = await completeSale.mutateAsync({ orderId: toComplete.id, request });
      setSelected(null);
      toast({
        title: "Sale completed",
        description: `${receipt.orderNumber} · receipt ${receipt.receiptNumber} · ${formatFcfa(receipt.totalAmount)}${
          receipt.fullyPaid ? "" : ` (${formatFcfa(receipt.amountDue)} on credit)`
        }`,
        variant: "success",
      });
      return receipt;
    },
    [toComplete, completeSale, toast],
  );

  const handleCancel = useCallback(
    async (reason: string) => {
      if (!toCancel) throw new Error("No order selected");
      const order = await cancelOrder.mutateAsync({ orderId: toCancel.id, request: { reason } });
      setSelected(null);
      toast({ title: "Order cancelled", description: order.orderNumber, variant: "info" });
    },
    [toCancel, cancelOrder, toast],
  );

  if (!abilities.read) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">You don&apos;t have access to orders.</p>
        <p className="mt-1 text-sm text-muted-foreground">Ask an administrator for the SALE_READ permission.</p>
      </Card>
    );
  }

  const loading = !lookups.ready || (pending.isPending && completed.isPending && cancelled.isPending);
  const showLocation = lookups.anyLocation && location === "all";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sales</h2>
        <p className="text-sm text-muted-foreground">
          Orders by status. Pick a date to see one day. A sale counts only once it is completed.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm flex-1">
          <OrderSearchBar value={search} onChange={setSearch} />
        </div>
        <OrderDateFilter value={day} onChange={setDay} />
      </div>

      {lookups.anyLocation && <OrderLocationTabs value={location} onChange={setLocation} locations={lookups.locations} />}

      {loading ? (
        <OrdersSkeleton />
      ) : (
        <OrdersBoard
          columns={columns}
          lookups={lookups}
          showLocation={showLocation}
          permissions={permissions}
          filtered={term !== ""}
          onOpenDetails={setSelected}
          onCancel={setToCancel}
          onComplete={setToComplete}
        />
      )}

      <OrderDetailsDrawer
        order={selected}
        lookups={lookups}
        permissions={permissions}
        onClose={() => setSelected(null)}
        onCancel={setToCancel}
        onComplete={setToComplete}
      />

      <CompleteSaleModal order={toComplete} lookups={lookups} onClose={closeComplete} onSubmit={handleComplete} />

      <ReasonDialog
        open={toCancel !== null}
        onClose={closeCancel}
        title={`Cancel ${toCancel?.orderNumber ?? "order"}`}
        description="The order stays in the history as cancelled. Nothing was taken from stock or paid."
        label="Why is it cancelled?"
        confirmLabel="Cancel order"
        destructive
        onSubmit={handleCancel}
      />
    </div>
  );
}