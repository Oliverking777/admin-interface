/**
 * Request/response shapes of the /users endpoints.
 * They match UserResponse, CreateUserRequest and UpdateUserRequest on the backend.
 */
import type { UserResponse } from "@/types/iam/auth-dto";
import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/** The user returned by /users endpoints: UserResponse plus `lastActiveAt`. */
export interface MemberUserResponse extends UserResponse {
  /** When the user last made a request or logged in. Can be a few minutes behind. Null if never. */
  lastActiveAt: ISODateTime | null;
}

export type MemberPageResponse = PageResponse<MemberUserResponse>;

export interface CreateUserRequest {
  /** Max 100 characters. */
  firstName: string;
  /** Max 100 characters. */
  lastName: string;
  roleId: UUID;
  /** At least 8 characters, at most 72 bytes, with a letter and a digit. Max 200 characters. */
  password: string;
}

/** Fields left out are not changed, but at least one must be sent. */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  /** Needs both USER_UPDATE and USER_ASSIGN_ROLE. */
  roleId?: UUID;
}