import React from 'react';
import AppLayout from '@/components/AppLayout';
import APSummaryCards from './components/APSummaryCards';
import APTable from './components/APTable';

export default function AccountsPayablePage() {
  return (
    <AppLayout
      title="Accounts Payable"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Finance' }, { label: 'Accounts Payable' }]}
    >
      <div className="space-y-5">
        <APSummaryCards />
        <APTable />
      </div>
    </AppLayout>
  );
}
