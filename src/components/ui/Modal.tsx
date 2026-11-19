"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ModalSize = "md" | "lg" | "xl" | "2xl";

/** Width, and how tall the dialog may grow before its body scrolls. "2xl" is for wide two-column forms. */
const SIZE_CLASS: Record<ModalSize, string> = {
  md: "max-w-2xl max-h-[90vh]",
  lg: "max-w-3xl max-h-[90vh]",
  xl: "max-w-4xl max-h-[90vh]",
  "2xl": "max-w-6xl max-h-[96vh]",
};

type ModalProps = {
  open: boolean;
  /** Pass a stable function (useCallback) so Escape handling is not re-registered every render. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** True while saving or uploading: Escape, the backdrop and the close button are then ignored. */
  busy?: boolean;
  /** Maximum width of the dialog. Defaults to "md" (max-w-2xl). */
  size?: ModalSize;
  className?: string;
};

/** Centered dialog for forms. Same behavior as Drawer (Escape, scroll lock, focus), different placement. */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  busy = false,
  size = "md",
  className,
}: ModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus the close button only when the modal opens, not every time `busy` changes.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-foreground/40 transition-opacity duration-200 starting:opacity-0 motion-reduce:transition-none"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex w-full flex-col border border-border bg-background shadow-md",
          SIZE_CLASS[size],
          "transition duration-200 starting:scale-95 starting:opacity-0 motion-reduce:transition-none",
          className,
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && <footer className="border-t border-border px-5 py-4">{footer}</footer>}
      </div>
    </div>
  );
}