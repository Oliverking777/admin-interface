"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { parseCount } from "@/lib/inventory/initialization-format";
import { formatNumber } from "@/lib/inventory/stock-format";
import { unitOptionLabel, type StockVariant } from "@/lib/inventory/stock-variants";
import { MAX_INITIALIZATION_LINES } from "@/types/inventory/inventory";

/** One line being edited. The counted quantity stays text until the form is validated. */
export type InitLineDraft = {
  key: string;
  productId: string;
  unitId: string;
  count: string;
};

export function newInitLineDraft(): InitLineDraft {
  return { key: crypto.randomUUID(), productId: "", unitId: "", count: "" };
}

type InitializationLinesEditorProps = {
  lines: InitLineDraft[];
  onChange: (lines: InitLineDraft[]) => void;
  /** Every variant; only active ones are offered. */
  products: StockVariant[];
  /** Variants that already have stock at the chosen location: they are not offered, since they cannot be initialized there. */
  blockedProductIds: Set<string>;
  disabled?: boolean;
  error?: string;
};

export default function InitializationLinesEditor({
  lines,
  onChange,
  products,
  blockedProductIds,
  disabled = false,
  error,
}: InitializationLinesEditorProps) {
  const productById = new Map(products.map((p) => [p.id, p]));

  function patch(key: string, change: Partial<InitLineDraft>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...change } : l)));
  }

  function chooseProduct(key: string, productId: string) {
    const base = productById.get(productId)?.units.find((u) => u.isBase);
    patch(key, { productId, unitId: base?.unitId ?? "" });
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No products are available. You need permission to read products to initialize stock.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-3">
        {lines.map((line, index) => {
          const product = productById.get(line.productId);
          const unit = product?.units.find((u) => u.unitId === line.unitId);
          const baseName = product?.units.find((u) => u.isBase)?.unitName ?? "";
          const count = parseCount(line.count);
          // a product can be on the form once, so hide the ones other lines already use
          const takenElsewhere = new Set(lines.filter((l) => l.key !== line.key).map((l) => l.productId));

          return (
            <li key={line.key} className="flex flex-wrap items-start gap-2">
              <div className="min-w-48 flex-1">
                <Select
                  aria-label={`Product, line ${index + 1}`}
                  value={line.productId}
                  onChange={(e) => chooseProduct(line.key, e.target.value)}
                  disabled={disabled}
                  className="py-2 text-sm"
                >
                  <option value="">Choose a product</option>
                  {products
                    .filter(
                      (p) =>
                        p.id === line.productId ||
                        (p.active && !takenElsewhere.has(p.id) && !blockedProductIds.has(p.id)),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                </Select>
              </div>

              <div className="w-52">
                <Select
                  aria-label={`Unit, line ${index + 1}`}
                  value={line.unitId}
                  onChange={(e) => patch(line.key, { unitId: e.target.value })}
                  disabled={disabled || !product}
                  className="py-2 text-sm"
                >
                  {!product && <option value="">Unit</option>}
                  {product?.units
                    .filter((u) => u.status === "ACTIVE" || u.unitId === line.unitId)
                    .map((u) => (
                      <option key={u.unitId} value={u.unitId}>
                        {unitOptionLabel(u, baseName)}
                      </option>
                    ))}
                </Select>
              </div>

              <div className="w-28">
                <Input
                  inputMode="numeric"
                  placeholder="Counted"
                  aria-label={`Counted quantity, line ${index + 1}`}
                  value={line.count}
                  onChange={(e) => patch(line.key, { count: e.target.value })}
                  disabled={disabled}
                  className="py-2 text-sm"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
                disabled={disabled || lines.length === 1}
                aria-label={`Remove line ${index + 1}`}
              >
                Remove
              </Button>

              {unit && !unit.isBase && count !== null && count > 0 && (
                <p className="basis-full text-xs text-muted-foreground">
                  {formatNumber(count)} {unit.unitName} = {formatNumber(count * unit.conversionFactor)} {baseName}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange([...lines, newInitLineDraft()])}
          disabled={disabled || lines.length >= MAX_INITIALIZATION_LINES}
        >
          Add product
        </Button>
      </div>
    </div>
  );
}