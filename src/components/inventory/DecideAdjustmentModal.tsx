"use client";

/**
 * Approves or rejects a PENDING adjustment.
 *  - Approve: the stock moves now. The note is optional.
 *  - Reject: no stock changes. The note is the reason and is required (5 to 500 characters).
 * The requester may approve their own adjustment. A decrease larger than the stock cannot be approved
 * (the backend answers 409 and the adjustment stays PENDING).
 * Mount it only while it is shown, so its state starts fresh each time.
 */

import { useState } from "react";

import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import { useApproveStockAdjustment, useRejectStockAdjustment } from "@/hooks/inventory/use-inventory";
import { formatSignedQuantity } from "@/lib/inventory/stock-format";
import { signedDelta } from "@/lib/inventory/adjustment-format";
import {
  ADJUSTMENT_NOTE_MAX_LENGTH,
  MIN_REJECTION_NOTE_LENGTH,
  type StockAdjustment,
} from "@/types/inventory/inventory";
import type { VariantUnit } from "@/types/product/product";

export type DecideMode = "approve" | "reject";

type DecideAdjustmentModalProps = {
  adjustment: StockAdjustment;
  mode: DecideMode;
  /** The variant's units, to write the quantity with its base unit. */
  units: VariantUnit[];
  /** Pass a stable function (useCallback). */
  onClose: () => void;
  onDone: () => void;
};

export default function DecideAdjustmentModal({
  adjustment,
  mode,
  units,
  onClose,
  onDone,
}: DecideAdjustmentModalProps) {
  const { toast } = useToast();
  const approve = useApproveStockAdjustment();
  const reject = useRejectStockAdjustment();
  const pending = approve.isPending || reject.isPending;
  const isApprove = mode === "approve";

  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | undefined>();

  function submit() {
    setServerError(undefined);
    const trimmed = note.trim();

    if (trimmed.length > ADJUSTMENT_NOTE_MAX_LENGTH) {
      setError(`At most ${ADJUSTMENT_NOTE_MAX_LENGTH} characters.`);
      return;
    }
    if (!isApprove && trimmed.length < MIN_REJECTION_NOTE_LENGTH) {
      setError(`Give a reason of at least ${MIN_REJECTION_NOTE_LENGTH} characters.`);
      return;
    }
    setError(undefined);

    const callbacks = {
      onSuccess: (updated: StockAdjustment) => {
        toast({ title: `Adjustment ${updated.number} ${isApprove ? "approved" : "rejected"}` });
        onDone();
      },
      onError: (e: { message: string }) => setServerError(e.message),
    };

    if (isApprove) {
      approve.mutate(
        { adjustmentId: adjustment.id, request: trimmed ? { note: trimmed } : undefined },
        callbacks,
      );
    } else {
      reject.mutate({ adjustmentId: adjustment.id, request: { note: trimmed } }, callbacks);
    }
  }

  const change = formatSignedQuantity(signedDelta(adjustment.direction, adjustment.quantity), units);

  return (
    <Modal
      open
      onClose={onClose}
      busy={pending}
      title={`${isApprove ? "Approve" : "Reject"} ${adjustment.number}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Back
          </Button>
          <Button variant={isApprove ? "primary" : "danger"} onClick={submit} loading={pending}>
            {isApprove ? "Approve" : "Reject"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {isApprove
            ? `Stock moves now: ${adjustment.productName} at ${adjustment.locationName} changes by ${change}.`
            : "No stock changes. The person who asked for it will see your reason."}
        </p>

        {serverError && (
          <p role="alert" className="border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {serverError}
          </p>
        )}

        <FormField
          id="decision-note"
          label={isApprove ? "Note (optional)" : "Reason"}
          hint={`${note.length} / ${ADJUSTMENT_NOTE_MAX_LENGTH}`}
          error={error}
        >
          <Textarea
            id="decision-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            invalid={!!error}
            disabled={pending}
            aria-describedby={error ? "decision-note-error" : undefined}
          />
        </FormField>
      </div>
    </Modal>
  );
}