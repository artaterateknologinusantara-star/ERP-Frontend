import React from 'react';
import AppLayout from '@/components/AppLayout';
import PurchaseOrderSummaryCards from './components/PurchaseOrderSummaryCards';
import PurchaseOrderTable from './components/PurchaseOrderTable';

export default function PurchaseOrderPage() {
  return (
    <AppLayout
      title="Purchase Order"
      breadcrumbs={[{ label: 'Purchasing' }, { label: 'Purchase Order' }]}
    >
      <div className="space-y-5">
        <PurchaseOrderSummaryCards />
        <PurchaseOrderTable />
      </div>
    </AppLayout>
  );
}
