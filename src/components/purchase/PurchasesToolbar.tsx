import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import type { NamedOption } from "@/components/purchase/purchase-display";
import type { PurchaseListQuery } from "@/types/purchase/purchase-dto";

/** The list tabs. "PROBLEMS" is the deliveries with rejected or missing goods. */
export type PurchaseStatusFilter = "ALL" | "SUBMITTED" | "CONFIRMED" | "PROBLEMS" | "CANCELLED";

const FILTERS: TabItem<PurchaseStatusFilter>[] = [
  { value: "ALL", label: "All" },
  { value: "SUBMITTED", label: "Ordered" },
  { value: "CONFIRMED", label: "Delivered" },
  { value: "PROBLEMS", label: "With problems" },
  { value: "CANCELLED", label: "Cancelled" },
];

/** The list query of a tab. */
export function statusFilterQuery(filter: PurchaseStatusFilter): Pick<PurchaseListQuery, "status" | "hasDiscrepancy"> {
  switch (filter) {
    case "ALL":
      return {};
    case "PROBLEMS":
      return { status: "CONFIRMED", hasDiscrepancy: true };
    default:
      return { status: filter };
  }
}

type PurchasesToolbarProps = {
  filter: PurchaseStatusFilter;
  onFilterChange: (value: PurchaseStatusFilter) => void;
  /** "" means every supplier. */
  supplierId: string;
  onSupplierChange: (supplierId: string) => void;
  /** Leave out to hide the supplier filter. */
  suppliers?: NamedOption[];
  /** "YYYY-MM-DD" or "". Both days are included; convert with dayRangeToQuery. */
  fromDay: string;
  toDay: string;
  onFromDayChange: (value: string) => void;
  onToDayChange: (value: string) => void;
  onAdd: () => void;
  /** Hides the New order button for users who may not create purchases. */
  canAdd: boolean;
  /** Opens the direct purchase form (bought and received now). Leave out to hide the Record purchase button. */
  onRecordDirect?: () => void;
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function PurchasesToolbar({
  filter,
  onFilterChange,
  supplierId,
  onSupplierChange,
  suppliers,
  fromDay,
  toDay,
  onFromDayChange,
  onToDayChange,
  onAdd,
  canAdd,
  onRecordDirect,
}: PurchasesToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs items={FILTERS} value={filter} onChange={onFilterChange} aria-label="Filter by status" />
        <div className="flex flex-wrap gap-2">
          {/* Goods ordered in advance: order now, confirm the delivery when they arrive. */}
          {canAdd && (
            <Button variant={onRecordDirect ? "secondary" : "primary"} onClick={onAdd}>
              {!onRecordDirect && <PlusIcon />}
              New order
            </Button>
          )}
          {/* Goods bought and received now: recorded and added to stock in one step. */}
          {onRecordDirect && (
            <Button onClick={onRecordDirect}>
              <PlusIcon />
              Record purchase
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {suppliers && (
          <div className="w-full sm:w-64">
            <Select
              value={supplierId}
              onChange={(e) => onSupplierChange(e.target.value)}
              aria-label="Filter by supplier"
              className="py-2 text-sm"
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <DatePicker label="From" value={fromDay} max={toDay || undefined} onChange={onFromDayChange} />
        <DatePicker label="To" value={toDay} min={fromDay || undefined} onChange={onToDayChange} />
        {(fromDay || toDay) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onFromDayChange("");
              onToDayChange("");
            }}
          >
            Clear dates
          </Button>
        )}
      </div>
    </div>
  );
}