'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import ProjectSummaryCards from '../components/ProjectSummaryCards';
import { projectService, ProjectListItem } from '@/services/project.service';
import { formatDateShort } from '@/lib/format';

const BAR_COLORS = ['bg-primary', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500'];
const TICK_COUNT = 6;
const MIN_BAR_WIDTH_PCT = 2;

export default function ProjectTimelinePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectService.list({ perPage: 200 })
      .then((res) => setProjects(res.data))
      .finally(() => setLoading(false));
  }, []);

  // Rentang timeline dihitung dari StartDate/EndDate Project asli (bukan tanggal tetap) - Project
  // tanpa EndDate dianggap selesai di StartDate-nya sendiri untuk keperluan rentang, batangnya tetap
  // diberi lebar minimum (MIN_BAR_WIDTH_PCT) supaya tetap terlihat.
  const starts = projects.map((p) => new Date(p.startDate).getTime());
  const ends = projects.map((p) => new Date(p.endDate ?? p.startDate).getTime());
  const minTime = starts.length ? Math.min(...starts) : Date.now();
  const maxTime = ends.length ? Math.max(...ends) : Date.now();
  const totalSpan = Math.max(maxTime - minTime, 1);

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => new Date(minTime + (totalSpan * i) / (TICK_COUNT - 1)));

  return (
    <AppLayout
      title="Timeline"
      breadcrumbs={[{ label: 'Project' }, { label: 'Timeline' }]}
    >
      <div className="space-y-5">
        <ProjectSummaryCards />
        <div className="erp-card shadow-card">
          <h3 className="text-[13px] font-700 text-foreground mb-4">Timeline Proyek</h3>
          {loading ? (
            <p className="text-center py-10 text-muted-foreground text-[13px]">Memuat data...</p>
          ) : projects.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-[13px]">Belum ada project</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="flex border-b border-border pb-2 mb-2">
                  <div className="w-48 flex-shrink-0 text-xs font-600 text-muted-foreground">Proyek</div>
                  {ticks.map((d, i) => (
                    <div key={i} className="flex-1 text-xs text-muted-foreground text-center">{formatDateShort(d.toISOString())}</div>
                  ))}
                </div>
                {projects.map((p, i) => {
                  const start = new Date(p.startDate).getTime();
                  const end = new Date(p.endDate ?? p.startDate).getTime();
                  const startPct = ((start - minTime) / totalSpan) * 100;
                  const widthPct = Math.max(((end - start) / totalSpan) * 100, MIN_BAR_WIDTH_PCT);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center mb-3 cursor-pointer group"
                      onClick={() => router.push(`/project/${p.id}`)}
                    >
                      <div className="w-48 flex-shrink-0 text-[13px] font-500 text-foreground truncate pr-2 group-hover:text-primary">
                        {p.name}
                      </div>
                      <div className="flex-1 relative h-6 bg-muted rounded">
                        <div
                          className={`absolute h-full rounded ${BAR_COLORS[i % BAR_COLORS.length]} opacity-80 group-hover:opacity-100 transition-opacity`}
                          style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                          title={`${p.code} — ${p.startDate} s/d ${p.endDate ?? '—'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
