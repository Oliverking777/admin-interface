"use client";

/**
 * Location queries and mutations.
 *
 *   component -> hook -> locationService -> apiClient
 *
 * Queries switch themselves off when the user lacks the permission, so no pointless 403 is sent.
 * (The backend still enforces everything; this only saves requests.)
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts
 * (a 409 means the code is taken, the status is already the requested one, or the user cannot be assigned).
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { locationKeys } from "@/hooks/business/location-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { locationService, toLocation } from "@/services/business/location-service";
import type { PageParams } from "@/services/iam/role-service";
import type { Location, LocationUser } from "@/types/business/location";
import type {
  CreateLocationRequest,
  LocationPageResponse,
  UpdateLocationRequest,
} from "@/types/business/location-dto";
import type { PageResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/** One page of locations, ordered by name. The previous page stays visible while the next one loads. */
export function useLocations(params: PageParams = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;

  return useQuery<LocationPageResponse, ApiError, PageResponse<Location>>({
    queryKey: locationKeys.locationList({ page, size }),
    queryFn: ({ signal }) => locationService.listPage(page, size, signal),
    select: (result) => ({ ...result, content: result.content.map(toLocation) }),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.LOCATION_READ),
    placeholderData: keepPreviousData,
  });
}

/** Every location (all pages), for tables, dropdowns and filters. */
export function useAllLocations(options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<Location[], ApiError>({
    queryKey: locationKeys.locationAll(),
    queryFn: ({ signal }) => locationService.listAll(signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.LOCATION_READ),
  });
}

/** One location. */
export function useLocation(locationId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<Location, ApiError>({
    queryKey: locationKeys.location(locationId ?? ""),
    queryFn: ({ signal }) => locationService.getById(locationId as UUID, signal),
    enabled: (options.enabled ?? true) && !!locationId && hasPermission(PERMISSIONS.LOCATION_READ),
  });
}

/** The logged-in user's own location, or null when they have none (e.g. an owner). Needs no permission. */
export function useMyLocation(options: QueryOptions = {}) {
  const { isAuthenticated } = useAuth();

  return useQuery<Location | null, ApiError>({
    queryKey: locationKeys.mine(),
    queryFn: ({ signal }) => locationService.getMine(signal),
    enabled: (options.enabled ?? true) && isAuthenticated,
  });
}

/** The users assigned to a location. Needs LOCATION_USER_READ. */
export function useLocationUsers(locationId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<LocationUser[], ApiError>({
    queryKey: locationKeys.users(locationId ?? ""),
    queryFn: ({ signal }) => locationService.listUsers(locationId as UUID, signal),
    enabled: (options.enabled ?? true) && !!locationId && hasPermission(PERMISSIONS.LOCATION_USER_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Location mutations                                                        */
/* -------------------------------------------------------------------------- */

/** Needs LOCATION_CREATE. A code already in use gives a 409. */
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation<Location, ApiError, CreateLocationRequest>({
    mutationFn: (request) => locationService.create(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: locationKeys.locations() }),
  });
}

/** Needs LOCATION_UPDATE. Fields left out stay unchanged; the code cannot be changed. */
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation<Location, ApiError, { locationId: UUID; request: UpdateLocationRequest }>({
    mutationFn: ({ locationId, request }) => locationService.update(locationId, request),
    onSuccess: async (location, { locationId }) => {
      queryClient.setQueryData(locationKeys.location(locationId), location);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: locationKeys.locations() }),
        queryClient.invalidateQueries({ queryKey: locationKeys.mine() }),
      ]);
    },
  });
}

/** Needs LOCATION_ACTIVATE. Fails with a 409 if the location is already active. */
export function useActivateLocation() {
  const queryClient = useQueryClient();

  return useMutation<Location, ApiError, UUID>({
    mutationFn: (locationId) => locationService.activate(locationId),
    onSuccess: async (location, locationId) => {
      queryClient.setQueryData(locationKeys.location(locationId), location);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: locationKeys.locations() }),
        queryClient.invalidateQueries({ queryKey: locationKeys.mine() }),
      ]);
    },
  });
}

/** Needs LOCATION_DEACTIVATE. Fails with a 409 if the location is already inactive. User assignments are kept. */
export function useDeactivateLocation() {
  const queryClient = useQueryClient();

  return useMutation<Location, ApiError, UUID>({
    mutationFn: (locationId) => locationService.deactivate(locationId),
    onSuccess: async (location, locationId) => {
      queryClient.setQueryData(locationKeys.location(locationId), location);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: locationKeys.locations() }),
        queryClient.invalidateQueries({ queryKey: locationKeys.mine() }),
      ]);
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  User assignment mutations                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Needs LOCATION_USER_ASSIGN. Fails with a 409 if the location or the user is inactive,
 * the user already has a location, or the user's role needs no location.
 * If the user is the logged-in user, their session data is reloaded so their location is current.
 */
export function useAssignUserToLocation() {
  const queryClient = useQueryClient();
  const { user, refreshCurrentUser } = useAuth();

  return useMutation<LocationUser, ApiError, { locationId: UUID; userId: UUID }>({
    mutationFn: ({ locationId, userId }) => locationService.assignUser(locationId, userId),
    onSuccess: async (_assigned, { locationId, userId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: locationKeys.users(locationId) }),
        queryClient.invalidateQueries({ queryKey: locationKeys.mine() }),
      ]);
      if (user?.userId === userId) void refreshCurrentUser().catch(() => undefined);
    },
  });
}

/** Needs LOCATION_USER_REMOVE. A 404 means the user is not assigned to that location. */
export function useRemoveUserFromLocation() {
  const queryClient = useQueryClient();
  const { user, refreshCurrentUser } = useAuth();

  return useMutation<void, ApiError, { locationId: UUID; userId: UUID }>({
    mutationFn: ({ locationId, userId }) => locationService.removeUser(locationId, userId),
    onSuccess: async (_data, { locationId, userId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: locationKeys.users(locationId) }),
        queryClient.invalidateQueries({ queryKey: locationKeys.mine() }),
      ]);
      if (user?.userId === userId) void refreshCurrentUser().catch(() => undefined);
    },
  });
}