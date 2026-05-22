'use client';

import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const cashflowData = [
  { month: 'Jan', cashIn: 4200000000, cashOut: 2800000000 },
  { month: 'Feb', cashIn: 3800000000, cashOut: 2400000000 },
  { month: 'Mar', cashIn: 5100000000, cashOut: 3200000000 },
  { month: 'Apr', cashIn: 4600000000, cashOut: 2900000000 },
  { month: 'Mei', cashIn: 5800000000, cashOut: 3200000000 },
];

const formatBillion = (val: number) => `Rp ${(val / 1000000000).toFixed(1)}M`;

export default function FinanceCharts() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <div className="erp-card shadow-card">
        <h3 className="text-[13px] font-700 text-foreground mb-1">Cashflow Trend</h3>
        <p className="text-xs text-muted-foreground mb-4">Cash In vs Cash Out — 5 bulan terakhir</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={cashflowData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cashInGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cashOutGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis tickFormatter={formatBillion} tick={{ fontSize: 10, fill: '#64748B' }} width={60} />
            <Tooltip formatter={(val: number) => formatBillion(val)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="cashIn" name="Cash In" stroke="#2563EB" fill="url(#cashInGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="cashOut" name="Cash Out" stroke="#EF4444" fill="url(#cashOutGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="erp-card shadow-card">
        <h3 className="text-[13px] font-700 text-foreground mb-1">Revenue vs Expense</h3>
        <p className="text-xs text-muted-foreground mb-4">Perbandingan pendapatan dan pengeluaran</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={cashflowData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis tickFormatter={formatBillion} tick={{ fontSize: 10, fill: '#64748B' }} width={60} />
            <Tooltip formatter={(val: number) => formatBillion(val)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="cashIn" name="Revenue" fill="#2563EB" radius={[3, 3, 0, 0]} />
            <Bar dataKey="cashOut" name="Expense" fill="#EF4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
