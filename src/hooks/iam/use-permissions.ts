"use client";

/**
 * Permission queries and mutations.
 *
 * Permission codes are also written in the backend and checked by @PreAuthorize,
 * so renaming or deleting one can break an endpoint: confirm with the user first.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { iamKeys } from "@/hooks/iam/iam-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import {
  createPermission,
  deletePermission,
  getPermission,
  listAllPermissions,
  listPermissions,
  updatePermission,
} from "@/services/iam/permission-service";
import type { PageParams } from "@/services/iam/role-service";
import type {
  CreatePermissionRequest,
  PermissionPageResponse,
  PermissionResponse,
  UpdatePermissionRequest,
} from "@/types/iam/permission-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/** One page of permissions, for a management table. */
export function usePermissions(params: PageParams = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;

  return useQuery<PermissionPageResponse, ApiError>({
    queryKey: iamKeys.permissionList({ page, size }),
    queryFn: ({ signal }) => listPermissions({ page, size }, signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.PERMISSION_READ),
    placeholderData: keepPreviousData,
  });
}

/**
 * Every permission (all pages), for the role checklist.
 * Needs PERMISSION_READ: a user with only ROLE_PERMISSION_UPDATE cannot load the list.
 */
export function useAllPermissions(options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<PermissionResponse[], ApiError>({
    queryKey: iamKeys.permissionAll(),
    queryFn: ({ signal }) => listAllPermissions(signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.PERMISSION_READ),
    staleTime: 5 * 60_000, // permissions change rarely
  });
}

export function usePermission(permissionId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<PermissionResponse, ApiError>({
    queryKey: iamKeys.permission(permissionId ?? ""),
    queryFn: ({ signal }) => getPermission(permissionId as UUID, signal),
    enabled: (options.enabled ?? true) && !!permissionId && hasPermission(PERMISSIONS.PERMISSION_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreatePermission() {
  const queryClient = useQueryClient();

  return useMutation<PermissionResponse, ApiError, CreatePermissionRequest>({
    mutationFn: createPermission,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: iamKeys.permissions() }),
  });
}

export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation<
    PermissionResponse,
    ApiError,
    { permissionId: UUID; request: UpdatePermissionRequest }
  >({
    mutationFn: ({ permissionId, request }) => updatePermission(permissionId, request),
    onSuccess: async () => {
      // Role-permission responses contain the code, so they are stale too.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: iamKeys.permissions() }),
        queryClient.invalidateQueries({ queryKey: iamKeys.rolePermissionsAll() }),
      ]);
    },
  });
}

/** Fails with a 409 while a role still has the permission. */
export function useDeletePermission() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, UUID>({
    mutationFn: deletePermission,
    onSuccess: async (_data, permissionId) => {
      queryClient.removeQueries({ queryKey: iamKeys.permission(permissionId) });
      await queryClient.invalidateQueries({ queryKey: iamKeys.permissions() });
    },
  });
}