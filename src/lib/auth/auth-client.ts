/**
 * Talks to the authentication endpoints (/auth/...).
 * Every call goes through apiClient; there is no fetch() here.
 *
 * Every function either returns the unwrapped payload or throws an ApiError.
 *
 * The backend has no refresh-token, invitation or password-reset endpoints yet,
 * so there are no functions for them.
 */

import { apiClient } from "@/lib/api/api-client";
import { ClientType } from "@/types/iam/auth";
import type {
  ChangeOwnPasswordRequest,
  CurrentUserResponse,
  LoginRequest,
  LoginResponse,
} from "@/types/iam/auth-dto";
import type { ApiResponse } from "@/types/iam/common-dto";

const AUTH_PATH = "/auth";

/**
 * Logs in as a WEB client: the backend sets the HttpOnly session cookie,
 * and the response body carries no token.
 *
 * Wrong credentials give a 401 ApiError. It does not trigger the app-wide
 * "session expired" handler.
 * Call getCurrentUser() afterwards to get the user's permissions.
 */
export async function login(credentials: Omit<LoginRequest, "clientType">): Promise<LoginResponse> {
  const body: LoginRequest = { ...credentials, clientType: ClientType.WEB };
  const response = await apiClient.post<ApiResponse<LoginResponse>>(`${AUTH_PATH}/login`, body, {
    skipUnauthorizedHandler: true,
  });
  return response.data;
}

/**
 * Ends the session and clears the cookie. The backend always answers 204,
 * even if the session was already over, so it is safe to call twice.
 */
export async function logout(): Promise<void> {
  await apiClient.post<void>(`${AUTH_PATH}/logout`, undefined, {
    skipUnauthorizedHandler: true,
  });
}

/**
 * Returns the logged-in user, their permission codes and when the session ends.
 * Use it at app start to find out whether a session exists: a 401 ApiError then simply
 * means "not logged in", so it does not trigger the app-wide "session expired" handler.
 */
export async function getCurrentUser(signal?: AbortSignal): Promise<CurrentUserResponse> {
  const response = await apiClient.get<ApiResponse<CurrentUserResponse>>(`${AUTH_PATH}/me`, {
    signal,
    skipUnauthorizedHandler: true,
  });
  return response.data;
}

/**
 * Changes the logged-in user's own password. The session stays open.
 * A wrong current password, or a new password that breaks the rules, gives a 400 ApiError.
 */
export async function changeOwnPassword(request: ChangeOwnPasswordRequest): Promise<void> {
  await apiClient.put<void>(`${AUTH_PATH}/me/password`, request);
}