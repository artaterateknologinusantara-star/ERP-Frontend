'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import VendorShell from '@/components/vendor/VendorShell';
import StatusBadge from '@/components/ui/StatusBadge';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { vendorRabRequestService } from '@/services/vendorRabRequest.service';
import { formatDate, formatRp } from '@/lib/format';
import { useVendorAuth } from '@/hooks/useVendorAuth';

function VendorRabRequestDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { loading: authLoading } = useVendorAuth();
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [materialPrices, setMaterialPrices] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-rab-request', params.id],
    queryFn: () => vendorRabRequestService.getById(params.id),
    enabled: !authLoading,
  });

  const request = data?.data;

  const sortedSubmissions = [...(request?.submissions ?? [])].sort((a, b) => b.attemptNumber - a.attemptNumber);
  const latest = sortedSubmissions[0];
  const canSubmit = !latest || latest.status === 'Rejected';

  useEffect(() => {
    if (request && canSubmit) {
      setServicePrices((prev) => {
        const next = { ...prev };
        for (const line of request.lines) {
          if (!(line.id in next)) next[line.id] = 0;
        }
        return next;
      });
      setMaterialPrices((prev) => {
        const next = { ...prev };
        for (const line of request.lines) {
          if (!(line.id in next)) next[line.id] = 0;
        }
        return next;
      });
    }
  }, [request, canSubmit]);

  if (authLoading || isLoading) {
    return <div className="text-center py-10 text-muted-foreground text-sm">Memuat data...</div>;
  }

  if (!request) {
    return <div className="text-center py-10 text-muted-foreground text-sm">Permintaan RAB tidak ditemukan.</div>;
  }

  const handleSubmit = async () => {
    // Total (Jasa+Material) harus > 0 — salah satu boleh legitimately 0 (baris murni jasa atau
    // murni material), tapi tidak boleh keduanya kosong.
    const missingOrInvalid = request.lines.filter(
      (l) => (servicePrices[l.id] ?? 0) + (materialPrices[l.id] ?? 0) <= 0,
    );
    if (missingOrInvalid.length > 0) {
      toast.error(`Ada ${missingOrInvalid.length} baris yang harganya belum diisi.`);
      return;
    }
    setSubmitting(true);
    try {
      await vendorRabRequestService.submit(
        request.id,
        request.lines.map((l) => ({
          vendorRabRequestLineId: l.id,
          servicePrice: servicePrices[l.id] ?? 0,
          materialPrice: materialPrices[l.id] ?? 0,
        })),
      );
      toast.success('Submission berhasil dikirim, menunggu review.');
      queryClient.invalidateQueries({ queryKey: ['vendor-rab-request', params.id] });
      queryClient.invalidateQueries({ queryKey: ['vendor-rab-requests'] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengirim submission');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push('/vendor-portal/rab-requests')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={13} /> Kembali
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-700 text-foreground">{request.name}</h1>
          <p className="text-sm text-muted-foreground">
            Jatuh tempo: {request.dueDate ? formatDate(request.dueDate) : '—'}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {sortedSubmissions.length > 0 && (
        <div className="erp-card space-y-2">
          <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Riwayat Submission</p>
          {sortedSubmissions.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span>Attempt #{s.attemptNumber} — {formatDate(s.submittedAt)}</span>
              <StatusBadge status={s.status} size="sm" />
            </div>
          ))}
          {latest?.status === 'Rejected' && (
            <p className="text-xs text-red-600 bg-red-50 rounded-md p-2 mt-1">
              Submission terakhir ditolak. Silakan perbaiki dan kirim ulang.
            </p>
          )}
        </div>
      )}

      {!canSubmit && latest?.status === 'PendingReview' && (
        <div className="erp-card text-center py-6 text-sm text-muted-foreground">
          Submission Anda sedang menunggu review dari maincon.
        </div>
      )}

      {!canSubmit && latest?.status === 'Approved' && (
        <div className="erp-card text-center py-6 text-sm text-green-700 bg-green-50">
          Submission Anda sudah disetujui.
        </div>
      )}

      {canSubmit && (
        <div className="erp-card space-y-3">
          <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Isi Harga Jasa &amp; Material</p>
          <div className="space-y-2">
            {request.lines.map((line) => {
              const total = (servicePrices[line.id] ?? 0) + (materialPrices[line.id] ?? 0);
              return (
                <div key={line.id} className="border border-border rounded-md p-3 space-y-2">
                  <div>
                    <p className="font-600 text-sm">{line.name}</p>
                    {line.spesifikasi && <p className="text-xs text-muted-foreground whitespace-pre-line">{line.spesifikasi}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{line.volume} {line.unit}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <label className="erp-form-label flex-shrink-0 mb-0">Harga Jasa</label>
                      <div className="w-40">
                        <CurrencyInput
                          value={servicePrices[line.id] ?? 0}
                          onChange={(v) => setServicePrices((prev) => ({ ...prev, [line.id]: v }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="erp-form-label flex-shrink-0 mb-0">Harga Material</label>
                      <div className="w-40">
                        <CurrencyInput
                          value={materialPrices[line.id] ?? 0}
                          onChange={(v) => setMaterialPrices((prev) => ({ ...prev, [line.id]: v }))}
                        />
                      </div>
                    </div>
                    {total > 0 && (
                      <span className="text-xs text-muted-foreground font-tabular">
                        = {formatRp(line.volume * total)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn-primary w-full justify-center" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Kirim Submission'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function VendorRabRequestDetailPage() {
  return (
    <VendorShell>
      <VendorRabRequestDetail />
    </VendorShell>
  );
}
