"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/iam/use-auth";

type AuthGuardProps = {
  children: ReactNode;
  /** The user must have ALL of these permission codes. */
  requiredPermissions?: readonly string[];
  /** The user's role must be ONE of these. */
  requiredRoles?: readonly string[];
  /** Shown while the app checks whether a session exists. */
  loadingFallback?: ReactNode;
  /** Shown to a logged-in user who lacks the required permission or role. */
  forbiddenFallback?: ReactNode;
  loginPath?: string;
};

const NONE: readonly string[] = [];

/**
 * Protects a page or layout.
 *  - Not logged in: sends the user to the login page (which sends them back afterwards).
 *  - Logged in without the required permission/role: shows a "no permission" message.
 *
 * This only hides screens. The backend enforces the same rules on every request.
 */
export default function AuthGuard({
  children,
  requiredPermissions = NONE,
  requiredRoles = NONE,
  loadingFallback = null,
  forbiddenFallback,
  loginPath = "/login",
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, hasAllPermissions, hasAnyRole } = useAuth();

  const mustLogin = !isLoading && !isAuthenticated;

  useEffect(() => {
    if (mustLogin) {
      router.replace(`${loginPath}?next=${encodeURIComponent(pathname)}`);
    }
  }, [mustLogin, router, loginPath, pathname]);

  if (isLoading || mustLogin) {
    return <>{loadingFallback}</>;
  }

  const allowed =
    hasAllPermissions(requiredPermissions) &&
    (requiredRoles.length === 0 || hasAnyRole(requiredRoles));

  if (!allowed) {
    return (
      <>
        {forbiddenFallback ?? (
          <div role="alert" className="flex min-h-[50vh] items-center justify-center p-4">
            <div className="max-w-sm border border-border bg-background p-8 text-center shadow-md">
              <h1 className="text-xl font-semibold text-foreground">Access denied</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                You do not have permission to view this page.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}