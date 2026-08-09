import React from 'react';
import AppLayout from '@/components/AppLayout';
import ReportsModule from '../sales/components/ReportsModule';

export default function ReportsFinancePage() {
  return (
    <AppLayout
      title="Finance Report"
      breadcrumbs={[{ label: 'Reports' }, { label: 'Finance Report' }]}
    >
      <ReportsModule reportType="finance" />
    </AppLayout>
  );
}
