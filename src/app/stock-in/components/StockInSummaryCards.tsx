'use client';

import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, XCircle, DollarSign } from 'lucide-react';
import { getInventoryStats, InventoryStats } from '@/services/inventory.service';
import { formatRp } from '@/lib/format';

interface StockInSummaryCardsProps {
  refreshKey?: number;
}

export default function StockInSummaryCards({ refreshKey }: StockInSummaryCardsProps) {
  const [stats, setStats] = useState<InventoryStats | null>(null);

  useEffect(() => {
    getInventoryStats().then(setStats).catch(() => {});
  }, [refreshKey]);

  const cards = [
    {
      id: 'si-total',
      label: 'Total Item Aktif',
      value: stats ? stats.activeItems.toLocaleString('id-ID') : '—',
      sub: `${stats ? stats.totalItems.toLocaleString('id-ID') : '—'} total item`,
      icon: <Package size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary',
    },
    {
      id: 'si-low',
      label: 'Stok Menipis',
      value: stats ? stats.lowStockItems.toLocaleString('id-ID') : '—',
      sub: 'Di bawah minimum',
      icon: <AlertTriangle size={16} />,
      iconBg: stats && stats.lowStockItems > 0 ? 'bg-amber-50' : 'bg-muted',
      iconColor: stats && stats.lowStockItems > 0 ? 'text-amber-600' : 'text-muted-foreground',
    },
    {
      id: 'si-empty',
      label: 'Habis',
      value: stats ? stats.outOfStockItems.toLocaleString('id-ID') : '—',
      sub: 'Stok = 0',
      icon: <XCircle size={16} />,
      iconBg: stats && stats.outOfStockItems > 0 ? 'bg-red-50' : 'bg-muted',
      iconColor: stats && stats.outOfStockItems > 0 ? 'text-red-500' : 'text-muted-foreground',
    },
    {
      id: 'si-value',
      label: 'Nilai Stok Total',
      value: stats ? formatRp(stats.totalStockValue, true) : '—',
      sub: 'HPP × Stok',
      icon: <DollarSign size={16} />,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
