'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { ApiRequestError } from '@/lib/api-client';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            // Client errors (4xx) will not succeed on retry.
            retry: (failureCount, error) =>
              !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500) &&
              failureCount < 2,
          },
        },
      }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
