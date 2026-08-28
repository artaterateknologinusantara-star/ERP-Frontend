'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Download, Save, ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import InformasiPenawaranSection, { type InfoFormValues } from './InformasiPenawaranSection';
import CostingTabsSection from './CostingTabsSection';
import GrandTotalPanel from './GrandTotalPanel';
import SyaratPembayaranSection from './SyaratPembayaranSection';
import SyaratKetentuanSection from './SyaratKetentuanSection';
import TotalMarginSection from './TotalMarginSection';
import CatatanTambahanSection from './CatatanTambahanSection';
import type { CostingTab, CostingRow, PaymentTerm, QuotationStatus } from '@/types';
import { quotationService, mapTabsToBackend } from '@/services/quotation.service';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { formatRp } from '@/lib/format';
import { getMarginTier, marginTierClasses } from '@/lib/margin';

const makeEmptyRow = (groupId: string, no: string, sortOrder: number): CostingRow => ({
  id: `row-${groupId}-${sortOrder + 1}`,
  no,
  equipment: '',
  description: '',
  manufacturer: '',
  qty: 1,
  unit: 'Unit',
  servicePrice: 0,
  materialPrice: 0,
  costPrice: 0,
  sortOrder,
});

const initialTabs: CostingTab[] = [
  {
    id: 'tab-penawaran',
    label: 'Penawaran',
    sortOrder: 0,
    groups: [
      {
        id: 'grp-tab-penawaran-1',
        name: 'Kategori Baru',
        // Mulai dengan 2 baris kosong agar user langsung paham cara mengisi tabel.
        rows: [
          makeEmptyRow('grp-tab-penawaran-1', '1.1', 0),
          makeEmptyRow('grp-tab-penawaran-1', '1.2', 1),
        ],
        sortOrder: 0,
      },
    ],
  },
];

const today = new Date().toISOString().split('T')[0];
const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const defaultInfo: InfoFormValues = {
  customerId: '',
  projectName: '',
  projectLocation: '',
  attn: '',
  date: today,
  validUntil: thirtyDaysLater,
  salesId: '20000000-0000-0000-0000-000000000001',
  branch: 'Jakarta Pusat',
  quotationNo: '—',
  revision: 0,
};

// Maps backend QuotationDto tabs (items) back to frontend CostingTab (rows)
function mapApiTabs(apiTabs: any[]): CostingTab[] {
  return (apiTabs ?? []).map((t: any) => ({
    id: t.id,
    label: t.label,
    sortOrder: t.sortOrder ?? 0,
    groups: (t.groups ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      sortOrder: g.sortOrder ?? 0,
      rows: (g.items ?? []).map((i: any) => ({
        id: i.id,
        no: i.itemNo,
        equipment: i.equipment,
        description: i.description ?? '',
        manufacturer: i.manufacturer ?? '',
        qty: i.qty,
        unit: i.unit,
        servicePrice: i.servicePrice,
        materialPrice: i.materialPrice,
        costPrice: 0,
        sortOrder: i.sortOrder ?? 0,
      })),
    })),
  }));
}

// Parses the saved "20% - Deskripsi\n80% - Deskripsi\nNET 30 HARI" string back into
// structured SyaratPembayaranSection state — the shape buildDto() produces below.
function parsePaymentTermsString(str: string): { terms: PaymentTerm[]; netPayment: number } {
  const terms: PaymentTerm[] = [];
  let netPayment = 30;
  (str ?? '').split('\n').map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    const netMatch = line.match(/^NET\s+(\d+(?:\.\d+)?)\s+HARI$/i);
    if (netMatch) { netPayment = Number(netMatch[1]); return; }
    const termMatch = line.match(/^(\d+(?:\.\d+)?)%\s*-\s*(.*)$/);
    if (termMatch) terms.push({ id: `pt-${i}-${Date.now()}`, percentage: Number(termMatch[1]), description: termMatch[2].trim() });
  });
  return { terms, netPayment };
}

export default function BuatPenawaranForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id');

  const [infoValues, setInfoValues] = useState<InfoFormValues>(defaultInfo);
  const [tabs, setTabs] = useState<CostingTab[]>(initialTabs);
  const [activeTab, setActiveTab] = useState(initialTabs[0].id);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(11);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [netPayment, setNetPayment] = useState(30);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const { data: companySettings } = useCompanySettings();
  // createdId tracks a just-created quotation that has no URL param yet.
  // For edit mode (URL has ?id=), we always use editId directly — never frozen state.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const targetId = editId ?? createdId;
  const [currentStatus, setCurrentStatus] = useState<QuotationStatus>('Draft');
  const [saveLabel, setSaveLabel] = useState<string>('Belum disimpan');
  const [isSaving, setIsSaving] = useState(false);

  // Load existing quotation for edit mode
  useEffect(() => {
    if (!editId) return;
    quotationService.getById(editId)
      .then((res) => {
        const q = res.data;
        setInfoValues({
          customerId: q.customerId,
          projectName: q.projectName,
          projectLocation: '',
          attn: '',
          date: q.date,
          validUntil: q.validUntil ?? '',
          salesId: q.salesId,
          branch: 'Jakarta Pusat',
          quotationNo: q.no,
          revision: q.revision,
        });
        if (q.tabs?.length) setTabs(mapApiTabs(q.tabs as any[]));
        setDiscount(q.discount);
        setTaxRate(q.taxRate);
        setCurrentStatus(q.status);
        setSaveLabel(q.revision > 0 ? `Draft · R.${String(q.revision).padStart(2, '0')}` : 'Draft');
        const { terms, netPayment: net } = parsePaymentTermsString(q.paymentTerms ?? '');
        setPaymentTerms(terms);
        setNetPayment(net);
        setTermsAndConditions(q.termsAndConditions ?? '');
      })
      .catch(() => toast.error('Gagal memuat data penawaran'));
  }, [editId]);

  // New quotation: prefill Syarat & Ketentuan from Company Settings once, unless the user already typed something
  useEffect(() => {
    if (editId) return;
    if (termsAndConditions) return;
    if (companySettings?.footerText) setTermsAndConditions(companySettings.footerText);
  }, [editId, companySettings, termsAndConditions]);

  const buildDto = () => {
    const ptStr = [
      ...paymentTerms.map((t) => `${t.percentage}% - ${t.description}`),
      `NET ${netPayment} HARI`,
    ].join('\n');
    return {
      customerId: infoValues.customerId,
      salesId: infoValues.salesId,
      projectName: infoValues.projectName,
      date: infoValues.date,
      validUntil: infoValues.validUntil || undefined,
      discount,
      taxRate,
      paymentTerms: ptStr,
      termsAndConditions,
      additionalNotes,
      tabs: mapTabsToBackend(tabs),
    };
  };

  const handleSaveDraft = async () => {
    if (!infoValues.customerId) { toast.error('Pilih pelanggan terlebih dahulu'); return; }
    if (!infoValues.projectName.trim()) { toast.error('Nama proyek wajib diisi'); return; }
    if (!infoValues.salesId) { toast.error('Pilih sales person terlebih dahulu'); return; }
    setIsSaving(true);
    try {
      const dto = buildDto();
      if (targetId) {
        // UPDATE existing quotation (draft or revision draft) — stay on page
        await quotationService.update(targetId, dto);
        const isRevision = infoValues.revision > 0;
        toast.success(isRevision ? 'Draft revisi berhasil diperbarui' : 'Draft penawaran berhasil diperbarui');
        setSaveLabel(
          isRevision
            ? `Tersimpan · R.${String(infoValues.revision).padStart(2, '0')}`
            : 'Tersimpan'
        );
      } else {
        // CREATE new quotation — redirect to history so user sees it
        const res = await quotationService.create(dto);
        setCreatedId(res.data.id);
        setInfoValues((v) => ({ ...v, quotationNo: res.data.no, revision: res.data.revision }));
        toast.success('Draft penawaran berhasil disimpan');
        router.push('/riwayat-penawaran');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan penawaran');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = () => {
    if (!targetId) { toast.info('Simpan penawaran terlebih dahulu sebelum export PDF'); return; }
    quotationService.exportPdf(targetId)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${infoValues.quotationNo || 'penawaran'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Gagal mengunduh PDF'));
  };

  // Mobile-only sticky summary bar — grand total + margin, always visible while scrolling
  // the form on small screens (mirrors the checkout-summary pattern from e-commerce/enterprise apps).
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const allRows = tabs.flatMap((t) => t.groups.flatMap((g) => g.rows));
  const mTotalMaterial = allRows.reduce((s, r) => s + r.qty * r.materialPrice, 0);
  const mTotalJasa = allRows.reduce((s, r) => s + r.qty * r.servicePrice, 0);
  const mTotalCost = allRows.reduce((s, r) => s + r.qty * r.costPrice, 0);
  const mGrandTotal = mTotalMaterial + mTotalJasa;
  const mAfterDiscount = mGrandTotal - mGrandTotal * (discount / 100);
  const mGrandTotalWithTax = mAfterDiscount + mAfterDiscount * (taxRate / 100);
  const mMargin = mAfterDiscount - mTotalCost;
  const mMarginPercent = mAfterDiscount > 0 ? (mMargin / mAfterDiscount) * 100 : 0;
  const mTier = getMarginTier(mMarginPercent);
  const mTc = marginTierClasses[mTier];

  // Mobile sticky summary bar should be rendered as a sibling of the
  // main .animate-fade-in container so fixed positioning anchors to viewport.
  return (
    <React.Fragment>
      <div className="space-y-5 animate-fade-in pb-28 lg:pb-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky-action-bar px-3 sm:px-5 py-3 -mx-3 sm:-mx-5 -mt-3 sm:-mt-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText size={16} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-700 text-foreground">{infoValues.quotationNo}</h2>
              <StatusBadge status={currentStatus} size="sm" />
            </div>
            <p className="text-xs text-muted-foreground">{saveLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          <button className="btn-secondary min-h-11 flex-shrink-0" onClick={handleExportPdf}>
            <Download size={14} /> Export PDF
          </button>
          <button className="btn-secondary min-h-11 flex-shrink-0" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? (
              <span className="flex items-center gap-1.5 w-28 justify-center">
                <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Menyimpan...
              </span>
            ) : (
              <><Save size={14} /> Submit Penawaran</>
            )}
          </button>
          <button className="btn-primary min-h-11 flex-shrink-0" onClick={() => router.push('/riwayat-penawaran')}>
            <ArrowLeft size={14} /> Kembali ke Riwayat
          </button>
        </div>
      </div>

      {/* Section 1: Informasi Penawaran */}
      <InformasiPenawaranSection
        values={infoValues}
        onChange={(patch) => setInfoValues((v) => ({ ...v, ...patch }))}
        errors={{}}
      />

      {/* Section 2: Costing Tabs */}
      <CostingTabsSection
        tabs={tabs}
        setTabs={setTabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Section 3: Bottom panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <TotalMarginSection tabs={tabs} discount={discount} />
          <SyaratPembayaranSection
            terms={paymentTerms}
            onChange={setPaymentTerms}
            netPayment={netPayment}
            setNetPayment={setNetPayment}
          />
          <SyaratKetentuanSection value={termsAndConditions} onChange={setTermsAndConditions} />
          <CatatanTambahanSection value={additionalNotes} onChange={setAdditionalNotes} />
        </div>
        <div className="xl:col-span-1">
          <GrandTotalPanel
            tabs={tabs}
            discount={discount}
            setDiscount={setDiscount}
            taxRate={taxRate}
            setTaxRate={setTaxRate}
          />
        </div>
      </div>
    </div>

    <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
        {mobileSummaryOpen && (
          <div className="px-4 py-3 border-b border-border space-y-1.5 text-xs animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Material</span>
              <span className="font-600 font-tabular text-foreground">{formatRp(mTotalMaterial)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Jasa</span>
              <span className="font-600 font-tabular text-foreground">{formatRp(mTotalJasa)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Diskon ({discount}%) / PPN ({taxRate}%)</span>
              <span className="font-600 font-tabular text-foreground">{formatRp(mGrandTotalWithTax)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Margin</span>
              <span className={`font-600 font-tabular ${mTc.text}`}>
                {formatRp(mMargin)} ({mMarginPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setMobileSummaryOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[56px]"
        >
          <span className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
            {mobileSummaryOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
          <span className="flex-1 flex items-center justify-between gap-2 min-w-0">
            <span className="text-left min-w-0">
              <span className="block text-xs text-muted-foreground">Grand Total</span>
              <span className="block text-xl font-800 font-tabular text-foreground truncate">{formatRp(mGrandTotalWithTax)}</span>
            </span>
            <span className={`text-sm font-700 font-tabular px-2 py-1 rounded-lg flex-shrink-0 ${mTc.bg} ${mTc.text}`}>
              {mMarginPercent >= 0 ? '' : '-'}{Math.abs(mMarginPercent).toFixed(1)}%
            </span>
          </span>
        </button>
      </div>
    </React.Fragment>
  );
}
