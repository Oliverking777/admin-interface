"use client";

/**
 * Records the delivery of a purchase: what was accepted (goes into stock) and rejected for every line.
 * Whatever is neither accepted nor rejected counts as missing. Lines start filled as "everything arrived",
 * so only the lines that differ need typing. Confirming adds the stock at once and cannot be undone.
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
  formatQuantity,
  parseWholeNumber,
  type UnitLabel,
} from "@/components/purchase/purchase-display";
import { CellError } from "@/components/purchase/TableStates";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { cn } from "@/lib/cn";
import {
  DELIVERY_NOTE_MAX_LENGTH,
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
  type Purchase,
  type PurchaseItem,
  type RejectionType,
} from "@/types/purchase/purchase";
import type { ConfirmPurchaseRequest, DeliveryLineRequest } from "@/types/purchase/purchase-dto";

type ConfirmDeliveryModalProps = {
  open: boolean;
  /** Must be a stable function (useCallback). */
  onClose: () => void;
  /** A purchase still waiting for delivery. */
  purchase: Purchase | null;
  unitLabel?: UnitLabel;
  /** Should reject on failure; the error is shown in the form. */
  onConfirm: (purchaseId: string, request: ConfirmPurchaseRequest) => Promise<unknown>;
};

/** What was typed for one line. Numbers stay strings until submit. */
type RowDraft = { accepted: string; rejected: string; rejectionType: RejectionType | ""; reason: string };
type RowErrors = Record<string, Partial<Record<keyof RowDraft, string>>>;
type Errors = Partial<Record<"deliveryNote" | "form", string>>;

const asOrdered = (item: PurchaseItem): RowDraft => ({
  accepted: String(item.orderedQuantity),
  rejected: "",
  rejectionType: "",
  reason: "",
});

/** Rejected is optional (0). missing is null while a number is not valid yet. */
function quantities(item: PurchaseItem, row: RowDraft) {
  const accepted = parseWholeNumber(row.accepted);
  const rejected = row.rejected.trim() ? parseWholeNumber(row.rejected) : 0;
  const valid = accepted >= 0 && rejected >= 0;
  const missing = valid ? Math.max(0, item.orderedQuantity - accepted - rejected) : null;
  // A line differs from the order when something was refused or is missing.
  const differs = valid && (rejected > 0 || accepted < item.orderedQuantity);
  return { accepted, rejected, missing, differs };
}

function validateRows(items: PurchaseItem[], rows: Record<string, RowDraft>) {
  const errors: RowErrors = {};
  const lines: DeliveryLineRequest[] = [];

  for (const item of items) {
    const row = rows[item.id] ?? asOrdered(item);
    const e: RowErrors[string] = {};
    const { accepted, rejected, differs } = quantities(item, row);
    const reason = row.reason.trim();

    if (!(accepted >= 0)) e.accepted = "Whole number, 0 or more.";
    else if (accepted > item.orderedQuantity) {
      e.accepted = `Only ${formatQuantity(item.orderedQuantity)} ordered: reject the extra as "${REJECTION_TYPE_LABEL.EXCESS}".`;
    }
    if (!(rejected >= 0)) e.rejected = "Whole number, 0 or more.";
    if (rejected > 0 && !row.rejectionType) e.rejectionType = "Choose why.";
    if (differs && reason.length < REASON_MIN_LENGTH) e.reason = `Explain in at least ${REASON_MIN_LENGTH} characters.`;

    if (Object.keys(e).length > 0) {
      errors[item.id] = e;
      continue;
    }
    lines.push({
      purchaseItemId: item.id,
      quantityAccepted: accepted,
      quantityRejected: rejected,
      ...(rejected > 0 ? { rejectionType: row.rejectionType as RejectionType } : {}),
      ...(differs ? { reason } : {}),
    });
  }
  return { errors, lines };
}

export default function ConfirmDeliveryModal({ open, onClose, purchase, unitLabel, onConfirm }: ConfirmDeliveryModalProps) {
  const formId = useId();
  const [rows, setRows] = useState<Record<string, RowDraft>>({});
  const [deliveryNote, setDeliveryNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [rowErrors, setRowErrors] = useState<RowErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const items = purchase?.items ?? [];

  // Keyed on the id so a background refetch does not wipe what the user is typing.
  useEffect(() => {
    setRows(open && purchase ? Object.fromEntries(purchase.items.map((i) => [i.id, asOrdered(i)])) : {});
    setDeliveryNote("");
    setErrors({});
    setRowErrors({});
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchase?.id]);

  function updateRow(item: PurchaseItem, patch: Partial<RowDraft>) {
    setRows((current) => ({ ...current, [item.id]: { ...(current[item.id] ?? asOrdered(item)), ...patch } }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!purchase) return;

    const { errors: nextRowErrors, lines } = validateRows(items, rows);
    const next: Errors = {};
    const trimmedNote = deliveryNote.trim();
    if (trimmedNote.length > DELIVERY_NOTE_MAX_LENGTH) next.deliveryNote = `Use at most ${DELIVERY_NOTE_MAX_LENGTH} characters.`;

    setErrors(next);
    setRowErrors(nextRowErrors);
    if (Object.keys(next).length > 0 || Object.keys(nextRowErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onConfirm(purchase.id, { ...(trimmedNote ? { deliveryNote: trimmedNote } : {}), items: lines });
      onClose();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setErrors({ deliveryNote: error.fieldError("deliveryNote"), form: error.message });
      } else {
        // 403 = not assigned to the destination; 409 = already delivered or cancelled, or a line the backend refused.
        setErrors({ form: getErrorMessage(error, "Could not confirm the delivery.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const noteFieldId = `${formId}-note`;
  const COLUMNS = 4;

  return (
    <Modal
      open={open && purchase !== null}
      onClose={onClose}
      busy={submitting}
      size="xl"
      title={`Confirm delivery of ${purchase?.code ?? ""}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            Confirm and add to stock
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Each line starts as delivered in full. Change only what differs: anything neither accepted nor rejected is
          counted as missing. The accepted goods are added to stock as soon as you confirm, and this cannot be undone.
        </p>

        <div className="sm:w-1/2">
          <FormField
            id={noteFieldId}
            label="Supplier's delivery note (optional)"
            error={errors.deliveryNote}
            hint="The number on the supplier's paperwork."
          >
            <Input
              id={noteFieldId}
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              maxLength={DELIVERY_NOTE_MAX_LENGTH}
              autoComplete="off"
              invalid={!!errors.deliveryNote}
              aria-describedby={errors.deliveryNote ? `${noteFieldId}-error` : undefined}
            />
          </FormField>
        </div>

        <div className="border border-border">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
            </colgroup>
            <TableHead>
              <tr>
                <TableHeaderCell className="px-2">Product</TableHeaderCell>
                <TableHeaderCell className="px-2">Accepted</TableHeaderCell>
                <TableHeaderCell className="px-2">Rejected</TableHeaderCell>
                <TableHeaderCell className="px-2 text-right">Missing</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const row = rows[item.id] ?? asOrdered(item);
                const e = rowErrors[item.id] ?? {};
                const { rejected, missing, differs } = quantities(item, row);
                const name = item.productName ?? "Unknown product";
                const unit = unitLabel?.(item.unitId);

                return (
                  <Fragment key={item.id}>
                    <TableRow className={cn("hover:bg-transparent", differs && "border-b-0")}>
                      <TableCell className="px-2 py-2 align-top">
                        <span className="block truncate font-medium" title={name}>
                          {name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Ordered {formatQuantity(item.orderedQuantity)}
                          {unit && ` ${unit}`}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-2 align-top">
                        <Input
                          inputMode="numeric"
                          value={row.accepted}
                          onChange={(ev) => updateRow(item, { accepted: ev.target.value })}
                          disabled={submitting}
                          invalid={!!e.accepted}
                          aria-label={`Accepted, ${name}`}
                          className="py-1.5 text-sm"
                        />
                        <CellError message={e.accepted} />
                      </TableCell>
                      <TableCell className="px-2 py-2 align-top">
                        <Input
                          inputMode="numeric"
                          value={row.rejected}
                          placeholder="0"
                          onChange={(ev) => updateRow(item, { rejected: ev.target.value })}
                          disabled={submitting}
                          invalid={!!e.rejected}
                          aria-label={`Rejected, ${name}`}
                          className="py-1.5 text-sm"
                        />
                        <CellError message={e.rejected} />
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-2 py-2 pt-3.5 text-right align-top tabular-nums",
                          missing ? "font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground",
                        )}
                      >
                        {missing === null ? "-" : formatQuantity(missing)}
                      </TableCell>
                    </TableRow>

                    {differs && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={COLUMNS} className="px-2 py-2">
                          <div className="grid gap-2 sm:grid-cols-3">
                            {rejected > 0 && (
                              <div>
                                <Select
                                  value={row.rejectionType}
                                  onChange={(ev) =>
                                    updateRow(item, { rejectionType: ev.target.value as RejectionType | "" })
                                  }
                                  disabled={submitting}
                                  invalid={!!e.rejectionType}
                                  aria-label={`Why goods were rejected, ${name}`}
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
                            )}
                            <div className={rejected > 0 ? "sm:col-span-2" : "sm:col-span-3"}>
                              <Input
                                value={row.reason}
                                onChange={(ev) => updateRow(item, { reason: ev.target.value })}
                                maxLength={REASON_MAX_LENGTH}
                                placeholder={
                                  rejected > 0 ? "What was wrong, e.g. 3 cartons crushed" : "Why it is short, e.g. out of stock at the supplier"
                                }
                                disabled={submitting}
                                invalid={!!e.reason}
                                aria-label={`Why this line differs from the order, ${name}`}
                                className="py-1.5 text-sm"
                              />
                              <CellError message={e.reason} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {errors.form && (
          <p role="alert" className="text-sm text-red-600">
            {errors.form}
          </p>
        )}
      </form>
    </Modal>
  );
}