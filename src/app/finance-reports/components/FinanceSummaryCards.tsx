import React from 'react';
import { Banknote, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const cards = [
  { id: 'fin-cash', label: 'Cash Balance', value: 'Rp 2,4M', sub: 'Saldo kas saat ini', icon: <Banknote size={16} />, iconBg: 'bg-blue-50', iconColor: 'text-primary' },
  { id: 'fin-revenue', label: 'Revenue Bulan Ini', value: 'Rp 5,8M', sub: '+12% vs bulan lalu', icon: <TrendingUp size={16} />, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  { id: 'fin-expense', label: 'Pengeluaran Bulan Ini', value: 'Rp 3,2M', sub: '-5% vs bulan lalu', icon: <TrendingDown size={16} />, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
  { id: 'fin-net', label: 'Net Cashflow', value: 'Rp 2,6M', sub: 'Surplus bulan ini', icon: <DollarSign size={16} />, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
];

export default function FinanceSummaryCards() {
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
