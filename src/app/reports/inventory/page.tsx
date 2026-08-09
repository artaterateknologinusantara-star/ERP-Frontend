import React from 'react';
import AppLayout from '@/components/AppLayout';
import ReportsModule from '../sales/components/ReportsModule';

export default function ReportsInventoryPage() {
  return (
    <AppLayout
      title="Inventory Report"
      breadcrumbs={[{ label: 'Reports' }, { label: 'Inventory Report' }]}
    >
      <ReportsModule reportType="inventory" />
    </AppLayout>
  );
}
