import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type CardProps = ComponentProps<"div"> & {
  /** Set to false when the content manages its own spacing. */
  padded?: boolean;
};

export default function Card({
  padded = true,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "border border-border bg-background text-foreground",
        padded && "p-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}