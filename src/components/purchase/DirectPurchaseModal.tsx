"use client";

/**
 * A purchase bought and received on the spot: supplier, shop and what arrived. One call creates and confirms the
 * purchase, so the kept goods go into stock at once (needs PURCHASE_CREATE and RECEIPT_CONFIRM).
 */

import { Fragment, useEffect, useId, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import {
  REJECTION_TYPES,
  REJECTION_TYPE_LABEL,
  formatFcfa,
  parseWholeNumber,
  type NamedOption,
  type ProductOption,
} from "@/components/purchase/purchase-display";
import { CellError, EmptyRow } from "@/components/purchase/TableStates";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { cn } from "@/lib/cn";
import {
  DELIVERY_NOTE_MAX_LENGTH,
  PURCHASE_MAX_LINES,
  PURCHASE_NOTE_MAX_LENGTH,
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
  type Purchase,
  type RejectionType,
} from "@/types/purchase/purchase";
import type { DirectPurchaseLineRequest, DirectPurchaseRequest } from "@/types/purchase/purchase-dto";

type DirectPurchaseModalProps = {
  open: boolean;
  /** Must be a stable function (useCallback). */
  onClose: () => void;
  /** Active suppliers. */
  suppliers: NamedOption[];
  /** Locations the user may receive at. With a single one it is picked automatically. */
  locations: NamedOption[];
  /** Purchasable products with their units. */
  products: ProductOption[];
  /** Should reject on failure; the error is shown in the form. The window closes when it resolves. */
  onRecord: (request: DirectPurchaseRequest) => Promise<Purchase>;
};

type LineDraft = {
  key: string;
  productId: string;
  unitId: string;
  received: string;
  price: string;
  rejected: string;
  rejectionType: RejectionType | "";
  rejectionReason: string;
};
type LineField = Exclude<keyof LineDraft, "key">;
type LineErrors = Record<string, Partial<Record<LineField, string>>>;
type Errors = Partial<Record<"supplier" | "location" | "deliveryNote" | "note" | "form", string>>;

const newLine = (): LineDraft => ({
  key: crypto.randomUUID(),
  productId: "",
  unitId: "",
  received: "",
  price: "",
  rejected: "",
  rejectionType: "",
  rejectionReason: "",
});

const isBlank = (l: LineDraft) =>
  !l.productId && !l.unitId && !l.received.trim() && !l.price.trim() && !l.rejected.trim();

function lineNumbers(l: LineDraft) {
  const received = parseWholeNumber(l.received);
  const price = parseWholeNumber(l.price);
  const rejected = l.rejected.trim() ? parseWholeNumber(l.rejected) : 0;
  return { received, price, rejected, total: received >= 1 && price >= 1 ? received * price : null };
}

/** Checks every non-blank line and builds the request lines of the valid ones. */
function validateLines(lines: LineDraft[]) {
  const errors: LineErrors = {};
  const items: DirectPurchaseLineRequest[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (isBlank(line)) continue;
    const e: LineErrors[string] = {};
    const { received, price, rejected } = lineNumbers(line);
    const reason = line.rejectionReason.trim();

    if (!line.productId) e.productId = "Choose a product.";
    if (!line.unitId) e.unitId = "Choose a unit.";
    else if (line.productId) {
      const pair = `${line.productId}:${line.unitId}`;
      if (seen.has(pair)) e.unitId = "Already on another line.";
      seen.add(pair);
    }
    if (!(received >= 1)) e.received = "Whole number, 1 or more.";
    if (!(price >= 1)) e.price = "Whole FCFA, 1 or more.";
    if (!(rejected >= 0)) e.rejected = "Whole number, 0 or more.";
    if (rejected > 0) {
      if (!line.rejectionType) e.rejectionType = "Choose why.";
      if (reason.length < REASON_MIN_LENGTH) e.rejectionReason = `Explain in at least ${REASON_MIN_LENGTH} characters.`;
    }

    if (Object.keys(e).length > 0) {
      errors[line.key] = e;
      continue;
    }
    items.push({
      productId: line.productId,
      unitId: line.unitId,
      quantityReceived: received,
      unitPrice: price,
      ...(rejected > 0
        ? { quantityRejected: rejected, rejectionType: line.rejectionType as RejectionType, rejectionReason: reason }
        : {}),
    });
  }
  return { errors, items };
}

function RemoveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function DirectPurchaseModal({
  open,
  onClose,
  suppliers,
  locations,
  products,
  onRecord,
}: DirectPurchaseModalProps) {
  const formId = useId();
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [lineErrors, setLineErrors] = useState<LineErrors>({});
  const [busy, setBusy] = useState(false);
  // One id per opening: a retry after a network error returns what was already recorded.
  const [purchaseId, setPurchaseId] = useState("");

  useEffect(() => {
    setSupplierId("");
    setLocationId("");
    setDeliveryNote("");
    setNote("");
    setLines(open ? [newLine()] : []);
    setErrors({});
    setLineErrors({});
    setBusy(false);
    setPurchaseId(open ? crypto.randomUUID() : "");
  }, [open]);

  const effectiveLocationId = locationId || (locations.length === 1 ? locations[0].id : "");
  const productById = new Map(products.map((p) => [p.id, p]));
  const total = lines.reduce((sum, l) => sum + (lineNumbers(l).total ?? 0), 0);

  function update(key: string, patch: Partial<LineDraft>) {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function changeProduct(key: string, productId: string) {
    const units = productById.get(productId)?.units ?? [];
    update(key, { productId, unitId: units.length === 1 ? units[0].id : "" });
  }

  function close() {
    if (!busy) onClose();
  }

  async function handleRecord(e: FormEvent) {
    e.preventDefault();

    const { errors: nextLineErrors, items } = validateLines(lines);
    const next: Errors = {};
    if (!supplierId) next.supplier = "Choose the supplier.";
    if (!effectiveLocationId) next.location = "Choose where the goods arrived.";
    if (deliveryNote.trim().length > DELIVERY_NOTE_MAX_LENGTH)
      next.deliveryNote = `At most ${DELIVERY_NOTE_MAX_LENGTH} characters.`;
    if (note.trim().length > PURCHASE_NOTE_MAX_LENGTH) next.note = `At most ${PURCHASE_NOTE_MAX_LENGTH} characters.`;
    if (Object.keys(nextLineErrors).length === 0) {
      if (items.length === 0) next.form = "Add at least one product.";
      else if (items.length > PURCHASE_MAX_LINES) next.form = `At most ${PURCHASE_MAX_LINES} lines.`;
    }

    setErrors(next);
    setLineErrors(nextLineErrors);
    if (Object.keys(next).length > 0 || Object.keys(nextLineErrors).length > 0) return;

    setBusy(true);
    try {
      await onRecord({
        purchaseId,
        supplierId,
        destinationLocationId: effectiveLocationId,
        ...(deliveryNote.trim() ? { deliveryNote: deliveryNote.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        items,
      });
      onClose();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setErrors({
          supplier: error.fieldError("supplierId"),
          location: error.fieldError("destinationLocationId"),
          deliveryNote: error.fieldError("deliveryNote"),
          note: error.fieldError("note"),
          form: error.message,
        });
      } else {
        setErrors({ form: getErrorMessage(error, "Could not record the purchase.") });
      }
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------ render */

  const fieldError = (id: string, error?: string) => (error ? `${id}-error` : undefined);
  const supplierFieldId = `${formId}-supplier`;
  const locationFieldId = `${formId}-location`;
  const noteFieldId = `${formId}-delivery-note`;
  const remarkFieldId = `${formId}-note`;
  const COLUMNS = 7;

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Total <span className="ml-1 font-semibold text-foreground tabular-nums">{formatFcfa(total)}</span>
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={close} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" form={formId} loading={busy}>
          Record and add to stock
        </Button>
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={close} busy={busy} size="xl" title="Record a purchase" footer={footer}>
      <form id={formId} onSubmit={handleRecord} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          For goods bought and received now. The goods you keep are added to stock as soon as you record them.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id={supplierFieldId} label="Supplier" error={errors.supplier}>
            <Select
              id={supplierFieldId}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              invalid={!!errors.supplier}
              aria-describedby={fieldError(supplierFieldId, errors.supplier)}
            >
              <option value="">Choose a supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id={locationFieldId} label="Received at" error={errors.location}>
            <Select
              id={locationFieldId}
              value={effectiveLocationId}
              onChange={(e) => setLocationId(e.target.value)}
              invalid={!!errors.location}
              aria-describedby={fieldError(locationFieldId, errors.location)}
            >
              <option value="">Choose a location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id={noteFieldId} label="Supplier's delivery note (optional)" error={errors.deliveryNote}>
            <Input
              id={noteFieldId}
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              maxLength={DELIVERY_NOTE_MAX_LENGTH}
              autoComplete="off"
              invalid={!!errors.deliveryNote}
              aria-describedby={fieldError(noteFieldId, errors.deliveryNote)}
            />
          </FormField>
        </div>

        <div className="border border-border">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[27%]" />
              <col className="w-[15%]" />
              <col className="w-[12%]" />
              <col className="w-[15%]" />
              <col className="w-[11%]" />
              <col className="w-[15%]" />
              <col className="w-[5%]" />
            </colgroup>
            <TableHead>
              <tr>
                <TableHeaderCell className="px-2">Product</TableHeaderCell>
                <TableHeaderCell className="px-2">Unit</TableHeaderCell>
                <TableHeaderCell className="px-2">Received</TableHeaderCell>
                <TableHeaderCell className="px-2">Unit price (FCFA)</TableHeaderCell>
                <TableHeaderCell className="px-2">Rejected</TableHeaderCell>
                <TableHeaderCell className="px-2 text-right">Line total</TableHeaderCell>
                <TableHeaderCell className="px-1">
                  <span className="sr-only">Remove</span>
                </TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {lines.length === 0 ? (
                <EmptyRow columns={COLUMNS} title="No products yet" hint="Add the products that arrived." />
              ) : (
                lines.map((line, index) => {
                  const n = index + 1;
                  const e = lineErrors[line.key] ?? {};
                  const units = productById.get(line.productId)?.units ?? [];
                  const { rejected, total: lineTotal } = lineNumbers(line);
                  const showRejection = rejected > 0;

                  return (
                    <Fragment key={line.key}>
                      <TableRow className={cn("hover:bg-transparent", showRejection && "border-b-0")}>
                        <TableCell className="px-2 py-2 align-top">
                          <Select
                            value={line.productId}
                            onChange={(ev) => changeProduct(line.key, ev.target.value)}
                            disabled={busy}
                            invalid={!!e.productId}
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
                          <CellError message={e.productId} />
                        </TableCell>
                        <TableCell className="px-2 py-2 align-top">
                          <Select
                            value={line.unitId}
                            onChange={(ev) => update(line.key, { unitId: ev.target.value })}
                            disabled={busy || !line.productId}
                            invalid={!!e.unitId}
                            aria-label={`Unit, line ${n}`}
                            className="py-1.5 text-sm"
                          >
                            <option value="">Unit</option>
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.conversionFactor && u.conversionFactor > 1
                                  ? `${u.name} (x${u.conversionFactor})`
                                  : u.name}
                              </option>
                            ))}
                          </Select>
                          <CellError message={e.unitId} />
                        </TableCell>
                        <TableCell className="px-2 py-2 align-top">
                          <Input
                            inputMode="numeric"
                            value={line.received}
                            onChange={(ev) => update(line.key, { received: ev.target.value })}
                            disabled={busy}
                            invalid={!!e.received}
                            aria-label={`Received, line ${n}`}
                            className="py-1.5 text-sm"
                          />
                          <CellError message={e.received} />
                        </TableCell>
                        <TableCell className="px-2 py-2 align-top">
                          <Input
                            inputMode="numeric"
                            value={line.price}
                            onChange={(ev) => update(line.key, { price: ev.target.value })}
                            disabled={busy}
                            invalid={!!e.price}
                            aria-label={`Unit price in FCFA, line ${n}`}
                            className="py-1.5 text-sm"
                          />
                          <CellError message={e.price} />
                        </TableCell>
                        <TableCell className="px-2 py-2 align-top">
                          <Input
                            inputMode="numeric"
                            value={line.rejected}
                            placeholder="0"
                            onChange={(ev) => update(line.key, { rejected: ev.target.value })}
                            disabled={busy}
                            invalid={!!e.rejected}
                            aria-label={`Rejected, line ${n}`}
                            className="py-1.5 text-sm"
                          />
                          <CellError message={e.rejected} />
                        </TableCell>
                        <TableCell className="truncate px-2 py-2 pt-3.5 text-right align-top tabular-nums">
                          {lineTotal === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            formatFcfa(lineTotal)
                          )}
                        </TableCell>
                        <TableCell className="px-1 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                            disabled={busy}
                            aria-label={`Remove line ${n}`}
                            className="mt-1 p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <RemoveIcon />
                          </button>
                        </TableCell>
                      </TableRow>

                      {showRejection && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={COLUMNS} className="px-2 py-2">
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div>
                                <Select
                                  value={line.rejectionType}
                                  onChange={(ev) =>
                                    update(line.key, { rejectionType: ev.target.value as RejectionType | "" })
                                  }
                                  disabled={busy}
                                  invalid={!!e.rejectionType}
                                  aria-label={`Why goods were rejected, line ${n}`}
                                  className="py-1.5 text-sm"
                                >
                                  <option value="">Why rejected?</option>
                                  {REJECTION_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                      {REJECTION_TYPE_LABEL[t]}
                                    </option>
                                  ))}
                                </Select>
                                <CellError message={e.rejectionType} />
                              </div>
                              <div className="sm:col-span-2">
                                <Input
                                  value={line.rejectionReason}
                                  onChange={(ev) => update(line.key, { rejectionReason: ev.target.value })}
                                  maxLength={REASON_MAX_LENGTH}
                                  placeholder="What was wrong, e.g. 3 cartons crushed"
                                  disabled={busy}
                                  invalid={!!e.rejectionReason}
                                  aria-label={`Rejection details, line ${n}`}
                                  className="py-1.5 text-sm"
                                />
                                <CellError message={e.rejectionReason} />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLines((current) => [...current, newLine()])}
            disabled={busy || lines.length >= PURCHASE_MAX_LINES}
          >
            Add product
          </Button>
        </div>

        <FormField id={remarkFieldId} label="Note (optional)" error={errors.note}>
          <Input
            id={remarkFieldId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={PURCHASE_NOTE_MAX_LENGTH}
            autoComplete="off"
            invalid={!!errors.note}
            aria-describedby={fieldError(remarkFieldId, errors.note)}
          />
        </FormField>

        {errors.form && (
          <p role="alert" className="text-sm text-red-600">
            {errors.form}
          </p>
        )}
      </form>
    </Modal>
  );
}