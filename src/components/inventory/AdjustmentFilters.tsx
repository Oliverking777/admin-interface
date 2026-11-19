"use client";

import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";

type Option = { id: string; name: string };

type AdjustmentFiltersProps = {
  /** "" means all locations. */
  locationId: string;
  onLocationChange: (value: string) => void;
  /** True when the user belongs to one location: they only ever see that one. */
  locationLocked: boolean;
  locations: Option[];
  /** "" means all products. */
  productId: string;
  onProductChange: (value: string) => void;
  products: Option[];
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
};

const PAGE_SIZES = [10, 20, 50];

export default function AdjustmentFilters({
  locationId,
  onLocationChange,
  locationLocked,
  locations,
  productId,
  onProductChange,
  products,
  pageSize,
  onPageSizeChange,
  hasActiveFilters,
  onClear,
}: AdjustmentFiltersProps) {
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