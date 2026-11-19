import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";

type OrderDateFilterProps = {
  /** "" for every day, or a business day "YYYY-MM-DD". */
  value: string;
  onChange: (value: string) => void;
};

/** Narrows the board to one day. Empty shows every order; "All dates" clears the pick. */
export default function OrderDateFilter({ value, onChange }: OrderDateFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <DatePicker value={value} onChange={onChange} />
      {value && (
        <Button variant="ghost" size="sm" onClick={() => onChange("")}>
          All dates
        </Button>
      )}
    </div>
  );
}