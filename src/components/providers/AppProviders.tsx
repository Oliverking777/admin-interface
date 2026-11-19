"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";

import ToastProvider from "@/components/ui/ToastProvider";
import { useAuth } from "@/hooks/iam/use-auth";
import { createQueryClient } from "@/lib/api/query-client";

/** Drops all cached server data when nobody is logged in, so the next user never sees it. */
function ClearCacheOnLogout() {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) queryClient.clear();
  }, [isAuthenticated, isLoading, queryClient]);

  return null;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ClearCacheOnLogout />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}