/**
 * Query keys for the Product module, in one place so invalidation is never a typo.
 * Keys are hierarchical: invalidating productKeys.all refreshes every product and variant query, and
 * productKeys.products() every product query (products carry their variants and units).
 */

import type { ProductStatusDto } from "@/types/product/product-dto";
import type { UUID } from "@/types/iam/user";

export const productKeys = {
  all: ["product"] as const,

  products: () => [...productKeys.all, "products"] as const,
  productList: (params: {
    page: number;
    size: number;
    search: string;
    status: ProductStatusDto | null;
  }) => [...productKeys.products(), "list", params] as const,
  productAll: (filters: { search: string; status: ProductStatusDto | null }) =>
    [...productKeys.products(), "all", filters] as const,
  product: (productId: UUID) => [...productKeys.products(), "detail", productId] as const,

  /** Variant lookups by id or code, used by other screens (lines, stock, prices). */
  variants: () => [...productKeys.all, "variants"] as const,
  variantsByIds: (ids: UUID[]) => [...productKeys.variants(), "ids", [...ids].sort()] as const,
  variantBySku: (sku: string) => [...productKeys.variants(), "sku", sku.toUpperCase()] as const,

  variantUnitsAll: () => [...productKeys.all, "variant-units"] as const,
  variantUnits: (variantId: UUID) => [...productKeys.variantUnitsAll(), variantId] as const,
};