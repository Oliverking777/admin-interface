"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type UserMenuUser = {
  name: string;
  location?: string;
};

type UserMenuProps = {
  user?: UserMenuUser;
  onLogout?: () => void | Promise<void>;
};

export default function UserMenu({ user, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const name = user?.name ?? "Account";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-3 px-2 py-1.5 text-left transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span
          className="flex h-9 w-9 items-center justify-center bg-primary text-sm font-semibold text-primary-foreground"
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-semibold text-foreground">{name}</span>
          {user?.location && (
            <span className="block text-xs text-muted-foreground">{user.location}</span>
          )}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-44 border border-border bg-background py-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void onLogout?.();
            }}
            className="block w-full px-4 py-2 text-left text-sm text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}