/**
 * Request/response structures for the authentication endpoints.
 * They match the Spring Boot DTO records exactly.
 */

import type { ClientType } from "@/types/iam/auth";
import type { ISODateTime, UUID } from "@/types/iam/user";

/* -------------------------------------------------------------------------- */
/*  Requests                                                                  */
/* -------------------------------------------------------------------------- */

export interface LoginRequest {
  /** Not case-sensitive. Max 100 characters. */
  userName: string;
  /** Max 200 characters. */
  password: string;
  /** WEB: token goes in an HttpOnly cookie. MOBILE: token is returned in the body. */
  clientType: ClientType;
}

export interface ChangeOwnPasswordRequest {
  /** Max 200 characters. */
  currentPassword: string;
  /** At least 8 characters, at most 72 bytes, with a letter and a digit. Max 200 characters. */
  newPassword: string;
}

/* -------------------------------------------------------------------------- */
/*  Responses                                                                 */
/* -------------------------------------------------------------------------- */

/** A user. Never contains password data. */
export interface UserResponse {
  userId: UUID;
  firstName: string;
  lastName: string;
  fullName: string;
  userName: string;
  roleId: UUID;
  active: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface LoginResponse {
  /**
   * Only present for MOBILE clients (send as `Authorization: Bearer <token>`).
   * Absent for WEB clients: the token travels only in the HttpOnly cookie.
   */
  sessionToken?: string;
  /** When the session ends (UTC). Fixed at login, never extended. */
  expiresAt: ISODateTime;
  clientType: ClientType;
  user: UserResponse;
}

/** Who is logged in, what they may do, and when the session ends. */
export interface CurrentUserResponse {
  userId: UUID;
  userName: string;
  fullName: string;
  roleId: UUID;
  roleName: string;
  /** Permission codes granted by the role, sorted. */
  permissions: string[];
  sessionExpiresAt: ISODateTime;
}