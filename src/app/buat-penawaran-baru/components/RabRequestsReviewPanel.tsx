'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import ERPModal from '@/components/ui/ERPModal';
import StatusBadge from '@/components/ui/StatusBadge';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { vendorRabRequestInternalService, vendorRabSubmissionService } from '@/services/vendorRabRequest.internal.service';
import { formatDate, formatRp } from '@/lib/format';
import { canApprove } from '@/lib/permissions';

interface Props {
  groupId: string;
  groupName: string;
  isOpen: boolean;
  onClose: () => void;
}

function SubmissionReview({ submissionId, onDecided }: { submissionId: string; onDecided: () => void }) {
  const queryClient = useQueryClient();
  const [deciding, setDeciding] = useState(false);
  const allowApprove = canApprove('Sales');

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-submission', submissionId],
    queryFn: () => vendorRabSubmissionService.getById(submissionId),
  });
  const submission = data?.data;

  // Local editable copy, keyed by line id — synced from the fetched data whenever it changes
  // (e.g. after a save), edited via onChange, persisted on blur.
  const [markups, setMarkups] = useState<Record<string, number>>({});
  useEffect(() => {
    if (submission) {
      setMarkups(Object.fromEntries(submission.lines.map((l) => [l.id, l.markupAmount])));
    }
  }, [submission]);

  const handleMarkupBlur = async (lineId: string) => {
    const original = submission?.lines.find((l) => l.id === lineId)?.markupAmount;
    const value = markups[lineId] ?? 0;
    if (value === original) return;
    try {
      await vendorRabSubmissionService.setLineMarkup(submissionId, lineId, value);
      queryClient.invalidateQueries({ queryKey: ['vendor-submission', submissionId] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan markup');
    }
  };

  const handleApprove = async () => {
    setDeciding(true);
    try {
      await vendorRabSubmissionService.approve(submissionId);
      toast.success('Submission disetujui, baris RAB resmi sudah ditambahkan ke Quotation.');
      onDecided();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyetujui submission');
    } finally {
      setDeciding(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Alasan penolakan (opsional):') ?? undefined;
    setDeciding(true);
    try {
      await vendorRabSubmissionService.reject(submissionId, reason);
      toast.success('Submission ditolak. Vendor bisa submit ulang.');
      onDecided();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menolak submission');
    } finally {
      setDeciding(false);
    }
  };

  if (isLoading || !submission) {
    return <div className="text-xs text-muted-foreground py-2">Memuat submission...</div>;
  }

  const isPending = submission.status === 'PendingReview';
  const total = submission.lines.reduce((sum, l) => sum + l.totalHarga, 0);

  return (
    <div className="space-y-2 pt-2 border-t border-border/60">
      {submission.lines.map((line) => (
        <div key={line.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center text-xs">
          <span className="sm:col-span-2 truncate" title={line.name}>{line.name}</span>
          <span className="text-muted-foreground font-tabular">{formatRp(line.unitPrice)}</span>
          <div className="w-28">
            <CurrencyInput
              value={markups[line.id] ?? line.markupAmount}
              prefix=""
              disabled={!isPending || !allowApprove}
              onChange={(v) => setMarkups((prev) => ({ ...prev, [line.id]: v }))}
              onBlur={() => handleMarkupBlur(line.id)}
              className="text-xs py-1"
            />
          </div>
          <span className="font-600 font-tabular">{formatRp(line.finalUnitPrice)} / {formatRp(line.totalHarga)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-700">Total: {formatRp(total)}</span>
        {isPending && allowApprove && (
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1 text-xs font-600 text-red-600 hover:bg-red-50 px-2 py-1 rounded"
              onClick={handleReject}
              disabled={deciding}
            >
              <X size={13} /> Tolak
            </button>
            <button
              className="flex items-center gap-1 text-xs font-600 text-white bg-primary hover:bg-primary/90 px-2.5 py-1 rounded"
              onClick={handleApprove}
              disabled={deciding}
            >
              <Check size={13} /> Setujui
            </button>
          </div>
        )}
        {submission.rejectionReason && (
          <span className="text-xs text-red-600">Alasan: {submission.rejectionReason}</span>
        )}
      </div>
    </div>
  );
}

export default function RabRequestsReviewPanel({ groupId, groupName, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-rab-requests-by-group', groupId],
    queryFn: () => vendorRabRequestInternalService.listByGroup(groupId),
    enabled: isOpen,
  });
  const requests = data?.data ?? [];

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['vendor-rab-requests-by-group', groupId] });
  };

  return (
    <ERPModal isOpen={isOpen} onClose={onClose} title="Review Permintaan RAB" subtitle={groupName} size="lg">
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Memuat data...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Belum ada permintaan RAB untuk group ini.</div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const sortedSubs = [...req.submissions].sort((a, b) => b.attemptNumber - a.attemptNumber);
            const latest = sortedSubs[0];
            return (
              <div key={req.id} className="border border-border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-600 text-sm">{req.supplierName}</p>
                    <p className="text-xs text-muted-foreground">
                      Dikirim {req.sentAt ? formatDate(req.sentAt) : '—'}
                      {req.dueDate ? ` · Jatuh tempo ${formatDate(req.dueDate)}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={req.status} size="sm" />
                </div>

                {sortedSubs.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-2">Vendor belum submit.</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {sortedSubs.map((s) => (
                      <div key={s.id}>
                        <button
                          className="flex items-center gap-1.5 text-xs w-full text-left py-1"
                          onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                        >
                          {expanded === s.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          Attempt #{s.attemptNumber} — {formatDate(s.submittedAt)}
                          <StatusBadge status={s.status} size="sm" />
                        </button>
                        {expanded === s.id && (
                          <SubmissionReview submissionId={s.id} onDecided={() => { refreshAll(); setExpanded(null); }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ERPModal>
  );
}
