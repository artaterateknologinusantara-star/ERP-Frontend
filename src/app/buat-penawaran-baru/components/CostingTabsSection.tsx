'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { BookTemplate, ClipboardList, Save } from 'lucide-react';
import type { CostingTab } from '@/types';
import CostingTable from './CostingTable';
import TemplateLibraryModal from './TemplateLibraryModal';
import GroupWorkItemsPanel from './GroupWorkItemsPanel';
import { getGroupCategoryLetters } from '@/lib/categoryLetter';

export interface DocumentInfo {
  projectName: string;
  quotationNo: string;
  date: string;
}

// Template library belum terhubung ke backend (data masih hardcoded, tabs selalu kosong —
// lihat TODO di TemplateLibraryModal.tsx) — disembunyikan dari UI sampai fiturnya jadi.
const TEMPLATE_FEATURE_ENABLED = false;

interface Props {
  tabs: CostingTab[];
  setTabs: React.Dispatch<React.SetStateAction<CostingTab[]>>;
  activeTab: string;
  setActiveTab: (id: string) => void;
  isCivilMeMode: boolean;
  documentInfo: DocumentInfo;
  onExportPdf: () => void;
}

export default function CostingTabsSection({
  tabs,
  setTabs,
  activeTab,
  setActiveTab,
  isCivilMeMode,
  documentInfo,
  onExportPdf,
}: Props) {
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  // Modal Detail RAB/BQ — 1 instance untuk seluruh Tab aktif (bukan per-Group lagi), supaya bisa
  // menampilkan semua Group sekaligus persis seperti mockup. focusGroupId null = dibuka dari
  // tombol umum "Detail RAB/BQ" (semua Group terbuka); diisi = dibuka dari tombol per-baris Group
  // di CostingTable (Group itu di-scroll-ke + dibuka, sisanya diciutkan).
  const [rabModalOpen, setRabModalOpen] = useState(false);
  const [focusGroupId, setFocusGroupId] = useState<string | null>(null);

  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];

  // Huruf kategori (A, B, C...) dihitung lintas SEMUA Tab di sini — bukan di dalam CostingTable,
  // yang cuma menerima 1 Tab (tabData) dan tidak tahu urutan Group di Tab lain. Lihat
  // src/lib/categoryLetter.ts untuk alasan kenapa ini harus persis mirror backend.
  const groupCategoryLetters = getGroupCategoryLetters(tabs);

  const handleLoadTemplate = (templateTabs: CostingTab[]) => {
    setTabs(templateTabs);
    setTemplateModalOpen(false);
    toast.success('Template berhasil dimuat ke dalam penawaran');
  };

  const openRabDetail = (groupId?: string) => {
    setFocusGroupId(groupId ?? null);
    setRabModalOpen(true);
  };

  return (
    <div className="erp-card shadow-card">
      {/* Tab Header + Template Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        {/* Tabs — horizontal scroll on mobile instead of wrapping */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1 overflow-x-auto no-scrollbar max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 sm:py-2 rounded-md text-base font-600 transition-all duration-150 whitespace-nowrap flex-shrink-0
                ${
                  activeTab === tab.id
                    ? 'bg-card text-primary shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Template Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {activeTabData && (
            <button
              className="btn-secondary text-xs justify-center min-h-11 lg:min-h-0"
              onClick={() => openRabDetail()}
            >
              <ClipboardList size={13} /> Detail RAB/BQ
            </button>
          )}
          {TEMPLATE_FEATURE_ENABLED && (
            <>
              <button
                className="btn-secondary text-xs justify-center min-h-11 lg:min-h-0"
                onClick={() => setTemplateModalOpen(true)}
              >
                <BookTemplate size={13} /> Gunakan Template
              </button>
              <button
                className="btn-secondary text-xs justify-center min-h-11 lg:min-h-0"
                onClick={() => toast.success('Struktur costing disimpan sebagai template baru')}
              >
                <Save size={13} /> Simpan Sebagai Template
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Tab Content */}
      {activeTabData && (
        <CostingTable
          tabData={activeTabData}
          onUpdate={(updated) => {
            setTabs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          }}
          isCivilMeMode={isCivilMeMode}
          groupCategoryLetters={groupCategoryLetters}
          onOpenRabDetail={openRabDetail}
        />
      )}

      {activeTabData && (
        <GroupWorkItemsPanel
          tabData={activeTabData}
          onUpdateTab={(updated) => {
            setTabs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          }}
          isOpen={rabModalOpen}
          onClose={() => setRabModalOpen(false)}
          focusGroupId={focusGroupId}
          groupCategoryLetters={groupCategoryLetters}
          documentInfo={documentInfo}
          onExportPdf={onExportPdf}
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
