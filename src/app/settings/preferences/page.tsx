import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsModule from '../company/components/SettingsModule';

export default function SettingsPreferencesPage() {
  return (
    <AppLayout
      title="ERP Preferences"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Settings' }, { label: 'ERP Preferences' }]}
    >
      <SettingsModule activeTab="preferences" />
    </AppLayout>
  );
}
