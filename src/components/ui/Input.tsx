import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Shared field styling, reusable by other form controls (e.g. DatePicker). */
export const inputBaseClass =
  "w-full border border-border bg-background px-3 py-2.5 text-base text-foreground " +
  "outline-none transition placeholder:text-muted-foreground " +
  "focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

export type InputProps = Omit<ComponentProps<"input">, "size"> & {
  startIcon?: ReactNode;
  invalid?: boolean;
};

export default function Input({
  startIcon,
  invalid = false,
  className,
  ...props
}: InputProps) {
  const field = (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        inputBaseClass,
        !! startIcon && "pl-10",
        invalid && "border-red-600 focus:border-red-600 focus:ring-red-600/30",
        className,
      )}
      {...props}
    />
  );

  if (!startIcon) return field;

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
        aria-hidden="true"
      >
        {startIcon}
      </span>
      {field}
    </div>
  );
}