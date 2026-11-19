/**
 * Small, pure authentication helpers. No API calls and no storage access here.
 *
 * Role names and permission codes are stored in upper case by the backend,
 * so comparisons ignore case.
 */

import type { CurrentUserResponse } from "@/types/iam/auth-dto";
import type { AuthenticatedUser, ISODateTime, UUID } from "@/types/iam/user";

type MaybeUser = AuthenticatedUser | null | undefined;

/* -------------------------------------------------------------------------- */
/*  Mapping                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Turns the "current user" API response into the frontend's AuthenticatedUser.
 * The location comes from the Location module, so it is passed in separately.
 */
export function toAuthenticatedUser(
  response: CurrentUserResponse,
  locationId: UUID | null = null,
): AuthenticatedUser {
  return {
    userId: response.userId,
    userName: response.userName,
    fullName: response.fullName,
    roleId: response.roleId,
    roleName: response.roleName,
    permissions: response.permissions,
    locationId,
  };
}

/* -------------------------------------------------------------------------- */
/*  Location                                                                  */
/* -------------------------------------------------------------------------- */

/** Id of the location the user is assigned to, or null (no user, or no location). */
export function getLocationId(user: MaybeUser): UUID | null {
  return user?.locationId ?? null;
}

export function hasLocation(user: MaybeUser): boolean {
  return getLocationId(user) !== null;
}

/* -------------------------------------------------------------------------- */
/*  Access checks                                                             */
/* -------------------------------------------------------------------------- */

export function isAuthenticated(user: MaybeUser): user is AuthenticatedUser {
  return user !== null && user !== undefined;
}

export function hasRole(user: MaybeUser, roleName: string): boolean {
  return isAuthenticated(user) && user.roleName.toUpperCase() === roleName.trim().toUpperCase();
}

export function hasAnyRole(user: MaybeUser, roleNames: readonly string[]): boolean {
  return roleNames.some((roleName) => hasRole(user, roleName));
}

export function hasPermission(user: MaybeUser, permissionCode: string): boolean {
  if (!isAuthenticated(user)) return false;
  const wanted = permissionCode.trim().toUpperCase();
  return user.permissions.some((code) => code.toUpperCase() === wanted);
}

/** True if the user has at least one of the permissions. */
export function hasAnyPermission(user: MaybeUser, permissionCodes: readonly string[]): boolean {
  return permissionCodes.some((code) => hasPermission(user, code));
}

/** True if the user has every one of the permissions. */
export function hasAllPermissions(user: MaybeUser, permissionCodes: readonly string[]): boolean {
  return permissionCodes.every((code) => hasPermission(user, code));
}

/* -------------------------------------------------------------------------- */
/*  Session expiry                                                            */
/* -------------------------------------------------------------------------- */

/**
 * True when the session has ended (or the date is missing or unreadable).
 * Sessions hard-expire at a fixed time and are never extended.
 * `now` is a timestamp in milliseconds and is a parameter so the function is easy to test.
 */
export function isSessionExpired(expiresAt: ISODateTime | null | undefined, now: number = Date.now()): boolean {
  if (!expiresAt) return true;
  const end = Date.parse(expiresAt);
  return Number.isNaN(end) || now >= end;
}

/** Milliseconds left before the session ends (0 if it already has). */
export function getSessionRemainingMs(
  expiresAt: ISODateTime | null | undefined,
  now: number = Date.now(),
): number {
  if (!expiresAt) return 0;
  const end = Date.parse(expiresAt);
  return Number.isNaN(end) ? 0 : Math.max(0, end - now);
}