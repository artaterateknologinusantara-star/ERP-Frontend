import React from 'react';
import AppLayout from '@/components/AppLayout';
import APSummaryCards from '../accounts-payable/components/APSummaryCards';
import APTable from '../accounts-payable/components/APTable';

export default function SupplierInvoicePage() {
  return (
    <AppLayout
      title="Supplier Invoice"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Purchasing' }, { label: 'Supplier Invoice' }]}
    >
      <div className="space-y-5">
        <APSummaryCards />
        <APTable />
      </div>
    </AppLayout>
  );
}
