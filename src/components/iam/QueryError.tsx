import Button from "@/components/ui/Button";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";

type QueryErrorProps = {
  error: unknown;
  onRetry?: () => void;
};

/** Block shown when a query fails. A missing permission gets no retry button: asking again won't help. */
export default function QueryError({ error, onRetry }: QueryErrorProps) {
  const forbidden = isApiError(error) && error.isForbidden;
  const message = forbidden ? "You do not have permission to view this." : getErrorMessage(error);

  return (
    <div role="alert" className="border border-border bg-background p-6 text-center">
      <p className="text-sm text-foreground">{message}</p>
      {onRetry && !forbidden && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}