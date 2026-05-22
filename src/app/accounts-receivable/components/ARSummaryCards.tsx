import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Users } from 'lucide-react';

const cards = [
  { id: 'ar-total', label: 'Total AR', value: 'Rp 8,4M', sub: 'Semua piutang aktif', icon: <TrendingUp size={16} />, iconBg: 'bg-blue-50', iconColor: 'text-primary' },
  { id: 'ar-overdue', label: 'Overdue AR', value: 'Rp 1,2M', sub: '7 invoice jatuh tempo', icon: <AlertCircle size={16} />, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
  { id: 'ar-received', label: 'Diterima Bulan Ini', value: 'Rp 3,6M', sub: 'Pembayaran masuk', icon: <CheckCircle size={16} />, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  { id: 'ar-customers', label: 'Customer Outstanding', value: '18', sub: 'Pelanggan aktif', icon: <Users size={16} />, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
];

export default function ARSummaryCards() {
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
