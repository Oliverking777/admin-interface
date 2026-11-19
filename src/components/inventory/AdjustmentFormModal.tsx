"use client";

/**
 * Requests a stock adjustment. It changes NO stock until it is approved.
 * The reason decides the direction when it can only go one way (damage, loss and supplier return remove
 * stock; opening stock adds it). Count correction and other may do either. "Other" needs a note.
 * Stock is kept per variant, so the product picked is a variant ("Indian Rice · 50 kg 10% broken").
 * Quantities are whole base units (the variant's smallest unit).
 * The form keeps its own state: the parent gives it a new `key` each time it opens.
 */

import { useState } from "react";

import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import { useProductStock, useRequestStockAdjustment } from "@/hooks/inventory/use-inventory";
import {
  ADJUSTMENT_REASONS,
  ADJUSTMENT_REASON_LABEL,
  DIRECTION_LABEL,
  parseQuantity,
} from "@/lib/inventory/adjustment-format";
import { formatQuantity } from "@/lib/inventory/stock-format";
import { type StockVariant } from "@/lib/inventory/stock-variants";
import {
  ADJUSTMENT_NOTE_MAX_LENGTH,
  ADJUSTMENT_REASON_DIRECTION,
  MIN_ADJUSTMENT_QUANTITY,
  reasonRequiresNote,
  type AdjustmentDirection,
  type AdjustmentReason,
  type StockAdjustment,
} from "@/types/inventory/inventory";

type Option = { id: string; name: string };

type AdjustmentFormModalProps = {
  open: boolean;
  /** Pass a stable function (useCallback). */
  onClose: () => void;
  locations: Option[];
  /** Every variant; only active ones can be picked. */
  products: StockVariant[];
  /** The user's own location when they belong to one: they can only adjust stock there. */
  lockedLocationId: string | null;
  /** Optional location to start with (e.g. the one the calling page is filtered on). Ignored when locked. */
  initialLocationId?: string | null;
  onSaved: (adjustment: StockAdjustment) => void;
};

type Errors = {
  location?: string;
  product?: string;
  reason?: string;
  direction?: string;
  quantity?: string;
  note?: string;
};

export default function AdjustmentFormModal({
  open,
  onClose,
  locations,
  products,
  lockedLocationId,
  initialLocationId = null,
  onSaved,
}: AdjustmentFormModalProps) {
  const { toast } = useToast();
  const request = useRequestStockAdjustment();

  const [locationId, setLocationId] = useState(lockedLocationId ?? initialLocationId ?? "");
  const [productId, setProductId] = useState("");
  const [reason, setReason] = useState<AdjustmentReason | "">("");
  const [direction, setDirection] = useState<AdjustmentDirection | "">("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | undefined>();

  const product = products.find((p) => p.id === productId);
  const baseUnitName = product?.units.find((u) => u.isBase)?.unitName ?? "";
  const activeVariants = products.filter((p) => p.active);

  // some reasons only allow one direction: it is then fixed, not chosen
  const fixedDirection = reason ? ADJUSTMENT_REASON_DIRECTION[reason] : null;
  const effectiveDirection: AdjustmentDirection | "" = fixedDirection ?? direction;
  const noteRequired = reason !== "" && reasonRequiresNote(reason);

  const stock = useProductStock(productId || undefined, locationId || undefined);
  const parsedQuantity = parseQuantity(quantity);
  const exceedsStock =
    effectiveDirection === "DECREASE" &&
    parsedQuantity !== null &&
    stock.data !== undefined &&
    parsedQuantity > stock.data.quantity;

  function submit() {
    setServerError(undefined);
    const next: Errors = {};
    if (!locationId) next.location = "Choose the location.";
    if (!productId) next.product = "Choose the product.";
    if (!reason) next.reason = "Choose a reason.";
    if (!effectiveDirection) next.direction = "Choose whether stock is added or removed.";
    if (parsedQuantity === null || parsedQuantity < MIN_ADJUSTMENT_QUANTITY) {
      next.quantity = `Enter a whole quantity of at least ${MIN_ADJUSTMENT_QUANTITY}.`;
    }
    if (noteRequired && note.trim() === "") next.note = "A note is required when the reason is Other.";
    else if (note.length > ADJUSTMENT_NOTE_MAX_LENGTH) next.note = `At most ${ADJUSTMENT_NOTE_MAX_LENGTH} characters.`;

    setErrors(next);
    if (Object.keys(next).length > 0 || !reason || !effectiveDirection || parsedQuantity === null) return;

    request.mutate(
      {
        productId,
        locationId,
        direction: effectiveDirection,
        reasonCategory: reason,
        quantity: parsedQuantity,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (adjustment) => {
          toast({
            title: `Adjustment ${adjustment.number} requested`,
            description: "No stock changes until it is approved.",
          });
          onSaved(adjustment);
          onClose();
        },
        onError: (e) => setServerError(e.message),
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={request.isPending}
      title="Request a stock adjustment"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={request.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={request.isPending}>
            Request adjustment
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          An adjustment changes no stock until it is approved.
        </p>

        {serverError && (
          <p role="alert" className="border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {serverError}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="adjustment-location" label="Location" error={errors.location}>
            <Select
              id="adjustment-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={lockedLocationId !== null || request.isPending}
              invalid={!!errors.location}
            >
              <option value="">Choose a location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            id="adjustment-product"
            label="Product"
            error={errors.product}
            hint={
              productId && locationId && stock.data && product
                ? `On hand: ${formatQuantity(stock.data.quantity, product.units)}`
                : undefined
            }
          >
            <Select
              id="adjustment-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={request.isPending}
              invalid={!!errors.product}
              aria-describedby={errors.product ? "adjustment-product-error" : undefined}
            >
              <option value="">Choose a product</option>
              {activeVariants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="adjustment-reason" label="Reason" error={errors.reason}>
            <Select
              id="adjustment-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as AdjustmentReason | "")}
              disabled={request.isPending}
              invalid={!!errors.reason}
            >
              <option value="">Choose a reason</option>
              {ADJUSTMENT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {ADJUSTMENT_REASON_LABEL[r]}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            id="adjustment-direction"
            label="Effect"
            error={errors.direction}
            hint={fixedDirection ? "Set by the reason." : undefined}
          >
            <Select
              id="adjustment-direction"
              value={effectiveDirection}
              onChange={(e) => setDirection(e.target.value as AdjustmentDirection | "")}
              disabled={fixedDirection !== null || request.isPending}
              invalid={!!errors.direction}
            >
              <option value="">Choose</option>
              <option value="INCREASE">{DIRECTION_LABEL.INCREASE}</option>
              <option value="DECREASE">{DIRECTION_LABEL.DECREASE}</option>
            </Select>
          </FormField>
        </div>

        <FormField
          id="adjustment-quantity"
          label={baseUnitName ? `Quantity (${baseUnitName})` : "Quantity"}
          hint="Counted in the smallest unit of this product."
          error={errors.quantity}
        >
          <Input
            id="adjustment-quantity"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            invalid={!!errors.quantity}
            disabled={request.isPending}
            aria-describedby={errors.quantity ? "adjustment-quantity-error" : undefined}
          />
        </FormField>

        {exceedsStock && (
          <p role="status" className="border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            This is more than the stock on hand. It cannot be approved until there is enough stock.
          </p>
        )}

        <FormField
          id="adjustment-note"
          label={noteRequired ? "Note (required)" : "Note (optional)"}
          hint={`${note.length} / ${ADJUSTMENT_NOTE_MAX_LENGTH}`}
          error={errors.note}
        >
          <Textarea
            id="adjustment-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            invalid={!!errors.note}
            disabled={request.isPending}
            aria-describedby={errors.note ? "adjustment-note-error" : undefined}
          />
        </FormField>
      </div>
    </Modal>
  );
}