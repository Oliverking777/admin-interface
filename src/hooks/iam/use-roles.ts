"use client";

/**
 * Role queries and mutations.
 *
 *   component -> hook -> role-service -> apiClient
 *
 * Queries switch themselves off when the user lacks ROLE_READ, so no pointless 403 is sent.
 * (The backend still enforces everything; this only saves requests.)
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { iamKeys } from "@/hooks/iam/iam-query-keys";
import { useOwnRoleSync } from "@/hooks/iam/use-own-role-sync";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import {
  createRole,
  deleteRole,
  getRole,
  listAllRoles,
  listRoles,
  updateRole,
  type PageParams,
} from "@/services/iam/role-service";
import type {
  CreateRoleRequest,
  RolePageResponse,
  RoleResponse,
  UpdateRoleRequest,
} from "@/types/iam/role-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/** One page of roles. The previous page stays visible while the next one loads. */
export function useRoles(params: PageParams = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;

  return useQuery<RolePageResponse, ApiError>({
    queryKey: iamKeys.roleList({ page, size }),
    queryFn: ({ signal }) => listRoles({ page, size }, signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.ROLE_READ),
    placeholderData: keepPreviousData,
  });
}

/** Every role, for dropdowns (e.g. choosing a user's role). */
export function useAllRoles(options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<RoleResponse[], ApiError>({
    queryKey: iamKeys.roleAll(),
    queryFn: ({ signal }) => listAllRoles(signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.ROLE_READ),
  });
}

/** One role. Does not include its permissions: see useRolePermissions. */
export function useRole(roleId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<RoleResponse, ApiError>({
    queryKey: iamKeys.role(roleId ?? ""),
    queryFn: ({ signal }) => getRole(roleId as UUID, signal),
    enabled: (options.enabled ?? true) && !!roleId && hasPermission(PERMISSIONS.ROLE_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation<RoleResponse, ApiError, CreateRoleRequest>({
    mutationFn: createRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: iamKeys.roles() }),
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const syncOwnRole = useOwnRoleSync();

  return useMutation<RoleResponse, ApiError, { roleId: UUID; request: UpdateRoleRequest }>({
    mutationFn: ({ roleId, request }) => updateRole(roleId, request),
    onSuccess: async (_role, { roleId }) => {
      // The role name is also inside the role-permissions response.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: iamKeys.roles() }),
        queryClient.invalidateQueries({ queryKey: iamKeys.rolePermissions(roleId) }),
      ]);
      syncOwnRole(roleId);
    },
  });
}

/** Fails with a 409 for system roles and for roles that still have users. */
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, UUID>({
    mutationFn: deleteRole,
    onSuccess: async (_data, roleId) => {
      queryClient.removeQueries({ queryKey: iamKeys.role(roleId) });
      queryClient.removeQueries({ queryKey: iamKeys.rolePermissions(roleId) });
      await queryClient.invalidateQueries({ queryKey: iamKeys.roles() });
    },
  });
}