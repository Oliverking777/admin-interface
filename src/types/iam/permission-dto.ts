/**
 * Request/response structures for the permission endpoints.
 */

import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/* -------------------------------------------------------------------------- */
/*  Requests                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 3 to 100 characters; letters, digits and single underscores,
 * starting with a letter (regex: ^[A-Za-z][A-Za-z0-9]*(_[A-Za-z0-9]+)*$).
 * Stored in upper case.
 */
export interface CreatePermissionRequest {
  permissionCode: string;
}

/** Same rules as CreatePermissionRequest. */
export interface UpdatePermissionRequest {
  permissionCode: string;
}

/* -------------------------------------------------------------------------- */
/*  Responses                                                                 */
/* -------------------------------------------------------------------------- */

export interface PermissionResponse {
  permissionId: UUID;
  permissionCode: string;
  createdAt: ISODateTime;
}

export type PermissionPageResponse = PageResponse<PermissionResponse>;