'use client';

import React, { useState, useEffect } from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { SummaryCardData } from '@/types';
import { FileText, Clock, Send, CheckCircle, XCircle } from 'lucide-react';
import { getPRStats, PurchaseRequestStats } from '@/services/purchase.service';

export default function PurchaseRequestSummaryCards() {
  const [stats, setStats] = useState<PurchaseRequestStats | null>(null);

  useEffect(() => {
    getPRStats().then(setStats).catch(() => {});
  }, []);

  const s = stats;

  const cards: SummaryCardData[] = [
    {
      id: 'pr-total',
      label: 'Total PR',
      value: s ? String(s.total) : '0',
      sub: 'Semua purchase request',
      icon: <FileText size={16} />,
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-500',
    },
    {
      id: 'pr-draft',
      label: 'Draft',
      value: s ? String(s.draft) : '0',
      sub: 'Belum diajukan',
      icon: <Clock size={16} />,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-500',
    },
    {
      id: 'pr-submitted',
      label: 'Diajukan',
      value: s ? String(s.submitted) : '0',
      sub: 'Menunggu approval',
      icon: <Send size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary',
    },
    {
      id: 'pr-approved',
      label: 'Disetujui',
      value: s ? String(s.approved) : '0',
      sub: 'Siap dibuat PO',
      icon: <CheckCircle size={16} />,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      id: 'pr-rejected',
      label: 'Ditolak',
      value: s ? String(s.rejected) : '0',
      sub: 'Perlu revisi',
      icon: <XCircle size={16} />,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
    },
  ];

  return <SummaryCards cards={cards} cols={5} />;
}
