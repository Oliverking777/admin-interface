import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import { TableCell, TableRow } from "@/components/ui/Table";

/** Loading, error and empty rows shared by the Purchasing tables (same look as SuppliersTable). */

export function SkeletonRows({ columns, rows = 4 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {Array.from({ length: columns }, (_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-20 animate-pulse bg-muted motion-reduce:animate-none" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function MessageRow({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="py-12 text-center">
        {children}
      </TableCell>
    </TableRow>
  );
}

export function ErrorRow({ columns, message, onRetry }: { columns: number; message: string; onRetry?: () => void }) {
  return (
    <MessageRow columns={columns}>
      <p role="alert" className="text-sm text-foreground">
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
          Try again
        </Button>
      )}
    </MessageRow>
  );
}

export function EmptyRow({ columns, title, hint }: { columns: number; title: string; hint?: string }) {
  return (
    <MessageRow columns={columns}>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </MessageRow>
  );
}

/** Small error under a control inside a table cell. */
export function CellError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-left text-xs text-red-600">{message}</p> : null;
}
