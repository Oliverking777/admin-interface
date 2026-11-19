"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "error" | "info";

export type ToastData = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** Milliseconds before auto-dismiss. */
  duration: number;
};

type ToastProps = ToastData & {
  onDismiss: (id: string) => void;
};

const iconBox: Record<ToastVariant, string> = {
  success: "bg-primary text-primary-foreground",
  error: "bg-red-600 text-white",
  info: "bg-secondary text-secondary-foreground",
};

const icons: Record<ToastVariant, string> = {
  success: "M5 12l5 5 9-10",
  error: "M6 6l12 12M18 6L6 18",
  info: "M12 8v.01M12 12v5",
};

export default function Toast({
  id,
  title,
  description,
  variant,
  duration,
  onDismiss,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className="flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 border border-border bg-background p-3 shadow-md transition duration-200 starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none"
    >
      <span
        className={cn("flex h-8 w-8 shrink-0 items-center justify-center", iconBox[variant])}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d={icons[variant]} />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="p-0.5 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}