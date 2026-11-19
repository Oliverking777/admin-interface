/**
 * Permission endpoints (/permissions).
 *
 * Permission codes are also written in the backend (PermissionCatalog) and checked by
 * @PreAuthorize, so renaming or deleting one here can break an endpoint. The UI should warn.
 *
 * Errors worth handling in the UI:
 *   400 + fieldErrors  invalid code (VALIDATION)
 *   409                duplicate code, or permission still assigned to a role (CONFLICT)
 *   404                permission not found
 */

import { apiClient } from "@/lib/api/api-client";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import type { ApiResponse } from "@/types/iam/common-dto";
import type {
  CreatePermissionRequest,
  PermissionPageResponse,
  PermissionResponse,
  UpdatePermissionRequest,
} from "@/types/iam/permission-dto";
import type { UUID } from "@/types/iam/user";
import type { PageParams } from "@/services/iam/role-service";

const PERMISSIONS_PATH = "/permissions";

/** One page of permissions, ordered by code. Needs PERMISSION_READ. */
export async function listPermissions(
  { page = 0, size = 20 }: PageParams = {},
  signal?: AbortSignal,
): Promise<PermissionPageResponse> {
  const response = await apiClient.get<ApiResponse<PermissionPageResponse>>(PERMISSIONS_PATH, {
    query: { page, size },
    signal,
  });
  return response.data;
}

/** Every permission (all pages). Needs PERMISSION_READ. */
export function listAllPermissions(signal?: AbortSignal): Promise<PermissionResponse[]> {
  return fetchAllPages((page, size) => listPermissions({ page, size }, signal));
}

/** Needs PERMISSION_READ. */
export async function getPermission(
  permissionId: UUID,
  signal?: AbortSignal,
): Promise<PermissionResponse> {
  const response = await apiClient.get<ApiResponse<PermissionResponse>>(
    `${PERMISSIONS_PATH}/${encodeURIComponent(permissionId)}`,
    { signal },
  );
  return response.data;
}

/** Case-insensitive lookup. Needs PERMISSION_READ. */
export async function getPermissionByCode(
  permissionCode: string,
  signal?: AbortSignal,
): Promise<PermissionResponse> {
  const response = await apiClient.get<ApiResponse<PermissionResponse>>(
    `${PERMISSIONS_PATH}/by-code/${encodeURIComponent(permissionCode)}`,
    { signal },
  );
  return response.data;
}

/** Needs PERMISSION_CREATE. */
export async function createPermission(
  request: CreatePermissionRequest,
): Promise<PermissionResponse> {
  const response = await apiClient.post<ApiResponse<PermissionResponse>>(PERMISSIONS_PATH, request);
  return response.data;
}

/** Replaces the code. Needs PERMISSION_UPDATE. */
export async function updatePermission(
  permissionId: UUID,
  request: UpdatePermissionRequest,
): Promise<PermissionResponse> {
  const response = await apiClient.put<ApiResponse<PermissionResponse>>(
    `${PERMISSIONS_PATH}/${encodeURIComponent(permissionId)}`,
    request,
  );
  return response.data;
}

/** Needs PERMISSION_DELETE. Fails with 409 while a role still has the permission. */
export async function deletePermission(permissionId: UUID): Promise<void> {
  await apiClient.delete<void>(`${PERMISSIONS_PATH}/${encodeURIComponent(permissionId)}`);
}