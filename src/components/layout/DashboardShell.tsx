import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import type { UserMenuUser } from "@/components/layout/UserMenu";

type DashboardShellProps = {
  children: ReactNode;
  user?: UserMenuUser;
  onLogout?: () => void | Promise<void>;
};

export default function DashboardShell({
  children,
  user,
  onLogout,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onLogout={onLogout} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}