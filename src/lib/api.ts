import { ApiResponse, PaginatedResponse } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('syntera_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('syntera_token');
    localStorage.removeItem('syntera_user');
    window.location.href = '/login';
    throw new Error('Sesi berakhir. Silakan login kembali.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    // Handle ApiResponse format { message } and ASP.NET Core ProblemDetails { title, errors }
    const message =
      error.message ??
      error.title ??
      (error.errors
        ? Object.values(error.errors as Record<string, string[]>).flat().join('; ')
        : null) ??
      `Request failed: ${res.status}`;
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

export const api = {
  get<T>(path: string): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(path);
  },

  async getList<T>(path: string, params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<T>> {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    const res = await request<ApiResponse<PaginatedResponse<T>>>(`${path}${qs}`);
    return res.data;
  },

  post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = void>(path: string): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(path, { method: 'DELETE' });
  },
};
