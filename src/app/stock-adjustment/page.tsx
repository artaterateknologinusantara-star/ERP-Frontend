import React from 'react';
import AppLayout from '@/components/AppLayout';
import InventorySummaryCards from '../item-master/components/InventorySummaryCards';
import ItemMasterTable from '../item-master/components/ItemMasterTable';

export default function StockAdjustmentPage() {
  return (
    <AppLayout
      title="Stock Adjustment"
      breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock Adjustment' }]}
    >
      <div className="space-y-5">
        <InventorySummaryCards />
        <ItemMasterTable />
      </div>
    </AppLayout>
  );
}
