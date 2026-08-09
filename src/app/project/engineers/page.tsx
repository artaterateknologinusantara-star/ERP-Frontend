import React from 'react';
import AppLayout from '@/components/AppLayout';
import ProjectSummaryCards from '../components/ProjectSummaryCards';

export default function ProjectEngineersPage() {
  return (
    <AppLayout
      title="Engineer Assignment"
      breadcrumbs={[{ label: 'Project' }, { label: 'Engineer Assignment' }]}
    >
      <div className="space-y-5">
        <ProjectSummaryCards />
        <div className="erp-card shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-700 text-foreground">Penugasan Engineer</h3>
            <button className="btn-primary text-xs py-1.5 px-3">+ Assign Engineer</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/40">
                  {['Engineer', 'Jabatan', 'Proyek Aktif', 'Task Selesai', 'Utilization', 'Status']?.map((h) => (
                    <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Ahmad Fauzi', role: 'Network Engineer', projects: 3, tasks: 12, util: 85 },
                  { name: 'Bayu Prasetyo', role: 'CCTV Specialist', projects: 2, tasks: 8, util: 70 },
                  { name: 'Candra Wijaya', role: 'Fiber Optic Tech', projects: 2, tasks: 15, util: 90 },
                  { name: 'Dewi Anggraini', role: 'System Engineer', projects: 1, tasks: 6, util: 50 },
                  { name: 'Eko Santoso', role: 'Network Engineer', projects: 3, tasks: 10, util: 80 },
                ]?.map((eng, i) => (
                  <tr key={i} className="border-b border-border hover:bg-primary/5 transition-colors">
                    <td className="erp-table-cell font-600">{eng?.name}</td>
                    <td className="erp-table-cell text-muted-foreground">{eng?.role}</td>
                    <td className="erp-table-cell text-center font-600">{eng?.projects}</td>
                    <td className="erp-table-cell text-center font-600 text-emerald-600">{eng?.tasks}</td>
                    <td className="erp-table-cell min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${eng?.util >= 80 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${eng?.util}%` }} />
                        </div>
                        <span className="text-xs font-600 text-muted-foreground w-8 text-right">{eng?.util}%</span>
                      </div>
                    </td>
                    <td className="erp-table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${eng?.util >= 80 ? 'status-kadaluarsa' : 'status-disetujui'}`}>
                        {eng?.util >= 80 ? 'Penuh' : 'Tersedia'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
