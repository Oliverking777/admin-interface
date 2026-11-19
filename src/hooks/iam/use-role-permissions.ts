"use client";

/**
 * The permissions a role grants.
 *
 * The role editor keeps the checklist selection in local component state and saves it
 * once with useReplaceRolePermissions (one PUT with the complete list).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { iamKeys } from "@/hooks/iam/iam-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import { useOwnRoleSync } from "@/hooks/iam/use-own-role-sync";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import {
  getRolePermissions,
  replaceRolePermissions,
} from "@/services/iam/role-permission-service";
import type { RolePermissionsResponse } from "@/types/iam/role-dto";
import type { UUID } from "@/types/iam/user";

/** Needs ROLE_PERMISSION_READ (separate from ROLE_READ). */
export function useRolePermissions(roleId: UUID | undefined, options: { enabled?: boolean } = {}) {
  const { hasPermission } = useAuth();

  return useQuery<RolePermissionsResponse, ApiError>({
    queryKey: iamKeys.rolePermissions(roleId ?? ""),
    queryFn: ({ signal }) => getRolePermissions(roleId as UUID, signal),
    enabled: (options.enabled ?? true) && !!roleId && hasPermission(PERMISSIONS.ROLE_PERMISSION_READ),
  });
}

/**
 * Saves the complete list of permissions (an empty list removes all).
 * The cache is updated from the server's answer. If the role is the logged-in user's own,
 * their session is reloaded so the new permissions apply at once.
 */
export function useReplaceRolePermissions() {
  const queryClient = useQueryClient();
  const syncOwnRole = useOwnRoleSync();

  return useMutation<
    RolePermissionsResponse,
    ApiError,
    { roleId: UUID; permissionIds: UUID[] }
  >({
    mutationFn: ({ roleId, permissionIds }) => replaceRolePermissions(roleId, permissionIds),
    onSuccess: async (result, { roleId }) => {
      queryClient.setQueryData(iamKeys.rolePermissions(roleId), result);
      // The role's updatedAt changed.
      await queryClient.invalidateQueries({ queryKey: iamKeys.roles() });
      syncOwnRole(roleId);
    },
  });
}