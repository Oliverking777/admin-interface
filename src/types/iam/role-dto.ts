/**
 * Request/response structures for the role endpoints.
 * They match the Spring Boot DTO records exactly.
 */

import type { PageResponse } from "@/types/iam/common-dto";
import type { PermissionResponse } from "@/types/iam/permission-dto";
import type { ISODateTime, LocationScope, UUID } from "@/types/iam/user";

/* -------------------------------------------------------------------------- */
/*  Requests                                                                  */
/* -------------------------------------------------------------------------- */

export interface CreateRoleRequest {
  /** 3 to 50 characters: letters, digits and underscores only. Stored in upper case. */
  roleName: string;
  /** Max 255 characters. Optional. */
  description?: string | null;
  /** Defaults to ASSIGNED on the backend when left out. */
  locationScope?: LocationScope;
}

/**
 * Partial update: fields left out are not changed, but at least one must be sent.
 * Send an empty string as `description` to clear it.
 * System roles reject a new name or scope with a 409.
 */
export interface UpdateRoleRequest {
  /** 3 to 50 characters: letters, digits and underscores only. */
  roleName?: string;
  /** Max 255 characters. */
  description?: string;
  locationScope?: LocationScope;
}

/** Add several permissions to a role, or remove several from it. */
export interface BulkRolePermissionsRequest {
  /** 1 to 500 ids. */
  permissionIds: UUID[];
}

/** Sets the complete list of permissions of a role. */
export interface ReplaceRolePermissionsRequest {
  /** At most 500 ids. Send an empty array to remove all permissions. */
  permissionIds: UUID[];
}

/* -------------------------------------------------------------------------- */
/*  Responses                                                                 */
/* -------------------------------------------------------------------------- */

export interface RoleResponse {
  roleId: UUID;
  roleName: string;
  description: string | null;
  locationScope: LocationScope;
  /** True for built-in roles (cannot be renamed, deleted or given another scope). */
  system: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type RolePageResponse = PageResponse<RoleResponse>;

export interface RolePermissionsResponse {
  roleId: UUID;
  roleName: string;
  /** Ordered by permission code. */
  permissions: PermissionResponse[];
}