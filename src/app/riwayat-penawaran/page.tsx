'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import RiwayatSummaryCards from './components/RiwayatSummaryCards';
import RiwayatPenawaranTable from './components/RiwayatPenawaranTable';
import { quotationService } from '@/services/quotation.service';
import type { QuotationListItem } from '@/types';
import { toast } from 'sonner';

export default function RiwayatPenawaranPage() {
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotations = () => {
    setLoading(true);
    quotationService.list({ perPage: 200 })
      .then((res) => setQuotations(res.data))
      .catch(() => toast.error('Gagal memuat data penawaran'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQuotations(); }, []);

  return (
    <AppLayout
      title="Riwayat Penawaran"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Penawaran' }, { label: 'Riwayat Penawaran' }]}
    >
      <div className="space-y-5">
        <RiwayatSummaryCards quotations={quotations} loading={loading} />
        <RiwayatPenawaranTable quotations={quotations} loading={loading} onRefresh={fetchQuotations} />
      </div>
    </AppLayout>
  );
}
