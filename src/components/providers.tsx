'use client';

import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { usePublicCompanySettings } from '@/hooks/useCompanySettings';

// Next.js `metadata` in the root layout is static (server/build-time) and can't depend on
// client-only, unauthenticated data. This keeps that static title as the initial value (what search
// engines and the very first paint see) and swaps in the real company name client-side once the
// public CompanySettings endpoint resolves — same trade-off as the login page's branding.
function TitleSync() {
  const { data } = usePublicCompanySettings();

  useEffect(() => {
    if (data?.companyName) document.title = data.companyName;
  }, [data?.companyName]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TitleSync />
      {children}
    </QueryClientProvider>
  );
}
