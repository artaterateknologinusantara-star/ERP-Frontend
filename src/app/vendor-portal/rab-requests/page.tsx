'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import VendorShell from '@/components/vendor/VendorShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { vendorRabRequestService } from '@/services/vendorRabRequest.service';
import { formatDate } from '@/lib/format';
import { useVendorAuth } from '@/hooks/useVendorAuth';

function VendorRabRequestsList() {
  const router = useRouter();
  const { loading } = useVendorAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-rab-requests'],
    queryFn: () => vendorRabRequestService.list(),
    enabled: !loading,
  });

  const requests = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-700 text-foreground">Permintaan RAB</h1>
        <p className="text-sm text-muted-foreground">Daftar permintaan pengisian harga satuan RAB dari maincon.</p>
      </div>

      <div className="erp-card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Memuat data...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Belum ada permintaan RAB.</div>
        ) : (
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Nama', 'Status', 'Jatuh Tempo', 'Terkirim'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => router.push(`/vendor-portal/rab-requests/${r.id}`)}
                >
                  <td className="erp-table-cell font-600">{r.name}</td>
                  <td className="erp-table-cell"><StatusBadge status={r.status} size="sm" /></td>
                  <td className="erp-table-cell text-muted-foreground">{r.dueDate ? formatDate(r.dueDate) : '—'}</td>
                  <td className="erp-table-cell text-muted-foreground">{r.sentAt ? formatDate(r.sentAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function VendorRabRequestsPage() {
  return (
    <VendorShell>
      <VendorRabRequestsList />
    </VendorShell>
  );
}
