'use client';

import React, { useState, useEffect } from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { SummaryCardData } from '@/types';
import { ShoppingBag, Clock, Truck, CheckCircle, Package } from 'lucide-react';
import { getPOStats, PurchaseOrderStats } from '@/services/purchase.service';

export default function PurchaseOrderSummaryCards() {
  const [stats, setStats] = useState<PurchaseOrderStats | null>(null);

  useEffect(() => {
    getPOStats().then(setStats).catch(() => {});
  }, []);

  const s = stats;

  const cards: SummaryCardData[] = [
    {
      id: 'po-total',
      label: 'Total PO',
      value: s ? String(s.total) : '0',
      sub: 'Semua purchase order',
      icon: <ShoppingBag size={16} />,
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-500',
    },
    {
      id: 'po-draft',
      label: 'Draft',
      value: s ? String(s.draft) : '0',
      sub: 'Belum dikonfirmasi',
      icon: <Clock size={16} />,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-500',
    },
    {
      id: 'po-ordered',
      label: 'Dipesan',
      value: s ? String(s.ordered) : '0',
      sub: 'Menunggu pengiriman',
      icon: <Package size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary',
    },
    {
      id: 'po-partial',
      label: 'Partial Terima',
      value: s ? String(s.partialReceive) : '0',
      sub: 'Sebagian diterima',
      icon: <Truck size={16} />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      id: 'po-completed',
      label: 'Selesai',
      value: s ? String(s.completed) : '0',
      sub: 'Diterima penuh',
      icon: <CheckCircle size={16} />,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
  ];

  return <SummaryCards cards={cards} cols={5} />;
}
