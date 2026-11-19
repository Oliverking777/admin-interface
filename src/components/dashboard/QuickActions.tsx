"use client";

import Card from "@/components/ui/Card";
import QuickActionButton from "@/components/dashboard/QuickActionButton";
import { useAuth } from "@/hooks/iam/use-auth";
import { PERMISSIONS } from "@/lib/iam/permission-codes";

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      <path d={d} />
    </svg>
  );
}

type QuickAction = {
  id: string;
  label: string;
  href: string;
  d: string;
  /** Shown only to users with this permission. Leave out to show to everyone (the page still checks). */
  permission?: string;
};

/** Same routes as the sidebar (NAV_ITEMS). */
const ACTIONS: QuickAction[] = [
  {
    id: "orders",
    label: "Orders",
    href: "/orders",
    d: "M4 7h16l-1.5 10a2 2 0 01-2 1.7H7.5a2 2 0 01-2-1.7L4 7zM8 7V5a4 4 0 018 0v2",
    permission: PERMISSIONS.SALE_READ,
  },
  {
    id: "receipts",
    label: "Receipts",
    href: "/receipts",
    d: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6",
    permission: PERMISSIONS.SALE_READ,
  },
  {
    id: "purchase",
    label: "Record Purchase",
    href: "/purchasing/purchases",
    d: "M3 3h2l2.4 12.4a2 2 0 002 1.6h8.6a2 2 0 002-1.6L21 8H6",
    permission: PERMISSIONS.PURCHASE_CREATE,
  },
  { id: "transfer", label: "Transfers", href: "/inventory/transfers", d: "M7 7h10M7 7l3-3M7 7l3 3M17 17H7M17 17l-3-3M17 17l-3 3" },
  { id: "adjustment", label: "Stock Adjustment", href: "/inventory/adjustments", d: "M12 4v16M4 12h16" },
  { id: "customers", label: "Customers", href: "/customers", d: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    d: "M4 19V5M4 19h16M8 19v-6M12 19v-9M16 19v-4",
    permission: PERMISSIONS.REPORT_DEBT_READ,
  },
];

export default function QuickActions() {
  const { hasPermission } = useAuth();
  // Hiding is only a convenience: the backend enforces every permission.
  const actions = ACTIONS.filter((a) => !a.permission || hasPermission(a.permission));
  if (actions.length === 0) return null;

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {actions.map((action) => (
          <QuickActionButton key={action.id} href={action.href} label={action.label} icon={<Icon d={action.d} />} />
        ))}
      </div>
    </Card>
  );
}