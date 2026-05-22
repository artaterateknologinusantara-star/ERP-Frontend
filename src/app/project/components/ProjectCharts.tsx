'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const statusData = [
  { name: 'Running', value: 12, color: '#22C55E' },
  { name: 'Planning', value: 3, color: '#2563EB' },
  { name: 'On Hold', value: 3, color: '#F59E0B' },
  { name: 'Completed', value: 9, color: '#64748B' },
];

export default function ProjectCharts() {
  return (
    <div className="erp-card shadow-card h-full">
      <h3 className="text-[13px] font-700 text-foreground mb-1">Status Proyek</h3>
      <p className="text-xs text-muted-foreground mb-4">Distribusi status proyek aktif</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
            {statusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(val: number) => [`${val} proyek`, '']} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        {statusData.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
            <span className="text-xs font-700 text-foreground">{item.value} proyek</span>
          </div>
        ))}
      </div>
    </div>
  );
}
