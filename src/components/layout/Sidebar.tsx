"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import SidebarItem from "@/components/layout/SidebarItem";
import SidebarGroup from "@/components/layout/SidebarGroup";
import { useAuth } from "@/hooks/iam/use-auth";
import { PERMISSIONS } from "@/lib/iam/permission-codes";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      {children}
    </svg>
  );
}

export type NavChild = {
  href: string;
  label: string;
  /** Shown only to users with this permission. Leave out to show to everyone. */
  permission?: string;
};
export type NavItem = {
  href?: string; // leaf items only
  /** Leaf items only: shown only to users with this permission. */
  permission?: string;
  label: string;
  icon: ReactNode;
  children?: NavChild[]; // group items only
};

/** Single source of truth for navigation; Topbar reads titles from here too. */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <Icon>
        <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9z" />
      </Icon>
    ),
  },
  {
    // Sales / POS — Module III (FR-013–FR-023)
    label: "Sales",
    icon: (
      <Icon>
        <path d="M4 7h16l-1.5 10a2 2 0 01-2 1.7H7.5a2 2 0 01-2-1.7L4 7z" />
        <path d="M8 7V5a4 4 0 018 0v2" />
      </Icon>
    ),
    children: [
      { href: "/orders", label: "Orders" },
      { href: "/receipts", label: "Receipts" },
    ],
  },
  {
    // Multi-location stock levels — Module I (FR-001–FR-008)
    // Transfers — Module V (FR-033–FR-038)
    label: "Inventory",
    icon: (
      <Icon>
        <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" />
        <path d="M3 8l9 5 9-5M12 13v8" />
      </Icon>
    ),
    children: [
      { href: "/inventory/stock", label: "Stock" },
      { href: "/inventory/transfers", label: "Transfers" },
      { href: "/inventory/adjustments", label: "Adjustments" },
      { href: "/inventory/initializations", label: "Initializations" },
    ],
  },
  {
    // Purchases from suppliers and the supplier directory
    label: "Purchasing",
    icon: (
      <Icon>
        <path d="M2 6h12v10H2z" />
        <path d="M14 10h4l3 3v3h-7" />
        <circle cx="6.5" cy="18" r="1.75" />
        <circle cx="17.5" cy="18" r="1.75" />
      </Icon>
    ),
    children: [
      { href: "/purchasing/purchases", label: "Purchases", permission: PERMISSIONS.PURCHASE_READ },
      { href: "/purchasing/suppliers", label: "Suppliers", permission: PERMISSIONS.SUPPLIER_READ },
    ],
  },
  {
    label: "Products",
    icon: (
      <Icon>
        <path d="M3 3h8l10 10-8 8L3 11V3z" />
        <circle cx="7.5" cy="7.5" r="1.25" />
      </Icon>
    ),
    children: [
  { href: "/product/products", label: "Products", permission: PERMISSIONS.PRODUCT_READ },
  { href: "/product/units",    label: "Units",    permission: PERMISSIONS.UNIT_READ },
  { href: "/product/pricing",  label: "Pricing",  permission: PERMISSIONS.PRICE_RULE_READ },
]
  },
  {
    // Customer records, credit & payment ledger — Module IV (FR-024–FR-032)
    href: "/customers",
    label: "Customers",
    icon: (
      <Icon>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0116 0" />
      </Icon>
    ),
  },
  {
    // Owner dashboard summaries & audit log — Module VII (FR-051–FR-059)
    href: "/reports",
    label: "Reports",
    icon: (
      <Icon>
        <path d="M4 19V5M4 19h16M8 19v-6M12 19v-9M16 19v-4" />
      </Icon>
    ),
  },
  {
    label: "Business",
    icon: (
      <Icon>
        <path d="M3 21h18M5 21V9l7-5 7 5v12" />
        <path d="M9 21v-6h6v6" />
      </Icon>
    ),
    children: [
      { href: "/business/locations", label: "Locations", permission: PERMISSIONS.LOCATION_READ },
      { href: "/business/categories", label: "Categories", permission: PERMISSIONS.CATEGORY_READ },
    ],
  },
  {
    label: "Administration",
    icon: (
      <Icon>
        <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z" />
        <path d="M9 12l2 2 4-4" />
      </Icon>
    ),
    children: [
      { href: "/admin/members", label: "Members", permission: PERMISSIONS.USER_READ },
      { href: "/admin/roles", label: "Roles", permission: PERMISSIONS.ROLE_READ },
      { href: "/admin/permissions", label: "Permissions", permission: PERMISSIONS.PERMISSION_READ },
    ],
  },
];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Title for the Topbar: the matching sub-page if any, else the section. */
export function getPageTitle(pathname: string, fallback = "Yah Enterprise") {
  for (const item of NAV_ITEMS) {
    if (item.href && isActivePath(pathname, item.href)) return item.label;
    const child = item.children?.find((c) => isActivePath(pathname, c.href));
    if (child) return child.label;
  }
  return fallback;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  // Hiding items is only a convenience: the backend enforces every permission.
  const canSee = (permission?: string) => !permission || hasPermission(permission);

  // One group open at a time (accordion). It starts on the group of the current page, and navigating into
  // another group opens that one and closes the rest.
  const activeGroup =
    NAV_ITEMS.find((item) => item.children?.some((c) => isActivePath(pathname, c.href)))?.label ?? null;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);

  useEffect(() => {
    if (activeGroup) setOpenGroup(activeGroup);
  }, [activeGroup]);

  function toggleGroup(label: string) {
    setOpenGroup((current) => (current === label ? null : label));
  }

  return (
    <aside className="sidebar-scroll sticky top-0 flex h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-background py-4">
      <nav aria-label="Main" className="flex flex-col gap-1 px-2">
        {NAV_ITEMS.map((item) => {
          if (item.children) {
            const children = item.children.filter((c) => canSee(c.permission));
            if (children.length === 0) return null;
            return (
              <SidebarGroup
                key={item.label}
                label={item.label}
                icon={item.icon}
                open={openGroup === item.label}
                onToggle={() => toggleGroup(item.label)}
                items={children.map((c) => ({
                  href: c.href,
                  label: c.label,
                  active: isActivePath(pathname, c.href),
                }))}
              />
            );
          }

          if (!canSee(item.permission)) return null;
          return (
            <SidebarItem
              key={item.href}
              href={item.href!}
              label={item.label}
              icon={item.icon}
              active={isActivePath(pathname, item.href!)}
            />
          );
        })}
      </nav>
    </aside>
  );
}