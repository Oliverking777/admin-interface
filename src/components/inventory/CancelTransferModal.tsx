"use client";

/**
 * Cancels a transfer that is in transit: the goods go back into the source stock. A reason is required.
 * A received transfer cannot be cancelled.
 * Mount it only while it is shown, so its state starts fresh each time.
 */

import { useState } from "react";

import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import { useCancelTransfer } from "@/hooks/inventory/use-transfers";
import {
  MIN_CANCEL_REASON_LENGTH,
  TRANSFER_NOTE_MAX_LENGTH,
  type Transfer,
} from "@/types/inventory/transfer";

type CancelTransferModalProps = {
  transfer: Transfer;
  /** Pass a stable function (useCallback). */
  onClose: () => void;
  onDone: () => void;
};

export default function CancelTransferModal({ transfer, onClose, onDone }: CancelTransferModalProps) {
  const { toast } = useToast();
  const cancel = useCancelTransfer();

  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | undefined>();

  function submit() {
    setServerError(undefined);
    const trimmed = reason.trim();
    if (trimmed.length < MIN_CANCEL_REASON_LENGTH) {
      setError(`Give a reason of at least ${MIN_CANCEL_REASON_LENGTH} characters.`);
      return;
    }
    if (trimmed.length > TRANSFER_NOTE_MAX_LENGTH) {
      setError(`At most ${TRANSFER_NOTE_MAX_LENGTH} characters.`);
      return;
    }
    setError(undefined);

    cancel.mutate(
      { transferId: transfer.id, request: { reason: trimmed } },
      {
        onSuccess: (updated) => {
          toast({ title: `Transfer ${updated.number} cancelled` });
          onDone();
        },
        onError: (e) => setServerError(e.message),
      },
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={cancel.isPending}
      title={`Cancel ${transfer.number}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={cancel.isPending}>
            Keep transfer
          </Button>
          <Button variant="danger" onClick={submit} loading={cancel.isPending}>
            Cancel transfer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          The goods go back into the stock of {transfer.sourceLocationName}.
        </p>

        {serverError && (
          <p role="alert" className="border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {serverError}
          </p>
        )}

        <FormField
          id="cancel-reason"
          label="Reason"
          hint={`${reason.length} / ${TRANSFER_NOTE_MAX_LENGTH}`}
          error={error}
        >
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            invalid={!!error}
            disabled={cancel.isPending}
            aria-describedby={error ? "cancel-reason-error" : undefined}
            placeholder="For example: wrong destination chosen"
          />
        </FormField>
      </div>
    </Modal>
  );
}