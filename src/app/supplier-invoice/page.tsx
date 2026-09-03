import React from 'react';
import AppLayout from '@/components/AppLayout';
import SupplierInvoiceTable from './components/SupplierInvoiceTable';

export default function SupplierInvoicePage() {
  return (
    <AppLayout
      title="Supplier Invoice"
      breadcrumbs={[{ label: 'Purchasing' }, { label: 'Supplier Invoice' }]}
    >
      <div className="space-y-5">
        <SupplierInvoiceTable />
      </div>
    </AppLayout>
  );
}
