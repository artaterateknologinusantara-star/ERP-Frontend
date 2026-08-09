import React from 'react';
import AppLayout from '@/components/AppLayout';
import CustomerSummaryCards from './components/CustomerSummaryCards';
import CustomerTable from './components/CustomerTable';

export default function CustomerPage() {
  return (
    <AppLayout
      title="Customer"
      breadcrumbs={[{ label: 'Sales' }, { label: 'Customer' }]}
    >
      <div className="space-y-5">
        <CustomerSummaryCards />
        <CustomerTable />
      </div>
    </AppLayout>
  );
}
