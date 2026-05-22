import React from 'react';
import AppLayout from '@/components/AppLayout';
import FinanceSummaryCards from './components/FinanceSummaryCards';
import FinanceCharts from './components/FinanceCharts';
import CashInTable from './components/CashInTable';

export default function FinancePage() {
  return (
    <AppLayout
      title="Finance"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Finance' }, { label: 'Finance Dashboard' }]}
    >
      <div className="space-y-5">
        <FinanceSummaryCards />
        <FinanceCharts />
        <CashInTable />
      </div>
    </AppLayout>
  );
}
