'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ProjectSummaryCards from '../components/ProjectSummaryCards';
import ProjectTable from '../components/ProjectTable';
import { projectService, ProjectTaskListItem } from '@/services/project.service';
import { formatDate } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  Todo: 'Todo', InProgress: 'In Progress', Done: 'Done', Cancelled: 'Cancelled',
};
const STATUS_DOT: Record<string, string> = {
  Todo: 'bg-muted-foreground', InProgress: 'bg-primary', Done: 'bg-emerald-500', Cancelled: 'bg-red-500',
};
const STATUS_BADGE: Record<string, string> = {
  Todo: 'status-draft', InProgress: 'status-terkirim', Done: 'status-disetujui', Cancelled: 'bg-red-50 text-red-600',
};
const PRIORITY_BADGE: Record<string, string> = {
  High: 'bg-red-100 text-red-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-slate-100 text-slate-600',
};

export default function ProjectTasksPage() {
  const [tasks, setTasks] = useState<ProjectTaskListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectService.getAllTasks()
      .then(setTasks)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout
      title="Task Management"
      breadcrumbs={[{ label: 'Project' }, { label: 'Task Management' }]}
    >
      <div className="space-y-5">
        <ProjectSummaryCards />
        <div className="erp-card shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-700 text-foreground">Daftar Task</h3>
            <button className="btn-primary text-xs py-1.5 px-3">+ Tambah Task</button>
          </div>
          {loading ? (
            <p className="text-center py-10 text-muted-foreground text-[13px]">Memuat data...</p>
          ) : tasks.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-[13px]">Belum ada task</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-primary/5 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[task.status] ?? 'bg-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-500 ${task.status === 'Done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{task.projectCode} · {task.assignedToName ?? 'Belum ditugaskan'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-600 flex-shrink-0 ${PRIORITY_BADGE[task.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                    {task.priority}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{task.dueDate ? formatDate(task.dueDate) : '—'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-600 flex-shrink-0 ${STATUS_BADGE[task.status] ?? 'status-draft'}`}>
                    {STATUS_LABEL[task.status] ?? task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <ProjectTable />
      </div>
    </AppLayout>
  );
}
