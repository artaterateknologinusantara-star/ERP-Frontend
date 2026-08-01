'use client';

import React, { useState, useEffect } from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { SummaryCardData } from '@/types';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { formatRp } from '@/lib/format';
import { getFinanceSummary, FinanceSummary } from '@/services/finance.service';

export default function FinanceSummaryCards() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  useEffect(() => {
    getFinanceSummary().then(setSummary).catch(() => {});
  }, []);

  const s = summary;
  const net = s?.netCashThisMonth ?? 0;

  const cards: SummaryCardData[] = [
    {
      id: 'fin-cash-in',
      label: 'Cash In Bulan Ini',
      value: s ? formatRp(s.totalCashInThisMonth) : 'Rp 0',
      sub: `Total: ${s ? formatRp(s.totalCashInAllTime) : 'Rp 0'}`,
      icon: <TrendingUp size={16} />,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      id: 'fin-cash-out',
      label: 'Cash Out Bulan Ini',
      value: s ? formatRp(s.totalCashOutThisMonth) : 'Rp 0',
      sub: `Total: ${s ? formatRp(s.totalCashOutAllTime) : 'Rp 0'}`,
      icon: <TrendingDown size={16} />,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    {
      id: 'fin-net',
      label: 'Net Bulan Ini',
      value: s ? formatRp(Math.abs(net)) : 'Rp 0',
      sub: net >= 0 ? 'Surplus' : 'Defisit',
      icon: <DollarSign size={16} />,
      iconBg: net >= 0 ? 'bg-emerald-50' : 'bg-red-50',
      iconColor: net >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
    {
      id: 'fin-ar',
      label: 'Total AR Outstanding',
      value: s ? formatRp(s.totalAR) : 'Rp 0',
      sub: `Overdue: ${s ? formatRp(s.overdueAR) : 'Rp 0'}`,
      icon: <AlertCircle size={16} />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  return <SummaryCards cards={cards} />;
}
