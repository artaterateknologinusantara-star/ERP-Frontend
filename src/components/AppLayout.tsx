'use client';

import React from 'react';
import { usePublishPageHeader, type Breadcrumb } from '@/hooks/usePageHeader';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: Breadcrumb[];
}

// The Sidebar/Topbar chrome itself now lives in AppShell (rendered once in the root layout so it
// persists across navigations). AppLayout keeps its old per-page API — every page.tsx still wraps
// its content in <AppLayout title=... breadcrumbs=...> unchanged — but now it just publishes that
// title/breadcrumbs into PageHeaderContext for AppShell's Topbar to read, and renders children
// directly with no wrapping chrome of its own.
export default function AppLayout({ children, title, breadcrumbs }: AppLayoutProps) {
  usePublishPageHeader(title, breadcrumbs);
  return <>{children}</>;
}