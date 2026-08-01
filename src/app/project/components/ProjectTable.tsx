'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Plus } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import { toast } from 'sonner';
import { projectService, ProjectListItem } from '@/services/project.service';
import { formatRp } from '@/lib/format';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Planning', label: 'Planning' },
  { value: 'Running', label: 'Running' },
  { value: 'OnHold', label: 'On Hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const statusColors: Record<string, string> = {
  Planning: 'status-terkirim',
  Running: 'status-disetujui',
  OnHold: 'status-kadaluarsa',
  Completed: 'bg-slate-100 text-slate-600',
  Cancelled: 'bg-red-50 text-red-600',
};

const PER_PAGE = 10;

export default function ProjectTable() {
  const router = useRouter();
  const [items, setItems]   = useState<ProjectListItem[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q: string, p: number, pp: number) => {
    setLoading(true);
    try {
      const res = await projectService.list({ page: p, perPage: pp, search: q || undefined });
      setItems(res.data);
      setTotal(res.total);
    } catch {
      toast.error('Gagal memuat data project');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, page, perPage), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, page, perPage, load]);

  const filtered = statusFilter === 'Semua' ? items : items.filter((i) => i.status === statusFilter);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="erp-card shadow-card">
      <TableToolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Cari kode, nama, customer..."
        totalCount={filtered.length}
        countLabel="project"
        statusFilter={statusFilter}
        onStatusFilter={(v) => setStatusFilter(v)}
        statusOptions={STATUS_OPTIONS}
        actions={
          <button className="btn-primary" onClick={() => toast.info('Form buat project baru')}>
            <Plus size={14} /> Buat Project
          </button>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['Kode', 'Nama Project', 'Customer', 'PM', 'Progress', 'Budget', 'Mulai', 'Selesai', 'Status'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
              <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">Belum ada project</td></tr>
            ) : filtered.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors group">
                <td className="erp-table-cell font-600 text-primary">{row.code}</td>
                <td className="erp-table-cell font-500 max-w-[160px] truncate" title={row.name}>{row.name}</td>
                <td className="erp-table-cell text-muted-foreground max-w-[140px] truncate" title={row.customerName}>{row.customerName}</td>
                <td className="erp-table-cell text-muted-foreground">{row.projectManagerName ?? '—'}</td>
                <td className="erp-table-cell">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
                      <div
                        className={`h-full rounded-full ${row.progress >= 100 ? 'bg-emerald-500' : row.progress >= 50 ? 'bg-blue-500' : 'bg-amber-400'}`}
                        style={{ width: `${row.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-600 tabular-nums w-8 text-right">{row.progress}%</span>
                  </div>
                </td>
                <td className="erp-table-cell font-tabular text-right">{formatRp(row.budget)}</td>
                <td className="erp-table-cell text-muted-foreground whitespace-nowrap">{row.startDate}</td>
                <td className="erp-table-cell text-muted-foreground whitespace-nowrap">{row.endDate ?? '—'}</td>
                <td className="erp-table-cell">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${statusColors[row.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {row.status === 'OnHold' ? 'On Hold' : row.status}
                  </span>
                </td>
                <td className="erp-table-cell erp-action-col">
                  <RowActionMenu items={[
                    { icon: <Eye size={13} />, label: 'Lihat Detail', onClick: () => router.push(`/project/${row.id}`) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination page={page} totalPages={totalPages} totalCount={total} perPage={perPage} onPageChange={setPage} onPerPageChange={(pp) => { setPerPage(pp); setPage(1); }} />
    </div>
  );
}
