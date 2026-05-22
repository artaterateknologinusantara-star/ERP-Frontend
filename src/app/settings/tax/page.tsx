import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsModule from '../company/components/SettingsModule';

export default function SettingsTaxPage() {
  return (
    <AppLayout
      title="Tax Settings"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Settings' }, { label: 'Tax Settings' }]}
    >
      <SettingsModule activeTab="tax" />
    </AppLayout>
  );
}
