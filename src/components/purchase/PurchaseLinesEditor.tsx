"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { formatFcfa, parseWholeNumber, type ProductOption } from "@/components/purchase/purchase-display";
import { CellError, EmptyRow } from "@/components/purchase/TableStates";
import { PURCHASE_MAX_LINES } from "@/types/purchase/purchase";
import type { PurchaseLineRequest } from "@/types/purchase/purchase-dto";

/** A line as typed in the form. Numbers stay strings until the form is submitted. */
export type PurchaseLineDraft = {
  key: string;
  productId: string;
  unitId: string;
  quantity: string;
  unitPrice: string;
};

export type LineField = "product" | "unit" | "quantity" | "unitPrice";
/** Errors by line key. */
export type LineErrors = Record<string, Partial<Record<LineField, string>>>;

export function newLineDraft(): PurchaseLineDraft {
  return { key: crypto.randomUUID(), productId: "", unitId: "", quantity: "", unitPrice: "" };
}

const isBlank = (l: PurchaseLineDraft) => !l.productId && !l.unitId && !l.quantity.trim() && !l.unitPrice.trim();

/** Checks the lines (completely empty ones are skipped) and builds the requests of the valid ones. */
export function validateLines(lines: PurchaseLineDraft[]): { errors: LineErrors; requests: PurchaseLineRequest[] } {
  const errors: LineErrors = {};
  const requests: PurchaseLineRequest[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (isBlank(line)) continue;
    const e: Partial<Record<LineField, string>> = {};
    const quantity = parseWholeNumber(line.quantity);
    const unitPrice = parseWholeNumber(line.unitPrice);

    if (!line.productId) e.product = "Choose a product.";
    if (!line.unitId) e.unit = "Choose a unit.";
    else if (line.productId) {
      const pair = `${line.productId}:${line.unitId}`;
      if (seen.has(pair)) e.unit = "Already on another line.";
      seen.add(pair);
    }
    if (!(quantity >= 1)) e.quantity = "Whole number, 1 or more.";
    if (!(unitPrice >= 1)) e.unitPrice = "Whole FCFA, 1 or more.";

    if (Object.keys(e).length > 0) errors[line.key] = e;
    else requests.push({ productId: line.productId, unitId: line.unitId, quantity, unitPrice });
  }
  return { errors, requests };
}

type PurchaseLinesEditorProps = {
  lines: PurchaseLineDraft[];
  onChange: (lines: PurchaseLineDraft[]) => void;
  products: ProductOption[];
  errors?: LineErrors;
  disabled?: boolean;
};

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function PurchaseLinesEditor({
  lines,
  onChange,
  products,
  errors = {},
  disabled = false,
}: PurchaseLinesEditorProps) {
  const productById = new Map(products.map((p) => [p.id, p]));

  function update(key: string, patch: Partial<PurchaseLineDraft>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  // A new product resets the unit, or picks it when the product has only one.
  function changeProduct(key: string, productId: string) {
    const units = productById.get(productId)?.units ?? [];
    update(key, { productId, unitId: units.length === 1 ? units[0].id : "" });
  }

  let total = 0;
  const lineTotal = (line: PurchaseLineDraft) => {
    const q = parseWholeNumber(line.quantity);
    const p = parseWholeNumber(line.unitPrice);
    return q >= 1 && p >= 1 ? q * p : null;
  };
  for (const line of lines) total += lineTotal(line) ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="border border-border">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[31%]" />
            <col className="w-[17%]" />
            <col className="w-[13%]" />
            <col className="w-[16%]" />
            <col className="w-[17%]" />
            <col className="w-[6%]" />
          </colgroup>
          <TableHead>
            <tr>
              <TableHeaderCell className="px-2">Product</TableHeaderCell>
              <TableHeaderCell className="px-2">Unit</TableHeaderCell>
              <TableHeaderCell className="px-2">Quantity</TableHeaderCell>
              <TableHeaderCell className="px-2">Unit price (FCFA)</TableHeaderCell>
              <TableHeaderCell className="px-2 text-right">Line total</TableHeaderCell>
              <TableHeaderCell className="px-2">
                <span className="sr-only">Remove</span>
              </TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {lines.length === 0 ? (
              <EmptyRow columns={6} title="No lines yet" hint="Add the products you are ordering." />
            ) : (
              lines.map((line, index) => {
                const n = index + 1;
                const e = errors[line.key] ?? {};
                const units = productById.get(line.productId)?.units ?? [];
                const amount = lineTotal(line);

                return (
                  <TableRow key={line.key} className="hover:bg-transparent">
                    <TableCell className="px-2 py-2 align-top">
                      <Select
                        value={line.productId}
                        onChange={(ev) => changeProduct(line.key, ev.target.value)}
                        disabled={disabled}
                        invalid={!!e.product}
                        aria-label={`Product, line ${n}`}
                        className="py-1.5 text-sm"
                      >
                        <option value="">Choose a product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                      <CellError message={e.product} />
                    </TableCell>
                    <TableCell className="px-2 py-2 align-top">
                      <Select
                        value={line.unitId}
                        onChange={(ev) => update(line.key, { unitId: ev.target.value })}
                        disabled={disabled || !line.productId}
                        invalid={!!e.unit}
                        aria-label={`Unit, line ${n}`}
                        className="py-1.5 text-sm"
                      >
                        <option value="">Unit</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.conversionFactor && u.conversionFactor > 1 ? `${u.name} (x${u.conversionFactor})` : u.name}
                          </option>
                        ))}
                      </Select>
                      <CellError message={e.unit} />
                    </TableCell>
                    <TableCell className="px-2 py-2 align-top">
                      <Input
                        inputMode="numeric"
                        value={line.quantity}
                        onChange={(ev) => update(line.key, { quantity: ev.target.value })}
                        disabled={disabled}
                        invalid={!!e.quantity}
                        aria-label={`Quantity, line ${n}`}
                        className="py-1.5 text-sm"
                      />
                      <CellError message={e.quantity} />
                    </TableCell>
                    <TableCell className="px-2 py-2 align-top">
                      <Input
                        inputMode="numeric"
                        value={line.unitPrice}
                        onChange={(ev) => update(line.key, { unitPrice: ev.target.value })}
                        disabled={disabled}
                        invalid={!!e.unitPrice}
                        aria-label={`Unit price in FCFA, line ${n}`}
                        className="py-1.5 text-sm"
                      />
                      <CellError message={e.unitPrice} />
                    </TableCell>
                    <TableCell className="truncate px-2 py-2 pt-3.5 text-right align-top tabular-nums">
                      {amount === null ? <span className="text-muted-foreground">-</span> : formatFcfa(amount)}
                    </TableCell>
                    <TableCell className="px-1 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
                        disabled={disabled}
                        aria-label={`Remove line ${n}`}
                        className="mt-1 p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RemoveIcon />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange([...lines, newLineDraft()])}
          disabled={disabled || lines.length >= PURCHASE_MAX_LINES}
        >
          Add line
        </Button>
        <p className="text-sm text-muted-foreground">
          Total <span className="ml-1 font-semibold text-foreground tabular-nums">{formatFcfa(total)}</span>
        </p>
      </div>
    </div>
  );
}
