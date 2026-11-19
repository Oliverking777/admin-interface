"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type SidebarGroupProps = {
  label: string;
  icon: ReactNode;
  items: { href: string; label: string; active: boolean }[];
  /** Controlled by the Sidebar, so only one group is open at a time. */
  open: boolean;
  onToggle: () => void;
};

export default function SidebarGroup({ label, icon, items, open, onToggle }: SidebarGroupProps) {
  const hasActive = items.some((i) => i.active);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex h-10 w-full items-center gap-3 px-3 text-left text-sm font-medium transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          hasActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <span className="h-5 w-5 shrink-0" aria-hidden="true">
          {icon}
        </span>
        <span className="flex-1 truncate">{label}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul id={panelId} className="mt-1 ml-5 flex flex-col gap-0.5 border-l border-border pl-3">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center px-3 text-sm transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  item.active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}