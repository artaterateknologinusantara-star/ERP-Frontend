import React from 'react';
import { FolderKanban, Play, PauseCircle, CheckCircle } from 'lucide-react';

const cards = [
  { id: 'prj-total', label: 'Total Proyek', value: '24', sub: 'Semua status', icon: <FolderKanban size={16} />, iconBg: 'bg-blue-50', iconColor: 'text-primary' },
  { id: 'prj-running', label: 'Running', value: '12', sub: 'Sedang berjalan', icon: <Play size={16} />, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  { id: 'prj-hold', label: 'On Hold', value: '3', sub: 'Ditunda sementara', icon: <PauseCircle size={16} />, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { id: 'prj-completed', label: 'Completed', value: '9', sub: 'Selesai bulan ini', icon: <CheckCircle size={16} />, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
];

export default function ProjectSummaryCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards?.map((card) => (
        <div key={card?.id} className="erp-card shadow-card flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${card?.iconBg} flex items-center justify-center flex-shrink-0`}>
            <span className={card?.iconColor}>{card?.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-500">{card?.label}</p>
            <p className="text-2xl font-800 text-foreground font-tabular">{card?.value}</p>
            <p className="text-xs text-muted-foreground truncate">{card?.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
