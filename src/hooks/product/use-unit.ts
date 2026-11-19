"use client";

/**
 * Unit queries and mutations.
 *
 *   component -> hook -> unitService -> apiClient
 *
 * Queries switch themselves off when the user lacks UNIT_READ, so no pointless 403 is sent.
 * (The backend still enforces everything; this only saves requests.)
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts
 * (a 409 means the name or code is taken, or the unit already has the requested status).
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { productKeys } from "@/hooks/product/product-query-keys";
import { unitKeys } from "@/hooks/product/unit-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { toUnit, unitService } from "@/services/product/unit-service";
import type { PageParams } from "@/services/iam/role-service";
import type { Unit } from "@/types/product/unit";
import type {
  CreateUnitRequest,
  UnitListQuery,
  UnitPageResponse,
  UpdateUnitRequest,
} from "@/types/product/unit-dto";
import type { PageResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/** One page of units, ordered by name. The previous page stays visible while the next one loads. */
export function useUnits(params: PageParams & UnitListQuery = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const status = params.status ?? null;

  return useQuery<UnitPageResponse, ApiError, PageResponse<Unit>>({
    queryKey: unitKeys.unitList({ page, size, status }),
    queryFn: ({ signal }) => unitService.listPage(page, size, { status: status ?? undefined }, signal),
    select: (result) => ({ ...result, content: result.content.map(toUnit) }),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.UNIT_READ),
    placeholderData: keepPreviousData,
  });
}

/**
 * Every unit (all pages), optionally filtered by status, for dropdowns and filters.
 * To pick a unit to assign to a variant, pass { status: "ACTIVE" }.
 */
export function useAllUnits(filters: UnitListQuery = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const status = filters.status ?? null;

  return useQuery<Unit[], ApiError>({
    queryKey: unitKeys.unitAll({ status }),
    queryFn: ({ signal }) => unitService.listAll({ status: status ?? undefined }, signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.UNIT_READ),
  });
}

/** One unit. */
export function useUnit(unitId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<Unit, ApiError>({
    queryKey: unitKeys.unit(unitId ?? ""),
    queryFn: ({ signal }) => unitService.getById(unitId as UUID, signal),
    enabled: (options.enabled ?? true) && !!unitId && hasPermission(PERMISSIONS.UNIT_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

/** Needs UNIT_CREATE. A name (ignoring case) or code already in use gives a 409. */
export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation<Unit, ApiError, CreateUnitRequest>({
    mutationFn: (request) => unitService.create(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitKeys.units() }),
  });
}

/**
 * Needs UNIT_UPDATE. Renames the unit (the code cannot be changed); a name used by another unit gives a 409.
 * Products and variants show their units' names, so their queries are refreshed too.
 */
export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation<Unit, ApiError, { unitId: UUID; request: UpdateUnitRequest }>({
    mutationFn: ({ unitId, request }) => unitService.update(unitId, request),
    onSuccess: async (unit, { unitId }) => {
      queryClient.setQueryData(unitKeys.unit(unitId), unit);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: unitKeys.units() }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
      ]);
    },
  });
}

/** Needs UNIT_UPDATE. Fails with a 409 if the unit is already active. */
export function useActivateUnit() {
  const queryClient = useQueryClient();

  return useMutation<Unit, ApiError, UUID>({
    mutationFn: (unitId) => unitService.activate(unitId),
    onSuccess: async (unit, unitId) => {
      queryClient.setQueryData(unitKeys.unit(unitId), unit);
      await queryClient.invalidateQueries({ queryKey: unitKeys.units() });
    },
  });
}

/**
 * Needs UNIT_DEACTIVATE. Fails with a 409 if the unit is already inactive.
 * Only blocks new assignments: variants already using the unit keep working.
 */
export function useDeactivateUnit() {
  const queryClient = useQueryClient();

  return useMutation<Unit, ApiError, UUID>({
    mutationFn: (unitId) => unitService.deactivate(unitId),
    onSuccess: async (unit, unitId) => {
      queryClient.setQueryData(unitKeys.unit(unitId), unit);
      await queryClient.invalidateQueries({ queryKey: unitKeys.units() });
    },
  });
}