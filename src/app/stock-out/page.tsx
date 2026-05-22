import React from 'react';
import AppLayout from '@/components/AppLayout';
import InventorySummaryCards from '../item-master/components/InventorySummaryCards';
import ItemMasterTable from '../item-master/components/ItemMasterTable';

export default function StockOutPage() {
  return (
    <AppLayout
      title="Stock Out"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Inventory' }, { label: 'Stock Out' }]}
    >
      <div className="space-y-5">
        <InventorySummaryCards />
        <ItemMasterTable />
      </div>
    </AppLayout>
  );
}
