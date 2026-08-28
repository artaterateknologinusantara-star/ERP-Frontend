'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useCompanySettings } from '@/hooks/useCompanySettings';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function AppLayout({ children, title, breadcrumbs }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: companySettings } = useCompanySettings();
  const companyName = companySettings?.companyName || 'ERP System';
  // Every page passes its own breadcrumbs without the root label — this is the one place that
  // supplies it, dynamically, so white-label customers see their own company name instead of a
  // hardcoded string repeated across ~60 page files.
  const fullBreadcrumbs = [{ label: companyName }, ...(breadcrumbs ?? [])];

  useEffect(() => {
    if (!localStorage.getItem('syntera_token')) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (!ready) return null;

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