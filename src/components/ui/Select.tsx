import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { inputBaseClass } from "@/components/ui/Input";

export type SelectProps = Omit<ComponentProps<"select">, "size"> & {
  /** "field" matches Input; "inline" is a borderless dropdown for table cells. */
  variant?: "field" | "inline";
  invalid?: boolean;
};

export default function Select({
  variant = "field",
  invalid = false,
  className,
  children,
  ...props
}: SelectProps) {
  const inline = variant === "inline";

  return (
    <div className={cn("relative", inline ? "inline-block" : "block")}>
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          "cursor-pointer appearance-none [color-scheme:light_dark]",
          "[&>option]:bg-background [&>option]:text-foreground",
          inline
            ? "bg-transparent py-1.5 pl-2 pr-7 text-sm font-medium text-primary outline-none transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
            : cn(
                inputBaseClass,
                "pr-9",
                invalid && "border-red-600 focus:border-red-600 focus:ring-red-600/30",
              ),
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2",
          inline ? "right-1.5 text-primary" : "right-3 text-muted-foreground",
        )}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}