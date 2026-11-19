import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { inputBaseClass } from "@/components/ui/Input";

export type TextareaProps = ComponentProps<"textarea"> & { invalid?: boolean };

export default function Textarea({ invalid = false, className, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        inputBaseClass,
        "resize-y",
        invalid && "border-red-600 focus:border-red-600 focus:ring-red-600/30",
        className,
      )}
      {...props}
    />
  );
}