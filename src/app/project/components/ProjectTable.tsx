'use client';

import React, { useState } from 'react';
import { Eye, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';

type ProjectStatus = 'Planning' | 'Running' | 'On Hold' | 'Completed';

interface Project {
  id: string;
  code: string;
  name: string;
  customer: string;
  pm: string;
  startDate: string;
  endDate: string;
  budget: number;
  progress: number;
  status: ProjectStatus;
}

const projects: Project[] = [
  { id: 'prj-001', code: 'PRJ-2026-024', name: 'Network Core Upgrade Telkom', customer: 'PT Telkom Indonesia', pm: 'Budi Santoso', startDate: '01/05/2026', endDate: '30/06/2026', budget: 847500000, progress: 35, status: 'Running' },
  { id: 'prj-002', code: 'PRJ-2026-023', name: 'CCTV BCA Kantor Pusat', customer: 'PT Bank Central Asia', pm: 'Rizky Ananda', startDate: '15/04/2026', endDate: '15/06/2026', budget: 312000000, progress: 70, status: 'Running' },
  { id: 'prj-003', code: 'PRJ-2026-022', name: 'Data Center Astra International', customer: 'PT Astra International', pm: 'Sari Wulandari', startDate: '01/04/2026', endDate: '31/07/2026', budget: 1240000000, progress: 20, status: 'Planning' },
  { id: 'prj-004', code: 'PRJ-2026-021', name: 'Fiber Optic Backbone Wijaya Karya', customer: 'PT Wijaya Karya', pm: 'Dian Pratiwi', startDate: '01/03/2026', endDate: '30/04/2026', budget: 560000000, progress: 100, status: 'Completed' },
  { id: 'prj-005', code: 'PRJ-2026-020', name: 'Access Control PLN Pusat', customer: 'PT PLN (Persero)', pm: 'Budi Santoso', startDate: '15/03/2026', endDate: '15/05/2026', budget: 420000000, progress: 55, status: 'On Hold' },
  { id: 'prj-006', code: 'PRJ-2026-019', name: 'CCTV Pertamina Refinery', customer: 'PT Pertamina', pm: 'Rizky Ananda', startDate: '01/02/2026', endDate: '31/03/2026', budget: 930000000, progress: 100, status: 'Completed' },
];

const statusColors: Record<ProjectStatus, string> = {
  Planning: 'status-terkirim',
  Running: 'status-disetujui',
  'On Hold': 'status-kadaluarsa',
  Completed: 'bg-slate-100 text-slate-600',
};

const formatRp = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

export default function ProjectTable() {
  const [page, setPage] = useState(1);
  const perPage = 6;
  const totalPages = Math.max(1, Math.ceil(projects.length / perPage));
  const pageData = projects.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="erp-card shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-700 text-foreground">Daftar Proyek</h3>
        <button className="btn-primary text-xs py-1.5 px-3">+ Tambah Proyek</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['Kode', 'Nama Proyek', 'Customer', 'PM', 'Deadline', 'Budget', 'Progress', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                <td className="erp-table-cell font-600 text-primary text-xs">{row.code}</td>
                <td className="erp-table-cell font-500 max-w-[180px] truncate">{row.name}</td>
                <td className="erp-table-cell text-muted-foreground max-w-[150px] truncate">{row.customer}</td>
                <td className="erp-table-cell">{row.pm}</td>
                <td className="erp-table-cell text-muted-foreground">{row.endDate}</td>
                <td className="erp-table-cell font-tabular text-right">{formatRp(row.budget)}</td>
                <td className="erp-table-cell min-w-[100px]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${row.progress === 100 ? 'bg-emerald-500' : row.progress >= 50 ? 'bg-primary' : 'bg-amber-500'}`}
                        style={{ width: `${row.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-600 text-muted-foreground w-8 text-right">{row.progress}%</span>
                  </div>
                </td>
                <td className="erp-table-cell">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${statusColors[row.status]}`}>{row.status}</span>
                </td>
                <td className="erp-table-cell">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Eye size={13} /></button>
                    <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Edit2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</span>
        <div className="flex items-center gap-1">
          <button className="btn-secondary py-1 px-2.5 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={13} /></button>
          <button className="btn-secondary py-1 px-2.5 text-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={13} /></button>
        </div>
      </div>
    </div>
  );
}
