'use client';

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getMonthlyChart, MonthlyChartItem } from '@/services/finance.service';

interface ChartRow { bulan: string; cashIn: number; cashOut: number; }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) => `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  return (
    <div className="bg-card border border-border rounded-lg shadow-dropdown p-3 text-[13px]">
      <p className="font-700 text-foreground mb-2">{label}</p>
      <p className="text-emerald-600 font-600">Cash In: {fmt(payload[0]?.value ?? 0)}</p>
      <p className="text-red-500 font-600">Cash Out: {fmt(payload[1]?.value ?? 0)}</p>
    </div>
  );
};

export default function PipelineAreaChart({ period }: { period: '3m' | '6m' | '12m' }) {
  const [allData, setAllData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMonthlyChart()
      .then((data: MonthlyChartItem[]) =>
        setAllData(data.map((d) => ({ bulan: d.month, cashIn: d.cashIn, cashOut: d.cashOut })))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sliceMap = { '3m': -3, '6m': -6, '12m': -12 } as const;
  const chartData = allData.slice(sliceMap[period]);

  if (loading) {
    return <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Memuat chart...</div>;
  }

  if (chartData.length === 0) {
    return <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Belum ada data cashflow</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCashIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradCashOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : `${(v / 1_000).toFixed(0)}rb`} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="cashIn" stroke="#16a34a" strokeWidth={2} fill="url(#gradCashIn)" name="Cash In" />
        <Area type="monotone" dataKey="cashOut" stroke="#dc2626" strokeWidth={2} fill="url(#gradCashOut)" name="Cash Out" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
