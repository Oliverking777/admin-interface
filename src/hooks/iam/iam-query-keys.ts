/**
 * Query keys for the IAM module, in one place so invalidation is never a typo.
 * Keys are hierarchical: invalidating iamKeys.roles() refreshes every role query.
 */

import type { UUID } from "@/types/iam/user";

export const iamKeys = {
  all: ["iam"] as const,

  roles: () => [...iamKeys.all, "roles"] as const,
  roleList: (params: { page: number; size: number }) => [...iamKeys.roles(), "list", params] as const,
  roleAll: () => [...iamKeys.roles(), "all"] as const,
  role: (roleId: UUID) => [...iamKeys.roles(), "detail", roleId] as const,

  permissions: () => [...iamKeys.all, "permissions"] as const,
  permissionList: (params: { page: number; size: number }) =>
    [...iamKeys.permissions(), "list", params] as const,
  permissionAll: () => [...iamKeys.permissions(), "all"] as const,
  permission: (permissionId: UUID) => [...iamKeys.permissions(), "detail", permissionId] as const,

  rolePermissionsAll: () => [...iamKeys.all, "role-permissions"] as const,
  rolePermissions: (roleId: UUID) => [...iamKeys.rolePermissionsAll(), roleId] as const,
};