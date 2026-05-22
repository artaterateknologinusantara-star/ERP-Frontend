import React from 'react';
import AppLayout from '@/components/AppLayout';
import FinanceSummaryCards from '../finance-reports/components/FinanceSummaryCards';
import CashInTable from '../finance-reports/components/CashInTable';

export default function CashInPage() {
  return (
    <AppLayout
      title="Cash In"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Finance' }, { label: 'Cash In' }]}
    >
      <div className="space-y-5">
        <FinanceSummaryCards />
        <CashInTable />
      </div>
    </AppLayout>
  );
}
