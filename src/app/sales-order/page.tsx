import React from 'react';
import AppLayout from '@/components/AppLayout';
import SalesOrderSummaryCards from './components/SalesOrderSummaryCards';
import SalesOrderTable from './components/SalesOrderTable';

export default function SalesOrderPage() {
  return (
    <AppLayout
      title="Sales Order"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Sales' }, { label: 'Sales Order' }]}
    >
      <div className="space-y-5">
        <SalesOrderSummaryCards />
        <SalesOrderTable />
      </div>
    </AppLayout>
  );
}
