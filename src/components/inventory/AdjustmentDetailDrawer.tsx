"use client";

/**
 * One adjustment: what was asked, why, who asked, and what was decided.
 * A PENDING adjustment can be approved or rejected by a user with STOCK_ADJUST_APPROVE (the backend lets the
 * requester approve their own adjustment). Once approved, the stock before and after are shown.
 *
 * While a dialog is open the drawer is hidden, so two overlays never compete for the Escape key.
 */

import { useCallback, useState } from "react";

import AdjustmentStatusBadge from "@/components/inventory/AdjustmentStatusBadge";
import DecideAdjustmentModal, { type DecideMode } from "@/components/inventory/DecideAdjustmentModal";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import { useAuth } from "@/hooks/iam/use-auth";
import { useStockAdjustment } from "@/hooks/inventory/use-inventory";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import {
  ADJUSTMENT_REASON_LABEL,
  DIRECTION_LABEL,
  signedDelta,
} from "@/lib/inventory/adjustment-format";
import {
  formatDateTime,
  formatQuantity,
  formatSignedQuantity,
  shortId,
} from "@/lib/inventory/stock-format";
import { type StockVariant } from "@/lib/inventory/stock-variants";

type AdjustmentDetailDrawerProps = {
  /** The adjustment to show. Null closes the drawer. */
  adjustmentId: string | null;
  /** By variant id: units to write the quantities with. */
  variantsById: Map<string, StockVariant>;
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

export default function AdjustmentDetailDrawer({
  adjustmentId,
  variantsById,
  onClose,
}: AdjustmentDetailDrawerProps) {
  const { hasPermission } = useAuth();
  const query = useStockAdjustment(adjustmentId ?? undefined);
  const [mode, setMode] = useState<DecideMode | null>(null);
  const closeDialog = useCallback(() => setMode(null), []);

  const adjustment = query.data ?? null;
  const units = adjustment ? (variantsById.get(adjustment.productId)?.units ?? []) : [];

  const isPending = adjustment?.status === "PENDING";
  const canDecide = isPending && hasPermission(PERMISSIONS.STOCK_ADJUST_APPROVE);

  return (
    <>
      <Drawer
        open={adjustmentId !== null && mode === null}
        onClose={onClose}
        title={adjustment?.number ?? "Adjustment"}
        footer={
          adjustment && canDecide ? (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMode("reject")}>
                Reject
              </Button>
              <Button onClick={() => setMode("approve")}>Approve</Button>
            </div>
          ) : undefined
        }
      >
        {query.isLoading && <p className="text-sm text-muted-foreground">Loading adjustment...</p>}

        {query.error && (
          <p role="alert" className="text-sm text-red-600">
            {query.error.message}
          </p>
        )}

        {adjustment && (
          <div className="flex flex-col gap-6">
            <section aria-label="Request" className="flex flex-col gap-4">
              <AdjustmentStatusBadge status={adjustment.status} />

              <div className="border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground">{DIRECTION_LABEL[adjustment.direction]}</p>
                <p
                  className={
                    "mt-1 text-2xl font-semibold tabular-nums " +
                    (adjustment.direction === "INCREASE" ? "text-primary" : "text-red-600")
                  }
                >
                  {formatSignedQuantity(signedDelta(adjustment.direction, adjustment.quantity), units)}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Detail label="Product" value={adjustment.productName} />
                <Detail label="Location" value={adjustment.locationName} />
                <Detail label="Reason" value={ADJUSTMENT_REASON_LABEL[adjustment.reason]} />
                <Detail label="Requested" value={formatDateTime(adjustment.createdAt)} />
                <Detail label="Requested by" value={`User ${shortId(adjustment.createdBy)}`} />
              </dl>

              {adjustment.note && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Note</p>
                  <p className="mt-0.5 text-sm text-foreground">{adjustment.note}</p>
                </div>
              )}
            </section>

            {isPending && (
              <p className="border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                Waiting for a decision. No stock has changed yet.
              </p>
            )}

            {!isPending && (
              <section aria-label="Decision" className="flex flex-col gap-4">
                <h3 className="text-base font-semibold text-foreground">Decision</h3>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {adjustment.decidedAt && <Detail label="Decided" value={formatDateTime(adjustment.decidedAt)} />}
                  {adjustment.decidedBy && (
                    <Detail label="Decided by" value={`User ${shortId(adjustment.decidedBy)}`} />
                  )}
                  {adjustment.beforeQuantity !== null && (
                    <Detail label="Stock before" value={formatQuantity(adjustment.beforeQuantity, units)} />
                  )}
                  {adjustment.afterQuantity !== null && (
                    <Detail label="Stock after" value={formatQuantity(adjustment.afterQuantity, units)} />
                  )}
                </dl>

                {adjustment.decisionNote && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {adjustment.status === "REJECTED" ? "Rejection reason" : "Approval note"}
                    </p>
                    <p className="mt-0.5 text-sm text-foreground">{adjustment.decisionNote}</p>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </Drawer>

      {adjustment && mode && (
        <DecideAdjustmentModal
          adjustment={adjustment}
          mode={mode}
          units={units}
          onClose={closeDialog}
          onDone={closeDialog}
        />
      )}
    </>
  );
}
