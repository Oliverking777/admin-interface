"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import PurchaseLinesEditor, {
  newLineDraft,
  validateLines,
  type LineErrors,
  type PurchaseLineDraft,
} from "@/components/purchase/PurchaseLinesEditor";
import { todayIsoDate, type NamedOption, type ProductOption } from "@/components/purchase/purchase-display";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { PURCHASE_MAX_LINES, PURCHASE_NOTE_MAX_LENGTH, type Purchase } from "@/types/purchase/purchase";
import type { CreatePurchaseRequest, UpdatePurchaseRequest } from "@/types/purchase/purchase-dto";

type PurchaseFormModalProps = {
  open: boolean;
  /** Must be a stable function (useCallback). */
  onClose: () => void;
  /** The purchase being edited (still waiting for delivery), or null to order. Lines of an existing purchase are edited on its page. */
  purchase: Purchase | null;
  /** Active suppliers. */
  suppliers: NamedOption[];
  /** Locations the user may order for. With a single one it is picked automatically. */
  locations: NamedOption[];
  /** Purchasable products with their units. Only used when creating. */
  products?: ProductOption[];
  /** Needed to create. Should reject on failure; the error is shown in the form. */
  onCreate?: (request: CreatePurchaseRequest) => Promise<unknown>;
  /** Should reject on failure; the error is shown in the form. */
  onUpdate: (purchaseId: string, request: UpdatePurchaseRequest) => Promise<unknown>;
};

type Field = "supplier" | "location" | "expectedDate" | "note";
type Errors = Partial<Record<Field | "form", string>>;

/** Keeps the current value selectable when it is no longer in the list (e.g. a supplier deactivated since). */
function withCurrent(options: NamedOption[], id: string | undefined, name: string | null | undefined): NamedOption[] {
  if (!id || options.some((o) => o.id === id)) return options;
  return [{ id, name: name ?? "Current value" }, ...options];
}

export default function PurchaseFormModal({
  open,
  onClose,
  purchase,
  suppliers,
  locations,
  products = [],
  onCreate,
  onUpdate,
}: PurchaseFormModalProps) {
  const formId = useId();
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<PurchaseLineDraft[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [lineErrors, setLineErrors] = useState<LineErrors>({});
  const [submitting, setSubmitting] = useState(false);
  // One id per opening: retrying after a network error returns the same purchase instead of a second one.
  const [purchaseId, setPurchaseId] = useState("");

  const isEdit = purchase !== null;
  const today = todayIsoDate();

  // Fill the form when the modal opens. Keyed on the purchase id, not the object, so a background
  // refetch of the same purchase does not wipe what the user is typing.
  useEffect(() => {
    setSupplierId(open ? (purchase?.supplierId ?? "") : "");
    setLocationId(open ? (purchase?.destinationLocationId ?? "") : "");
    setExpectedDate(open ? (purchase?.expectedDeliveryDate ?? "") : "");
    setNote(open ? (purchase?.note ?? "") : "");
    setLines(open && !purchase ? [newLineDraft()] : []);
    setErrors({});
    setLineErrors({});
    setSubmitting(false);
    setPurchaseId(open && !purchase ? crypto.randomUUID() : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchase?.id]);

  const effectiveLocationId = locationId || (locations.length === 1 ? locations[0].id : "");
  const supplierOptions = withCurrent(suppliers, purchase?.supplierId, purchase?.supplierName);
  const locationOptions = withCurrent(locations, purchase?.destinationLocationId, purchase?.locationName);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedNote = note.trim();
    const dateChanged = expectedDate !== (purchase?.expectedDeliveryDate ?? "");
    const next: Errors = {};
    if (!supplierId) next.supplier = "Choose a supplier.";
    if (!effectiveLocationId) next.location = "Choose where the goods will be delivered.";
    if (expectedDate && dateChanged && expectedDate < today) next.expectedDate = "Choose today or a later date.";
    if (!expectedDate && purchase?.expectedDeliveryDate) next.expectedDate = "The date can be changed, not removed.";
    if (trimmedNote.length > PURCHASE_NOTE_MAX_LENGTH) next.note = `Use at most ${PURCHASE_NOTE_MAX_LENGTH} characters.`;

    const { errors: nextLineErrors, requests } = isEdit ? { errors: {}, requests: [] } : validateLines(lines);
    if (!isEdit && Object.keys(nextLineErrors).length === 0 && requests.length === 0) {
      next.form = "Add at least one product.";
    }
    if (requests.length > PURCHASE_MAX_LINES) next.form = `A purchase can have at most ${PURCHASE_MAX_LINES} lines.`;

    setErrors(next);
    setLineErrors(nextLineErrors);
    if (Object.keys(next).length > 0 || Object.keys(nextLineErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (purchase) {
        // Send only what changed.
        const request: UpdatePurchaseRequest = {};
        if (supplierId !== purchase.supplierId) request.supplierId = supplierId;
        if (effectiveLocationId !== purchase.destinationLocationId) request.destinationLocationId = effectiveLocationId;
        if (expectedDate && dateChanged) request.expectedDeliveryDate = expectedDate;
        // An emptied note is sent as "": check that the backend clears it rather than rejecting it.
        if (trimmedNote !== (purchase.note ?? "")) request.note = trimmedNote;

        if (Object.keys(request).length > 0) await onUpdate(purchase.id, request);
      } else {
        await onCreate?.({
          purchaseId,
          supplierId,
          destinationLocationId: effectiveLocationId,
          ...(expectedDate ? { expectedDeliveryDate: expectedDate } : {}),
          ...(trimmedNote ? { note: trimmedNote } : {}),
          items: requests,
        });
      }
      onClose();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setErrors({
          supplier: error.fieldError("supplierId"),
          location: error.fieldError("destinationLocationId"),
          expectedDate: error.fieldError("expectedDeliveryDate"),
          note: error.fieldError("note"),
          form: error.message,
        });
      } else {
        // 403 (not assigned to the location), 409 (already delivered or cancelled, inactive supplier...): the message says which.
        setErrors({ form: getErrorMessage(error, "Could not save the purchase.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const supplierFieldId = `${formId}-supplier`;
  const locationFieldId = `${formId}-location`;
  const dateFieldId = `${formId}-date`;
  const noteFieldId = `${formId}-note`;
  const describedBy = (id: string, error?: string) => (error ? `${id}-error` : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      size={isEdit ? "md" : "xl"}
      title={isEdit ? `Edit purchase ${purchase.code}` : "New order"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {isEdit ? "Save changes" : "Place order"}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={supplierFieldId} label="Supplier" error={errors.supplier}>
            <Select
              id={supplierFieldId}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              invalid={!!errors.supplier}
              aria-describedby={describedBy(supplierFieldId, errors.supplier)}
            >
              <option value="">Choose a supplier</option>
              {supplierOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id={locationFieldId} label="Deliver to" error={errors.location}>
            <Select
              id={locationFieldId}
              value={effectiveLocationId}
              onChange={(e) => setLocationId(e.target.value)}
              invalid={!!errors.location}
              aria-describedby={describedBy(locationFieldId, errors.location)}
            >
              <option value="">Choose a location</option>
              {locationOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id={dateFieldId} label="Expected delivery (optional)" error={errors.expectedDate}>
            <Input
              id={dateFieldId}
              type="date"
              min={today}
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              invalid={!!errors.expectedDate}
              aria-describedby={describedBy(dateFieldId, errors.expectedDate)}
              className="[color-scheme:light_dark]"
            />
          </FormField>
        </div>

        <FormField
          id={noteFieldId}
          label="Note (optional)"
          error={errors.note}
          hint={`${note.length}/${PURCHASE_NOTE_MAX_LENGTH} characters`}
        >
          <Textarea
            id={noteFieldId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={PURCHASE_NOTE_MAX_LENGTH}
            invalid={!!errors.note}
            aria-describedby={describedBy(noteFieldId, errors.note)}
          />
        </FormField>

        {!isEdit && (
          <section className="flex flex-col gap-2" aria-labelledby={`${formId}-lines`}>
            <div>
              <h3 id={`${formId}-lines`} className="text-sm font-medium text-foreground">
                Lines
              </h3>
              <p className="text-sm text-muted-foreground">
                What you are ordering. Stock changes only when the delivery is confirmed.
              </p>
            </div>
            <PurchaseLinesEditor
              lines={lines}
              onChange={setLines}
              products={products}
              errors={lineErrors}
              disabled={submitting}
            />
          </section>
        )}

        {errors.form && (
          <p role="alert" className="text-sm text-red-600">
            {errors.form}
          </p>
        )}
      </form>
    </Modal>
  );
}