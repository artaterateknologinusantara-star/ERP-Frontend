'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { BookTemplate, Save } from 'lucide-react';
import type { CostingTab } from '@/types';
import CostingTable from './CostingTable';
import TemplateLibraryModal from './TemplateLibraryModal';

interface Props {
  tabs: CostingTab[];
  setTabs: React.Dispatch<React.SetStateAction<CostingTab[]>>;
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export default function CostingTabsSection({ tabs, setTabs, activeTab, setActiveTab }: Props) {
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];

  const handleLoadTemplate = (templateTabs: CostingTab[]) => {
    setTabs(templateTabs);
    setTemplateModalOpen(false);
    toast.success('Template berhasil dimuat ke dalam penawaran');
  };

  return (
    <div className="erp-card shadow-card">
      {/* Tab Header + Template Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        {/* Tabs */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-base font-600 transition-all duration-150 whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-card text-primary shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Template Actions */}
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={() => setTemplateModalOpen(true)}
          >
            <BookTemplate size={13} /> Gunakan Template
          </button>
          <button
            className="btn-secondary text-xs"
            onClick={() => toast.success('Struktur costing disimpan sebagai template baru')}
          >
            <Save size={13} /> Simpan Sebagai Template
          </button>
        </div>
      </div>

      {/* Active Tab Content */}
      {activeTabData && (
        <CostingTable
          tabData={activeTabData}
          onUpdate={(updated) => {
            setTabs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          }}
        />
      )}

      <TemplateLibraryModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onLoadTemplate={handleLoadTemplate}
      />
    </div>
  );
}