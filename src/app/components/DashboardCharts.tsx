'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const PipelineAreaChart = dynamic(() => import('./charts/PipelineAreaChart'), { ssr: false });
const StatusBarChart = dynamic(() => import('./charts/StatusBarChart'), { ssr: false });

export default function DashboardCharts() {
  const [period, setPeriod] = useState<'3m' | '6m' | '12m'>('6m');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 2xl:grid-cols-5 gap-5">
      {/* Pipeline Chart — spans 3 cols */}
      <div className="xl:col-span-3 erp-card shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-700 text-foreground">Nilai Pipeline Penawaran</h3>
            <p className="text-base text-muted-foreground mt-0.5">Nilai kumulatif per bulan (Rp Juta)</p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['3m', '6m', '12m'] as const).map((p) => (
              <button
                key={`period-${p}`}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-600 transition-all ${period === p ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {p === '3m' ? '3 Bln' : p === '6m' ? '6 Bln' : '12 Bln'}
              </button>
            ))}
          </div>
        </div>
        <PipelineAreaChart period={period} />
      </div>

      {/* Status Bar Chart — spans 2 cols */}
      <div className="xl:col-span-2 erp-card shadow-card">
        <div className="mb-4">
          <h3 className="text-xl font-700 text-foreground">Distribusi Status</h3>
          <p className="text-base text-muted-foreground mt-0.5">Penawaran per status, 6 bulan terakhir</p>
        </div>
        <StatusBarChart />
      </div>
    </div>
  );
}