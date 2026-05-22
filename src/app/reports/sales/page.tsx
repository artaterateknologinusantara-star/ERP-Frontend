import React from 'react';
import AppLayout from '@/components/AppLayout';
import ReportsModule from './components/ReportsModule';

export default function ReportsSalesPage() {
  return (
    <AppLayout
      title="Sales Report"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Reports' }, { label: 'Sales Report' }]}
    >
      <ReportsModule reportType="sales" />
    </AppLayout>
  );
}
