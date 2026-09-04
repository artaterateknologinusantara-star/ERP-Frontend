'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Building2, Calendar, DollarSign, TrendingUp,
  TrendingDown, AlertCircle, CheckCircle2, Clock, CircleDot,
  User, Link as LinkIcon, Settings2, PlusCircle,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ERPModal from '@/components/ui/ERPModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import CurrencyInput from '@/components/ui/CurrencyInput';
import {
  projectService, ProjectDetail, ProjectCostSummary, ProjectRevenueRecognitionEntry,
  RevenueRecognitionMethod, UpdateProjectDto,
} from '@/services/project.service';
import { formatRp, formatDate, formatPercent } from '@/lib/format';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = {
  Planning: 'Planning', Running: 'Running', OnHold: 'On Hold',
  Completed: 'Completed', Cancelled: 'Cancelled',
};
const STATUS_COLOR: Record<string, string> = {
  Planning:  'bg-blue-100 text-blue-700',
  Running:   'bg-green-100 text-green-700',
  OnHold:    'bg-amber-100 text-amber-700',
  Completed: 'bg-slate-100 text-slate-600',
  Cancelled: 'bg-red-100 text-red-600',
};
const TASK_STATUS_COLOR: Record<string, string> = {
  Todo:       'bg-slate-100 text-slate-600',
  InProgress: 'bg-blue-100 text-blue-700',
  Done:       'bg-green-100 text-green-700',
  Cancelled:  'bg-red-100 text-red-600',
};
const PRIORITY_COLOR: Record<string, string> = {
  Low:    'bg-slate-100 text-slate-500',
  Medium: 'bg-amber-100 text-amber-700',
  High:   'bg-red-100 text-red-600',
};

// Full-object PUT — endpoint tidak mendukung partial update, field yang tidak dipetakan
// eksplisit di sini akan ke-overwrite jadi default di backend kalau sampai tidak disertakan.
function toUpdateDto(d: ProjectDetail): UpdateProjectDto {
  return {
    name: d.name,
    customerId: d.customerId,
    salesOrderId: d.salesOrderId,
    projectManagerId: d.projectManagerId,
    startDate: d.startDate,
    endDate: d.endDate,
    budget: d.budget,
    notes: d.notes,
    progress: d.progress,
    status: d.status,
    revenueRecognitionMethod: d.revenueRecognitionMethod,
    estimatedTotalCost: d.estimatedTotalCost,
  };
}

function CostCard({
  label, value, sub, color, icon,
}: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <div className={`erp-card shadow-card border-l-4 ${color}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-500 mb-0.5">{label}</p>
          <p className="text-lg font-800 text-foreground font-tabular truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className="flex-shrink-0 mt-0.5 opacity-70">{icon}</div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [detail, setDetail]   = useState<ProjectDetail | null>(null);
  const [cost,   setCost]     = useState<ProjectCostSummary | null>(null);
  const [history, setHistory] = useState<ProjectRevenueRecognitionEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [rrModalOpen, setRrModalOpen] = useState(false);
  const [rrMethod, setRrMethod]       = useState<RevenueRecognitionMethod>('Immediate');
  const [rrEstCost, setRrEstCost]     = useState(0);
  const [savingRR, setSavingRR]       = useState(false);

  const [completing, setCompleting] = useState(false);
  const [trueUpConfirm, setTrueUpConfirm] = useState<{ message: string } | null>(null);
  const [confirmingTrueUp, setConfirmingTrueUp] = useState(false);

  const [recordingProgress, setRecordingProgress] = useState(false);

  const loadAll = useCallback((showSpinner: boolean) => {
    if (!id) return;
    if (showSpinner) setLoading(true);
    Promise.all([
      projectService.getById(id),
      projectService.getCostSummary(id),
      projectService.getRevenueRecognitionHistory(id),
    ])
      .then(([d, c, h]) => { setDetail(d); setCost(c); setHistory(h); })
      .catch(() => toast.error('Gagal memuat detail project'))
      .finally(() => { if (showSpinner) setLoading(false); });
  }, [id]);

  useEffect(() => { loadAll(true); }, [loadAll]);

  const openRrModal = () => {
    if (!detail) return;
    setRrMethod(detail.revenueRecognitionMethod);
    setRrEstCost(detail.estimatedTotalCost ?? 0);
    setRrModalOpen(true);
  };

  const handleSaveRR = async () => {
    if (!detail) return;
    if (rrMethod === 'PercentageOfCompletion' && rrEstCost <= 0) {
      toast.error('Estimated Total Cost wajib diisi untuk metode Percentage of Completion.');
      return;
    }
    setSavingRR(true);
    try {
      const dto: UpdateProjectDto = {
        ...toUpdateDto(detail),
        revenueRecognitionMethod: rrMethod,
        estimatedTotalCost: rrMethod === 'PercentageOfCompletion' ? rrEstCost : undefined,
      };
      await projectService.update(detail.id, dto);
      toast.success('Pengaturan Revenue Recognition tersimpan');
      setRrModalOpen(false);
      loadAll(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan pengaturan');
    } finally {
      setSavingRR(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!detail) return;
    setCompleting(true);
    try {
      const dto: UpdateProjectDto = { ...toUpdateDto(detail), status: 'Completed' };
      await projectService.update(detail.id, dto);
      toast.success('Project ditandai selesai');
      loadAll(false);
    } catch (e) {
      const err = e as Error & { status?: number; data?: { requiresConfirmation?: boolean } };
      if (err.status === 409 && err.data?.requiresConfirmation) {
        setTrueUpConfirm({ message: err.message });
      } else {
        toast.error(err.message ?? 'Gagal menandai project selesai');
      }
    } finally {
      setCompleting(false);
    }
  };

  const handleConfirmTrueUp = async () => {
    if (!detail) return;
    setConfirmingTrueUp(true);
    try {
      const dto: UpdateProjectDto = { ...toUpdateDto(detail), status: 'Completed', confirmRevenueTrueUp: true };
      await projectService.update(detail.id, dto);
      toast.success('Project ditandai selesai, sisa pendapatan sudah diakui');
      setTrueUpConfirm(null);
      loadAll(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyelesaikan penutupan project');
    } finally {
      setConfirmingTrueUp(false);
    }
  };

  const handleRecordProgress = async () => {
    if (!detail) return;
    setRecordingProgress(true);
    try {
      const result = await projectService.postRevenueRecognition(detail.id);
      toast.success(`Progres dicatat: ${formatPercent(result.percentageComplete, 2)} (+${formatRp(result.incrementalRevenue)})`);
      loadAll(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mencatat progres');
    } finally {
      setRecordingProgress(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Detail Project" breadcrumbs={[{ label: 'Project' }, { label: 'Detail' }]}>
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Memuat data...</div>
      </AppLayout>
    );
  }

  if (!detail) {
    return (
      <AppLayout title="Detail Project" breadcrumbs={[{ label: 'Project' }, { label: 'Detail' }]}>
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Project tidak ditemukan.</div>
      </AppLayout>
    );
  }

  const marginPositive = (cost?.estimatedMargin ?? 0) >= 0;
  const arPositive     = (cost?.outstandingAR ?? 0) <= 0;
  const isPoc           = detail.revenueRecognitionMethod === 'PercentageOfCompletion';
  const canMarkComplete = detail.status !== 'Completed' && detail.status !== 'Cancelled';

  return (
    <AppLayout
      title={detail.name}
      breadcrumbs={[
        { label: 'Project', href: '/project' },
        { label: detail.code },
      ]}
    >
      <div className="space-y-5">
        {/* Back + Header actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/project')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> Kembali
          </button>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={openRrModal}>
              <Settings2 size={14} /> Revenue Recognition
            </button>
            {canMarkComplete && (
              <button
                className="btn-primary text-xs flex items-center gap-1.5"
                onClick={handleMarkComplete}
                disabled={completing}
              >
                <CheckCircle2 size={14} /> {completing ? 'Memproses...' : 'Tandai Selesai'}
              </button>
            )}
          </div>
        </div>

        {/* Project Info Card */}
        <div className="erp-card shadow-card">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-700 text-primary font-tabular">{detail.code}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${STATUS_COLOR[detail.status] ?? 'bg-muted text-muted-foreground'}`}>
                  {STATUS_LABEL[detail.status] ?? detail.status}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 bg-violet-100 text-violet-700">
                  {isPoc ? 'Percentage of Completion' : 'Immediate'}
                </span>
              </div>
              <h1 className="text-lg font-800 text-foreground mb-3">{detail.name}</h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 size={13} className="flex-shrink-0" />
                  <span className="font-500 text-foreground">{detail.customerName}</span>
                </div>
                {detail.projectManagerName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User size={13} className="flex-shrink-0" />
                    <span>PM: <span className="text-foreground font-500">{detail.projectManagerName}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar size={13} className="flex-shrink-0" />
                  <span>Mulai: <span className="text-foreground font-500">{detail.startDate}</span></span>
                </div>
                {detail.endDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={13} className="flex-shrink-0" />
                    <span>Selesai: <span className="text-foreground font-500">{detail.endDate}</span></span>
                  </div>
                )}
                {detail.salesOrderNo && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <LinkIcon size={13} className="flex-shrink-0" />
                    <span>SO: <span className="text-primary font-600">{detail.salesOrderNo}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign size={13} className="flex-shrink-0" />
                  <span>Budget: <span className="text-foreground font-600">{formatRp(detail.budget)}</span></span>
                </div>
                {isPoc && (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign size={13} className="flex-shrink-0" />
                      <span>Estimated Total Cost: <span className="text-foreground font-600">{formatRp(detail.estimatedTotalCost ?? 0)}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign size={13} className="flex-shrink-0" />
                      <span>Unbilled Revenue: <span className="text-foreground font-600">{formatRp(detail.unbilledRevenueBalance)}</span></span>
                    </div>
                    {detail.overbilledBalance > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign size={13} className="flex-shrink-0" />
                        <span>Overbilled: <span className="text-foreground font-600">{formatRp(detail.overbilledBalance)}</span></span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="md:w-48 flex-shrink-0">
              <div className="text-center mb-1.5">
                <span className="text-3xl font-800 text-foreground font-tabular">{detail.progress}%</span>
                <p className="text-xs text-muted-foreground">Progress</p>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${detail.progress >= 100 ? 'bg-emerald-500' : detail.progress >= 50 ? 'bg-blue-500' : 'bg-amber-400'}`}
                  style={{ width: `${detail.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span><span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Monitoring */}
        {cost && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-700 text-foreground">Cost Monitoring</h2>
              {isPoc && (
                <button
                  className="btn-secondary text-xs flex items-center gap-1.5"
                  onClick={handleRecordProgress}
                  disabled={recordingProgress}
                >
                  <PlusCircle size={14} /> {recordingProgress ? 'Memproses...' : 'Catat Progres Pendapatan'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CostCard
                label="Revenue (SO)"
                value={formatRp(cost.revenue)}
                sub={cost.salesOrderNo ?? 'Nilai kontrak'}
                color="border-blue-500"
                icon={<TrendingUp size={20} className="text-blue-500" />}
              />
              <CostCard
                label="Procurement Cost"
                value={formatRp(cost.procurementCost)}
                sub="Total PR terkait"
                color="border-amber-400"
                icon={<DollarSign size={20} className="text-amber-500" />}
              />
              <CostCard
                label="Vendor Payment"
                value={formatRp(cost.vendorPayment)}
                sub="Realisasi bayar vendor"
                color="border-red-400"
                icon={<DollarSign size={20} className="text-red-500" />}
              />
              <CostCard
                label="Estimasi Margin"
                value={formatRp(cost.estimatedMargin)}
                sub="Revenue − Vendor Payment"
                color={marginPositive ? 'border-emerald-500' : 'border-red-500'}
                icon={
                  marginPositive
                    ? <TrendingUp size={20} className="text-emerald-500" />
                    : <TrendingDown size={20} className="text-red-500" />
                }
              />
              <CostCard
                label="Customer Billing"
                value={formatRp(cost.customerBilling)}
                sub="Total invoice diterbitkan"
                color="border-blue-400"
                icon={<DollarSign size={20} className="text-blue-400" />}
              />
              <CostCard
                label="Customer Payment"
                value={formatRp(cost.customerPayment)}
                sub="Diterima dari customer"
                color="border-emerald-500"
                icon={<CheckCircle2 size={20} className="text-emerald-500" />}
              />
              <CostCard
                label="Outstanding AR"
                value={formatRp(cost.outstandingAR)}
                sub="Belum dibayar customer"
                color={arPositive ? 'border-slate-300' : 'border-amber-400'}
                icon={<AlertCircle size={20} className={arPositive ? 'text-slate-400' : 'text-amber-500'} />}
              />
              <CostCard
                label="Outstanding AP"
                value={formatRp(cost.outstandingAP)}
                sub="Hutang ke vendor (estimasi)"
                color={cost.outstandingAP <= 0 ? 'border-slate-300' : 'border-red-400'}
                icon={<Clock size={20} className={cost.outstandingAP <= 0 ? 'text-slate-400' : 'text-red-500'} />}
              />
            </div>
          </div>
        )}

        {/* Jadwal Pengakuan Pendapatan */}
        {isPoc && (
          <div className="erp-card shadow-card">
            <h2 className="text-[13px] font-700 text-foreground mb-3">Jadwal Pengakuan Pendapatan</h2>
            {!history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada progres yang dicatat</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="pb-2 font-600">Tanggal</th>
                      <th className="pb-2 font-600 text-right">%</th>
                      <th className="pb-2 font-600 text-right">Actual Cost</th>
                      <th className="pb-2 font-600 text-right">Cumulative Revenue</th>
                      <th className="pb-2 font-600 text-right">Incremental</th>
                      <th className="pb-2 font-600">No Jurnal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 text-foreground">{formatDate(h.recognitionDate)}</td>
                        <td className="py-2 text-right font-tabular">{formatPercent(h.percentageComplete, 2)}</td>
                        <td className="py-2 text-right font-tabular">{formatRp(h.actualCostToDate)}</td>
                        <td className="py-2 text-right font-tabular">{formatRp(h.cumulativeRevenueRecognized)}</td>
                        <td className="py-2 text-right font-tabular text-emerald-600 font-600">{formatRp(h.incrementalRevenueThisEntry)}</td>
                        <td className="py-2 text-primary font-600">{h.journalEntryNo ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tasks */}
        <div className="erp-card shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[13px] font-700 text-foreground">Tasks</h2>
              <p className="text-xs text-muted-foreground">{detail.tasks.length} task terdaftar</p>
            </div>
          </div>

          {detail.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada task</p>
          ) : (
            <div className="space-y-2">
              {detail.tasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-primary/5 transition-colors">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'Done' ? 'bg-emerald-500' : task.status === 'InProgress' ? 'bg-blue-500' : task.status === 'Cancelled' ? 'bg-red-400' : 'bg-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-500 ${task.status === 'Done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                    )}
                    {task.assignedToName && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <User size={10} /> {task.assignedToName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar size={10} /> {task.dueDate}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-600 ${PRIORITY_COLOR[task.priority] ?? 'bg-muted text-muted-foreground'}`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-600 ${TASK_STATUS_COLOR[task.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {task.status === 'InProgress' ? 'In Progress' : task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {detail.notes && (
          <div className="erp-card shadow-card">
            <h2 className="text-[13px] font-700 text-foreground mb-2">Catatan</h2>
            <p className="text-[13px] text-muted-foreground whitespace-pre-line">{detail.notes}</p>
          </div>
        )}
      </div>

      {/* Modal: Pengaturan Revenue Recognition */}
      <ERPModal
        isOpen={rrModalOpen}
        onClose={() => setRrModalOpen(false)}
        title="Pengaturan Revenue Recognition"
        subtitle={detail.code}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRrModalOpen(false)} disabled={savingRR}>Batal</button>
            <button className="btn-primary" onClick={handleSaveRR} disabled={savingRR}>
              {savingRR ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="erp-form-label">Revenue Recognition Method</label>
            <select
              className="erp-input"
              value={rrMethod}
              onChange={(e) => setRrMethod(e.target.value as RevenueRecognitionMethod)}
            >
              <option value="Immediate">Immediate</option>
              <option value="PercentageOfCompletion">Percentage of Completion</option>
            </select>
          </div>
          {rrMethod === 'PercentageOfCompletion' && (
            <div>
              <label className="erp-form-label">Estimated Total Cost<span className="text-red-500 ml-0.5">*</span></label>
              <CurrencyInput value={rrEstCost} onChange={setRrEstCost} />
              <p className="text-xs text-muted-foreground mt-1">
                Dipakai sebagai penyebut basis Cost-to-Cost (ActualCost / EstimatedTotalCost).
              </p>
            </div>
          )}
        </div>
      </ERPModal>

      {/* Confirm: True-up revenue saat menutup Project POC */}
      <ConfirmModal
        isOpen={!!trueUpConfirm}
        onClose={() => setTrueUpConfirm(null)}
        onConfirm={handleConfirmTrueUp}
        title="Konfirmasi Penutupan Proyek"
        description={trueUpConfirm?.message ?? ''}
        confirmLabel="Ya, Tutup & Akui Sisa Pendapatan"
        loading={confirmingTrueUp}
        variant="default"
      />
    </AppLayout>
  );
}
