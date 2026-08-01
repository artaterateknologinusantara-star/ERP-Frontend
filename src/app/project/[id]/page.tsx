'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Building2, Calendar, DollarSign, TrendingUp,
  TrendingDown, AlertCircle, CheckCircle2, Clock, CircleDot,
  User, Link as LinkIcon,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { projectService, ProjectDetail, ProjectCostSummary } from '@/services/project.service';
import { formatRp } from '@/lib/format';
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

  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [cost,   setCost]   = useState<ProjectCostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      projectService.getById(id),
      projectService.getCostSummary(id),
    ])
      .then(([d, c]) => { setDetail(d); setCost(c); })
      .catch(() => toast.error('Gagal memuat detail project'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="Detail Project" breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Project' }, { label: 'Detail' }]}>
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Memuat data...</div>
      </AppLayout>
    );
  }

  if (!detail) {
    return (
      <AppLayout title="Detail Project" breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Project' }, { label: 'Detail' }]}>
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Project tidak ditemukan.</div>
      </AppLayout>
    );
  }

  const marginPositive = (cost?.estimatedMargin ?? 0) >= 0;
  const arPositive     = (cost?.outstandingAR ?? 0) <= 0;

  return (
    <AppLayout
      title={detail.name}
      breadcrumbs={[
        { label: 'SynteraERP' },
        { label: 'Project', href: '/project' },
        { label: detail.code },
      ]}
    >
      <div className="space-y-5">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/project')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> Kembali
          </button>
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
            <h2 className="text-[13px] font-700 text-foreground mb-3">Cost Monitoring</h2>
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
    </AppLayout>
  );
}
