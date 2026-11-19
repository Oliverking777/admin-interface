/**
 * Query keys for the Customer module, in one place so invalidation is never a typo.
 * Keys are hierarchical: invalidating customerKeys.customers() refreshes every customer query.
 */

import type { CustomerStatusDto } from "@/types/customer/customer-dto";
import type { UUID } from "@/types/iam/user";

export const customerKeys = {
  all: ["customer"] as const,

  customers: () => [...customerKeys.all, "customers"] as const,
  customerList: (params: {
    page: number;
    size: number;
    search: string;
    status: CustomerStatusDto | null;
  }) => [...customerKeys.customers(), "list", params] as const,
  customerAll: (filters: { search: string; status: CustomerStatusDto | null }) =>
    [...customerKeys.customers(), "all", filters] as const,
  customer: (customerId: UUID) => [...customerKeys.customers(), "detail", customerId] as const,
};