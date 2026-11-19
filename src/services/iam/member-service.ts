/**
 * Member operations from the frontend's point of view.
 * A member is a backend user, so this talks to /users through the shared apiClient.
 */
import { apiClient } from "@/lib/api/api-client";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import type { ApiResponse } from "@/types/iam/common-dto";
import type { Member } from "@/types/iam/member";
import type {
  CreateUserRequest,
  MemberPageResponse,
  MemberUserResponse,
  UpdateUserRequest,
} from "@/types/iam/member-dto";

const USERS_PATH = "/users";

function toMember(dto: MemberUserResponse): Member {
  return {
    id: dto.userId,
    firstName: dto.firstName,
    lastName: dto.lastName,
    name: dto.fullName,
    userName: dto.userName,
    roleId: dto.roleId,
    status: dto.active ? "ACTIVE" : "SUSPENDED",
    lastActiveAt: dto.lastActiveAt,
  };
}

export const memberService = {
  /** One page of users. Page numbers start at 0, size is 1 to 100. Needs USER_READ. */
  async listPage(page: number, size: number, signal?: AbortSignal): Promise<MemberPageResponse> {
    const response = await apiClient.get<ApiResponse<MemberPageResponse>>(USERS_PATH, {
      query: { page, size },
      signal,
    });
    return response.data;
  },

  /** Every user (all pages). Needs USER_READ. */
  async listAll(signal?: AbortSignal): Promise<Member[]> {
    const users = await fetchAllPages((page, size) => memberService.listPage(page, size, signal));
    return users.map(toMember);
  },

  /** Creates an active user. The backend generates the login name. Needs USER_CREATE. */
  async create(request: CreateUserRequest): Promise<Member> {
    const response = await apiClient.post<ApiResponse<MemberUserResponse>>(USERS_PATH, request);
    return toMember(response.data);
  },

  /** Needs USER_UPDATE and USER_ASSIGN_ROLE. */
  async changeRole(id: string, roleId: string): Promise<Member> {
    const body: UpdateUserRequest = { roleId };
    const response = await apiClient.patch<ApiResponse<MemberUserResponse>>(`${USERS_PATH}/${id}`, body);
    return toMember(response.data);
  },

  /** Lets the user log in again. Needs USER_ACTIVATE. */
  async activate(id: string): Promise<Member> {
    const response = await apiClient.post<ApiResponse<MemberUserResponse>>(`${USERS_PATH}/${id}/activate`);
    return toMember(response.data);
  },

  /** Blocks login and ends the user's session. Needs USER_DEACTIVATE and the OWNER role. */
  async deactivate(id: string): Promise<Member> {
    const response = await apiClient.post<ApiResponse<MemberUserResponse>>(`${USERS_PATH}/${id}/deactivate`);
    return toMember(response.data);
  },
};