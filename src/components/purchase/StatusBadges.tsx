import Badge from "@/components/ui/Badge";
import { purchaseStatusDisplay } from "@/components/purchase/purchase-display";
import type { PurchaseStatus } from "@/types/purchase/purchase";

/** Ordered, Delivered, Delivered with problems or Cancelled. */
export function PurchaseStatusBadge({ status, hasDiscrepancy = false }: { status: PurchaseStatus; hasDiscrepancy?: boolean }) {
  const { label, variant } = purchaseStatusDisplay(status, hasDiscrepancy);
  return <Badge variant={variant}>{label}</Badge>;
}