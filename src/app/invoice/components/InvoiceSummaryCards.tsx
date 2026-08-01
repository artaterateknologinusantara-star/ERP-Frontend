'use client';

import React, { useState, useEffect } from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { SummaryCardData } from '@/types';
import { Receipt, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { getInvoiceStats, InvoiceStats } from '@/services/invoice.service';

export default function InvoiceSummaryCards() {
  const [stats, setStats] = useState<InvoiceStats | null>(null);

  useEffect(() => {
    getInvoiceStats().then(setStats).catch(() => {});
  }, []);

  const s = stats;
  const isOverdue = s ? s.overdue > 0 : false;

  const cards: SummaryCardData[] = [
    {
      id: 'inv-total',
      label: 'Total Invoice',
      value: s ? String(s.total) : '0',
      sub: 'Semua invoice',
      icon: <Receipt size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary',
    },
    {
      id: 'inv-outstanding',
      label: 'Outstanding',
      value: s ? String(s.outstanding) : '0',
      sub: 'Belum terbayar',
      icon: <Clock size={16} />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      id: 'inv-overdue',
      label: 'Overdue',
      value: s ? String(s.overdue) : '0',
      sub: isOverdue ? 'Perlu tindak lanjut' : 'Semua tepat waktu',
      icon: <AlertCircle size={16} />,
      iconBg: isOverdue ? 'bg-red-50' : 'bg-green-50',
      iconColor: isOverdue ? 'text-red-500' : 'text-green-600',
    },
    {
      id: 'inv-collected',
      label: 'Total Terkumpul',
      value: s ? 'Rp ' + s.totalCollected.toLocaleString('id-ID') : 'Rp 0',
      sub: 'Total pembayaran diterima',
      icon: <CheckCircle size={16} />,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
  ];

  return <SummaryCards cards={cards} />;
}
