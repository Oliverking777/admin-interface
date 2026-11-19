"use client";

import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import {
  INITIALIZATION_STATUSES,
  INITIALIZATION_STATUS_LABEL,
} from "@/lib/inventory/initialization-format";
import type { StockInitializationStatus } from "@/types/inventory/inventory";

type Option = { id: string; name: string };

type InitializationFiltersProps = {
  /** "" means all locations. */
  locationId: string;
  onLocationChange: (value: string) => void;
  /** True when the user belongs to one location: they only ever see that one. */
  locationLocked: boolean;
  locations: Option[];
  /** "" means all statuses. */
  status: StockInitializationStatus | "";
  onStatusChange: (value: StockInitializationStatus | "") => void;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
};

const PAGE_SIZES = [10, 20, 50];

export default function InitializationFilters({
  locationId,
  onLocationChange,
  locationLocked,
  locations,
  status,
  onStatusChange,
  pageSize,
  onPageSizeChange,
  hasActiveFilters,
  onClear,
}: InitializationFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Location"
        value={locationId}
        onChange={(e) => onLocationChange(e.target.value)}
        disabled={locationLocked}
        className="py-2 text-sm"
      >
        {!locationLocked && <option value="">All locations</option>}
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Status"
        value={status}
        onChange={(e) => onStatusChange(e.target.value as StockInitializationStatus | "")}
        className="py-2 text-sm"
      >
        <option value="">All statuses</option>
        {INITIALIZATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {INITIALIZATION_STATUS_LABEL[s]}
          </option>
        ))}
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
        <span>Show</span>
        <Select
          aria-label="Rows per page"
          value={String(pageSize)}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="py-2 text-sm"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
