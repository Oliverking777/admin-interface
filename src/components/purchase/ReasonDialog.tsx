"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { REASON_MAX_LENGTH, REASON_MIN_LENGTH } from "@/types/purchase/purchase";

type ReasonDialogProps = {
  open: boolean;
  /** Must be a stable function (useCallback). */
  onClose: () => void;
  title: string;
  description?: ReactNode;
  label?: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Should reject on failure; the error is shown in the dialog. The dialog closes when it resolves. */
  onSubmit: (reason: string) => Promise<unknown>;
};

/** Asks for a 5-500 character reason, e.g. when cancelling a purchase. */
export default function ReasonDialog({
  open,
  onClose,
  title,
  description,
  label = "Reason",
  confirmLabel,
  destructive = false,
  onSubmit,
}: ReasonDialogProps) {
  const formId = useId();
  const fieldId = `${formId}-reason`;
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setReason("");
    setError(undefined);
    setFormError(undefined);
    setSubmitting(false);
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < REASON_MIN_LENGTH) {
      setError(`Write at least ${REASON_MIN_LENGTH} characters.`);
      return;
    }
    setError(undefined);
    setFormError(undefined);

    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.isValidation) {
        setError(err.fieldError("reason"));
        setFormError(err.message);
      } else {
        setFormError(getErrorMessage(err, "Could not complete this action."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Keep it
          </Button>
          <Button type="submit" form={formId} variant={destructive ? "danger" : "primary"} loading={submitting}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
        <FormField
          id={fieldId}
          label={label}
          error={error}
          hint={`${reason.length}/${REASON_MAX_LENGTH} characters, at least ${REASON_MIN_LENGTH}`}
        >
          <Textarea
            id={fieldId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REASON_MAX_LENGTH}
            invalid={!!error}
            aria-describedby={error ? `${fieldId}-error` : undefined}
          />
        </FormField>
        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}
