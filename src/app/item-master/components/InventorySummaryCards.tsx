'use client';

import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle, TrendingDown } from 'lucide-react';
import { itemMasterService, ItemMasterStats } from '@/services/itemmaster.service';

export default function InventorySummaryCards() {
  const [stats, setStats] = useState<ItemMasterStats | null>(null);

  useEffect(() => {
    itemMasterService.getStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const cards = [
    {
      id: 'inv-total',
      label: 'Total Item Aktif',
      value: stats ? stats.totalActive.toLocaleString('id-ID') : '—',
      sub: `${stats ? stats.totalAll.toLocaleString('id-ID') : '—'} total item`,
      icon: <Package size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary',
    },
    {
      id: 'inv-low',
      label: 'Low Stock',
      value: stats ? stats.lowStockCount.toLocaleString('id-ID') : '—',
      sub: 'Di bawah minimum',
      icon: <AlertTriangle size={16} />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      id: 'inv-margin',
      label: 'Margin di Bawah Minimum',
      value: stats ? stats.belowMinimumMarginCount.toLocaleString('id-ID') : '—',
      sub: 'Perlu direview',
      icon: <TrendingDown size={16} />,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    {
      id: 'inv-in',
      label: 'Stock In Bulan Ini',
      value: '—',
      sub: 'Penerimaan barang',
      icon: <ArrowDownCircle size={16} />,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      id: 'inv-out',
      label: 'Stock Out Bulan Ini',
      value: '—',
      sub: 'Pengeluaran barang',
      icon: <ArrowUpCircle size={16} />,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.id} className="erp-card shadow-card flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
            <span className={card.iconColor}>{card.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-500">{card.label}</p>
            <p className="text-2xl font-800 text-foreground font-tabular">{card.value}</p>
            <p className="text-xs text-muted-foreground truncate">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
