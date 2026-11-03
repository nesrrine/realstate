'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

// 30 s : évite les refetch inutiles sans garder trop longtemps une réponse périmée.
// invalidateQueries() (création, modification, suppression) ignore le staleTime
// et recharge quand même les listes affichées.
const DEFAULT_STALE_TIME = 30_000;

// Ne pas rejouer une requête qui échoue pour une raison "définitive"
// (non connecté, accès refusé, introuvable, données invalides).
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status && [400, 401, 403, 404, 422].includes(status)) return false;
  return failureCount < 1;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: DEFAULT_STALE_TIME,
            refetchOnWindowFocus: false,
            retry: shouldRetryQuery,
            gcTime: 10 * 60_000,
          },
          mutations: {
            retry: false, // ne jamais rejouer un POST/PATCH/DELETE automatiquement
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}