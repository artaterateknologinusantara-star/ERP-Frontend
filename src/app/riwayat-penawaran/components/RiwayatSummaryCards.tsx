import React from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { formatRp } from '@/lib/format';
import type { QuotationListItem, SummaryCardData } from '@/types';
import { FileText, TrendingUp, CheckCircle, Send } from 'lucide-react';

interface Props {
  quotations: QuotationListItem[];
  loading: boolean;
}

export default function RiwayatSummaryCards({ quotations, loading }: Props) {
  const latest = quotations.filter((q) => q.isLatestRevision);
  const total = latest.length;
  const totalNilai = latest.reduce((s, q) => s + q.grandTotal, 0);
  const disetujui = latest.filter((q) => q.status === 'Disetujui').length;
  const terkirim = latest.filter((q) => q.status === 'Terkirim').length;
  const approvalRate = total > 0 ? ((disetujui / total) * 100).toFixed(1) : '0';

  const dash = loading ? '—' : undefined;

  const cards: SummaryCardData[] = [
    {
      id: 'q-total',
      label: 'Total Penawaran',
      value: dash ?? String(total),
      sub: 'Sepanjang waktu',
      icon: <FileText size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary',
    },
    {
      id: 'q-nilai',
      label: 'Total Nilai',
      value: dash ?? formatRp(totalNilai, true),
      sub: 'Semua status',
      icon: <TrendingUp size={16} />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'q-disetujui',
      label: 'Disetujui',
      value: dash ?? String(disetujui),
      sub: dash ?? `${approvalRate}% approval rate`,
      icon: <CheckCircle size={16} />,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      id: 'q-terkirim',
      label: 'Terkirim',
      value: dash ?? String(terkirim),
      sub: 'Menunggu respons klien',
      icon: <Send size={16} />,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
    },
  ];

  return <SummaryCards cards={cards} />;
}
