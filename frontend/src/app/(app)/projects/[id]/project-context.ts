'use client';

import { useParams } from 'next/navigation';

/** The current project id from the route. */
export function useProjectId(): string {
  const params = useParams<{ id: string }>();
  return params.id;
}
