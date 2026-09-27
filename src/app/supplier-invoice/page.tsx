import React from 'react';
import AppLayout from '@/components/AppLayout';
import SupplierInvoiceTable from './components/SupplierInvoiceTable';

export default function SupplierInvoicePage() {
  return (
    <AppLayout
      title="Bill"
      breadcrumbs={[{ label: 'Purchasing' }, { label: 'Bill' }]}
    >
      <div className="space-y-5">
        <SupplierInvoiceTable />
      </div>
    </AppLayout>
  );
}
