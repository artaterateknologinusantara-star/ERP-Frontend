import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardKPICards from './components/DashboardKPICards';
import DashboardCharts from './components/DashboardCharts';
import DashboardRecentTable from './components/DashboardRecentTable';
import DashboardAlerts from './components/DashboardAlerts';

export default function DashboardPage() {
  return (
    <AppLayout
      title="Dashboard"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Dashboard' }]}
    >
      <div className="space-y-5">
        {/* KPI Cards */}
        <DashboardKPICards />

        {/* Charts Row */}
        <DashboardCharts />

        {/* Bottom Row: Recent Table + Alerts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <DashboardRecentTable />
          </div>
          <div className="xl:col-span-1">
            <DashboardAlerts />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}