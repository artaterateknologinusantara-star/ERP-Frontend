'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderValue {
  title: string;
  breadcrumbs: Breadcrumb[];
}

interface PageHeaderContextValue {
  header: PageHeaderValue;
  setHeader: (header: PageHeaderValue) => void;
}

const DEFAULT_HEADER: PageHeaderValue = { title: '', breadcrumbs: [] };

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [header, setHeader] = useState<PageHeaderValue>(DEFAULT_HEADER);
  const value = useMemo(() => ({ header, setHeader }), [header]);
  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

function usePageHeaderContext(): PageHeaderContextValue {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error('usePageHeaderContext must be used within PageHeaderProvider');
  return ctx;
}

// Called by AppLayout (rendered per-page) so the persistent AppShell (rendered once, in the root
// layout) knows what title/breadcrumbs to show without AppShell itself needing page-specific props.
export function usePublishPageHeader(title: string, breadcrumbs: Breadcrumb[] = []) {
  const { setHeader } = usePageHeaderContext();
  const breadcrumbsKey = JSON.stringify(breadcrumbs);

  useEffect(() => {
    setHeader({ title, breadcrumbs: JSON.parse(breadcrumbsKey) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, breadcrumbsKey]);
}

export function useCurrentPageHeader(): PageHeaderValue {
  return usePageHeaderContext().header;
}
