import React from 'react';
import AppLayout from '@/components/AppLayout';
import FinanceSummaryCards from '../finance-reports/components/FinanceSummaryCards';
import CashInTable from '../finance-reports/components/CashInTable';

export default function CashOutPage() {
  return (
    <AppLayout
      title="Cash Out"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Finance' }, { label: 'Cash Out' }]}
    >
      <div className="space-y-5">
        <FinanceSummaryCards />
        <CashInTable type="cash-out" />
      </div>
    </AppLayout>
  );
}
