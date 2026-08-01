'use client';

import React, { useState, useEffect } from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { SummaryCardData } from '@/types';
import { TrendingUp, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { formatRp } from '@/lib/format';
import { getARStats, ARStats } from '@/services/finance.service';

export default function ARSummaryCards() {
  const [stats, setStats] = useState<ARStats | null>(null);

  useEffect(() => {
    getARStats().then(setStats).catch(() => {});
  }, []);

  const s = stats;
  const overdue = s
    ? s.overdue1to30 + s.overdue31to60 + s.overdue61to90 + s.overdueOver90
    : 0;

  const cards: SummaryCardData[] = [
    {
      id: 'ar-outstanding',
      label: 'Total Outstanding',
      value: s ? formatRp(s.totalOutstanding) : 'Rp 0',
      sub: `${s?.totalInvoices ?? 0} invoice aktif`,
      icon: <TrendingUp size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary',
    },
    {
      id: 'ar-current',
      label: 'Current',
      value: s ? formatRp(s.current) : 'Rp 0',
      sub: 'Belum jatuh tempo',
      icon: <CheckCircle size={16} />,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      id: 'ar-overdue',
      label: 'Overdue',
      value: s ? formatRp(overdue) : 'Rp 0',
      sub: `${s?.overdueCount ?? 0} invoice terlambat`,
      icon: <AlertCircle size={16} />,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    {
      id: 'ar-count',
      label: 'Jumlah Invoice',
      value: s ? `${s.totalInvoices} invoice` : '0 invoice',
      sub: `${s?.overdueCount ?? 0} overdue`,
      icon: <FileText size={16} />,
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-500',
    },
  ];

  return <SummaryCards cards={cards} />;
}
