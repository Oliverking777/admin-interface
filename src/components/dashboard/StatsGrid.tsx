import StatCard, { StatCardSkeleton, type DashboardStat } from "@/components/dashboard/StatCard";
import { formatCount, formatFcfa } from "@/components/dashboard/dashboard-format";
import type { DashboardSummary } from "@/types/dashboard/dashboard";

const STAT_COUNT = 9;

/** A count that needs someone's action: highlighted when above zero. */
function waiting(count: number): Pick<DashboardStat, "value" | "tone"> {
  return { value: formatCount(count), tone: count > 0 ? "warning" : "default" };
}

/** The headline figures of the summary. A section that failed shows "Unavailable" on its cards. */
function toStats(s: DashboardSummary): DashboardStat[] {
  const { sales, money, stock, pending, logistics } = s;

  return [
    {
      id: "sales",
      label: "Sales today",
      value: sales ? formatFcfa(sales.completedSalesAmountToday) : null,
      hint: sales ? `${formatCount(sales.completedSalesCountToday)} completed · net of discounts` : undefined,
      href: "/orders",
    },
    {
      id: "payments",
      label: "Collected today",
      value: money ? formatFcfa(money.paymentsCollectedToday) : null,
      hint: "Payments received",
    },
    {
      id: "owed",
      label: "Customers owe",
      value: money ? formatFcfa(money.outstandingCustomerBalance) : null,
      hint: "All unpaid balances",
      href: "/customers",
    },
    {
      id: "orders",
      label: "Orders to validate",
      ...(pending ? waiting(pending.pendingOrderCount) : { value: null }),
      href: "/orders",
    },
    {
      id: "credit",
      label: "Credit requests",
      ...(pending ? waiting(pending.pendingCreditRequestCount) : { value: null }),
      hint: "Waiting for approval",
      href: "/customers",
    },
    {
      id: "adjustments",
      label: "Adjustments to approve",
      ...(pending ? waiting(pending.pendingStockAdjustmentCount) : { value: null }),
      href: "/inventory/adjustments",
    },
    {
      id: "transfers",
      label: "Transfers in transit",
      value: logistics ? formatCount(logistics.pendingTransferCount) : null,
      hint: "Sent, not yet received",
      href: "/inventory/transfers",
    },
    {
      id: "deliveries",
      label: "Purchases awaiting delivery",
      value: logistics ? formatCount(logistics.purchaseAwaitingDeliveryCount) : null,
      hint: "Ordered, not yet delivered",
      href: "/purchasing/purchases",
    },
    {
      id: "stock",
      label: "Out of stock",
      value: stock ? formatCount(stock.outOfStockProductCount) : null,
      tone: stock && stock.outOfStockProductCount > 0 ? "danger" : "default",
      hint: stock ? `${formatCount(stock.lowStockProductCount)} running low` : undefined,
      href: "/inventory/stock",
    },
  ];
}

export default function StatsGrid({ summary, loading }: { summary?: DashboardSummary; loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {!summary && loading
        ? Array.from({ length: STAT_COUNT }, (_, i) => <StatCardSkeleton key={i} />)
        : summary && toStats(summary).map((stat) => <StatCard key={stat.id} {...stat} />)}
    </div>
  );
}