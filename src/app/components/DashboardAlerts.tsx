import React from 'react';
import { AlertTriangle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

const alerts = [
  {
    id: 'alert-001',
    type: 'warning' as const,
    title: 'Q.SYN-26.0139 kadaluarsa besok',
    desc: 'PT Mandiri Sekuritas — Rp 280Jt',
    time: '1 hari lagi',
    icon: <AlertTriangle size={14} />,
  },
  {
    id: 'alert-002',
    type: 'warning' as const,
    title: 'Q.SYN-26.0136 kadaluarsa 3 hari',
    desc: 'PT XL Axiata — Rp 145Jt',
    time: '3 hari lagi',
    icon: <Clock size={14} />,
  },
  {
    id: 'alert-003',
    type: 'success' as const,
    title: 'Q.SYN-26.0144 disetujui klien',
    desc: 'PT Pertamina — Rp 930Jt',
    time: '2 jam lalu',
    icon: <CheckCircle2 size={14} />,
  },
  {
    id: 'alert-004',
    type: 'warning' as const,
    title: 'Q.SYN-26.0132 kadaluarsa 5 hari',
    desc: 'PT Jasa Marga — Rp 390Jt',
    time: '5 hari lagi',
    icon: <Clock size={14} />,
  },
  {
    id: 'alert-005',
    type: 'info' as const,
    title: 'Revisi ke-3 Q.SYN-26.0140',
    desc: 'PT Semen Indonesia — menunggu approval',
    time: '5 jam lalu',
    icon: <RefreshCw size={14} />,
  },
];

const typeStyles = {
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  success: 'bg-green-50 border-green-200 text-green-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
};

export default function DashboardAlerts() {
  return (
    <div className="erp-card shadow-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-700 text-foreground">Notifikasi & Peringatan</h3>
        <span className="bg-amber-100 text-amber-700 text-xs font-700 px-2 py-0.5 rounded-full">4 aktif</span>
      </div>
      <div className="space-y-2.5">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-2.5 p-3 rounded-lg border ${typeStyles[alert.type]} cursor-pointer hover:opacity-90 transition-opacity`}
          >
            <span className="mt-0.5 flex-shrink-0">{alert.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-600 leading-tight">{alert.title}</p>
              <p className="text-xs mt-0.5 opacity-80 truncate">{alert.desc}</p>
            </div>
            <span className="text-2xs font-500 opacity-70 flex-shrink-0 whitespace-nowrap">{alert.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}