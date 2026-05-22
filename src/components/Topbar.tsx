'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, HelpCircle, LogOut } from 'lucide-react';

interface TopbarProps {
  sidebarCollapsed: boolean;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function Topbar({ sidebarCollapsed, title, breadcrumbs }: TopbarProps) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [initials, setInitials] = useState('?');

  useEffect(() => {
    const raw = localStorage.getItem('syntera_user');
    if (raw) {
      try {
        const u = JSON.parse(raw) as { name: string };
        setUserName(u.name);
        setInitials(u.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase());
      } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('syntera_token');
    localStorage.removeItem('syntera_user');
    router.replace('/login');
  };

  return (
    <header
      className="fixed top-0 right-0 z-30 bg-card border-b border-border flex items-center px-5 transition-all duration-300 ease-in-out"
      style={{
        left: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        height: 'var(--topbar-height)',
      }}
    >
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-base">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={`crumb-${i}`}>
                {i > 0 && <span className="text-muted-foreground">/</span>}
                <span className={i === breadcrumbs.length - 1 ? 'text-foreground font-600' : 'text-muted-foreground hover:text-foreground cursor-pointer'}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        ) : (
          <h1 className="text-xl font-700 text-foreground truncate">{title}</h1>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search size={14} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Cari penawaran, pelanggan..."
            className="erp-input pl-8 w-52 text-sm"
          />
        </div>

        {/* Help */}
        <button className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle size={17} />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-700 text-primary">{initials}</span>
          </div>
          <span className="text-base font-500 text-foreground hidden md:block">{userName}</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
          title="Keluar"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}