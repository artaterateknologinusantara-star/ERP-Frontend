'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, Search, HelpCircle, LogOut, Menu, CheckCircle, ClipboardCheck } from 'lucide-react';
import { usePendingApprovals } from '@/hooks/usePendingApprovals';
import { approvalService } from '@/services/approval.service';
import { formatRp } from '@/lib/format';

interface TopbarProps {
  sidebarCollapsed: boolean;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  onMenuClick?: () => void;
}

const MAX_PREVIEW = 6;

export default function Topbar({ sidebarCollapsed, title, breadcrumbs, onMenuClick }: TopbarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState('');
  const [initials, setInitials] = useState('?');
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: pendingApprovals } = usePendingApprovals();
  const pendingCount = pendingApprovals?.length ?? 0;
  const preview = pendingApprovals?.slice(0, MAX_PREVIEW) ?? [];

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const handleLogout = () => {
    localStorage.removeItem('syntera_token');
    localStorage.removeItem('syntera_user');
    router.replace('/login');
  };

  const handleQuickApprove = async (item: NonNullable<typeof pendingApprovals>[number]) => {
    try {
      await approvalService.approve(item);
      toast.success(`${item.no} berhasil disetujui`);
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyetujui');
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-30 bg-card border-b border-border flex items-center px-3 sm:px-5 h-[var(--topbar-height)] transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'lg:left-[var(--sidebar-collapsed-width)]' : 'lg:left-[var(--sidebar-width)]'}`}
    >
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden flex-shrink-0 min-w-11 min-h-11 -ml-2 mr-1 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Buka menu"
      >
        <Menu size={20} />
      </button>

      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-base overflow-x-auto whitespace-nowrap">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={`crumb-${i}`}>
                {i > 0 && <span className="text-muted-foreground">/</span>}
                <span className={i === breadcrumbs.length - 1 ? 'text-foreground font-600' : 'text-muted-foreground hover:text-foreground cursor-pointer hidden sm:inline'}>
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
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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
        <button className="hidden sm:flex min-w-11 min-h-11 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle size={17} />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative min-w-11 min-h-11 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell size={17} />
            {pendingCount > 0 && (
              <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-700 rounded-full">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-700 text-foreground">Menunggu Persetujuan</span>
                {pendingCount > 0 && <span className="text-xs text-muted-foreground">{pendingCount} item</span>}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {preview.length === 0 ? (
                  <div className="px-3.5 py-6 text-center text-xs text-muted-foreground">
                    <ClipboardCheck size={20} className="mx-auto mb-1.5 opacity-40" />
                    Tidak ada item menunggu persetujuan.
                  </div>
                ) : preview.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="px-3.5 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-600 text-foreground truncate">{item.typeLabel} · {item.no}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.title}</p>
                        <p className="text-xs font-600 text-foreground mt-0.5">{formatRp(item.amount)}</p>
                      </div>
                      <button
                        onClick={() => handleQuickApprove(item)}
                        className="flex-shrink-0 p-1.5 rounded hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors"
                        title="Setujui langsung"
                      >
                        <CheckCircle size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/pending-approval"
                onClick={() => setNotifOpen(false)}
                className="block px-3.5 py-2.5 text-center text-xs font-600 text-primary hover:bg-primary/5 transition-colors"
              >
                Lihat Semua Pending Approval
              </Link>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-1.5 px-1.5 sm:px-2.5 py-1.5 rounded-md">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-700 text-primary">{initials}</span>
          </div>
          <span className="text-base font-500 text-foreground hidden md:block">{userName}</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
          title="Keluar"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
