'use client';

import React, { useState, useEffect } from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { SummaryCardData } from '@/types';
import { FileText, Clock, Truck, CheckCircle } from 'lucide-react';
import { getSalesOrderStats, SalesOrderStats } from '@/services/salesorder.service';

export default function SalesOrderSummaryCards() {
  const [stats, setStats] = useState<SalesOrderStats | null>(null);

  useEffect(() => {
    getSalesOrderStats().then(setStats).catch(() => {});
  }, []);

  const s = stats;

  const cards: SummaryCardData[] = [
    {
      id: 'so-total',
      label: 'Total SO',
      value: s ? String(s.total) : '0',
      sub: 'Semua sales order',
      icon: <FileText size={16} />,
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-500',
    },
    {
      id: 'so-open',
      label: 'Open',
      value: s ? String(s.open) : '0',
      sub: 'Sedang berjalan',
      icon: <Clock size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary',
    },
    {
      id: 'so-delivered',
      label: 'Delivered',
      value: s ? String(s.delivered) : '0',
      sub: 'Sudah dikirim',
      icon: <Truck size={16} />,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'so-completed',
      label: 'Completed Bln Ini',
      value: s ? String(s.completedThisMonth) : '0',
      sub: 'Selesai bulan ini',
      icon: <CheckCircle size={16} />,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
  ];

  return <SummaryCards cards={cards} />;
}
