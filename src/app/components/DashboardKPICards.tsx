import React from 'react';
import { FileText, DollarSign, CheckCircle, TrendingUp, ShoppingCart, Receipt, CreditCard, Package } from 'lucide-react';

const kpiData = [
  {
    id: 'kpi-total-penawaran',
    label: 'Total Penawaran',
    value: '148',
    sub: 'Semua status',
    icon: <FileText size={18} />,
    iconBg: 'bg-blue-50',
    iconColor: 'text-primary',
    trend: '+12 bulan ini',
    trendUp: true,
  },
  {
    id: 'kpi-sales-order',
    label: 'Sales Order',
    value: '46',
    sub: 'Aktif & open',
    icon: <ShoppingCart size={18} />,
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    trend: '+8 bulan ini',
    trendUp: true,
  },
  {
    id: 'kpi-invoice',
    label: 'Outstanding Invoice',
    value: 'Rp 4,2M',
    sub: 'Belum terbayar',
    icon: <Receipt size={18} />,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    trend: '7 invoice overdue',
    trendUp: false,
    alert: true,
  },
  {
    id: 'kpi-ar',
    label: 'Accounts Receivable',
    value: 'Rp 8,4M',
    sub: 'Total piutang aktif',
    icon: <TrendingUp size={18} />,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    trend: '+Rp 1,2M vs bulan lalu',
    trendUp: true,
  },
  {
    id: 'kpi-ap',
    label: 'Accounts Payable',
    value: 'Rp 5,8M',
    sub: 'Total hutang aktif',
    icon: <CreditCard size={18} />,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    trend: 'Rp 820Jt overdue',
    trendUp: false,
    alert: true,
  },
  {
    id: 'kpi-revenue',
    label: 'Revenue Bulan Ini',
    value: 'Rp 5,8M',
    sub: 'Pendapatan Mei 2026',
    icon: <DollarSign size={18} />,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    trend: '+12% vs bulan lalu',
    trendUp: true,
  },
  {
    id: 'kpi-gross-profit',
    label: 'Gross Profit',
    value: 'Rp 2,6M',
    sub: 'Margin 44,8%',
    icon: <CheckCircle size={18} />,
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    trend: '+5,2% vs bulan lalu',
    trendUp: true,
  },
  {
    id: 'kpi-inventory',
    label: 'Low Stock Alert',
    value: '18',
    sub: 'Item di bawah minimum',
    icon: <Package size={18} />,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    trend: '+3 vs minggu lalu',
    trendUp: false,
    alert: true,
  },
];

export default function DashboardKPICards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
      {kpiData?.map((kpi) => (
        <div
          key={kpi?.id}
          className={`erp-card shadow-card hover:shadow-card-hover transition-shadow duration-200 ${kpi?.alert ? 'border-amber-200 bg-amber-50/30' : ''}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg ${kpi?.iconBg} flex items-center justify-center`}>
              <span className={kpi?.iconColor}>{kpi?.icon}</span>
            </div>
            {kpi?.alert && (
              <span className="w-2 h-2 rounded-full bg-amber-500 mt-1" />
            )}
          </div>
          <p className="text-2xs font-600 text-muted-foreground uppercase tracking-wider mb-1">{kpi?.label}</p>
          <p className="text-xl font-800 text-foreground font-tabular leading-tight">{kpi?.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{kpi?.sub}</p>
          <p className={`text-xs font-500 mt-2 ${kpi?.trendUp ? 'text-emerald-600' : 'text-amber-600'}`}>
            {kpi?.trend}
          </p>
        </div>
      ))}
    </div>
  );
}