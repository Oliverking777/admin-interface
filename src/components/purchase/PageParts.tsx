import Link from "next/link";
import type { ReactNode } from "react";
import Card from "@/components/ui/Card";

/** Small layout pieces shared by the Purchasing pages. */

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      {label}
    </Link>
  );
}

export function NoAccessCard({ what, permission }: { what: string; permission: string }) {
  return (
    <Card>
      <p className="text-sm font-medium text-foreground">You do not have access to {what}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Ask an administrator to give your role the {permission} permission.
      </p>
    </Card>
  );
}

export function DetailSkeleton() {
  return (
    <Card className="p-5" aria-busy="true">
      <div className="flex flex-col gap-3">
        <div className="h-6 w-48 animate-pulse bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-80 animate-pulse bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-64 animate-pulse bg-muted motion-reduce:animate-none" />
      </div>
    </Card>
  );
}

/** A titled card holding a table. */
export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}