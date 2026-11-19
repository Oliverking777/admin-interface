import Button from "@/components/ui/Button";
import Tabs, { type TabItem } from "@/components/ui/Tabs";

export type UnitStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const FILTERS: TabItem<UnitStatusFilter>[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

type UnitsToolbarProps = {
  filter: UnitStatusFilter;
  onFilterChange: (value: UnitStatusFilter) => void;
  onAdd: () => void;
  /** Hides the New unit button for users who may not create units. */
  canAdd: boolean;
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** No search box: the units API only filters by status. Add one when the backend supports it. */
export default function UnitsToolbar({ filter, onFilterChange, onAdd, canAdd }: UnitsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs items={FILTERS} value={filter} onChange={onFilterChange} aria-label="Filter by status" />
      {canAdd && (
        <Button onClick={onAdd}>
          <PlusIcon />
          New unit
        </Button>
      )}
    </div>
  );
}