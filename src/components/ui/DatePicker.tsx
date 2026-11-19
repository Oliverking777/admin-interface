import { useId } from "react";
import { cn } from "@/lib/cn";
import { inputBaseClass } from "@/components/ui/Input";

type DatePickerProps = {
  /** ISO date string, e.g. "2025-03-02". */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  min?: string;
  max?: string;
  className?: string;
};

export default function DatePicker({
  value,
  onChange,
  label = "Date",
  min,
  max,
  className,
}: DatePickerProps) {
  const id = useId();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputBaseClass, "w-auto py-2 text-sm [color-scheme:light_dark]")}
      />
    </div>
  );
}