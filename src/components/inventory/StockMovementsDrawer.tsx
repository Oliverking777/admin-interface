"use client";

import { useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/hooks/iam/use-auth";
import { useStockMovements, useUpdateStockThreshold } from "@/hooks/inventory/use-inventory";
import { cn } from "@/lib/cn";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import {
  MOVEMENT_LABEL,
  MOVEMENT_TYPES,
  REFERENCE_LABEL,
  formatBreakdown,
  formatDateTime,
  formatQuantity,
  formatSignedQuantity,
  shortId,
} from "@/lib/inventory/stock-format";
import { STATUS_LABEL, STATUS_VARIANT } from "@/lib/inventory/stock-status";
import type { MovementType } from "@/types/inventory/inventory";
import type { StockRow } from "@/types/inventory/stock-row";

type StockMovementsDrawerProps = {
  /** The row whose history is shown. Null closes the drawer. */
  row: StockRow | null;
  /** Pass a stable function (useCallback). */
  onClose: () => void;
};

const MOVEMENTS_PAGE_SIZE = 10;

export default function StockMovementsDrawer({ row, onClose }: StockMovementsDrawerProps) {
  return (
    <Drawer
      open={row !== null}
      onClose={onClose}
      title={row?.productName ?? "Stock history"}
      className="sm:max-w-xl"
    >
      {/* keyed by row so the page, filter and editor reset when another product is opened */}
      {row && <DrawerBody key={row.key} row={row} />}
    </Drawer>
  );
}

function DrawerBody({ row }: { row: StockRow }) {
  const breakdown = formatBreakdown(row.quantity, row.units);

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Current stock" className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {row.productCode} at {row.locationName}
            </p>
            {row.categoryName && <p className="text-sm text-muted-foreground">{row.categoryName}</p>}
          </div>
          <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
        </div>

        <div className="border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground">On hand</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {formatQuantity(row.quantity, row.units)}
          </p>
          {breakdown && <p className="text-sm text-muted-foreground">{breakdown}</p>}
          <p className="mt-2 text-xs text-muted-foreground">Updated {formatDateTime(row.updatedAt)}</p>
        </div>

        <ThresholdEditor row={row} />
      </section>

      <MovementsSection row={row} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Low-stock threshold (the only thing editable here; it never changes stock) */
/* -------------------------------------------------------------------------- */

function ThresholdEditor({ row }: { row: StockRow }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(PERMISSIONS.STOCK_THRESHOLD_UPDATE);
  const { toast } = useToast();
  const update = useUpdateStockThreshold();

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();

  const baseName = row.units.find((u) => u.isBase)?.unitName ?? "units";

  function open() {
    setValue(row.lowStockThreshold === null ? "" : String(row.lowStockThreshold));
    setError(undefined);
    setEditing(true);
  }

  function save(threshold: number | null) {
    setError(undefined);
    update.mutate(
      { productId: row.productId, locationId: row.locationId, request: { lowStockThreshold: threshold } },
      {
        onSuccess: () => {
          toast({ title: threshold === null ? "Alert level removed" : "Alert level saved" });
          setEditing(false);
        },
        onError: (e) => setError(e.message),
      },
    );
  }

  function submit() {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError("Enter a whole number, 0 or more.");
      return;
    }
    save(Number(trimmed));
  }

  return (
    <div className="border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Low-stock alert level</p>
          <p className="mt-1 text-sm text-foreground tabular-nums">
            {row.lowStockThreshold === null ? "Not set" : formatQuantity(row.lowStockThreshold, row.units)}
          </p>
        </div>
        {canEdit && !editing && (
          <Button variant="secondary" size="sm" onClick={open}>
            {row.lowStockThreshold === null ? "Set level" : "Change"}
          </Button>
        )}
      </div>

      {editing && (
        <div className="mt-4 flex flex-col gap-3">
          <FormField
            id="stock-threshold"
            label={`Alert when stock is at or below (${baseName})`}
            hint="This does not change the quantity on hand."
            error={error}
          >
            <Input
              id="stock-threshold"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              invalid={!!error}
              aria-describedby={error ? "stock-threshold-error" : undefined}
              disabled={update.isPending}
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={submit} loading={update.isPending}>
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={update.isPending}>
              Cancel
            </Button>
            {row.lowStockThreshold !== null && (
              <Button size="sm" variant="ghost" onClick={() => save(null)} disabled={update.isPending}>
                Remove
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Movement history (read-only, newest first)                                */
/* -------------------------------------------------------------------------- */

function MovementsSection({ row }: { row: StockRow }) {
  const [page, setPage] = useState(0);
  const [type, setType] = useState<MovementType | "">("");

  const movements = useStockMovements({
    page,
    size: MOVEMENTS_PAGE_SIZE,
    productId: row.productId,
    locationId: row.locationId,
    movementType: type || undefined,
  });

  const data = movements.data;

  return (
    <section aria-label="Stock movements" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">Movements</h3>
        <Select
          aria-label="Movement type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as MovementType | "");
            setPage(0);
          }}
          className="py-1.5 text-sm"
        >
          <option value="">All types</option>
          {MOVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {MOVEMENT_LABEL[t]}
            </option>
          ))}
        </Select>
      </div>

      {movements.isLoading && <p className="text-sm text-muted-foreground">Loading movements...</p>}

      {movements.error && (
        <p role="alert" className="text-sm text-red-600">
          {movements.error.message}
        </p>
      )}

      {data && data.content.length === 0 && (
        <p className="text-sm text-muted-foreground">No movements recorded for this product here.</p>
      )}

      {data && data.content.length > 0 && (
        <ul className="border border-border">
          {data.content.map((m) => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{MOVEMENT_LABEL[m.type]}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(m.occurredAt)}</p>
                <p className="text-xs text-muted-foreground">
                  {REFERENCE_LABEL[m.referenceType]} ref. {shortId(m.referenceId)}
                </p>
                {m.note && <p className="mt-1 text-sm text-muted-foreground">{m.note}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    m.quantityDelta > 0 ? "text-primary" : "text-red-600",
                  )}
                >
                  {formatSignedQuantity(m.quantityDelta, row.units)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Balance {formatQuantity(m.balanceAfter, row.units)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && (
        <div className="-mx-5">
          <Pagination
            page={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            noun="movements"
            onPageChange={setPage}
            disabled={movements.isFetching}
          />
        </div>
      )}
    </section>
  );
}