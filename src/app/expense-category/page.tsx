import React from 'react';
import AppLayout from '@/components/AppLayout';
import ExpenseCategoryTable from './components/ExpenseCategoryTable';

export default function ExpenseCategoryPage() {
  return (
    <AppLayout
      title="Kategori Pengeluaran"
      breadcrumbs={[{ label: 'Finance' }, { label: 'Kategori Pengeluaran' }]}
    >
      <ExpenseCategoryTable />
    </AppLayout>
  );
}
