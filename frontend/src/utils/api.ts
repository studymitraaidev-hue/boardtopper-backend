// Central API client — connected to real backend
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

// Warn clearly in production if the API URL is misconfigured
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error(
    '[BoardTopper] VITE_API_URL is not set. All API calls will fail in production. ' +
    'Add VITE_API_URL=https://your-backend.railway.app to your Vercel environment variables.'
  );
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Backend always returns { data: T, error: string | null }
// This helper unwraps that envelope and surfaces backend errors
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('bt_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // 401 interceptor — try refresh token before clearing session
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('bt_refresh_token');

    // If there is a refresh token and this is not the refresh endpoint itself,
    // try to get a new access token before giving up.
    if (refreshToken && !path.includes('/api/auth/refresh')) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshBody = await refreshRes.json() as { data?: { token?: string } };
          const newToken    = refreshBody.data?.token;

          if (newToken) {
            localStorage.setItem('bt_token', newToken);

            // Retry the original request with the new access token
            const retryHeaders: HeadersInit = {
              'Content-Type': 'application/json',
              Authorization:  `Bearer ${newToken}`,
              ...(options?.headers ?? {}),
            };
            const retryRes  = await fetch(`${BASE_URL}${path}`, { ...options, headers: retryHeaders });
            const retryBody = await retryRes.json().catch(() => ({ data: null, error: retryRes.statusText }));

            if (retryRes.ok) {
              if (retryBody !== null && typeof retryBody === 'object' && 'data' in retryBody) {
                if ((retryBody as { error: string | null }).error) {
                  throw new ApiError(retryRes.status, (retryBody as { error: string }).error);
                }
                return (retryBody as { data: T }).data;
              }
              return retryBody as T;
            }
          }
        }
      } catch (retryErr) {
        if (retryErr instanceof ApiError) throw retryErr;
        // Refresh failed — fall through to logout
      }
    }

    // Refresh failed or no refresh token — clear everything and redirect
    localStorage.removeItem('bt_token');
    localStorage.removeItem('bt_refresh_token');
    localStorage.removeItem('bt_user');
    if (
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/signup')
    ) {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  // Parse body (backend always sends JSON)
  const body = await res.json().catch(() => ({ data: null, error: res.statusText }));

  if (!res.ok) {
    const message =
      (body as { error?: string }).error ??
      (body as { message?: string }).message ??
      'Request failed';
    if (res.status === 429) throw new ApiError(429, 'Too many requests. Please slow down and try again.');
    if (res.status === 503) throw new ApiError(503, 'Service temporarily unavailable. Please try again.');
    throw new ApiError(res.status, message);
  }

  // Unwrap backend envelope: { data: T, error: null } → T
  if (body !== null && typeof body === 'object' && 'data' in body && 'error' in body) {
    if ((body as { error: string | null }).error) {
      throw new ApiError(res.status, (body as { error: string }).error);
    }
    return (body as { data: T }).data;
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /** Store or clear the JWT in localStorage */
  setToken(token: string | null): void {
    if (token === null) {
      localStorage.removeItem('bt_token');
    } else {
      localStorage.setItem('bt_token', token);
    }
  },
};
