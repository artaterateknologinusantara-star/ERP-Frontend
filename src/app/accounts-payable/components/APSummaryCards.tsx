import React from 'react';
import { CreditCard, AlertCircle, Clock, CheckCircle } from 'lucide-react';

const cards = [
  { id: 'ap-total', label: 'Total AP', value: 'Rp 5,8M', sub: 'Semua hutang aktif', icon: <CreditCard size={16} />, iconBg: 'bg-blue-50', iconColor: 'text-primary' },
  { id: 'ap-overdue', label: 'Overdue AP', value: 'Rp 820Jt', sub: '4 invoice jatuh tempo', icon: <AlertCircle size={16} />, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
  { id: 'ap-upcoming', label: 'Jatuh Tempo 7 Hari', value: 'Rp 1,4M', sub: 'Perlu dibayar segera', icon: <Clock size={16} />, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { id: 'ap-paid', label: 'Dibayar Bulan Ini', value: 'Rp 2,1M', sub: 'Pembayaran keluar', icon: <CheckCircle size={16} />, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
];

export default function APSummaryCards() {
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
