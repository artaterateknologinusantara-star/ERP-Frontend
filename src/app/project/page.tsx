import React from 'react';
import AppLayout from '@/components/AppLayout';
import ProjectSummaryCards from './components/ProjectSummaryCards';
import ProjectTable from './components/ProjectTable';
import ProjectCharts from './components/ProjectCharts';

export default function ProjectPage() {
  return (
    <AppLayout
      title="Project Dashboard"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Project' }, { label: 'Project Dashboard' }]}
    >
      <div className="space-y-5">
        <ProjectSummaryCards />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <ProjectTable />
          </div>
          <div className="xl:col-span-1">
            <ProjectCharts />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
