import Link from "next/link";
import type { ReactNode } from "react";

type QuickActionButtonProps = {
  href: string;
  label: string;
  icon: ReactNode;
};

export default function QuickActionButton({ href, label, icon }: QuickActionButtonProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 border border-border bg-background p-3 text-center transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="flex h-9 w-9 items-center justify-center bg-primary text-primary-foreground" aria-hidden="true">
        <span className="h-5 w-5">{icon}</span>
      </span>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </Link>
  );
}