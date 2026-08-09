import React from 'react';
import AppLayout from '@/components/AppLayout';
import ARSummaryCards from './components/ARSummaryCards';
import ARTable from './components/ARTable';

export default function AccountsReceivablePage() {
  return (
    <AppLayout
      title="Accounts Receivable"
      breadcrumbs={[{ label: 'Finance' }, { label: 'Accounts Receivable' }]}
    >
      <div className="space-y-5">
        <ARSummaryCards />
        <ARTable />
      </div>
    </AppLayout>
  );
}
