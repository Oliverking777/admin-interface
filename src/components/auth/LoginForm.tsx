"use client";

import { useState, type FormEvent } from "react";

type Credentials = { username: string; password: string };

type LoginFormProps = {
  onSubmit?: (credentials: Credentials) => void | Promise<void>;
  brandName?: string;
  /** Optional message shown above the fields, e.g. "Your session has ended. Please log in again." */
  notice?: string | null;
};

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 26V10l6-4v20M8 26V4l8 4v18M16 26V12l6-3v17M22 26h8V14l-8-2" />
      <path d="M1 26h30" />
    </svg>
  );
}

export default function LoginForm({
  onSubmit,
  brandName = "Brand",
  notice = null,
}: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit?.({ username, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full border border-border bg-background px-3 py-2.5 text-base text-foreground " +
    "outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="border border-border bg-background p-8 shadow-md"
        >
          <header className="mb-6 text-center">
            <div className="mb-4 flex items-center justify-center gap-3 text-primary">
              <LogoMark className="h-8 w-9" />
              <span className="text-lg font-semibold uppercase tracking-widest">
                {brandName}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Please enter your details
            </p>
          </header>

          {notice && (
            <p
              role="status"
              className="mb-4 border border-border px-3 py-2 text-center text-sm text-muted-foreground"
            >
              {notice}
            </p>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="text-sm font-medium text-foreground"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-center text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full bg-primary py-2.5 text-base font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}