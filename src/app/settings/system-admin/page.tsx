import React from 'react';
import AppLayout from '@/components/AppLayout';
import TransactionResetModule from './components/TransactionResetModule';

export default function SystemAdminPage() {
  return (
    <AppLayout
      title="System Administration"
      breadcrumbs={[
        { label: 'SynteraERP' },
        { label: 'Settings' },
        { label: 'System Administration' },
      ]}
    >
      <TransactionResetModule />
    </AppLayout>
  );
}
