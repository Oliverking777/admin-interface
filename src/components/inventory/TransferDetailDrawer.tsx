"use client";

/**
 * One transfer: where it goes, what is on it (sent, received, damaged, missing), its history, and the actions
 * the current status allows.
 *
 * While the goods are in transit:
 *   Receive  needs TRANSFER_CONFIRM and a user who works at the destination;
 *   Cancel   needs TRANSFER_CREATE or TRANSFER_CONFIRM and a user who works at the source or the destination.
 * A user without a location (owner, admin) works everywhere. The backend enforces all of this anyway.
 *
 * While a dialog is open the drawer is hidden, so two overlays never compete for the Escape key.
 */

import { useCallback, useState } from "react";

import CancelTransferModal from "@/components/inventory/CancelTransferModal";
import ReceiveTransferModal from "@/components/inventory/ReceiveTransferModal";
import TransferStatusBadge from "@/components/inventory/TransferStatusBadge";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { useMyLocation } from "@/hooks/business/use-locations";
import { useAuth } from "@/hooks/iam/use-auth";
import { useTransfer, useTransferHistory } from "@/hooks/inventory/use-transfers";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { formatDateTime, shortId } from "@/lib/inventory/stock-format";
import { formatQuantityOrDash, transferEventLabel } from "@/lib/inventory/transfer-format";
import { canCancelTransfer, canReceiveTransfer } from "@/types/inventory/transfer";

type Action = "receive" | "cancel";

type TransferDetailDrawerProps = {
  /** The transfer to show. Null closes the drawer. */
  transferId: string | null;
  /** Pass a stable function (useCallback). */
  onClose: () => void;
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

export default function TransferDetailDrawer({ transferId, onClose }: TransferDetailDrawerProps) {
  const { hasPermission } = useAuth();
  const myLocation = useMyLocation().data ?? null;

  const transferQuery = useTransfer(transferId ?? undefined);
  const historyQuery = useTransferHistory(transferId ?? undefined);

  const [action, setAction] = useState<Action | null>(null);
  const closeAction = useCallback(() => setAction(null), []);

  const transfer = transferQuery.data ?? null;

  const atSource = !myLocation || myLocation.id === transfer?.sourceLocationId;
  const atDestination = !myLocation || myLocation.id === transfer?.destinationLocationId;
  const mayConfirm = hasPermission(PERMISSIONS.TRANSFER_CONFIRM);
  const mayCancel = hasPermission(PERMISSIONS.TRANSFER_CREATE) || mayConfirm;

  const status = transfer?.status;
  const showReceive = !!status && mayConfirm && atDestination && canReceiveTransfer(status);
  const showCancel = !!status && mayCancel && (atSource || atDestination) && canCancelTransfer(status);

  return (
    <>
      <Drawer
        open={transferId !== null && action === null}
        onClose={onClose}
        title={transfer?.number ?? "Transfer"}
        className="sm:max-w-2xl"
        footer={
          transfer && (showReceive || showCancel) ? (
            <div className="flex flex-wrap justify-end gap-2">
              {showCancel && (
                <Button variant="ghost" onClick={() => setAction("cancel")}>
                  Cancel transfer
                </Button>
              )}
              {showReceive && <Button onClick={() => setAction("receive")}>Receive</Button>}
            </div>
          ) : undefined
        }
      >
        {transferQuery.isLoading && <p className="text-sm text-muted-foreground">Loading transfer...</p>}

        {transferQuery.error && (
          <p role="alert" className="text-sm text-red-600">
            {transferQuery.error.message}
          </p>
        )}

        {transfer && (
          <div className="flex flex-col gap-6">
            <section aria-label="Summary" className="flex flex-col gap-4">
              <TransferStatusBadge transfer={transfer} />

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Detail label="From" value={transfer.sourceLocationName} />
                <Detail label="To" value={transfer.destinationLocationName} />
                <Detail label="Sent" value={formatDateTime(transfer.createdAt)} />
                {transfer.receivedAt && <Detail label="Received" value={formatDateTime(transfer.receivedAt)} />}
                {transfer.cancelledAt && <Detail label="Cancelled" value={formatDateTime(transfer.cancelledAt)} />}
              </dl>

              {transfer.note && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Note</p>
                  <p className="mt-0.5 text-sm text-foreground">{transfer.note}</p>
                </div>
              )}

              {transfer.cancelReason && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Cancellation reason</p>
                  <p className="mt-0.5 text-sm text-foreground">{transfer.cancelReason}</p>
                </div>
              )}
            </section>

            <section aria-label="Products" className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-foreground">Products</h3>
              <div className="border border-border">
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Product</TableHeaderCell>
                      <TableHeaderCell className="text-right">Sent</TableHeaderCell>
                      <TableHeaderCell className="text-right">Received</TableHeaderCell>
                      <TableHeaderCell className="text-right">Damaged</TableHeaderCell>
                      <TableHeaderCell className="text-right">Missing</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {transfer.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.productCode}, counted in {item.unitName}
                          </p>
                          {item.discrepancyReason && (
                            <p className="mt-1 text-xs text-red-600">Reason: {item.discrepancyReason}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatQuantityOrDash(item.quantity)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatQuantityOrDash(item.receivedQuantity)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatQuantityOrDash(item.damagedQuantity)}</TableCell>
                        <TableCell
                          className={
                            "text-right tabular-nums " +
                            ((item.missingQuantity ?? 0) > 0 ? "font-semibold text-red-600" : "")
                          }
                        >
                          {formatQuantityOrDash(item.missingQuantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section aria-label="History" className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-foreground">History</h3>

              {historyQuery.isLoading && <p className="text-sm text-muted-foreground">Loading history...</p>}
              {historyQuery.error && (
                <p role="alert" className="text-sm text-red-600">
                  {historyQuery.error.message}
                </p>
              )}

              {historyQuery.data && (
                <ol className="border border-border">
                  {historyQuery.data.map((event) => (
                    <li key={event.id} className="border-b border-border px-4 py-3 last:border-b-0">
                      <p className="text-sm font-medium text-foreground">{transferEventLabel(event.type)}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</p>
                      <p className="text-xs text-muted-foreground">User {shortId(event.performedBy)}</p>
                      {event.note && <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </Drawer>

      {transfer && action === "receive" && (
        <ReceiveTransferModal transfer={transfer} onClose={closeAction} onDone={closeAction} />
      )}
      {transfer && action === "cancel" && (
        <CancelTransferModal transfer={transfer} onClose={closeAction} onDone={closeAction} />
      )}
    </>
  );
}