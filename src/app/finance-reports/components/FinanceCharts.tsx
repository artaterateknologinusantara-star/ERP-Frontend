'use client';

import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getMonthlyChart, MonthlyChartItem } from '@/services/finance.service';

const formatAxis = (val: number): string => {
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000)     return `${(val / 1_000_000).toFixed(0)}jt`;
  if (abs >= 1_000)         return `${(val / 1_000).toFixed(0)}rb`;
  return String(val);
};

const formatTooltip = (val: number): string => {
  return 'Rp ' + Math.abs(val).toLocaleString('id-ID');
};

export default function FinanceCharts() {
  const [data, setData]     = useState<MonthlyChartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMonthlyChart()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="erp-card">
        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
          Memuat chart...
        </div>
      </div>
    );
  }

  return (
    <div className="erp-card">
      <h3 className="text-[13px] font-700 text-foreground mb-1">Cashflow — 6 Bulan Terakhir</h3>
      <p className="text-xs text-muted-foreground mb-4">Cash In, Cash Out, dan Net per bulan</p>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
          <YAxis tickFormatter={formatAxis} tick={{ fontSize: 10, fill: '#64748B' }} width={65} />
          <Tooltip
            formatter={(val: number, name: string) => [formatTooltip(val), name]}
            labelFormatter={(label) => `Bulan: ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="cashIn"  name="Cash In"  fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={40} />
          <Bar dataKey="cashOut" name="Cash Out" fill="#dc2626" radius={[3, 3, 0, 0]} maxBarSize={40} />
          <Line
            type="monotone"
            dataKey="net"
            name="Net"
            stroke="#2563EB"
            strokeWidth={2}
            dot={{ r: 4, fill: '#2563EB' }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
