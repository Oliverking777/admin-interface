"use client";

/**
 * Receives a transfer that is in transit, at the destination. For each product that was sent:
 * the good quantity goes into stock; damaged goods and goods that never arrived (missing) do not.
 * Damaged or missing goods need a reason, and mark the transfer "Received with issues".
 * Mount it only while it is shown, so its state starts fresh each time.
 */

import { useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import { useReceiveTransfer } from "@/hooks/inventory/use-transfers";
import { formatNumber } from "@/lib/inventory/stock-format";
import { parseWholeNumber } from "@/lib/inventory/transfer-format";
import {
  MIN_DISCREPANCY_REASON_LENGTH,
  TRANSFER_NOTE_MAX_LENGTH,
  missingQuantity,
  type Transfer,
} from "@/types/inventory/transfer";
import type { ReceiveLineRequest } from "@/types/inventory/transfer-dto";

type ReceiveTransferModalProps = {
  transfer: Transfer;
  /** Pass a stable function (useCallback). */
  onClose: () => void;
  onDone: () => void;
};

type LineState = { received: string; damaged: string; reason: string };

export default function ReceiveTransferModal({ transfer, onClose, onDone }: ReceiveTransferModalProps) {
  const { toast } = useToast();
  const receive = useReceiveTransfer();

  // every product on the transfer needs a line
  const items = transfer.items;

  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(
      items.map((i) => [i.productId, { received: String(i.quantity), damaged: "0", reason: "" }]),
    ),
  );
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | undefined>();

  function patch(productId: string, change: Partial<LineState>) {
    setLines((current) => ({ ...current, [productId]: { ...current[productId], ...change } }));
  }

  function submit() {
    setServerError(undefined);
    const errors: Record<string, string> = {};
    const request: ReceiveLineRequest[] = [];

    for (const item of items) {
      const sent = item.quantity;
      const line = lines[item.productId];
      const received = parseWholeNumber(line.received);
      const damaged = parseWholeNumber(line.damaged);
      const reason = line.reason.trim();

      if (received === null || damaged === null) {
        errors[item.productId] = "Quantities must be whole numbers, 0 or more.";
      } else if (received + damaged > sent) {
        errors[item.productId] = `Received and damaged cannot add up to more than ${formatNumber(sent)}.`;
      } else if (
        (damaged > 0 || missingQuantity(sent, received, damaged) > 0) &&
        reason.length < MIN_DISCREPANCY_REASON_LENGTH
      ) {
        errors[item.productId] = `Explain what is damaged or missing (at least ${MIN_DISCREPANCY_REASON_LENGTH} characters).`;
      } else if (reason.length > TRANSFER_NOTE_MAX_LENGTH) {
        errors[item.productId] = `The reason can have at most ${TRANSFER_NOTE_MAX_LENGTH} characters.`;
      } else {
        request.push({
          productId: item.productId,
          receivedQuantity: received,
          damagedQuantity: damaged,
          discrepancyReason: reason || undefined,
        });
      }
    }
    setLineErrors(errors);
    if (Object.keys(errors).length > 0) return;

    receive.mutate(
      { transferId: transfer.id, request: { items: request } },
      {
        onSuccess: (updated) => {
          toast({ title: `Transfer ${updated.number} received` });
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
      busy={receive.isPending}
      size="lg"
      title={`Receive ${transfer.number}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={receive.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={receive.isPending}>
            Confirm reception
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Count what arrived at {transfer.destinationLocationName}. Only the good quantity is added to stock.
        </p>

        {serverError && (
          <p role="alert" className="border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {serverError}
          </p>
        )}

        <ul className="border border-border">
          {items.map((item) => {
            const sent = item.quantity;
            const line = lines[item.productId];
            const received = parseWholeNumber(line.received);
            const damaged = parseWholeNumber(line.damaged);
            const valid = received !== null && damaged !== null;
            const missing = valid ? missingQuantity(sent, received, damaged) : 0;
            const needsReason = valid && (damaged > 0 || missing > 0);
            const error = lineErrors[item.productId];

            return (
              <li key={item.id} className="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent {formatNumber(sent)} {item.unitName}
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Good
                    <Input
                      inputMode="numeric"
                      aria-label={`Good quantity for ${item.productName}`}
                      value={line.received}
                      onChange={(e) => patch(item.productId, { received: e.target.value })}
                      invalid={!!error}
                      disabled={receive.isPending}
                      className="w-24 py-2 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Damaged
                    <Input
                      inputMode="numeric"
                      aria-label={`Damaged quantity for ${item.productName}`}
                      value={line.damaged}
                      onChange={(e) => patch(item.productId, { damaged: e.target.value })}
                      invalid={!!error}
                      disabled={receive.isPending}
                      className="w-24 py-2 text-sm"
                    />
                  </label>
                  <p className="pb-2 text-sm text-muted-foreground">
                    Missing: <span className={missing > 0 ? "font-semibold text-red-600" : ""}>{formatNumber(missing)}</span>
                  </p>
                </div>

                {needsReason && (
                  <Textarea
                    aria-label={`Reason for damaged or missing ${item.productName}`}
                    placeholder="What happened to the damaged or missing goods?"
                    value={line.reason}
                    onChange={(e) => patch(item.productId, { reason: e.target.value })}
                    invalid={!!error}
                    disabled={receive.isPending}
                    rows={2}
                    className="text-sm"
                  />
                )}

                {error && (
                  <p role="alert" className="text-xs text-red-600">
                    {error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}