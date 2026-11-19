import Input from "@/components/ui/Input";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

type OrderSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

/** Filters the orders already loaded in each column (the API has no text search). */
export default function OrderSearchBar({ value, onChange }: OrderSearchBarProps) {
  return (
    <Input
      type="search"
      placeholder="Search order no. or customer"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      startIcon={<SearchIcon />}
      aria-label="Search orders"
    />
  );
}