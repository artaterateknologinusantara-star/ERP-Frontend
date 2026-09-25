'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useVendorAuth } from '@/hooks/useVendorAuth';
import { usePublicCompanySettings } from '@/hooks/useCompanySettings';

// Lightweight top bar for the /vendor-portal/* tree — no Sidebar, no permissions, no
// breadcrumbs. Wraps every vendor page except /vendor-portal/login itself.
export default function VendorShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { vendorUser, loading } = useVendorAuth();
  const { data: publicSettings } = usePublicCompanySettings();
  const companyName = publicSettings?.companyName || 'ERP System';

  const handleLogout = () => {
    localStorage.removeItem('vendor_token');
    localStorage.removeItem('vendor_user');
    router.replace('/vendor-portal/login');
  };

  if (loading || !vendorUser) {
    return <div className="min-h-screen bg-background animate-pulse" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-700 text-sm text-foreground">{companyName}</p>
            <p className="text-xs text-muted-foreground">Portal Vendor</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-600 text-foreground">{vendorUser.name}</p>
              <p className="text-[11px] text-muted-foreground">{vendorUser.supplierName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="min-w-11 min-h-11 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Keluar"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4">{children}</main>
    </div>
  );
}
