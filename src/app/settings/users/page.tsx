import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsModule from '../company/components/SettingsModule';

export default function SettingsUsersPage() {
  return (
    <AppLayout
      title="User Management"
      breadcrumbs={[{ label: 'Settings' }, { label: 'User Management' }]}
    >
      <SettingsModule activeTab="users" />
    </AppLayout>
  );
}
