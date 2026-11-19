/**
 * Factory for the app's TanStack Query client.
 * Create ONE per browser session inside the provider (not at module level), e.g.
 *
 *   const [queryClient] = useState(createQueryClient);
 */

import { QueryClient } from "@tanstack/react-query";

import { isApiError } from "@/lib/api/api-error";

const MAX_RETRIES = 2;

/** Retries only connectivity problems and 5xx. A 4xx answer will not change by asking again. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (isApiError(error)) {
    if (error.kind === "ABORTED") return false;
    if (error.status >= 400 && error.status < 500) return false;
  }
  return true;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: { retry: false },
    },
  });
}