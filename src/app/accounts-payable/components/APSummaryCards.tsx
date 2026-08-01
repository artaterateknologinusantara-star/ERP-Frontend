'use client';

import React, { useState, useEffect } from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { SummaryCardData } from '@/types';
import { CreditCard, Package, Truck, AlertTriangle } from 'lucide-react';
import { formatRp } from '@/lib/format';
import { getAPStats, APStats } from '@/services/finance.service';

export default function APSummaryCards() {
  const [stats, setStats] = useState<APStats | null>(null);

  useEffect(() => {
    getAPStats().then(setStats).catch(() => {});
  }, []);

  const s = stats;

  const cards: SummaryCardData[] = [
    {
      id: 'ap-total',
      label: 'Total Hutang',
      value: s ? formatRp(s.totalPending) : 'Rp 0',
      sub: `${s?.totalPos ?? 0} purchase order`,
      icon: <CreditCard size={16} />,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    {
      id: 'ap-ordered',
      label: 'Dipesan',
      value: s ? formatRp(s.ordered) : 'Rp 0',
      sub: 'Menunggu pengiriman',
      icon: <Package size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary',
    },
    {
      id: 'ap-partial',
      label: 'Partial Terima',
      value: s ? formatRp(s.partialReceive) : 'Rp 0',
      sub: 'Sebagian diterima',
      icon: <Truck size={16} />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      id: 'ap-overdue-delivery',
      label: 'Terlambat Kirim',
      value: s ? `${s.overdueDelivery} PO` : '0 PO',
      sub: 'Delivery date terlewat',
      icon: <AlertTriangle size={16} />,
      iconBg: s?.overdueDelivery ? 'bg-red-50' : 'bg-gray-50',
      iconColor: s?.overdueDelivery ? 'text-red-600' : 'text-gray-400',
    },
  ];

  return <SummaryCards cards={cards} />;
}
