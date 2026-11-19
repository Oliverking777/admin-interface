import { ORDER_BOARD_STATUSES } from "@/components/orders/order-display";

export default function OrdersSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" aria-busy="true" aria-label="Loading orders">
      {ORDER_BOARD_STATUSES.map((status) => (
        <div key={status} className="min-w-[260px] flex-1 border border-border">
          <div className="h-9 animate-pulse bg-accent motion-reduce:animate-none" />
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse border border-border bg-accent/40 motion-reduce:animate-none" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}