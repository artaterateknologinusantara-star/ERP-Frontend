import React from 'react';
import AppLayout from '@/components/AppLayout';
import InventorySummaryCards from '../item-master/components/InventorySummaryCards';
import ItemMasterTable from '../item-master/components/ItemMasterTable';

export default function StockInPage() {
  return (
    <AppLayout
      title="Stock In"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Inventory' }, { label: 'Stock In' }]}
    >
      <div className="space-y-5">
        <InventorySummaryCards />
        <ItemMasterTable />
      </div>
    </AppLayout>
  );
}
