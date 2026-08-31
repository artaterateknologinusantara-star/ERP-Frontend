'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle, XCircle, ExternalLink, ClipboardCheck } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatRp, formatDate } from '@/lib/format';
import { usePendingApprovals } from '@/hooks/usePendingApprovals';
import { approvalService, canReject, type PendingApproval } from '@/services/approval.service';

export default function PendingApprovalPage() {
  const queryClient = useQueryClient();
  const { data: items, isLoading } = usePendingApprovals();
  const [action, setAction] = useState<{ type: 'approve' | 'reject'; item: PendingApproval } | null>(null);
  const [processing, setProcessing] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });

  const handleConfirm = async () => {
    if (!action) return;
    setProcessing(true);
    try {
      if (action.type === 'approve') {
        await approvalService.approve(action.item);
        toast.success(`${action.item.no} berhasil disetujui`);
      } else {
        await approvalService.reject(action.item);
        toast.success(`${action.item.no} berhasil ditolak`);
      }
      setAction(null);
      refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal memproses persetujuan');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppLayout title="Pending Approval" breadcrumbs={[{ label: 'Pending Approval' }]}>
      <div className="erp-card shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[13px] font-700 text-foreground">Menunggu Persetujuan Anda</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daftar ini hanya berisi item dari modul yang boleh Anda approve.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Tipe', 'No', 'Detail', 'Diajukan Oleh', 'Tanggal', 'Nilai', 'Aksi'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="erp-table-cell text-center py-8 text-muted-foreground">Memuat data...</td></tr>
              ) : !items || items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="erp-table-cell text-center py-12 text-muted-foreground">
                    <ClipboardCheck size={28} className="mx-auto mb-2 opacity-40" />
                    Tidak ada item yang menunggu persetujuan Anda saat ini.
                  </td>
                </tr>
              ) : items.map((item) => (
                <tr key={`${item.type}-${item.id}`} className="border-b border-border hover:bg-primary/5 transition-colors">
                  <td className="erp-table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 status-terkirim">
                      {item.typeLabel}
                    </span>
                  </td>
                  <td className="erp-table-cell font-700 text-primary">{item.no}</td>
                  <td className="erp-table-cell max-w-[280px] truncate" title={item.title}>{item.title}</td>
                  <td className="erp-table-cell text-muted-foreground">{item.requestedByName || '—'}</td>
                  <td className="erp-table-cell text-muted-foreground">{formatDate(item.date)}</td>
                  <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(item.amount)}</td>
                  <td className="erp-table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 rounded hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors"
                        title="Setujui"
                        onClick={() => setAction({ type: 'approve', item })}
                      >
                        <CheckCircle size={15} />
                      </button>
                      {canReject(item.type) && (
                        <button
                          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Tolak"
                          onClick={() => setAction({ type: 'reject', item })}
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                      {item.detailUrl && (
                        <Link
                          href={item.detailUrl}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          title="Lihat Detail"
                        >
                          <ExternalLink size={15} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={action !== null}
        onClose={() => setAction(null)}
        onConfirm={handleConfirm}
        title={action?.type === 'approve' ? 'Setujui Item Ini?' : 'Tolak Item Ini?'}
        description={
          action
            ? `${action.item.typeLabel} ${action.item.no} akan ${action.type === 'approve' ? 'disetujui' : 'ditolak'}.`
            : ''
        }
        confirmLabel={action?.type === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
        variant={action?.type === 'approve' ? 'default' : 'danger'}
        loading={processing}
      />
    </AppLayout>
  );
}
