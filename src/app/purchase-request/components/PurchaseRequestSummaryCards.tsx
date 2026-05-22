import React from 'react';
import { ClipboardList, Clock, CheckCircle, XCircle } from 'lucide-react';

const cards = [
  { id: 'pr-total', label: 'Total PR', value: '32', sub: 'Bulan ini', icon: <ClipboardList size={16} />, iconBg: 'bg-blue-50', iconColor: 'text-primary' },
  { id: 'pr-pending', label: 'Menunggu Approval', value: '8', sub: 'Perlu disetujui', icon: <Clock size={16} />, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { id: 'pr-approved', label: 'Disetujui', value: '19', sub: 'Siap diproses PO', icon: <CheckCircle size={16} />, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  { id: 'pr-rejected', label: 'Ditolak', value: '5', sub: 'Perlu revisi', icon: <XCircle size={16} />, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
];

export default function PurchaseRequestSummaryCards() {
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
