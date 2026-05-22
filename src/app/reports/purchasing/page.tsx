import React from 'react';
import AppLayout from '@/components/AppLayout';
import ReportsModule from '../sales/components/ReportsModule';

export default function ReportsPurchasingPage() {
  return (
    <AppLayout
      title="Purchasing Report"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Reports' }, { label: 'Purchasing Report' }]}
    >
      <ReportsModule reportType="purchasing" />
    </AppLayout>
  );
}
