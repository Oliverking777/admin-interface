import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SidebarItemProps = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
};

export default function SidebarItem({
  href,
  label,
  icon,
  active = false,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 w-full items-center gap-3 px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <span className="h-5 w-5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}