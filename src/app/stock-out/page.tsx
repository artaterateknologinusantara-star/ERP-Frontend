import React from 'react';
import AppLayout from '@/components/AppLayout';
import StockOutContent from './components/StockOutContent';

export default function StockOutPage() {
  return (
    <AppLayout
      title="Delivery Order"
      breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock Out / DO' }]}
    >
      <StockOutContent />
    </AppLayout>
  );
}
