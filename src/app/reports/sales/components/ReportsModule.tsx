'use client';

import React, { useState } from 'react';
import { Download, FileText, Filter, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type ReportType = 'sales' | 'finance' | 'purchasing' | 'inventory';

interface ReportsModuleProps {
  reportType: ReportType;
}

const reportConfig: Record<ReportType, { title: string; color: string; data: { month: string; value: number; value2?: number }[]; label1: string; label2?: string }> = {
  sales: {
    title: 'Laporan Penjualan',
    color: '#2563EB',
    label1: 'Revenue',
    label2: 'Target',
    data: [
      { month: 'Jan', value: 4200000000, value2: 4000000000 },
      { month: 'Feb', value: 3800000000, value2: 4000000000 },
      { month: 'Mar', value: 5100000000, value2: 4500000000 },
      { month: 'Apr', value: 4600000000, value2: 4500000000 },
      { month: 'Mei', value: 5800000000, value2: 5000000000 },
    ],
  },
  finance: {
    title: 'Laporan Keuangan',
    color: '#22C55E',
    label1: 'Cash In',
    label2: 'Cash Out',
    data: [
      { month: 'Jan', value: 4200000000, value2: 2800000000 },
      { month: 'Feb', value: 3800000000, value2: 2400000000 },
      { month: 'Mar', value: 5100000000, value2: 3200000000 },
      { month: 'Apr', value: 4600000000, value2: 2900000000 },
      { month: 'Mei', value: 5800000000, value2: 3200000000 },
    ],
  },
  purchasing: {
    title: 'Laporan Pembelian',
    color: '#F59E0B',
    label1: 'Total PO',
    data: [
      { month: 'Jan', value: 1800000000 },
      { month: 'Feb', value: 1500000000 },
      { month: 'Mar', value: 2100000000 },
      { month: 'Apr', value: 1900000000 },
      { month: 'Mei', value: 2400000000 },
    ],
  },
  inventory: {
    title: 'Laporan Inventori',
    color: '#8B5CF6',
    label1: 'Stock In',
    label2: 'Stock Out',
    data: [
      { month: 'Jan', value: 120, value2: 95 },
      { month: 'Feb', value: 98, value2: 87 },
      { month: 'Mar', value: 145, value2: 112 },
      { month: 'Apr', value: 132, value2: 108 },
      { month: 'Mei', value: 158, value2: 124 },
    ],
  },
};

const summaryRows: Record<ReportType, { label: string; value: string; trend: string; up: boolean }[]> = {
  sales: [
    { label: 'Total Revenue', value: 'Rp 23,5M', trend: '+14,2%', up: true },
    { label: 'Total Penawaran', value: '148', trend: '+8 vs bulan lalu', up: true },
    { label: 'Conversion Rate', value: '31,8%', trend: '+2,1%', up: true },
    { label: 'Avg Deal Size', value: 'Rp 124,3Jt', trend: '+8,4%', up: true },
  ],
  finance: [
    { label: 'Total Cash In', value: 'Rp 23,5M', trend: '+12%', up: true },
    { label: 'Total Cash Out', value: 'Rp 14,5M', trend: '-5%', up: false },
    { label: 'Net Cashflow', value: 'Rp 9,0M', trend: '+18%', up: true },
    { label: 'Outstanding AR', value: 'Rp 8,4M', trend: '-3%', up: false },
  ],
  purchasing: [
    { label: 'Total PO', value: 'Rp 9,8M', trend: '+6%', up: true },
    { label: 'Jumlah PO', value: '19', trend: '+3 vs bulan lalu', up: true },
    { label: 'Avg PO Value', value: 'Rp 516Jt', trend: '+2,1%', up: true },
    { label: 'Outstanding AP', value: 'Rp 5,8M', trend: '+8%', up: false },
  ],
  inventory: [
    { label: 'Total Item', value: '312', trend: '+12 item baru', up: true },
    { label: 'Stock In', value: '653 unit', trend: '+47 bulan ini', up: true },
    { label: 'Stock Out', value: '526 unit', trend: '+38 bulan ini', up: true },
    { label: 'Low Stock Alert', value: '18 item', trend: '+3 vs bulan lalu', up: false },
  ],
};

const formatVal = (val: number, type: ReportType) => {
  if (type === 'inventory') return val.toLocaleString('id-ID');
  return `Rp ${(val / 1000000000).toFixed(1)}M`;
};

export default function ReportsModule({ reportType }: ReportsModuleProps) {
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-05-31');
  const config = reportConfig[reportType];
  const summary = summaryRows[reportType];

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="erp-card shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <span className="text-[13px] font-600 text-foreground">Filter Laporan</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Dari:</label>
            <input type="date" className="erp-input w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Sampai:</label>
            <input type="date" className="erp-input w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <select className="erp-input min-w-[140px]">
            <option>Semua Cabang</option>
            <option>Jakarta</option>
            <option>Surabaya</option>
            <option>Bandung</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <button className="btn-secondary"><Download size={14} /> Export Excel</button>
            <button className="btn-secondary"><FileText size={14} /> Export PDF</button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summary.map((item, i) => (
          <div key={i} className="erp-card shadow-card">
            <p className="text-xs text-muted-foreground font-500 mb-1">{item.label}</p>
            <p className="text-2xl font-800 text-foreground font-tabular">{item.value}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs font-500 ${item.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {item.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {item.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="erp-card shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[13px] font-700 text-foreground">{config.title}</h3>
            <p className="text-xs text-muted-foreground">Trend 5 bulan terakhir</p>
          </div>
          <BarChart2 size={16} className="text-muted-foreground" />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={config.data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis tickFormatter={(v) => formatVal(v, reportType)} tick={{ fontSize: 10, fill: '#64748B' }} width={65} />
            <Tooltip formatter={(v: number) => formatVal(v, reportType)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="value" name={config.label1} fill={config.color} radius={[3, 3, 0, 0]} />
            {config.label2 && <Bar dataKey="value2" name={config.label2} fill="#E2E8F0" radius={[3, 3, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
