import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  neutral: "border-border bg-accent text-foreground",
  success: "border-primary/30 bg-primary/15 text-primary",
  warning: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger: "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-400",
};

export type BadgeProps = ComponentProps<"span"> & { variant?: BadgeVariant };

export default function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}