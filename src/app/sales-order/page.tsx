import React from 'react';
import AppLayout from '@/components/AppLayout';
import SalesOrderSummaryCards from './components/SalesOrderSummaryCards';
import SalesOrderTable from './components/SalesOrderTable';

export default function SalesOrderPage() {
  return (
    <AppLayout
      title="Sales Order"
      breadcrumbs={[{ label: 'Sales' }, { label: 'Sales Order' }]}
    >
      <div className="space-y-5">
        <SalesOrderSummaryCards />
        <h2 className="text-sm font-600 text-muted-foreground">Daftar Sales Order</h2>
        <SalesOrderTable />
      </div>
    </AppLayout>
  );
}
