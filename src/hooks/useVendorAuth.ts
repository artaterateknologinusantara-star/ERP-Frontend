'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VendorUser } from '@/types';

// Mirrors AuthenticatedShell's inline auth-check in AppShell.tsx — there's no vendor equivalent
// of AppShell (that component only knows about the internal syntera_token), so each vendor page
// (except /vendor-portal/login) calls this directly instead.
export function useVendorAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'authed' | 'unauthed'>('checking');
  const [vendorUser, setVendorUser] = useState<VendorUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('vendor_token');
    const rawUser = localStorage.getItem('vendor_user');
    if (token && rawUser) {
      try {
        setVendorUser(JSON.parse(rawUser) as VendorUser);
        setAuthState('authed');
        return;
      } catch {
        // fall through to unauthed
      }
    }
    setAuthState('unauthed');
    router.replace('/vendor-portal/login');
  }, [router]);

  return { authState, vendorUser, loading: authState === 'checking' };
}
