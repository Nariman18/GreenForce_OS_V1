'use client';

import { ErrorState } from '@/components/ui/feedback';

/** Route-level boundary for unexpected render errors in the authenticated app. */
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} onRetry={reset} />;
}
