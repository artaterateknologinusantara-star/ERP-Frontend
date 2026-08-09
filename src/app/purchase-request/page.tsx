import React from 'react';
import AppLayout from '@/components/AppLayout';
import PurchaseRequestSummaryCards from './components/PurchaseRequestSummaryCards';
import PurchaseRequestTable from './components/PurchaseRequestTable';

export default function PurchaseRequestPage() {
  return (
    <AppLayout
      title="Purchase Request"
      breadcrumbs={[{ label: 'Purchasing' }, { label: 'Purchase Request' }]}
    >
      <div className="space-y-5">
        <PurchaseRequestSummaryCards />
        <PurchaseRequestTable />
      </div>
    </AppLayout>
  );
}
