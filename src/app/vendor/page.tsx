import React from 'react';
import AppLayout from '@/components/AppLayout';
import VendorSummaryCards from './components/VendorSummaryCards';
import VendorTable from './components/VendorTable';

export default function VendorPage() {
  return (
    <AppLayout
      title="Vendor"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Purchasing' }, { label: 'Vendor' }]}
    >
      <div className="space-y-5">
        <VendorSummaryCards />
        <VendorTable />
      </div>
    </AppLayout>
  );
}
