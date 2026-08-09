import React from 'react';
import AppLayout from '@/components/AppLayout';
import ProjectSummaryCards from '../components/ProjectSummaryCards';

export default function ProjectTimelinePage() {
  return (
    <AppLayout
      title="Timeline"
      breadcrumbs={[{ label: 'Project' }, { label: 'Timeline' }]}
    >
      <div className="space-y-5">
        <ProjectSummaryCards />
        <div className="erp-card shadow-card">
          <h3 className="text-[13px] font-700 text-foreground mb-4">Timeline Proyek — Mei 2026</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header weeks */}
              <div className="flex border-b border-border pb-2 mb-2">
                <div className="w-48 flex-shrink-0 text-xs font-600 text-muted-foreground">Proyek</div>
                {['01', '05', '10', '15', '20', '25', '30']?.map((d) => (
                  <div key={d} className="flex-1 text-xs text-muted-foreground text-center">{d} Mei</div>
                ))}
              </div>
              {[
                { name: 'Network Core Upgrade', start: 0, duration: 60, color: 'bg-primary' },
                { name: 'CCTV BCA Kantor Pusat', start: 20, duration: 50, color: 'bg-emerald-500' },
                { name: 'Data Center Astra', start: 5, duration: 80, color: 'bg-amber-500' },
                { name: 'Access Control PLN', start: 30, duration: 40, color: 'bg-violet-500' },
              ]?.map((prj) => (
                <div key={prj?.name} className="flex items-center mb-3">
                  <div className="w-48 flex-shrink-0 text-[13px] font-500 text-foreground truncate pr-2">{prj?.name}</div>
                  <div className="flex-1 relative h-6 bg-muted rounded">
                    <div
                      className={`absolute h-full rounded ${prj?.color} opacity-80`}
                      style={{ left: `${prj?.start}%`, width: `${prj?.duration}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
