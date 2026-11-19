/**
 * Role endpoints (/roles).
 *
 *   hook -> role-service -> apiClient -> Spring Boot
 *
 * Every function returns the unwrapped payload or throws an ApiError.
 * No React and no state in here.
 *
 * Errors worth handling in the UI:
 *   400 + fieldErrors  invalid name or description (VALIDATION)
 *   409                duplicate name, system role protected, or role still assigned to users (CONFLICT)
 *   404                role not found
 *   403                missing permission
 */

import { apiClient } from "@/lib/api/api-client";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import type { ApiResponse } from "@/types/iam/common-dto";
import type {
  CreateRoleRequest,
  RolePageResponse,
  RoleResponse,
  UpdateRoleRequest,
} from "@/types/iam/role-dto";
import type { UUID } from "@/types/iam/user";

const ROLES_PATH = "/roles";

export interface PageParams {
  /** Zero-based. Default 0. */
  page?: number;
  /** 1 to 100. Default 20. */
  size?: number;
}

/** One page of roles, ordered by name. Needs ROLE_READ. */
export async function listRoles(
  { page = 0, size = 20 }: PageParams = {},
  signal?: AbortSignal,
): Promise<RolePageResponse> {
  const response = await apiClient.get<ApiResponse<RolePageResponse>>(ROLES_PATH, {
    query: { page, size },
    signal,
  });
  return response.data;
}

/** Every role (all pages), e.g. for a role dropdown. Needs ROLE_READ. */
export function listAllRoles(signal?: AbortSignal): Promise<RoleResponse[]> {
  return fetchAllPages((page, size) => listRoles({ page, size }, signal));
}

/** Needs ROLE_READ. Does not include the role's permissions (see role-permission-service). */
export async function getRole(roleId: UUID, signal?: AbortSignal): Promise<RoleResponse> {
  const response = await apiClient.get<ApiResponse<RoleResponse>>(
    `${ROLES_PATH}/${encodeURIComponent(roleId)}`,
    { signal },
  );
  return response.data;
}

/** Case-insensitive lookup. Needs ROLE_READ. */
export async function getRoleByName(roleName: string, signal?: AbortSignal): Promise<RoleResponse> {
  const response = await apiClient.get<ApiResponse<RoleResponse>>(
    `${ROLES_PATH}/by-name/${encodeURIComponent(roleName)}`,
    { signal },
  );
  return response.data;
}

/** Needs ROLE_CREATE. */
export async function createRole(request: CreateRoleRequest): Promise<RoleResponse> {
  const response = await apiClient.post<ApiResponse<RoleResponse>>(ROLES_PATH, request);
  return response.data;
}

/** Partial update. Needs ROLE_UPDATE. */
export async function updateRole(roleId: UUID, request: UpdateRoleRequest): Promise<RoleResponse> {
  const response = await apiClient.patch<ApiResponse<RoleResponse>>(
    `${ROLES_PATH}/${encodeURIComponent(roleId)}`,
    request,
  );
  return response.data;
}

/** Needs ROLE_DELETE. Fails with 409 for system roles and roles that still have users. */
export async function deleteRole(roleId: UUID): Promise<void> {
  await apiClient.delete<void>(`${ROLES_PATH}/${encodeURIComponent(roleId)}`);
}