import { ApiResponse, CompanySettings } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('syntera_token');
}

export interface UpdateCompanySettingsDto {
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  footerText?: string;
  signatureName?: string;
  signatureTitle?: string;
  documentPrefix?: string;
  npwp?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolderName?: string;
}

export interface PublicCompanySettings {
  companyName: string;
  hasLogo: boolean;
}

export interface NumberingConfigEntry {
  docType: string;
  prefix: string;
  lastNumber: number;
}

export interface RegeneratePrefixesResponse {
  updatedCount: number;
  numberingConfigs: NumberingConfigEntry[];
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const err = await res.json().catch(() => null);
  return err?.message ?? fallback;
}

export const companySettingsService = {
  // No auth required — safe to call before login (login page, browser tab title).
  getPublic(): Promise<ApiResponse<PublicCompanySettings>> {
    return fetch(`${BASE_URL}/company-settings/public`)
      .then((r) => r.json() as Promise<ApiResponse<PublicCompanySettings>>);
  },

  get(): Promise<ApiResponse<CompanySettings>> {
    const token = getToken();
    return fetch(`${BASE_URL}/company-settings`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }).then((r) => r.json() as Promise<ApiResponse<CompanySettings>>);
  },

  async update(data: UpdateCompanySettingsDto): Promise<ApiResponse<CompanySettings>> {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/company-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error(await parseErrorMessage(res, 'Gagal menyimpan Company Settings'));
    return res.json() as Promise<ApiResponse<CompanySettings>>;
  },

  async uploadLogo(file: File): Promise<ApiResponse<CompanySettings>> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/company-settings/logo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) throw new Error(await parseErrorMessage(res, 'Gagal mengunggah logo'));
    return res.json() as Promise<ApiResponse<CompanySettings>>;
  },

  async deleteLogo(): Promise<ApiResponse<CompanySettings>> {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/company-settings/logo`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) throw new Error(await parseErrorMessage(res, 'Gagal menghapus logo'));
    return res.json() as Promise<ApiResponse<CompanySettings>>;
  },

  async regeneratePrefixes(): Promise<ApiResponse<RegeneratePrefixesResponse>> {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/company-settings/regenerate-prefixes`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (!res.ok) throw new Error(await parseErrorMessage(res, 'Gagal memperbarui prefix dokumen'));
    return res.json() as Promise<ApiResponse<RegeneratePrefixesResponse>>;
  },

  // GetLogo is [Authorize]-protected (no query-string token support server-side), so an <img src="...">
  // can't hit it directly — fetch it as an authenticated blob and hand back a local object URL instead.
  // Caller is responsible for URL.revokeObjectURL(...) once the image is no longer shown.
  async getLogoObjectUrl(): Promise<string | null> {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/company-settings/logo`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
