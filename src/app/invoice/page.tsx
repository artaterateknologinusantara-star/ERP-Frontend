import React from 'react';
import AppLayout from '@/components/AppLayout';
import InvoiceSummaryCards from './components/InvoiceSummaryCards';
import InvoiceTable from './components/InvoiceTable';

export default function InvoicePage() {
  return (
    <AppLayout
      title="Invoice"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Sales' }, { label: 'Invoice' }]}
    >
      <div className="space-y-5">
        <InvoiceSummaryCards />
        <InvoiceTable />
      </div>
    </AppLayout>
  );
}
