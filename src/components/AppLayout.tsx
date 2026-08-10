'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
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

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <Topbar sidebarCollapsed={collapsed} title={title} breadcrumbs={fullBreadcrumbs} />
      <main
        className="transition-all duration-300 ease-in-out"
        style={{
          marginLeft: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          paddingTop: 'var(--topbar-height)',
        }}
      >
        <div className="min-h-[calc(100vh-56px)] p-5 max-w-screen-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}