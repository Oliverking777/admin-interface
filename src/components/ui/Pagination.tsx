import Button from "@/components/ui/Button";

type PaginationProps = {
  /** Zero-based. */
  page: number;
  totalPages: number;
  totalElements: number;
  /** Plural name shown in the summary, e.g. "roles". */
  noun: string;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export default function Pagination({
  page,
  totalPages,
  totalElements,
  noun,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  if (totalElements === 0) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground"
    >
      <p>
        Page {page + 1} of {Math.max(totalPages, 1)}: {totalElements} {noun}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}