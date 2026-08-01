'use client';

import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getMonthlyChart, getFinanceSummary, getARStats, getAPStats, MonthlyChartItem, FinanceSummary, ARStats, APStats } from '@/services/finance.service';
import { getSalesOrderStats, SalesOrderStats } from '@/services/salesorder.service';
import { getInvoiceStats, InvoiceStats } from '@/services/invoice.service';
import { getPOStats, PurchaseOrderStats } from '@/services/purchase.service';
import { getInventoryStats, InventoryStats } from '@/services/inventory.service';
import { formatRp } from '@/lib/format';

type ReportType = 'sales' | 'finance' | 'purchasing' | 'inventory';

interface ReportsModuleProps {
  reportType: ReportType;
}

const fmtAxis = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}Jt`;
  return String(v);
};

export default function ReportsModule({ reportType }: ReportsModuleProps) {
  const [monthly, setMonthly] = useState<MonthlyChartItem[]>([]);
  const [fin, setFin]         = useState<FinanceSummary | null>(null);
  const [ar, setAR]           = useState<ARStats | null>(null);
  const [ap, setAP]           = useState<APStats | null>(null);
  const [so, setSO]           = useState<SalesOrderStats | null>(null);
  const [inv, setInv]         = useState<InvoiceStats | null>(null);
  const [po, setPO]           = useState<PurchaseOrderStats | null>(null);
  const [stock, setStock]     = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      getMonthlyChart(), getFinanceSummary(), getARStats(), getAPStats(),
      getSalesOrderStats(), getInvoiceStats(), getPOStats(), getInventoryStats(),
    ]).then(([m, f, a, ap2, s, i, p, st]) => {
      if (m.status  === 'fulfilled') setMonthly(m.value);
      if (f.status  === 'fulfilled') setFin(f.value);
      if (a.status  === 'fulfilled') setAR(a.value);
      if (ap2.status === 'fulfilled') setAP(ap2.value);
      if (s.status  === 'fulfilled') setSO(s.value);
      if (i.status  === 'fulfilled') setInv(i.value);
      if (p.status  === 'fulfilled') setPO(p.value);
      if (st.status === 'fulfilled') setStock(st.value);
    }).finally(() => setLoading(false));
  }, []);

  const titles: Record<ReportType, string> = {
    sales: 'Laporan Penjualan',
    finance: 'Laporan Keuangan',
    purchasing: 'Laporan Pembelian',
    inventory: 'Laporan Inventori',
  };

  // Build chart data from monthly
  const chartData = monthly.slice(-6).map((d) => ({
    month: d.month,
    'Cash In':  d.cashIn,
    'Cash Out': d.cashOut,
    Net:        d.net,
  }));

  // Summary rows
  const summaryRows: Record<ReportType, { label: string; value: string; up: boolean }[]> = {
    sales: [
      { label: 'Total Cash In (All Time)', value: fin ? formatRp(fin.totalCashInAllTime) : '—', up: true },
      { label: 'Total SO', value: so ? so.total.toLocaleString('id-ID') : '—', up: true },
      { label: 'SO Completed Bulan Ini', value: so ? so.completedThisMonth.toLocaleString('id-ID') : '—', up: true },
      { label: 'Outstanding Invoice', value: inv ? formatRp(inv.outstanding) : '—', up: false },
    ],
    finance: [
      { label: 'Cash In Bulan Ini', value: fin ? formatRp(fin.totalCashInThisMonth) : '—', up: true },
      { label: 'Cash Out Bulan Ini', value: fin ? formatRp(fin.totalCashOutThisMonth) : '—', up: false },
      { label: 'Net Cashflow Bulan Ini', value: fin ? formatRp(fin.netCashThisMonth) : '—', up: (fin?.netCashThisMonth ?? 0) >= 0 },
      { label: 'Total AR Outstanding', value: ar ? formatRp(ar.totalOutstanding) : '—', up: false },
    ],
    purchasing: [
      { label: 'Total PO', value: po ? po.total.toLocaleString('id-ID') : '—', up: true },
      { label: 'PO Ordered', value: po ? po.ordered.toLocaleString('id-ID') : '—', up: true },
      { label: 'Total Nilai PO', value: po ? formatRp(po.totalValue) : '—', up: true },
      { label: 'Total AP Pending', value: ap ? formatRp(ap.totalPending) : '—', up: false },
    ],
    inventory: [
      { label: 'Total Item Aktif', value: stock ? stock.activeItems.toLocaleString('id-ID') : '—', up: true },
      { label: 'Nilai Stok', value: stock ? formatRp(stock.totalStockValue) : '—', up: true },
      { label: 'Low Stock Alert', value: stock ? stock.lowStockItems.toLocaleString('id-ID') : '—', up: false },
      { label: 'Out of Stock', value: stock ? stock.outOfStockItems.toLocaleString('id-ID') : '—', up: false },
    ],
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="erp-card shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-700 text-foreground">{titles[reportType]}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Data real-time dari sistem ERP</p>
          </div>
          <button className="btn-secondary"><Download size={14} /> Export</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryRows[reportType].map((row) => (
          <div key={row.label} className="erp-card shadow-card">
            <p className="text-xs text-muted-foreground font-500 mb-2">{row.label}</p>
            <p className="text-xl font-800 text-foreground font-tabular leading-tight">
              {loading ? <span className="inline-block w-20 h-5 bg-muted animate-pulse rounded" /> : row.value}
            </p>
            <div className={`flex items-center gap-1 mt-2 text-xs font-500 ${row.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {row.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {row.up ? 'Positif' : 'Perlu perhatian'}
            </div>
          </div>
        ))}
      </div>

      {/* Chart — Finance data for all report types */}
      <div className="erp-card shadow-card">
        <div className="mb-4">
          <h3 className="text-[13px] font-700 text-foreground">
            {reportType === 'finance' ? 'Cashflow 6 Bulan Terakhir' : 'Cash In vs Cash Out — 6 Bulan Terakhir'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Data dari sistem keuangan (Rp)</p>
        </div>

        {loading ? (
          <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">Memuat chart...</div>
        ) : chartData.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">Belum ada data cashflow</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} width={60} />
              <Tooltip
                formatter={(val: number, name: string) => [`Rp ${Math.abs(val).toLocaleString('id-ID')}`, name]}
                labelFormatter={(l) => `Bulan: ${l}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Cash In"  fill="#16a34a" radius={[3,3,0,0]} maxBarSize={40} />
              <Bar dataKey="Cash Out" fill="#dc2626" radius={[3,3,0,0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
