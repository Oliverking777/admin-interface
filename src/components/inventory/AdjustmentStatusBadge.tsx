import Badge from "@/components/ui/Badge";
import { ADJUSTMENT_STATUS_LABEL, ADJUSTMENT_STATUS_VARIANT } from "@/lib/inventory/adjustment-format";
import type { AdjustmentStatus } from "@/types/inventory/inventory";

export default function AdjustmentStatusBadge({ status }: { status: AdjustmentStatus }) {
  return <Badge variant={ADJUSTMENT_STATUS_VARIANT[status]}>{ADJUSTMENT_STATUS_LABEL[status]}</Badge>;
}