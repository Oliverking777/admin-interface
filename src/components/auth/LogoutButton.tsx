"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/iam/use-auth";

type LogoutButtonProps = {
  className?: string;
  children?: ReactNode;
  loginPath?: string;
};

export default function LogoutButton({
  className = "text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60",
  children = "Sign out",
  loginPath = "/login",
}: LogoutButtonProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    try {
      await logout(); // never throws: the user is always logged out locally
    } finally {
      setIsPending(false);
      router.replace(loginPath);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={className}
    >
      {isPending ? "Signing out..." : children}
    </button>
  );
}