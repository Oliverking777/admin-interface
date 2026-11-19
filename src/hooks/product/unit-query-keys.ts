/**
 * Query keys for the Unit module, in one place so invalidation is never a typo.
 * Keys are hierarchical: invalidating unitKeys.units() refreshes every unit query.
 */

import type { UnitStatusDto } from "@/types/product/unit-dto";
import type { UUID } from "@/types/iam/user";

export const unitKeys = {
  all: ["unit"] as const,

  units: () => [...unitKeys.all, "units"] as const,
  unitList: (params: { page: number; size: number; status: UnitStatusDto | null }) =>
    [...unitKeys.units(), "list", params] as const,
  unitAll: (filters: { status: UnitStatusDto | null }) => [...unitKeys.units(), "all", filters] as const,
  unit: (unitId: UUID) => [...unitKeys.units(), "detail", unitId] as const,
};