'use client';

import React, { useEffect, useState } from 'react';
import { FileText, DollarSign, TrendingDown, TrendingUp, ShoppingCart, Receipt, CreditCard, Package } from 'lucide-react';
import { formatRp } from '@/lib/format';
import { quotationService } from '@/services/quotation.service';
import { getSalesOrderStats, SalesOrderStats } from '@/services/salesorder.service';
import { getInvoiceStats, InvoiceStats } from '@/services/invoice.service';
import { getARStats, ARStats, getAPStats, APStats, getFinanceSummary, FinanceSummary } from '@/services/finance.service';
import { getInventoryStats, InventoryStats } from '@/services/inventory.service';

function Skeleton() {
  return <span className="inline-block w-16 h-5 bg-muted animate-pulse rounded align-middle" />;
}

export default function DashboardKPICards() {
  const [loading, setLoading] = useState(true);
  const [qtTotal, setQtTotal] = useState(0);
  const [soStats, setSoStats] = useState<SalesOrderStats | null>(null);
  const [invStats, setInvStats] = useState<InvoiceStats | null>(null);
  const [arStats, setArStats] = useState<ARStats | null>(null);
  const [apStats, setApStats] = useState<APStats | null>(null);
  const [fin, setFin] = useState<FinanceSummary | null>(null);
  const [inv, setInv] = useState<InventoryStats | null>(null);

  useEffect(() => {
    Promise.allSettled([
      quotationService.list({ perPage: 1 }),
      getSalesOrderStats(),
      getInvoiceStats(),
      getARStats(),
      getAPStats(),
      getFinanceSummary(),
      getInventoryStats(),
    ]).then(([q, so, invoice, ar, ap, f, stock]) => {
      if (q.status === 'fulfilled') setQtTotal(q.value.total);
      if (so.status === 'fulfilled') setSoStats(so.value);
      if (invoice.status === 'fulfilled') setInvStats(invoice.value);
      if (ar.status === 'fulfilled') setArStats(ar.value);
      if (ap.status === 'fulfilled') setApStats(ap.value);
      if (f.status === 'fulfilled') setFin(f.value);
      if (stock.status === 'fulfilled') setInv(stock.value);
    }).finally(() => setLoading(false));
  }, []);

  const overdueAP = apStats?.overdueDelivery ?? 0;
  const overdueAR = arStats?.overdueCount ?? 0;
  const lowStock  = inv?.lowStockItems ?? 0;
  const net       = fin?.netCashThisMonth ?? 0;

  const kpis = [
    {
      id: 'penawaran',
      label: 'Total Penawaran',
      value: loading ? <Skeleton /> : qtTotal.toLocaleString('id-ID'),
      sub: `${soStats?.completedThisMonth ?? 0} SO selesai bulan ini`,
      icon: <FileText size={18} />, iconBg: 'bg-blue-50', iconColor: 'text-primary',
      trend: `${soStats?.total ?? 0} total SO`, trendUp: true, alert: false,
    },
    {
      id: 'so-open',
      label: 'Sales Order',
      value: loading ? <Skeleton /> : (soStats?.open ?? 0).toLocaleString('id-ID'),
      sub: `${soStats?.delivered ?? 0} delivered`,
      icon: <ShoppingCart size={18} />, iconBg: 'bg-sky-50', iconColor: 'text-sky-600',
      trend: soStats ? formatRp(soStats.totalValue, true) + ' total nilai' : '—', trendUp: true, alert: false,
    },
    {
      id: 'invoice',
      label: 'Outstanding Invoice',
      value: loading ? <Skeleton /> : formatRp(invStats?.outstanding ?? 0, true),
      sub: 'Belum terbayar',
      icon: <Receipt size={18} />, iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
      trend: `${invStats?.overdue ?? 0} invoice overdue`, trendUp: false, alert: (invStats?.overdue ?? 0) > 0,
    },
    {
      id: 'ar',
      label: 'Accounts Receivable',
      value: loading ? <Skeleton /> : formatRp(arStats?.totalOutstanding ?? 0, true),
      sub: `${arStats?.totalInvoices ?? 0} invoice aktif`,
      icon: <TrendingUp size={18} />, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
      trend: `${overdueAR} overdue`, trendUp: overdueAR === 0, alert: overdueAR > 0,
    },
    {
      id: 'ap',
      label: 'Accounts Payable',
      value: loading ? <Skeleton /> : formatRp(apStats?.totalPending ?? 0, true),
      sub: `${apStats?.totalPos ?? 0} purchase order`,
      icon: <CreditCard size={18} />, iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
      trend: `${overdueAP} terlambat kirim`, trendUp: overdueAP === 0, alert: overdueAP > 0,
    },
    {
      id: 'cash-in',
      label: 'Cash In Bulan Ini',
      value: loading ? <Skeleton /> : formatRp(fin?.totalCashInThisMonth ?? 0, true),
      sub: 'Pembayaran diterima',
      icon: <DollarSign size={18} />, iconBg: 'bg-green-50', iconColor: 'text-green-600',
      trend: net >= 0 ? `Net +${formatRp(net, true)}` : `Net -${formatRp(Math.abs(net), true)}`,
      trendUp: net >= 0, alert: false,
    },
    {
      id: 'cash-out',
      label: 'Cash Out Bulan Ini',
      value: loading ? <Skeleton /> : formatRp(fin?.totalCashOutThisMonth ?? 0, true),
      sub: 'Pembayaran keluar',
      icon: <TrendingDown size={18} />, iconBg: 'bg-teal-50', iconColor: 'text-teal-600',
      trend: `YTD: ${formatRp(fin?.totalCashOutThisYear ?? 0, true)}`, trendUp: true, alert: false,
    },
    {
      id: 'low-stock',
      label: 'Low Stock Alert',
      value: loading ? <Skeleton /> : lowStock.toLocaleString('id-ID'),
      sub: 'Item di bawah minimum',
      icon: <Package size={18} />, iconBg: lowStock > 0 ? 'bg-red-50' : 'bg-muted', iconColor: lowStock > 0 ? 'text-red-500' : 'text-muted-foreground',
      trend: `${inv?.outOfStockItems ?? 0} item habis`, trendUp: false, alert: lowStock > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.id} className={`erp-card shadow-card hover:shadow-card-hover transition-shadow duration-200 ${kpi.alert ? 'border-amber-200 bg-amber-50/30' : ''}`}>
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
              <span className={kpi.iconColor}>{kpi.icon}</span>
            </div>
            {kpi.alert && <span className="w-2 h-2 rounded-full bg-amber-500 mt-1" />}
          </div>
          <p className="text-2xs font-600 text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</p>
          <p className="text-xl font-800 text-foreground font-tabular leading-tight">{kpi.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
          <p className={`text-xs font-500 mt-2 ${kpi.trendUp ? 'text-emerald-600' : 'text-amber-600'}`}>{kpi.trend}</p>
        </div>
      ))}
    </div>
  );
}
