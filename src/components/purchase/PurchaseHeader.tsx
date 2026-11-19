import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatDate, formatDateTime, formatFcfa } from "@/components/purchase/purchase-display";
import { PurchaseStatusBadge } from "@/components/purchase/StatusBadges";
import { isPurchaseOpen, type Purchase } from "@/types/purchase/purchase";

/** What the current user is allowed to do. A button also needs the purchase to still be waiting for delivery. */
export type PurchaseAbilities = {
  edit: boolean;
  confirm: boolean;
  cancel: boolean;
};

type PurchaseHeaderProps = {
  purchase: Purchase;
  abilities: PurchaseAbilities;
  onEdit: () => void;
  onConfirmDelivery: () => void;
  onCancel: () => void;
};

function Detail({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-4" : undefined}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

/** Title, status, key facts and the actions allowed while the goods are awaited. */
export default function PurchaseHeader({ purchase, abilities, onEdit, onConfirmDelivery, onCancel }: PurchaseHeaderProps) {
  const open = isPurchaseOpen(purchase.status);

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{purchase.code}</h1>
          <PurchaseStatusBadge status={purchase.status} hasDiscrepancy={purchase.hasDiscrepancy} />
        </div>

        {open && (
          <div className="flex flex-wrap gap-2">
            {abilities.confirm && <Button onClick={onConfirmDelivery}>Confirm delivery</Button>}
            {abilities.edit && (
              <Button variant="secondary" onClick={onEdit}>
                Edit
              </Button>
            )}
            {abilities.cancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel purchase
              </Button>
            )}
          </div>
        )}
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Supplier">{purchase.supplierName ?? "Unknown supplier"}</Detail>
        <Detail label="Deliver to">{purchase.locationName ?? "-"}</Detail>
        <Detail label="Expected delivery">{formatDate(purchase.expectedDeliveryDate)}</Detail>
        <Detail label="Total">
          <span className="font-semibold tabular-nums">{formatFcfa(purchase.totalAmount)}</span>
        </Detail>
        <Detail label="Ordered">{formatDateTime(purchase.createdAt)}</Detail>
        {purchase.confirmedAt && <Detail label="Delivered">{formatDateTime(purchase.confirmedAt)}</Detail>}
        {purchase.deliveryNote && <Detail label="Delivery note">{purchase.deliveryNote}</Detail>}
        {purchase.cancelledAt && <Detail label="Cancelled">{formatDateTime(purchase.cancelledAt)}</Detail>}
        {purchase.cancelReason && (
          <Detail label="Why it was cancelled" wide>
            {purchase.cancelReason}
          </Detail>
        )}
        {purchase.note && (
          <Detail label="Note" wide>
            <span className="whitespace-pre-line">{purchase.note}</span>
          </Detail>
        )}
      </dl>
    </Card>
  );
}
