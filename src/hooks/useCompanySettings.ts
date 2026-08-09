'use client';

import { useQuery } from '@tanstack/react-query';
import { companySettingsService } from '@/services/companySettings.service';

// Authenticated — used inside the app shell (Sidebar, breadcrumbs, Company Profile form) where a
// JWT always exists already. react-query dedupes concurrent calls to this same key, so mounting it
// in both AppLayout and Sidebar on every page only ever fires one network request per staleTime window.
export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const res = await companySettingsService.get();
      return res.data;
    },
  });
}

// Anonymous — for surfaces that render before login (the login page, the browser tab title). Only
// ever returns CompanyName + whether a logo exists, per the backend's public DTO.
export function usePublicCompanySettings() {
  return useQuery({
    queryKey: ['company-settings', 'public'],
    queryFn: async () => {
      const res = await companySettingsService.getPublic();
      return res.data;
    },
  });
}
