"use client";

/**
 * The interface React components use for authentication.
 *
 *   const { user, isAuthenticated, isLoading, login, logout, hasPermission } = useAuth();
 *
 * Components never fetch, store tokens or manage loading/error state themselves.
 * Requires React 18 or newer (useSyncExternalStore).
 */

import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  changeOwnPassword,
  clearError,
  getAuthState,
  initializeAuth,
  login,
  logout,
  refreshCurrentUser,
  subscribe,
} from "@/services/iam/auth-service";
import type { LoginCredentials } from "@/services/iam/auth-service";
import {
  getLocationId,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
} from "@/lib/auth/auth-utils";
import type { AuthState } from "@/types/iam/auth";
import type { ChangeOwnPasswordRequest } from "@/types/iam/auth-dto";
import type { AuthenticatedUser } from "@/types/iam/user";

export interface UseAuthResult extends AuthState {
  /** Id of the location (warehouse or store) the logged-in user works at, or null. */
  locationId: string | null;
  /** Logs in and loads the user. Rejects with an ApiError on failure (the message is also in `error`). */
  login: (credentials: LoginCredentials) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  /** Reloads the user and permissions from the server. */
  refreshCurrentUser: () => Promise<AuthenticatedUser>;
  changeOwnPassword: (request: ChangeOwnPasswordRequest) => Promise<void>;
  clearError: () => void;

  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: readonly string[]) => boolean;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: readonly string[]) => boolean;
  hasAllPermissions: (permissionCodes: readonly string[]) => boolean;
}

export function useAuth(): UseAuthResult {
  const state = useSyncExternalStore(subscribe, getAuthState, getAuthState);

  // Checks once (app-wide) whether a session already exists, e.g. after a page reload.
  useEffect(() => {
    void initializeAuth();
  }, []);

  return useMemo<UseAuthResult>(
    () => ({
      ...state,
      locationId: getLocationId(state.user),
      login,
      logout,
      refreshCurrentUser,
      changeOwnPassword,
      clearError,
      hasRole: (roleName) => hasRole(state.user, roleName),
      hasAnyRole: (roleNames) => hasAnyRole(state.user, roleNames),
      hasPermission: (permissionCode) => hasPermission(state.user, permissionCode),
      hasAnyPermission: (permissionCodes) => hasAnyPermission(state.user, permissionCodes),
      hasAllPermissions: (permissionCodes) => hasAllPermissions(state.user, permissionCodes),
    }),
    [state],
  );
}