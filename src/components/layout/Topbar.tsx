"use client";

import { usePathname } from "next/navigation";
import { getPageTitle } from "@/components/layout/Sidebar";
import UserMenu, { type UserMenuUser } from "@/components/layout/UserMenu";

type TopbarProps = {
  user?: UserMenuUser;
  onLogout?: () => void | Promise<void>;
};

export default function Topbar({ user, onLogout }: TopbarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3 md:px-6">
      <h1 className="truncate text-xl font-semibold text-foreground">{title}</h1>

      <UserMenu user={user} onLogout={onLogout} />
    </header>
  );
}