/**
 * Query keys for the Location module, in one place so invalidation is never a typo.
 * Keys are hierarchical: invalidating locationKeys.locations() refreshes every location query.
 */

import type { UUID } from "@/types/iam/user";

export const locationKeys = {
  all: ["location"] as const,

  locations: () => [...locationKeys.all, "locations"] as const,
  locationList: (params: { page: number; size: number }) =>
    [...locationKeys.locations(), "list", params] as const,
  locationAll: () => [...locationKeys.locations(), "all"] as const,
  location: (locationId: UUID) => [...locationKeys.locations(), "detail", locationId] as const,

  /** The logged-in user's own location. */
  mine: () => [...locationKeys.all, "mine"] as const,

  usersAll: () => [...locationKeys.all, "users"] as const,
  users: (locationId: UUID) => [...locationKeys.usersAll(), locationId] as const,
};