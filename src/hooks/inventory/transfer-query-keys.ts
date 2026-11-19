/**
 * Query keys for the Transfer module, in one place so invalidation is never a typo.
 * Keys are hierarchical:
 *   transferKeys.transfers()  refreshes every transfer query (lists, details, histories, in-transit goods)
 * Send, receipt and cancel also move stock, so the hooks invalidate inventoryKeys.stockLevels() and
 * inventoryKeys.movements() as well.
 */

import type { TransferStatusDto } from "@/types/inventory/transfer-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

export const transferKeys = {
  all: ["transfer"] as const,

  transfers: () => [...transferKeys.all, "transfers"] as const,
  transferList: (params: {
    page: number;
    size: number;
    locationId: UUID | null;
    status: TransferStatusDto | null;
    hasDiscrepancy: boolean | null;
    productId: UUID | null;
    from: ISODateTime | null;
    to: ISODateTime | null;
  }) => [...transferKeys.transfers(), "list", params] as const,
  transfer: (transferId: UUID) => [...transferKeys.transfers(), "detail", transferId] as const,
  history: (transferId: UUID) => [...transferKeys.transfers(), "history", transferId] as const,
  inTransit: (locationId: UUID | null) => [...transferKeys.transfers(), "in-transit", locationId] as const,
};