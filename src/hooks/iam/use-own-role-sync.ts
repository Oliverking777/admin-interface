"use client";

/**
 * When the logged-in user edits THEIR OWN role (its name or its permissions),
 * their session data is stale. This returns a function that reloads it from the server.
 *
 *   const syncOwnRole = useOwnRoleSync();
 *   onSuccess: (_data, { roleId }) => syncOwnRole(roleId);
 *
 * Does nothing for any other role. Never throws: a failed refresh must not turn
 * a successful save into an error.
 */

import { useAuth } from "@/hooks/iam/use-auth";
import type { UUID } from "@/types/iam/user";

export function useOwnRoleSync(): (roleId: UUID) => void {
  const { user, refreshCurrentUser } = useAuth();

  return (roleId) => {
    if (user?.roleId === roleId) {
      void refreshCurrentUser().catch(() => undefined);
    }
  };
}