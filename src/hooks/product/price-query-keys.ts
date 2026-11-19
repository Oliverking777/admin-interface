/**
 * Query keys for the Pricing module, in one place so invalidation is never a typo.
 * Keys are hierarchical, and a price always belongs to a variant:
 * invalidating priceKeys.prices(variantId) refreshes every price query of that variant
 * (current prices, history, one price, and applicable-price lookups).
 */

import type { UUID } from "@/types/iam/user";

export const priceKeys = {
  all: ["pricing"] as const,

  prices: (variantId: UUID) => [...priceKeys.all, "prices", variantId] as const,
  current: (variantId: UUID, unitId: UUID | null) =>
    [...priceKeys.prices(variantId), "current", unitId] as const,
  history: (variantId: UUID, params: { page: number; size: number; unitId: UUID | null }) =>
    [...priceKeys.prices(variantId), "history", params] as const,
  price: (variantId: UUID, priceId: UUID) => [...priceKeys.prices(variantId), "detail", priceId] as const,
  applicable: (variantId: UUID, params: { unitId: UUID; quantity: number; at: string | null }) =>
    [...priceKeys.prices(variantId), "applicable", params] as const,
};