import React from 'react';
import AppLayout from '@/components/AppLayout';
import ExpenseTable from './components/ExpenseTable';

export default function ExpensePage() {
  return (
    <AppLayout
      title="Expense Management"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Finance' }, { label: 'Expense Management' }]}
    >
      <ExpenseTable />
    </AppLayout>
  );
}
