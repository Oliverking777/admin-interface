/**
 * Application-level authentication service.
 *
 *   useAuth() -> auth-service -> auth-client -> api-client -> Spring Boot
 *
 * auth-client only talks to the backend. This file decides what the frontend DOES
 * with the results: it owns the AuthState, keeps the stored session end time in sync,
 * logs the user out when the session ends, and so on.
 *
 * The state lives in this module (not in React), so any component can read it through
 * useAuth() without a provider. React subscribes through `subscribe` / `getAuthState`.
 *
 * The backend has no invitation, forgot-password, reset-password or refresh-token
 * endpoints yet, so there are no functions for them.
 */

import { configureApiClient } from "@/lib/api/api-client";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import type { ApiError } from "@/lib/api/api-error";
import * as authClient from "@/lib/auth/auth-client";
import {
  clearAuthStorage,
  getStoredSessionExpiresAt,
  storeSessionExpiresAt,
} from "@/lib/auth/auth-storage";
import {
  getSessionRemainingMs,
  isSessionExpired,
  toAuthenticatedUser,
} from "@/lib/auth/auth-utils";
import { getMyLocationId } from "@/services/business/location-service";
import { initialAuthState } from "@/types/iam/auth";
import type { AuthState } from "@/types/iam/auth";
import type {
  ChangeOwnPasswordRequest,
  CurrentUserResponse,
  LoginRequest,
} from "@/types/iam/auth-dto";
import type { AuthenticatedUser, UUID } from "@/types/iam/user";

export type LoginCredentials = Omit<LoginRequest, "clientType">;

/** Shown whenever a session ends on its own: it expired, or the user logged in somewhere else. */
const SESSION_EXPIRED_MESSAGE = "Your session has ended. Please log in again.";

/* -------------------------------------------------------------------------- */
/*  State (what React subscribes to)                                          */
/* -------------------------------------------------------------------------- */

/**
 * Starts as "loading" because we do not know yet whether a session exists.
 * It turns false once initializeAuth() has asked the server.
 * Guards should wait for that instead of redirecting to login too early.
 */
let state: AuthState = { ...initialAuthState, isLoading: true };

type Listener = () => void;
const listeners = new Set<Listener>();

function setState(patch: Partial<AuthState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function getAuthState(): AuthState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* -------------------------------------------------------------------------- */
/*  Session bookkeeping                                                       */
/* -------------------------------------------------------------------------- */

let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function clearExpiryTimer(): void {
  if (expiryTimer !== undefined) {
    clearTimeout(expiryTimer);
    expiryTimer = undefined;
  }
}

/** Sessions hard-expire at a fixed time: log the user out locally when that moment comes. */
function scheduleExpiry(expiresAt: string): void {
  clearExpiryTimer();
  expiryTimer = setTimeout(
    () => clearSession(SESSION_EXPIRED_MESSAGE),
    getSessionRemainingMs(expiresAt),
  );
}

/** Marks the user as logged in from a /auth/me response and their location. */
function applySession(current: CurrentUserResponse, locationId: UUID | null): AuthenticatedUser {
  const user = toAuthenticatedUser(current, locationId);
  storeSessionExpiresAt(current.sessionExpiresAt);
  scheduleExpiry(current.sessionExpiresAt);
  setState({
    user,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    sessionExpiresAt: current.sessionExpiresAt,
  });
  return user;
}

/** Marks the user as logged out locally. `error` is a message to show, or null for none. */
function clearSession(error: string | null = null): void {
  clearExpiryTimer();
  clearAuthStorage();
  setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error,
    sessionExpiresAt: null,
  });
}

/**
 * The id of the location the user works at, or null.
 * A failed lookup (or a user with no location) must not block logging in, so errors give null.
 */
async function fetchLocationId(): Promise<UUID | null> {
  try {
    return await getMyLocationId();
  } catch {
    return null;
  }
}

/** Loads who is logged in and where they work, and marks them as logged in. */
async function loadSession(): Promise<AuthenticatedUser> {
  const current = await authClient.getCurrentUser();
  const locationId = await fetchLocationId();
  return applySession(current, locationId);
}

/** Called by api-client when any request gets a 401 (not for login, logout or /me). */
function handleSessionExpired(_error: ApiError): void {
  if (state.isAuthenticated) {
    clearSession(SESSION_EXPIRED_MESSAGE);
  }
}

/* -------------------------------------------------------------------------- */
/*  Initialization                                                            */
/* -------------------------------------------------------------------------- */

let initialization: Promise<void> | null = null;

/**
 * Finds out whether the browser already has a valid session (e.g. after a page reload)
 * and registers the app-wide 401 handler. Safe to call many times: it only runs once.
 */
export function initializeAuth(): Promise<void> {
  if (!initialization) {
    initialization = runInitialization();
  }
  return initialization;
}

async function runInitialization(): Promise<void> {
  configureApiClient({ onUnauthorized: handleSessionExpired });

  // The stored end time says the session is over: no need to ask the server.
  const storedExpiresAt = getStoredSessionExpiresAt();
  if (storedExpiresAt && isSessionExpired(storedExpiresAt)) {
    clearSession(SESSION_EXPIRED_MESSAGE);
    return;
  }

  try {
    await loadSession();
  } catch (error) {
    if (isApiError(error) && error.isUnauthorized) {
      clearSession(); // simply not logged in
    } else {
      clearSession(getErrorMessage(error)); // e.g. the server could not be reached
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Actions                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Logs in, then loads the user's role and permissions (the login response has no permissions).
 * On failure the error message is put in the state AND the ApiError is rethrown,
 * so a form can also read `fieldErrors` from it.
 */
export async function login(credentials: LoginCredentials): Promise<AuthenticatedUser> {
  setState({ isLoading: true, error: null });
  let loggedIn = false;
  try {
    await authClient.login(credentials);
    loggedIn = true;
    return await loadSession();
  } catch (error) {
    if (loggedIn) {
      // Logged in on the server but could not load the user: do not leave a half-open session.
      await authClient.logout().catch(() => undefined);
    }
    clearSession(getErrorMessage(error));
    throw error;
  }
}

/**
 * Logs out. The user is always logged out locally, even if the server could not be reached.
 */
export async function logout(): Promise<void> {
  try {
    await authClient.logout();
  } catch {
    // Best effort: the local state is cleared below whatever happens.
  } finally {
    clearSession();
  }
}

/**
 * Reloads the logged-in user from the server, e.g. to pick up changed permissions.
 * If the session turns out to be over, the user is logged out locally and the error is rethrown.
 */
export async function refreshCurrentUser(): Promise<AuthenticatedUser> {
  try {
    return await loadSession();
  } catch (error) {
    if (isApiError(error) && error.isUnauthorized) {
      clearSession(SESSION_EXPIRED_MESSAGE);
    }
    throw error;
  }
}

/** Changes the logged-in user's own password. The session stays open. */
export async function changeOwnPassword(request: ChangeOwnPasswordRequest): Promise<void> {
  await authClient.changeOwnPassword(request);
}

export function clearError(): void {
  if (state.error !== null) {
    setState({ error: null });
  }
}