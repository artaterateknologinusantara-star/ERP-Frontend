'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import { Eye, ArrowRight } from 'lucide-react';
import { quotationService } from '@/services/quotation.service';
import { formatRp } from '@/lib/format';
import type { QuotationListItem, QuotationStatus } from '@/types';

export default function DashboardRecentTable() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quotationService.list({ perPage: 8 })
      .then((res) => setQuotations(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="erp-card shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-700 text-foreground">Penawaran Terbaru</h3>
          <p className="text-base text-muted-foreground mt-0.5">8 penawaran terakhir</p>
        </div>
        <Link href="/riwayat-penawaran" className="flex items-center gap-1 text-primary text-base font-600 hover:underline">
          Lihat Semua <ArrowRight size={14} />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-border">
              {['No. Penawaran', 'Pelanggan', 'Total', 'Status', 'Sales', ''].map((h) => (
                <th key={h} className="text-left erp-table-cell text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="erp-table-cell py-3">
                      <div className="h-3.5 bg-muted animate-pulse rounded w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : quotations.length === 0 ? (
              <tr><td colSpan={6} className="erp-table-cell text-center text-muted-foreground py-8">Belum ada penawaran</td></tr>
            ) : quotations.map((q, i) => (
              <tr
                key={q.id}
                className={`border-b border-border hover:bg-muted/50 transition-colors cursor-pointer ${i % 2 !== 0 ? 'bg-muted/20' : ''}`}
                onClick={() => router.push(q.status === 'Draft' ? `/buat-penawaran-baru?id=${q.id}` : '/riwayat-penawaran')}
              >
                <td className="erp-table-cell font-600 text-primary">{q.no}</td>
                <td className="erp-table-cell text-foreground">{q.customerName}</td>
                <td className="erp-table-cell font-600 text-foreground font-tabular">{formatRp(q.grandTotal)}</td>
                <td className="erp-table-cell"><StatusBadge status={q.status as QuotationStatus} size="sm" /></td>
                <td className="erp-table-cell text-muted-foreground">{q.salesName}</td>
                <td className="erp-table-cell" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={q.status === 'Draft' ? `/buat-penawaran-baru?id=${q.id}` : `/riwayat-penawaran`}
                    className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors inline-flex"
                  >
                    <Eye size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
