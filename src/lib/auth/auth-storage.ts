/**
 * Browser storage for authentication.
 *
 * Sessions use an HttpOnly cookie that the browser manages and JavaScript cannot read,
 * so there is no token to store here. The only thing kept is when the session ends,
 * which is not a secret. It lets the app notice an expired session without a network call.
 *
 * Never store the user, their permissions, or any token here.
 * The server (GET /auth/me) is the source of truth for those.
 */

const SESSION_EXPIRES_AT_KEY = "yah.auth.sessionExpiresAt";

/** Storage can be missing (server-side rendering) or blocked (private mode), so every access is guarded. */
function getStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** ISO-8601 end time of the current session, or null if none is stored. */
export function getStoredSessionExpiresAt(): string | null {
  try {
    return getStorage()?.getItem(SESSION_EXPIRES_AT_KEY) ?? null;
  } catch {
    return null;
  }
}

export function storeSessionExpiresAt(expiresAt: string): void {
  try {
    getStorage()?.setItem(SESSION_EXPIRES_AT_KEY, expiresAt);
  } catch {
    // Storage full or blocked: the app still works, it just checks with the server instead.
  }
}

/** Call on logout and whenever the server says the session is over. */
export function clearAuthStorage(): void {
  try {
    getStorage()?.removeItem(SESSION_EXPIRES_AT_KEY);
  } catch {
    // Nothing to do.
  }
}