import React from 'react';
import AppLayout from '@/components/AppLayout';
import FinanceSummaryCards from './components/FinanceSummaryCards';
import FinanceCharts from './components/FinanceCharts';
import CashInTable from './components/CashInTable';

export default function FinancePage() {
  return (
    <AppLayout
      title="Finance Reports"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Finance' }, { label: 'Finance Reports' }]}
    >
      <div className="space-y-5">
        <FinanceSummaryCards />
        <FinanceCharts />
        <CashInTable type="cash-in" />
        <CashInTable type="cash-out" />
      </div>
    </AppLayout>
  );
}
