import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import type { CategoryStatus } from "@/types/business/category";

export type CategoryStatusFilter = "ALL" | CategoryStatus;

const FILTERS: TabItem<CategoryStatusFilter>[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

type CategoriesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: CategoryStatusFilter;
  onFilterChange: (value: CategoryStatusFilter) => void;
  onAdd: () => void;
  /** Hides the New category button for users who may not create categories. */
  canAdd: boolean;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function CategoriesToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onAdd,
  canAdd,
}: CategoriesToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or description"
            startIcon={<SearchIcon />}
            aria-label="Search categories"
          />
        </div>
        <Tabs items={FILTERS} value={filter} onChange={onFilterChange} aria-label="Filter by status" />
      </div>
      {canAdd && (
        <Button onClick={onAdd}>
          <PlusIcon />
          New category
        </Button>
      )}
    </div>
  );
}