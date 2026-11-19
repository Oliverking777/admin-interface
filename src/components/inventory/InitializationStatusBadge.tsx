import Badge from "@/components/ui/Badge";
import {
  INITIALIZATION_STATUS_LABEL,
  INITIALIZATION_STATUS_VARIANT,
} from "@/lib/inventory/initialization-format";
import type { StockInitializationStatus } from "@/types/inventory/inventory";

export default function InitializationStatusBadge({ status }: { status: StockInitializationStatus }) {
  return <Badge variant={INITIALIZATION_STATUS_VARIANT[status]}>{INITIALIZATION_STATUS_LABEL[status]}</Badge>;
}
