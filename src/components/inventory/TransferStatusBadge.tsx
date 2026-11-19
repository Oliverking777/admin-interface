import Badge from "@/components/ui/Badge";
import { transferBadge } from "@/lib/inventory/transfer-format";
import type { Transfer } from "@/types/inventory/transfer";

/** In transit, Received, Received with issues or Cancelled. */
export default function TransferStatusBadge({
  transfer,
}: {
  transfer: Pick<Transfer, "status" | "hasDiscrepancy">;
}) {
  const { label, variant } = transferBadge(transfer);
  return <Badge variant={variant}>{label}</Badge>;
}