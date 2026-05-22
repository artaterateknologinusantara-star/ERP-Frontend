import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsModule from '../company/components/SettingsModule';

export default function SettingsBranchPage() {
  return (
    <AppLayout
      title="Branch Management"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Settings' }, { label: 'Branch' }]}
    >
      <SettingsModule activeTab="branch" />
    </AppLayout>
  );
}
