"use client";

import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import { TRANSFER_STATUS_FILTERS, type TransferStatusFilter } from "@/lib/inventory/transfer-format";

type Option = { id: string; name: string };

type TransferFiltersProps = {
  /** "" means all locations. A location matches the source or the destination. */
  locationId: string;
  onLocationChange: (value: string) => void;
  /** True when the user belongs to one location: they only ever see that one. */
  locationLocked: boolean;
  locations: Option[];
  /** "" means all statuses. "RECEIVED_WITH_ISSUES" is the discrepancy review list. */
  status: TransferStatusFilter;
  onStatusChange: (value: TransferStatusFilter) => void;
  /** "" means all products. */
  productId: string;
  onProductChange: (value: string) => void;
  products: Option[];
  /** "YYYY-MM-DD" or "". */
  from: string;
  onFromChange: (value: string) => void;
  to: string;
  onToChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
};

const PAGE_SIZES = [10, 20, 50];

export default function TransferFilters({
  locationId,
  onLocationChange,
  locationLocked,
  locations,
  status,
  onStatusChange,
  productId,
  onProductChange,
  products,
  from,
  onFromChange,
  to,
  onToChange,
  pageSize,
  onPageSizeChange,
  hasActiveFilters,
  onClear,
}: TransferFiltersProps) {
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
        onChange={(e) => onStatusChange(e.target.value as TransferStatusFilter)}
        className="py-2 text-sm"
      >
        <option value="">All statuses</option>
        {TRANSFER_STATUS_FILTERS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>

      {products.length > 0 && (
        <Select
          aria-label="Product"
          value={productId}
          onChange={(e) => onProductChange(e.target.value)}
          className="py-2 text-sm"
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      )}

      <DatePicker label="From" value={from} onChange={onFromChange} max={to || undefined} />
      <DatePicker label="To" value={to} onChange={onToChange} min={from || undefined} />

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