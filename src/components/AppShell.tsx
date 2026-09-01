'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { PageHeaderProvider, useCurrentPageHeader } from '@/hooks/usePageHeader';

// Routes that render outside the authenticated shell (no Sidebar/Topbar, no auth check).
const PUBLIC_PATHS = new Set(['/login', '/reset-password', '/demo']);

function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="fixed inset-y-0 left-0 w-[var(--sidebar-width)] bg-card border-r border-border hidden lg:block" />
      <div className="fixed top-0 right-0 left-0 lg:left-[var(--sidebar-width)] h-[var(--topbar-height)] bg-card border-b border-border" />
    </div>
  );
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authState, setAuthState] = useState<'checking' | 'authed' | 'unauthed'>('checking');
  const { data: companySettings } = useCompanySettings();
  const { title, breadcrumbs } = useCurrentPageHeader();

  const companyName = companySettings?.companyName || 'ERP System';
  const fullBreadcrumbs = [{ label: companyName }, ...breadcrumbs];

  useEffect(() => {
    if (localStorage.getItem('syntera_token')) {
      setAuthState('authed');
    } else {
      setAuthState('unauthed');
      router.replace('/login');
    }
  }, [router]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (authState !== 'authed') return <ShellSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <Topbar
        sidebarCollapsed={collapsed}
        title={title}
        breadcrumbs={fullBreadcrumbs}
        onMenuClick={() => setMobileNavOpen(true)}
      />
      <main
        className={`transition-all duration-300 ease-in-out ml-0 pt-[var(--topbar-height)]
          ${collapsed ? 'lg:ml-[var(--sidebar-collapsed-width)]' : 'lg:ml-[var(--sidebar-width)]'}`}
      >
        <div className="min-h-[calc(100vh-56px)] p-3 sm:p-5 max-w-screen-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}

// Rendered once in the root layout so Sidebar/Topbar persist across client-side navigations
// instead of being unmounted and remounted by every page.tsx (which is what happened when each
// page rendered its own AppLayout). Per-page title/breadcrumbs still flow in via AppLayout, which
// now just publishes them to PageHeaderContext instead of rendering the chrome itself.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <PageHeaderProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </PageHeaderProvider>
  );
}
