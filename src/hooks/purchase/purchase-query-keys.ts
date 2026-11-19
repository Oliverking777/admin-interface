/**
 * Query keys for the Purchasing module, in one place.
 * Keys are hierarchical: invalidating purchaseKeys.purchases() refreshes every purchase query.
 */

import type { PurchaseListQuery } from "@/types/purchase/purchase-dto";
import type { UUID } from "@/types/iam/user";

type Paged = { page: number; size: number };

export const purchaseKeys = {
  all: ["purchasing"] as const,

  purchases: () => [...purchaseKeys.all, "purchases"] as const,
  purchaseList: (params: Paged & PurchaseListQuery) =>
    [...purchaseKeys.purchases(), "list", params] as const,
  purchase: (purchaseId: UUID) => [...purchaseKeys.purchases(), "detail", purchaseId] as const,

  supplierPurchases: (supplierId: UUID, params: Paged) =>
    [...purchaseKeys.all, "supplier-purchases", supplierId, params] as const,
  supplierProducts: (supplierId: UUID, params: Paged) =>
    [...purchaseKeys.all, "supplier-products", supplierId, params] as const,
};