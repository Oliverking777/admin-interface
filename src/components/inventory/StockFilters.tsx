"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

type Option = { id: string; name: string };

type StockFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  /** "" means all locations. */
  locationId: string;
  onLocationChange: (value: string) => void;
  /** True when the user belongs to one location: they only ever see that one. */
  locationLocked: boolean;
  locations: Option[];
  /** "" means all categories. */
  categoryId: string;
  onCategoryChange: (value: string) => void;
  categories: Option[];
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
};

const PAGE_SIZES = [10, 20, 50];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

export default function StockFilters({
  search,
  onSearchChange,
  locationId,
  onLocationChange,
  locationLocked,
  locations,
  categoryId,
  onCategoryChange,
  categories,
  pageSize,
  onPageSizeChange,
  hasActiveFilters,
  onClear,
}: StockFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-56 flex-1 sm:max-w-xs">
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or SKU"
          aria-label="Search products"
          startIcon={<SearchIcon />}
          className="py-2 text-sm"
        />
      </div>

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

      {categories.length > 0 && (
        <Select
          aria-label="Category"
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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