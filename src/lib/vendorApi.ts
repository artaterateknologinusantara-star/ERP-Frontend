import { ApiResponse } from '@/types';
import { BASE_URL } from './api';

// Parallel to api.ts, deliberately not sharing code with it — same isolation principle as the
// backend's separate "Vendor" JWT scheme (no shared path between internal and vendor auth).
// Separate localStorage keys (vendor_token/vendor_user) so a browser logged into both /login and
// /vendor-portal/login at once never cross-contaminates.

function getVendorToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vendor_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getVendorToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Same reasoning as api.ts: a 401 from the login call itself means "wrong credentials", not
  // "session expired" — don't redirect away from the page the vendor is already on.
  if (res.status === 401 && path !== '/vendor/auth/login') {
    localStorage.removeItem('vendor_token');
    localStorage.removeItem('vendor_user');
    window.location.href = '/vendor-portal/login';
    throw new Error('Sesi berakhir. Silakan login kembali.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    const message =
      error.message ??
      error.title ??
      (error.errors
        ? Object.values(error.errors as Record<string, string[]>).flat().join('; ')
        : null) ??
      `Request failed: ${res.status}`;
    const err = new Error(message) as Error & { status: number; data?: unknown };
    err.status = res.status;
    err.data = error.data;
    throw err;
  }

  return res.json() as Promise<T>;
}

export const vendorApi = {
  get<T>(path: string): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(path);
  },

  post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
