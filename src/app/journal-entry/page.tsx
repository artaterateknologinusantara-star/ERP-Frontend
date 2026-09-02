import React from 'react';
import AppLayout from '@/components/AppLayout';
import JournalEntryTable from './components/JournalEntryTable';

export default function JournalEntryPage() {
  return (
    <AppLayout
      title="Journal Entry"
      breadcrumbs={[{ label: 'Accounting' }, { label: 'Journal Entry' }]}
    >
      <div className="space-y-5">
        <JournalEntryTable />
      </div>
    </AppLayout>
  );
}
