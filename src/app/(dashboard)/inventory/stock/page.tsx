"use client";

/**
 * Inventory > Stock. A view of what each location holds.
 * Quantities are never edited in the table: they only change through initializations, purchases, transfers,
 * sales and approved adjustments. The quick actions at the top (initialize stock, request an adjustment,
 * new transfer) open the same forms as their own pages, starting on the location the page is filtered on,
 * and each shows only with its permission. The one setting you can change on a row (with permission) is the
 * low-stock alert level.
 *
 * Search, category, status, sorting and paging run in the browser on the full list of stock rows
 * (the catalog is small); the location filter goes to the backend.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";

import AdjustmentFormModal from "@/components/inventory/AdjustmentFormModal";
import InitializationFormModal from "@/components/inventory/InitializationFormModal";
import StockFilters from "@/components/inventory/StockFilters";
import StockMovementsDrawer from "@/components/inventory/StockMovementsDrawer";
import StockTable, { type StockSort, type StockSortKey } from "@/components/inventory/StockTable";
import TransferFormModal from "@/components/inventory/TransferFormModal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import { useMyLocation } from "@/hooks/business/use-locations";
import { useAuth } from "@/hooks/iam/use-auth";
import { useStockRows } from "@/hooks/inventory/use-stock-rows";
import { useAllProducts } from "@/hooks/product/use-products";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { exportStockCsv } from "@/lib/inventory/stock-export";
import { STATUS_ORDER } from "@/lib/inventory/stock-status";
import { toStockVariants } from "@/lib/inventory/stock-variants";
import type { StockRow } from "@/types/inventory/stock-row";

type StockTab = "ALL" | "LOW_STOCK" | "OUT_OF_STOCK";

/** The quick action whose form is open. */
type QuickAction = "initialize" | "adjust" | "transfer";

const TABS: TabItem<StockTab>[] = [
  { value: "ALL", label: "All items" },
  { value: "LOW_STOCK", label: "Low stock" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
];

function compareRows(sort: StockSort) {
  const factor = sort.direction === "asc" ? 1 : -1;
  return (a: StockRow, b: StockRow) => {
    let result = 0;
    switch (sort.key) {
      case "product":
        result = a.productName.localeCompare(b.productName);
        break;
      case "location":
        result = a.locationName.localeCompare(b.locationName);
        break;
      case "quantity":
        result = a.quantity - b.quantity;
        break;
      case "status":
        result = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        break;
      case "updatedAt":
        result = (a.updatedAt ?? "").localeCompare(b.updatedAt ?? "");
        break;
    }
    return (result || a.productName.localeCompare(b.productName)) * (result ? factor : 1);
  };
}

/* Quick-action icons: 24px grid, stroked with the text colour so they follow the button variant and theme. */
const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-4 w-4 shrink-0",
  "aria-hidden": true,
} as const;

/** A box: the starting stock of a product. */
function InitializeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </svg>
  );
}

/** Sliders: a correction up or down. */
function AdjustIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

/** Two opposite arrows: goods moving between locations. */
function TransferIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 8h15m0 0-3.5-3.5M19 8l-3.5 3.5" />
      <path d="M20 16H5m0 0 3.5-3.5M5 16l3.5 3.5" />
    </svg>
  );
}

/** Icon and label side by side, whatever the Button's own layout. */
function ActionLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      {children}
    </span>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone ?? "text-foreground"}`}>{value}</p>
    </Card>
  );
}

export default function StockPage() {
  const { hasPermission } = useAuth();
  const myLocation = useMyLocation().data ?? null;

  const [tab, setTab] = useState<StockTab>("ALL");
  const [search, setSearch] = useState("");
  const [locationChoice, setLocationChoice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sort, setSort] = useState<StockSort>({ key: "product", direction: "asc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [action, setAction] = useState<QuickAction | null>(null);
  const [actionKey, setActionKey] = useState(0);

  // A user who belongs to one location only ever sees that location.
  const lockedLocationId = myLocation?.id ?? null;
  const locationId = lockedLocationId ?? (locationChoice || null);

  const { rows, categories, locations, isLoading, error, refetch } = useStockRows(locationId);
  // the same cached query useStockRows uses, so no extra request
  const productsQuery = useAllProducts();
  // the forms pick variants: stock is kept per variant
  const variants = useMemo(() => toStockVariants(productsQuery.data ?? []), [productsQuery.data]);

  // Rows matching the search and category: the summary cards count these.
  const base = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!categoryId || r.categoryId === categoryId) &&
        (!term || r.productName.toLowerCase().includes(term) || r.productCode.toLowerCase().includes(term)),
    );
  }, [rows, search, categoryId]);

  const counts = useMemo(
    () => ({
      total: base.length,
      low: base.filter((r) => r.status === "LOW_STOCK").length,
      out: base.filter((r) => r.status === "OUT_OF_STOCK").length,
    }),
    [base],
  );

  const sorted = useMemo(() => {
    const visible =
      tab === "ALL"
        ? base
        : base.filter((r) => r.status === (tab === "LOW_STOCK" ? "LOW_STOCK" : "OUT_OF_STOCK"));
    return [...visible].sort(compareRows(sort));
  }, [base, tab, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const selected = rows.find((r) => r.key === selectedKey) ?? null;
  const closeDrawer = useCallback(() => setSelectedKey(null), []);
  const closeAction = useCallback(() => setAction(null), []);

  function openAction(next: QuickAction) {
    setActionKey((key) => key + 1); // a new key gives the form fresh state
    setAction(next);
  }

  // initialization has no permission of its own: STOCK_READ, like on the Initializations page
  const canAdjust = hasPermission(PERMISSIONS.STOCK_ADJUST_CREATE);
  const canTransfer = hasPermission(PERMISSIONS.TRANSFER_CREATE);

  const hasActiveFilters = search.trim() !== "" || categoryId !== "" || (!lockedLocationId && locationChoice !== "");

  function handleSort(key: StockSortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
    setPage(0);
  }

  function clearFilters() {
    setSearch("");
    setCategoryId("");
    if (!lockedLocationId) setLocationChoice("");
    setPage(0);
  }

  if (!hasPermission(PERMISSIONS.STOCK_READ)) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">You do not have permission to view stock.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" onClick={() => openAction("initialize")}>
          <ActionLabel icon={<InitializeIcon />}>Initialize stock</ActionLabel>
        </Button>
        {canAdjust && (
          <Button variant="secondary" onClick={() => openAction("adjust")}>
            <ActionLabel icon={<AdjustIcon />}>Request adjustment</ActionLabel>
          </Button>
        )}
        {canTransfer && (
          <Button onClick={() => openAction("transfer")}>
            <ActionLabel icon={<TransferIcon />}>New transfer</ActionLabel>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          aria-label="Stock status"
          items={TABS}
          value={tab}
          onChange={(value) => {
            setTab(value);
            setPage(0);
          }}
        />
        <Button variant="secondary" size="sm" onClick={() => exportStockCsv(sorted)} disabled={sorted.length === 0}>
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Items listed" value={counts.total} />
        <SummaryCard label="Low stock" value={counts.low} tone="text-amber-700 dark:text-amber-300" />
        <SummaryCard label="Out of stock" value={counts.out} tone="text-red-600" />
      </div>

      <StockFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        locationId={locationId ?? ""}
        onLocationChange={(value) => {
          setLocationChoice(value);
          setPage(0);
        }}
        locationLocked={lockedLocationId !== null}
        locations={locations}
        categoryId={categoryId}
        onCategoryChange={(value) => {
          setCategoryId(value);
          setPage(0);
        }}
        categories={categories}
        pageSize={pageSize}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(0);
        }}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      {error ? (
        <Card className="flex items-center justify-between gap-3">
          <p role="alert" className="text-sm text-red-600">
            {error.message}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </Card>
      ) : (
        <Card padded={false}>
          <StockTable
            rows={pageRows}
            sort={sort}
            onSort={handleSort}
            onViewHistory={(row) => setSelectedKey(row.key)}
            loading={isLoading}
          />
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalElements={sorted.length}
            noun="items"
            onPageChange={setPage}
          />
        </Card>
      )}

      <StockMovementsDrawer row={selected} onClose={closeDrawer} />

      {/* Each form shows its own toast, and the stock list refreshes by itself when stock moves
          (the mutations invalidate stock levels), so there is nothing more to do once one is saved. */}
      <InitializationFormModal
        key={`initialize-${actionKey}`}
        open={action === "initialize"}
        onClose={closeAction}
        locations={locations}
        products={variants}
        lockedLocationId={lockedLocationId}
        initialLocationId={locationId}
        onSaved={() => {}}
      />

      {canAdjust && (
        <AdjustmentFormModal
          key={`adjust-${actionKey}`}
          open={action === "adjust"}
          onClose={closeAction}
          locations={locations}
          products={variants}
          lockedLocationId={lockedLocationId}
          initialLocationId={locationId}
          onSaved={() => {}}
        />
      )}

      {canTransfer && (
        <TransferFormModal
          key={`transfer-${actionKey}`}
          open={action === "transfer"}
          onClose={closeAction}
          locations={locations}
          products={variants}
          lockedSourceId={lockedLocationId}
          initialSourceId={locationId}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}