/**
 * Query keys for the Supplier module, in one place so invalidation is never a typo.
 * Keys are hierarchical: invalidating supplierKeys.suppliers() refreshes every supplier query.
 */

import type { SupplierStatusDto } from "@/types/purchase/supplier-dto";
import type { UUID } from "@/types/iam/user";

export const supplierKeys = {
  all: ["supplier"] as const,

  suppliers: () => [...supplierKeys.all, "suppliers"] as const,
  supplierList: (params: {
    page: number;
    size: number;
    search: string;
    status: SupplierStatusDto | null;
  }) => [...supplierKeys.suppliers(), "list", params] as const,
  supplierAll: (filters: { search: string; status: SupplierStatusDto | null }) =>
    [...supplierKeys.suppliers(), "all", filters] as const,
  supplier: (supplierId: UUID) => [...supplierKeys.suppliers(), "detail", supplierId] as const,
};