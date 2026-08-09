import React from 'react';
import AppLayout from '@/components/AppLayout';
import InventorySummaryCards from './components/InventorySummaryCards';
import ItemMasterTable from './components/ItemMasterTable';

export default function ItemMasterPage() {
  return (
    <AppLayout
      title="Item Master"
      breadcrumbs={[{ label: 'Inventory' }, { label: 'Item Master' }]}
    >
      <div className="space-y-5">
        <InventorySummaryCards />
        <ItemMasterTable />
      </div>
    </AppLayout>
  );
}
