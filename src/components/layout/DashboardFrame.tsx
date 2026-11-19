"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import AuthGuard from "@/components/auth/AuthGuard";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/hooks/iam/use-auth";

/** Login check + sidebar/topbar for every page inside the (dashboard) route group. */
export default function DashboardFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout(); // never throws: the user is always logged out locally
    router.replace("/login");
  }

  return (
    <AuthGuard
      loadingFallback={
        <div role="status" className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <DashboardShell
        // UserMenu's second line is called "location"; until the user's location name is loaded, it shows the role.
        user={user ? { name: user.fullName, location: user.roleName } : undefined}
        onLogout={handleLogout}
      >
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}