'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data12m = [
  { bulan: 'Jun', nilai: 8200, disetujui: 3100 },
  { bulan: 'Jul', nilai: 11400, disetujui: 4200 },
  { bulan: 'Agt', nilai: 9800, disetujui: 3600 },
  { bulan: 'Sep', nilai: 13200, disetujui: 5100 },
  { bulan: 'Okt', nilai: 10500, disetujui: 3800 },
  { bulan: 'Nov', nilai: 15800, disetujui: 6200 },
  { bulan: 'Des', nilai: 12300, disetujui: 4900 },
  { bulan: 'Jan', nilai: 17200, disetujui: 7100 },
  { bulan: 'Feb', nilai: 14600, disetujui: 5500 },
  { bulan: 'Mar', nilai: 19400, disetujui: 8200 },
  { bulan: 'Apr', nilai: 16800, disetujui: 6700 },
  { bulan: 'Mei', nilai: 18400, disetujui: 7400 },
];

const data6m = data12m.slice(6);
const data3m = data12m.slice(9);

const dataMap = { '12m': data12m, '6m': data6m, '3m': data3m };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-dropdown p-3 text-base">
      <p className="font-700 text-foreground mb-2">{label}</p>
      <p className="text-primary font-600">Pipeline: Rp {(payload[0]?.value || 0).toLocaleString('id-ID')}Jt</p>
      <p className="text-emerald-600 font-600">Disetujui: Rp {(payload[1]?.value || 0).toLocaleString('id-ID')}Jt</p>
    </div>
  );
};

export default function PipelineAreaChart({ period }: { period: '3m' | '6m' | '12m' }) {
  const chartData = dataMap[period] || data6m;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradDisetujui" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}Jt`} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="nilai" stroke="var(--primary)" strokeWidth={2} fill="url(#gradPipeline)" name="Pipeline" />
        <Area type="monotone" dataKey="disetujui" stroke="#16a34a" strokeWidth={2} fill="url(#gradDisetujui)" name="Disetujui" />
      </AreaChart>
    </ResponsiveContainer>
  );
}