/**
 * Query keys for the Category module, in one place so invalidation is never a typo.
 * Keys are hierarchical: invalidating categoryKeys.categories() refreshes every category query.
 */

import type { UUID } from "@/types/iam/user";

export const categoryKeys = {
  all: ["category"] as const,

  categories: () => [...categoryKeys.all, "categories"] as const,
  categoryList: (params: { page: number; size: number }) =>
    [...categoryKeys.categories(), "list", params] as const,
  categoryAll: () => [...categoryKeys.categories(), "all"] as const,
  category: (categoryId: UUID) => [...categoryKeys.categories(), "detail", categoryId] as const,
};