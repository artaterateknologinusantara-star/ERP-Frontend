import React from 'react';
import AppLayout from '@/components/AppLayout';
import ProjectSummaryCards from '../components/ProjectSummaryCards';
import ProjectTable from '../components/ProjectTable';

export default function ProjectTasksPage() {
  return (
    <AppLayout
      title="Task Management"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Project' }, { label: 'Task Management' }]}
    >
      <div className="space-y-5">
        <ProjectSummaryCards />
        <div className="erp-card shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-700 text-foreground">Daftar Task</h3>
            <button className="btn-primary text-xs py-1.5 px-3">+ Tambah Task</button>
          </div>
          <div className="space-y-2">
            {[
              { task: 'Instalasi Switch Core - Telkom', project: 'PRJ-2026-024', assignee: 'Budi Santoso', due: '20/05/2026', priority: 'High', status: 'In Progress' },
              { task: 'Konfigurasi VLAN & Routing', project: 'PRJ-2026-024', assignee: 'Rizky Ananda', due: '22/05/2026', priority: 'High', status: 'Todo' },
              { task: 'Pemasangan IP Camera - BCA', project: 'PRJ-2026-023', assignee: 'Sari Wulandari', due: '18/05/2026', priority: 'Medium', status: 'In Progress' },
              { task: 'Testing & Commissioning CCTV', project: 'PRJ-2026-023', assignee: 'Dian Pratiwi', due: '25/05/2026', priority: 'Medium', status: 'Todo' },
              { task: 'Survey Lokasi Data Center', project: 'PRJ-2026-022', assignee: 'Budi Santoso', due: '15/05/2026', priority: 'Low', status: 'Done' },
            ]?.map((task, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-primary/5 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task?.status === 'Done' ? 'bg-emerald-500' : task?.status === 'In Progress' ? 'bg-primary' : 'bg-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-500 ${task?.status === 'Done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task?.task}</p>
                  <p className="text-xs text-muted-foreground">{task?.project} · {task?.assignee}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-600 flex-shrink-0 ${task?.priority === 'High' ? 'bg-red-100 text-red-700' : task?.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{task?.priority}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{task?.due}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-600 flex-shrink-0 ${task?.status === 'Done' ? 'status-disetujui' : task?.status === 'In Progress' ? 'status-terkirim' : 'status-draft'}`}>{task?.status}</span>
              </div>
            ))}
          </div>
        </div>
        <ProjectTable />
      </div>
    </AppLayout>
  );
}
