/**
 * Which permissions a role grants (/roles/{roleId}/permissions).
 *
 * The role editor uses replaceRolePermissions: the checklist is edited locally and
 * saved as one complete list. The add/remove functions exist for single quick changes.
 *
 * If the edited role is the logged-in user's own role, call refreshCurrentUser()
 * (from useAuth) afterwards so their permissions update at once.
 *
 * Errors worth handling in the UI:
 *   404  role not found, or one of the permission ids does not exist
 *   400  invalid ids or too many (max 500)
 */

import { apiClient } from "@/lib/api/api-client";
import type { ApiResponse } from "@/types/iam/common-dto";
import type {
  BulkRolePermissionsRequest,
  ReplaceRolePermissionsRequest,
  RolePermissionsResponse,
} from "@/types/iam/role-dto";
import type { UUID } from "@/types/iam/user";

function pathFor(roleId: UUID): string {
  return `/roles/${encodeURIComponent(roleId)}/permissions`;
}

/** Permissions of a role, ordered by code. Needs ROLE_PERMISSION_READ. */
export async function getRolePermissions(
  roleId: UUID,
  signal?: AbortSignal,
): Promise<RolePermissionsResponse> {
  const response = await apiClient.get<ApiResponse<RolePermissionsResponse>>(pathFor(roleId), {
    signal,
  });
  return response.data;
}

/** Sets the complete list (an empty list removes all). Needs ROLE_PERMISSION_UPDATE. */
export async function replaceRolePermissions(
  roleId: UUID,
  permissionIds: UUID[],
): Promise<RolePermissionsResponse> {
  const body: ReplaceRolePermissionsRequest = { permissionIds };
  const response = await apiClient.put<ApiResponse<RolePermissionsResponse>>(pathFor(roleId), body);
  return response.data;
}

/** Adds permissions and keeps the existing ones. All or nothing. Needs ROLE_PERMISSION_UPDATE. */
export async function addRolePermissions(
  roleId: UUID,
  permissionIds: UUID[],
): Promise<RolePermissionsResponse> {
  const body: BulkRolePermissionsRequest = { permissionIds };
  const response = await apiClient.post<ApiResponse<RolePermissionsResponse>>(pathFor(roleId), body);
  return response.data;
}

/** Removes permissions and keeps the rest. Needs ROLE_PERMISSION_UPDATE. */
export async function removeRolePermissions(
  roleId: UUID,
  permissionIds: UUID[],
): Promise<RolePermissionsResponse> {
  const body: BulkRolePermissionsRequest = { permissionIds };
  const response = await apiClient.post<ApiResponse<RolePermissionsResponse>>(
    `${pathFor(roleId)}/remove`,
    body,
  );
  return response.data;
}

/** Removes one permission. Still succeeds if the role did not have it. Needs ROLE_PERMISSION_UPDATE. */
export async function removeRolePermission(roleId: UUID, permissionId: UUID): Promise<void> {
  await apiClient.delete<void>(`${pathFor(roleId)}/${encodeURIComponent(permissionId)}`);
}