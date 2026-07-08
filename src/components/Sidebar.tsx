'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, FileText, ShoppingCart, Users, ChevronLeft, ChevronRight, Settings, User, ChevronDown, ChevronUp, ShoppingBag, Truck, FileCheck, CreditCard, Wallet, Banknote, BarChart2, Package, Warehouse, ArrowDownCircle, ArrowUpCircle, RefreshCw, FolderKanban, CheckSquare, Calendar, UserCog, TrendingUp, PieChart, ClipboardList, Globe, GitBranch, Shield, Hash, Sliders, Receipt, DollarSign, BookOpen, Layers, Database, Calculator } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navGroups: NavGroup[] = [
  {
    id: 'main',
    label: 'Dashboard',
    icon: <LayoutDashboard size={16} />,
    defaultOpen: true,
    items: [
      { id: 'nav-dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, href: '/' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: <ShoppingCart size={16} />,
    defaultOpen: true,
    items: [
      { id: 'nav-penawaran', label: 'Penawaran', icon: <FileText size={15} />, href: '/riwayat-penawaran', badge: 3 },
      { id: 'nav-customer-po', label: 'Customer PO', icon: <FileCheck size={15} />, href: '/customer-po' },
      { id: 'nav-sales-order', label: 'Sales Order', icon: <ShoppingCart size={15} />, href: '/sales-order' },
      { id: 'nav-invoice', label: 'Invoice', icon: <Receipt size={15} />, href: '/invoice' },
      { id: 'nav-customer', label: 'Customer', icon: <Users size={15} />, href: '/customer' },
    ],
  },
  {
    id: 'purchasing',
    label: 'Purchasing',
    icon: <ShoppingBag size={16} />,
    defaultOpen: false,
    items: [
      { id: 'nav-purchase-request', label: 'Purchase Request', icon: <ClipboardList size={15} />, href: '/purchase-request' },
      { id: 'nav-purchase-order', label: 'Purchase Order', icon: <ShoppingBag size={15} />, href: '/purchase-order' },
      { id: 'nav-supplier-invoice', label: 'Supplier Invoice', icon: <FileCheck size={15} />, href: '/supplier-invoice' },
      { id: 'nav-vendor', label: 'Vendor', icon: <Truck size={15} />, href: '/vendor' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: <Wallet size={16} />,
    defaultOpen: false,
    items: [
      { id: 'nav-ar', label: 'Accounts Receivable', icon: <TrendingUp size={15} />, href: '/accounts-receivable' },
      { id: 'nav-ap', label: 'Accounts Payable', icon: <CreditCard size={15} />, href: '/accounts-payable' },
      { id: 'nav-cash-in', label: 'Cash In', icon: <ArrowDownCircle size={15} />, href: '/cash-in' },
      { id: 'nav-cash-out', label: 'Cash Out', icon: <ArrowUpCircle size={15} />, href: '/cash-out' },
      { id: 'nav-expense', label: 'Expense Management', icon: <Receipt size={15} />, href: '/expense' },
      { id: 'nav-expense-category', label: 'Kategori Pengeluaran', icon: <Layers size={15} />, href: '/expense-category' },
      { id: 'nav-bank', label: 'Bank', icon: <Banknote size={15} />, href: '/bank' },
      { id: 'nav-finance-reports', label: 'Finance Reports', icon: <BookOpen size={15} />, href: '/finance-reports' },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: <Calculator size={16} />,
    defaultOpen: false,
    items: [
      { id: 'nav-opening-balance', label: 'Opening Balance', icon: <Calculator size={15} />, href: '/opening-balance' },
      { id: 'nav-trial-balance', label: 'Trial Balance', icon: <Layers size={15} />, href: '/finance-reports/trial-balance' },
      { id: 'nav-laba-rugi', label: 'Laba Rugi', icon: <TrendingUp size={15} />, href: '/finance-reports/laba-rugi' },
      { id: 'nav-neraca', label: 'Neraca', icon: <Database size={15} />, href: '/finance-reports/neraca' },
      { id: 'nav-ppn-reconciliation', label: 'Rekapitulasi PPN', icon: <Receipt size={15} />, href: '/finance-reports/ppn-reconciliation' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: <Package size={16} />,
    defaultOpen: false,
    items: [
      { id: 'nav-item-master', label: 'Item Master', icon: <Layers size={15} />, href: '/item-master' },
      { id: 'nav-warehouse', label: 'Warehouse', icon: <Warehouse size={15} />, href: '/warehouse' },
      { id: 'nav-stock-in', label: 'Stock In', icon: <ArrowDownCircle size={15} />, href: '/stock-in' },
      { id: 'nav-stock-out', label: 'Stock Out', icon: <ArrowUpCircle size={15} />, href: '/stock-out' },
      { id: 'nav-stock-adj', label: 'Stock Adjustment', icon: <RefreshCw size={15} />, href: '/stock-adjustment' },
    ],
  },
  {
    id: 'project',
    label: 'Project',
    icon: <FolderKanban size={16} />,
    defaultOpen: false,
    items: [
      { id: 'nav-project-dashboard', label: 'Project Dashboard', icon: <FolderKanban size={15} />, href: '/project' },
      { id: 'nav-tasks', label: 'Task Management', icon: <CheckSquare size={15} />, href: '/project/tasks' },
      { id: 'nav-timeline', label: 'Timeline', icon: <Calendar size={15} />, href: '/project/timeline' },
      { id: 'nav-engineer', label: 'Engineer Assignment', icon: <UserCog size={15} />, href: '/project/engineers' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <BarChart2 size={16} />,
    defaultOpen: false,
    items: [
      { id: 'nav-sales-report', label: 'Sales Report', icon: <TrendingUp size={15} />, href: '/reports/sales' },
      { id: 'nav-finance-report', label: 'Finance Report', icon: <DollarSign size={15} />, href: '/reports/finance' },
      { id: 'nav-purchasing-report', label: 'Purchasing Report', icon: <ShoppingBag size={15} />, href: '/reports/purchasing' },
      { id: 'nav-inventory-report', label: 'Inventory Report', icon: <Package size={15} />, href: '/reports/inventory' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={16} />,
    defaultOpen: false,
    items: [
      { id: 'nav-company', label: 'Company Profile', icon: <Globe size={15} />, href: '/settings/company' },
      { id: 'nav-branch', label: 'Branch', icon: <GitBranch size={15} />, href: '/settings/branch' },
      { id: 'nav-users', label: 'User Management', icon: <Users size={15} />, href: '/settings/users' },
      { id: 'nav-roles', label: 'Role Management', icon: <Shield size={15} />, href: '/settings/roles' },
      { id: 'nav-tax', label: 'Tax Settings', icon: <PieChart size={15} />, href: '/settings/tax' },
      { id: 'nav-numbering', label: 'Numbering Format', icon: <Hash size={15} />, href: '/settings/numbering' },
      { id: 'nav-preferences', label: 'ERP Preferences', icon: <Sliders size={15} />, href: '/settings/preferences' },
      { id: 'nav-system-admin', label: 'System Administration', icon: <Database size={15} />, href: '/settings/system-admin' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Some nav items share a URL prefix (e.g. Finance Reports at /finance-reports
// and Trial Balance at /finance-reports/trial-balance in a different group).
// Only the most specific (longest) matching href should count as active.
const findActiveHref = (pathname: string): string | undefined => {
  const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));
  const matches = allHrefs.filter((href) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
  );
  return matches.sort((a, b) => b.length - a.length)[0];
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navGroups.forEach((g) => { init[g.id] = g.defaultOpen ?? false; });
    return init;
  });

  const activeHref = findActiveHref(pathname);
  const isActive = (href: string) => href === activeHref;

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isActive(item.href));

  // Auto-open the group that contains the current page whenever route changes
  useEffect(() => {
    const activeHref = findActiveHref(pathname);
    navGroups.forEach((g) => {
      if (g.id === 'main') return;
      if (g.items.some((item) => item.href === activeHref)) {
        setOpenGroups((prev) => ({ ...prev, [g.id]: true }));
      }
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    if (collapsed) return;
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Dashboard group renders as a single direct link
  const dashboardGroup = navGroups.find((g) => g.id === 'main');
  const otherGroups = navGroups.filter((g) => g.id !== 'main');

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-40 flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-border flex-shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <AppLogo size={28} />
          {!collapsed && (
            <span className="font-extrabold text-xl text-foreground tracking-tight whitespace-nowrap">
              Syntera<span className="text-primary">ERP</span>
            </span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-hide">
        {/* Dashboard direct link */}
        {dashboardGroup && (
          <div className="px-2 mb-1">
            <Link
              href="/"
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-500 transition-all duration-150 group relative
                ${isActive('/')
                  ? 'bg-primary/10 text-primary font-600' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
                }`}
              title={collapsed ? 'Dashboard' : undefined}
            >
              <span className={`flex-shrink-0 ${isActive('/') ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                <LayoutDashboard size={16} />
              </span>
              {!collapsed && <span className="truncate text-[13px]">Dashboard</span>}
            </Link>
          </div>
        )}

        {/* Accordion groups */}
        {otherGroups.map((group) => {
          const isOpen = openGroups[group.id];
          const groupActive = isGroupActive(group);

          return (
            <div key={group.id} className="px-2 mb-0.5">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-500 transition-all duration-150 group
                  ${groupActive
                    ? 'text-primary bg-primary/5' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
                  }`}
                title={collapsed ? group.label : undefined}
              >
                <span className={`flex-shrink-0 ${groupActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                  {group.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate font-600">{group.label}</span>
                    <span className="flex-shrink-0 text-muted-foreground">
                      {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </span>
                  </>
                )}
              </button>

              {/* Group items */}
              {!collapsed && isOpen && (
                <ul className="mt-0.5 space-y-0.5 pl-3 border-l border-border ml-4">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-500 transition-all duration-150 group relative
                          ${isActive(item.href)
                            ? 'bg-primary/10 text-primary font-600' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
                          }`}
                      >
                        <span className={`flex-shrink-0 ${isActive(item.href) ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto flex-shrink-0 bg-primary text-primary-foreground text-[10px] font-700 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {/* Collapsed: show active dot */}
              {collapsed && groupActive && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-2 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer transition-colors mb-1">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-600 text-foreground truncate">Budi Santoso</p>
              <p className="text-xs text-muted-foreground truncate">Sales Manager</p>
            </div>
            <Settings size={14} className="text-muted-foreground flex-shrink-0" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 text-[13px] font-500"
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span>Ciutkan</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}