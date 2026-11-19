/**
 * Frontend authentication state.
 *
 * This is frontend state, not API communication:
 * request/response shapes live in auth-dto.ts.
 */

import type { AuthenticatedUser, ISODateTime } from "@/types/iam/user";

/**
 * The kind of client a session was opened from.
 * WEB: the session token lives in an HttpOnly cookie (invisible to JavaScript).
 * MOBILE: the token is returned in the login response and sent in a header.
 */
export const ClientType = {
  WEB: "WEB",
  MOBILE: "MOBILE",
} as const;

export type ClientType = (typeof ClientType)[keyof typeof ClientType];

export interface AuthState {
  /** The logged-in user, or null when nobody is logged in. */
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  /** True while a login, logout or session check is in flight. */
  isLoading: boolean;
  /** Last authentication error message, or null. */
  error: string | null;
  /**
   * When the session hard-expires (fixed 12 hours after login, never extended),
   * or null when logged out.
   */
  sessionExpiresAt: ISODateTime | null;
}

export const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionExpiresAt: null,
};