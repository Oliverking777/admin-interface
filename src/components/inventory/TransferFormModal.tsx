"use client";

/**
 * Sends a new transfer: the goods leave the source stock as soon as it is saved, and the transfer is in transit
 * until the destination receives it. There are no drafts: a sent transfer can only be received or cancelled.
 * The form keeps its own state: the parent gives it a new `key` each time it opens, so it starts fresh.
 * It carries a client-generated id, so retrying a failed send can never send the goods twice.
 */

import { useRef, useState } from "react";

import TransferLinesEditor, { newLineDraft, type LineDraft } from "@/components/inventory/TransferLinesEditor";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import { useCreateTransfer } from "@/hooks/inventory/use-transfers";
import { type StockVariant } from "@/lib/inventory/stock-variants";
import { parseWholeNumber } from "@/lib/inventory/transfer-format";
import {
  MIN_TRANSFER_LINE_QUANTITY,
  TRANSFER_NOTE_MAX_LENGTH,
  type Transfer,
} from "@/types/inventory/transfer";
import type { TransferLineRequest } from "@/types/inventory/transfer-dto";

type Option = { id: string; name: string };

type TransferFormModalProps = {
  open: boolean;
  /** Pass a stable function (useCallback). */
  onClose: () => void;
  locations: Option[];
  /** Every variant (stock moves per variant); only active ones can be picked. */
  products: StockVariant[];
  /** The user's own location when they belong to one: transfers then always leave from it. */
  lockedSourceId: string | null;
  /** Optional source to start with (e.g. the location the calling page is filtered on). Ignored when locked. */
  initialSourceId?: string | null;
  onSaved: (transfer: Transfer) => void;
};

export default function TransferFormModal({
  open,
  onClose,
  locations,
  products,
  lockedSourceId,
  initialSourceId = null,
  onSaved,
}: TransferFormModalProps) {
  const { toast } = useToast();
  const create = useCreateTransfer();
  const pending = create.isPending;

  const transferId = useRef(crypto.randomUUID());
  const [sourceId, setSourceId] = useState(lockedSourceId ?? initialSourceId ?? "");
  const [destinationId, setDestinationId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLineDraft()]);
  const [errors, setErrors] = useState<{ source?: string; destination?: string; note?: string; lines?: string }>({});
  const [serverError, setServerError] = useState<string | undefined>();

  const sourceName = locations.find((l) => l.id === sourceId)?.name;

  function validate(): TransferLineRequest[] | null {
    const next: typeof errors = {};
    if (!sourceId) next.source = "Choose where the goods leave from.";
    if (!destinationId) next.destination = "Choose where the goods go to.";
    else if (destinationId === sourceId) next.destination = "The destination must differ from the source.";
    if (note.length > TRANSFER_NOTE_MAX_LENGTH) next.note = `At most ${TRANSFER_NOTE_MAX_LENGTH} characters.`;

    const items: TransferLineRequest[] = [];
    for (const line of lines) {
      const quantity = parseWholeNumber(line.quantity);
      if (!line.productId || !line.unitId || quantity === null || quantity < MIN_TRANSFER_LINE_QUANTITY) {
        next.lines = `Every line needs a product, a unit and a whole quantity of at least ${MIN_TRANSFER_LINE_QUANTITY}.`;
        break;
      }
      items.push({ productId: line.productId, unitId: line.unitId, quantity });
    }

    setErrors(next);
    return Object.keys(next).length === 0 ? items : null;
  }

  function submit() {
    setServerError(undefined);
    const items = validate();
    if (!items) return;

    create.mutate(
      {
        transferId: transferId.current,
        sourceLocationId: sourceId,
        destinationLocationId: destinationId,
        note: note.trim() || undefined,
        items,
      },
      {
        onSuccess: (saved) => {
          toast({ title: `Transfer ${saved.number} sent` });
          onSaved(saved);
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
      busy={pending}
      size="lg"
      title="New transfer"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending}>
            Send transfer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          {sourceName
            ? `The goods leave the stock of ${sourceName} as soon as you send.`
            : "The goods leave the source stock as soon as you send."}
        </p>

        {serverError && (
          <p role="alert" className="border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {serverError}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="transfer-source" label="From" error={errors.source}>
            <Select
              id="transfer-source"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              disabled={lockedSourceId !== null || pending}
              invalid={!!errors.source}
            >
              <option value="">Choose a location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id="transfer-destination" label="To" error={errors.destination}>
            <Select
              id="transfer-destination"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              disabled={pending}
              invalid={!!errors.destination}
              aria-describedby={errors.destination ? "transfer-destination-error" : undefined}
            >
              <option value="">Choose a location</option>
              {locations
                .filter((l) => l.id !== sourceId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </Select>
          </FormField>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Products</span>
          <TransferLinesEditor lines={lines} onChange={setLines} products={products} disabled={pending} error={errors.lines} />
        </div>

        <FormField
          id="transfer-note"
          label="Note (optional)"
          hint={`${note.length} / ${TRANSFER_NOTE_MAX_LENGTH}`}
          error={errors.note}
        >
          <Textarea
            id="transfer-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            invalid={!!errors.note}
            disabled={pending}
          />
        </FormField>
      </div>
    </Modal>
  );
}