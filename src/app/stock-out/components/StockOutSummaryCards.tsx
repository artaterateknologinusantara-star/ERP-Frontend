'use client';

import React, { useEffect, useState } from 'react';
import { Truck, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getInventoryStats, InventoryStats } from '@/services/inventory.service';

interface Props {
  refreshKey?: number;
}

export default function StockOutSummaryCards({ refreshKey }: Props) {
  const [stats, setStats] = useState<InventoryStats | null>(null);

  useEffect(() => {
    getInventoryStats().then(setStats).catch(() => {});
  }, [refreshKey]);

  const totalDO = stats ? stats.pendingDOs + stats.activeDOs : 0;

  const cards = [
    {
      id: 'do-total',
      label: 'Total DO',
      value: stats ? totalDO.toLocaleString('id-ID') : '—',
      sub: 'Semua Delivery Order',
      icon: <Truck size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary',
    },
    {
      id: 'do-draft',
      label: 'Draft',
      value: stats ? stats.pendingDOs.toLocaleString('id-ID') : '—',
      sub: 'Belum dikonfirmasi',
      icon: <FileText size={16} />,
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
    },
    {
      id: 'do-confirmed',
      label: 'Confirmed',
      value: stats ? stats.activeDOs.toLocaleString('id-ID') : '—',
      sub: 'Stok sudah dikurangi',
      icon: <CheckCircle2 size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      id: 'do-lowstock',
      label: 'Stok Menipis',
      value: stats ? stats.lowStockItems.toLocaleString('id-ID') : '—',
      sub: 'Item di bawah minimum',
      icon: <AlertTriangle size={16} />,
      iconBg: stats && stats.lowStockItems > 0 ? 'bg-amber-50' : 'bg-muted',
      iconColor: stats && stats.lowStockItems > 0 ? 'text-amber-600' : 'text-muted-foreground',
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
