"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/iam/use-auth";

const DEFAULT_REDIRECT = "/dashboard"; // TODO: adjust to your post-login route

/** Only paths inside this app are allowed, never a link to another site. */
function safeRedirect(next: string | null): string {
  const isLocalPath =
    next !== null &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/\\");
  return isLocalPath ? next : DEFAULT_REDIRECT;
}

function LoginContent() {
  const router = useRouter();
  const redirectTo = safeRedirect(useSearchParams().get("next"));
  const { isAuthenticated, error, clearError, login } = useAuth();

  // A message left by the auth layer, e.g. "Your session has ended...". Read once, then cleared,
  // so a failed login is not shown twice (the form shows its own error).
  const [notice] = useState(error);
  useEffect(() => {
    clearError();
  }, [clearError]);

  // After a successful login, or when the user is already logged in.
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  async function handleLogin({
    username,
    password,
  }: {
    username: string;
    password: string;
  }) {
    // Throws an ApiError with a readable message on failure; LoginForm displays it.
    await login({ userName: username, password });
  }

  return (
    <LoginForm
      brandName="YAH ENTERPRISE"
      notice={notice}
      onSubmit={handleLogin}
    />
  );
}

// useSearchParams() needs a Suspense boundary in the Next.js App Router.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}