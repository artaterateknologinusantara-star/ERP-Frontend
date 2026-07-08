import React from 'react';
import AppLayout from '@/components/AppLayout';
import TrialBalanceReport from './components/TrialBalanceReport';

export default function TrialBalancePage() {
  return (
    <AppLayout
      title="Trial Balance"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Accounting' }, { label: 'Trial Balance' }]}
    >
      <div className="space-y-5">
        <TrialBalanceReport />
      </div>
    </AppLayout>
  );
}
