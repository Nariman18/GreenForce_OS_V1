import { API_PREFIX, type ApiError, ApiErrorSchema } from '@greenforce/shared';

/** Error thrown for every non-2xx API response, carrying the shared ApiError payload. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.status = error.statusCode;
    this.details = error.details ?? [];
  }
}

async function toApiError(response: Response): Promise<ApiRequestError> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = ApiErrorSchema.safeParse(body);
  return new ApiRequestError(
    parsed.success
      ? parsed.data
      : {
          statusCode: response.status,
          error: response.statusText,
          message: 'The server returned an unexpected error',
        },
  );
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Same-origin fetch wrapper for the GreenForce API. Paths come from `apiPaths` in @greenforce/shared.
 * A 401 outside the auth endpoints sends the user to sign in again.
 */
export async function apiRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError({
      statusCode: 0,
      error: 'Network',
      message: 'Cannot reach the GreenForce API',
    });
  }

  if (!response.ok) {
    const error = await toApiError(response);
    if (error.status === 401 && !path.startsWith('/auth/') && typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname);
      // A full navigation (not router.push) deliberately drops all cached client state of the expired session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${next}`);
    }
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>('GET', path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => apiRequest<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => apiRequest<T>('PATCH', path, body),
  delete: <T>(path: string) => apiRequest<T>('DELETE', path),
};

/** Absolute URL for browser navigation (downloads) to an API path. */
export const apiUrl = (path: string) => `${API_PREFIX}${path}`;

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong';
