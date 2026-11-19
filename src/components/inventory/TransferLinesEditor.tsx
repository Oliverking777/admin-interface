"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { unitOptionLabel, type StockVariant } from "@/lib/inventory/stock-variants";
import { TRANSFER_MAX_LINES } from "@/types/inventory/transfer";

/** One line being edited. Quantity stays text until the form is validated. */
export type LineDraft = {
  key: string;
  productId: string;
  unitId: string;
  quantity: string;
};

export function newLineDraft(): LineDraft {
  return { key: crypto.randomUUID(), productId: "", unitId: "", quantity: "1" };
}

type TransferLinesEditorProps = {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  /** Every variant; only active ones are offered. */
  products: StockVariant[];
  disabled?: boolean;
  error?: string;
};

export default function TransferLinesEditor({
  lines,
  onChange,
  products,
  disabled = false,
  error,
}: TransferLinesEditorProps) {
  const productById = new Map(products.map((p) => [p.id, p]));

  function patch(key: string, change: Partial<LineDraft>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...change } : l)));
  }

  function chooseProduct(key: string, productId: string) {
    const base = productById.get(productId)?.units.find((u) => u.isBase);
    patch(key, { productId, unitId: base?.unitId ?? "" });
  }

  function remove(key: string) {
    onChange(lines.filter((l) => l.key !== key));
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No products are available. You need permission to read products to build a transfer.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {lines.map((line, index) => {
          const product = productById.get(line.productId);
          const baseName = product?.units.find((u) => u.isBase)?.unitName ?? "";
          // a product can be on a transfer once, so hide the ones other lines already use
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
                      (p) => p.id === line.productId || (p.active && !takenElsewhere.has(p.id)),
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

              <div className="w-24">
                <Input
                  inputMode="numeric"
                  aria-label={`Quantity, line ${index + 1}`}
                  value={line.quantity}
                  onChange={(e) => patch(line.key, { quantity: e.target.value })}
                  disabled={disabled}
                  className="py-2 text-sm"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(line.key)}
                disabled={disabled || lines.length === 1}
                aria-label={`Remove line ${index + 1}`}
              >
                Remove
              </Button>
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
          onClick={() => onChange([...lines, newLineDraft()])}
          disabled={disabled || lines.length >= TRANSFER_MAX_LINES}
        >
          Add product
        </Button>
      </div>
    </div>
  );
}