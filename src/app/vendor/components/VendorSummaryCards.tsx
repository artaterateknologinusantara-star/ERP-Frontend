import React from 'react';
import { Truck, CheckCircle, Star, Package } from 'lucide-react';

const cards = [
  { id: 'vnd-total', label: 'Total Vendor', value: '24', sub: 'Vendor aktif', icon: <Truck size={16} />, iconBg: 'bg-blue-50', iconColor: 'text-primary' },
  { id: 'vnd-active', label: 'Vendor Aktif', value: '18', sub: 'Transaksi bulan ini', icon: <CheckCircle size={16} />, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  { id: 'vnd-preferred', label: 'Preferred Vendor', value: '7', sub: 'Rating tertinggi', icon: <Star size={16} />, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { id: 'vnd-items', label: 'Total Item Vendor', value: '312', sub: 'Produk tersedia', icon: <Package size={16} />, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
];

export default function VendorSummaryCards() {
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
