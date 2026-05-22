'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const data = [
  { bulan: 'Des', Draft: 8, Terkirim: 12, Disetujui: 7, Ditolak: 3 },
  { bulan: 'Jan', Draft: 11, Terkirim: 9, Disetujui: 8, Ditolak: 2 },
  { bulan: 'Feb', Draft: 7, Terkirim: 14, Disetujui: 6, Ditolak: 4 },
  { bulan: 'Mar', Draft: 13, Terkirim: 11, Disetujui: 9, Ditolak: 1 },
  { bulan: 'Apr', Draft: 9, Terkirim: 10, Disetujui: 8, Ditolak: 3 },
  { bulan: 'Mei', Draft: 12, Terkirim: 8, Disetujui: 7, Ditolak: 2 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-dropdown p-3 text-base">
      <p className="font-700 text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={`tt-${p.name}`} style={{ color: p.color }} className="font-500">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function StatusBarChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={8} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Draft" fill="#94a3b8" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Terkirim" fill="var(--primary)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Disetujui" fill="#16a34a" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Ditolak" fill="#dc2626" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}