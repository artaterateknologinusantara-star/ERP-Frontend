import React from 'react';
import AppLayout from '@/components/AppLayout';
import InvoiceSummaryCards from './components/InvoiceSummaryCards';
import InvoiceTable from './components/InvoiceTable';

export default function InvoicePage() {
  return (
    <AppLayout
      title="Invoice"
      breadcrumbs={[{ label: 'Sales' }, { label: 'Invoice' }]}
    >
      <div className="space-y-5">
        <InvoiceSummaryCards />
        <h2 className="text-sm font-600 text-muted-foreground">Daftar Invoice</h2>
        <InvoiceTable />
      </div>
    </AppLayout>
  );
}
