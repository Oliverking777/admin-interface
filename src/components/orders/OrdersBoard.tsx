import OrderColumn, { type OrderColumnData } from "@/components/orders/OrderColumn";
import type { OrderCardPermissions } from "@/components/orders/OrderCard";
import type { OrderLookups } from "@/hooks/order/use-order-lookups";
import type { Order } from "@/types/order/order";

type OrdersBoardProps = {
  columns: OrderColumnData[];
  lookups: OrderLookups;
  showLocation: boolean;
  permissions: OrderCardPermissions;
  filtered: boolean;
  onOpenDetails: (order: Order) => void;
  onCancel: (order: Order) => void;
  onComplete: (order: Order) => void;
};

/** One column per status: pending, completed, cancelled. */
export default function OrdersBoard({ columns, ...rest }: OrdersBoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((column) => (
        <OrderColumn key={column.status} {...column} {...rest} />
      ))}
    </div>
  );
}