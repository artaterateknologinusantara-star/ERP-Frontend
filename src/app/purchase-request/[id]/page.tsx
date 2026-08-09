'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import ERPModal from '@/components/ui/ERPModal';
import { formatRp, formatDate } from '@/lib/format';
import { ChevronDown, X, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import {
  getPRDetail,
  updatePRStatus,
  deletePR,
  createPOFromPR,
  getPOList,
  PurchaseRequestDetail,
  PurchaseOrderListItem,
} from '@/services/purchase.service';
import { supplierService } from '@/services/supplier.service';
import { PurchaseRequestStatus, PurchaseOrderStatus } from '@/types';
import type { Supplier } from '@/types';

export default function PurchaseRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [pr, setPr] = useState<PurchaseRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // PO Modal state
  const [poModal, setPoModal] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poError, setPoError] = useState('');
  const [creating, setCreating] = useState(false);
  const [itemAllocations, setItemAllocations] = useState<Record<string, string>>({});
  const comboRef = useRef<HTMLDivElement>(null);

  // Related POs (for Ordered banner)
  const [relatedPOs, setRelatedPOs] = useState<PurchaseOrderListItem[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPRDetail(id);
      setPr(data);
    } catch {
      toast.error('Gagal memuat detail Purchase Request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Fetch linked POs when PR is Ordered/PartiallyOrdered, to show accurate GR status banner + PO list
  useEffect(() => {
    if (!pr || (pr.status !== 'Ordered' && pr.status !== 'PartiallyOrdered')) return;
    setLoadingPOs(true);
    getPOList({ perPage: 100 })
      .then((res) => {
        setRelatedPOs(res.data.filter((po) => po.purchaseRequestId === pr.id));
      })
      .catch(() => {})
      .finally(() => setLoadingPOs(false));
  }, [pr?.id, pr?.status]);

  // Close combobox on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
        if (!selectedSupplierId) setSupplierSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedSupplierId]);

  const handleStatusAction = async (newStatus: string, msg: string) => {
    if (!pr) return;
    setSaving(true);
    try {
      await updatePRStatus(pr.id, newStatus);
      toast.success(msg);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Operasi gagal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pr) return;
    if (!confirm(`Hapus ${pr.no}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await deletePR(pr.id);
      toast.success(`${pr.no} berhasil dihapus`);
      router.push('/purchase-request');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus PR');
    }
  };

  const openPoModal = async () => {
    if (!pr) return;
    setPoError('');
    setSupplierSearch('');
    setSelectedSupplierId('');
    setSelectedSupplierName('');
    setDeliveryDate('');
    setPoNotes('');
    // Prefill qty PO dengan sisa yang belum teralokasi ke PO manapun — user boleh kurangi kalau mau
    // split sebagian lagi ke vendor lain, atau kosongkan/nolkan untuk skip item itu di PO ini.
    const initialAllocations: Record<string, string> = {};
    pr.items.forEach((i) => {
      const remaining = i.qty - i.orderedQty;
      if (remaining > 0) initialAllocations[i.id] = String(remaining);
    });
    setItemAllocations(initialAllocations);
    setPoModal(true);
    if (!suppliersLoaded) {
      try {
        const res = await supplierService.list({ perPage: 100 });
        setSuppliers(res.data);
        setSuppliersLoaded(true);
      } catch {
        // ignore
      }
    }
  };

  const handleSelectSupplier = (s: Supplier) => {
    setSelectedSupplierId(s.id);
    setSelectedSupplierName(s.name);
    setSupplierSearch(s.name);
    setComboOpen(false);
    setPoError('');
  };

  const handleClearSupplier = () => {
    setSelectedSupplierId('');
    setSelectedSupplierName('');
    setSupplierSearch('');
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.city ?? '').toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const handleCreatePO = async () => {
    if (!pr) return;
    if (!selectedSupplierId) {
      setPoError('Supplier wajib dipilih');
      return;
    }

    const items = Object.entries(itemAllocations)
      .map(([prItemId, qtyStr]) => ({ prItemId, qty: parseFloat(qtyStr) || 0 }))
      .filter((i) => i.qty > 0);

    if (items.length === 0) {
      setPoError('Pilih minimal 1 item dengan qty lebih dari 0 untuk vendor ini');
      return;
    }

    for (const it of items) {
      const prItem = pr.items.find((i) => i.id === it.prItemId);
      const remaining = (prItem?.qty ?? 0) - (prItem?.orderedQty ?? 0);
      if (it.qty > remaining) {
        setPoError(`Qty untuk ${prItem?.itemName} (${it.qty}) melebihi sisa yang belum teralokasi (${remaining})`);
        return;
      }
    }

    setCreating(true);
    try {
      const po = await createPOFromPR(pr.id, {
        supplierId: selectedSupplierId,
        items,
        deliveryDate: deliveryDate || undefined,
        notes: poNotes || undefined,
      });
      toast.success(`Purchase Order ${po.no} berhasil dibuat`);
      setPoModal(false);
      router.push(`/purchase-order/${po.id}`);
    } catch (e: unknown) {
      setPoError(e instanceof Error ? e.message : 'Gagal membuat PO');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout
        title="Purchase Request Detail"
        breadcrumbs={[
          { label: 'Purchasing' },
          { label: 'Purchase Request', href: '/purchase-request' },
          { label: '...' },
        ]}
      >
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Memuat data...
        </div>
      </AppLayout>
    );
  }

  if (!pr) {
    return (
      <AppLayout
        title="Purchase Request Detail"
        breadcrumbs={[
          { label: 'Purchasing' },
          { label: 'Purchase Request', href: '/purchase-request' },
          { label: 'Tidak ditemukan' },
        ]}
      >
        <div className="text-center py-20 text-muted-foreground text-sm">
          Purchase Request tidak ditemukan.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`PR ${pr.no}`}
      breadcrumbs={[
        { label: 'Purchasing' },
        { label: 'Purchase Request', href: '/purchase-request' },
        { label: pr.no },
      ]}
    >
      <div className="space-y-6">

        {/* ── Status banners ── */}
        {pr.status === 'Ordered' && !loadingPOs && (
          relatedPOs.length > 0 && relatedPOs.every((po) => po.status === 'Completed')
            ? (
              <div className="flex items-start gap-2.5 text-sm px-4 py-3 border border-green-200 bg-green-50 text-green-800 rounded-lg">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <span>Semua barang sudah diterima (Goods Receipt selesai). SO dapat melanjutkan ke tahap Delivery Order.</span>
              </div>
            )
            : relatedPOs.length > 0
              ? (
                <div className="flex items-start gap-2.5 text-sm px-4 py-3 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg">
                  <Clock size={15} className="shrink-0 mt-0.5" />
                  <span>
                    PO sudah dibuat. Menunggu proses Goods Receipt selesai sebelum SO bisa melanjutkan ke tahap Delivery Order.
                    {relatedPOs[0] && (
                      <Link href={`/purchase-order/${relatedPOs[0].id}`} className="ml-2 font-600 underline hover:no-underline whitespace-nowrap">
                        Lihat PO →
                      </Link>
                    )}
                  </span>
                </div>
              )
              : (
                <div className="flex items-start gap-2.5 text-sm px-4 py-3 border border-gray-200 bg-gray-50 text-gray-600 rounded-lg">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>PR berstatus Ordered namun belum ada PO terkait.</span>
                </div>
              )
        )}
        {pr.status === 'Submitted' && (
          <div className="flex items-start gap-2.5 text-sm px-4 py-3 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>PR menunggu persetujuan. Approve untuk bisa membuat Purchase Order.</span>
          </div>
        )}
        {pr.status === 'PartiallyOrdered' && (
          <div className="flex items-start gap-2.5 text-sm px-4 py-3 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              Sebagian item sudah dialokasikan ke Purchase Order (lihat tabel di bawah). Klik
              &quot;Buat PO dari PR ini&quot; untuk membuat PO tambahan bagi item yang masih tersisa —
              bisa ke vendor yang sama atau vendor berbeda.
            </span>
          </div>
        )}

        {/* ── Header ── */}
        <div className="erp-card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{pr.no}</h1>
              <StatusBadge status={pr.status as PurchaseRequestStatus} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {pr.status === 'Draft' && (
                <>
                  <button
                    className="btn-primary flex items-center gap-1.5"
                    onClick={() => handleStatusAction('Submitted', 'PR berhasil diajukan')}
                    disabled={saving}
                  >
                    Submit PR
                  </button>
                  <button
                    className="btn-secondary text-red-500 hover:bg-red-50"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Hapus
                  </button>
                </>
              )}
              {pr.status === 'Submitted' && (
                <>
                  <button
                    className="btn-primary flex items-center gap-1.5 bg-green-600 hover:bg-green-700 border-green-600"
                    onClick={() => handleStatusAction('Approved', 'PR disetujui')}
                    disabled={saving}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn-secondary text-red-500 border-red-300 hover:bg-red-50"
                    onClick={() => handleStatusAction('Rejected', 'PR ditolak')}
                    disabled={saving}
                  >
                    ✗ Reject
                  </button>
                </>
              )}
              {(pr.status === 'Approved' || pr.status === 'PartiallyOrdered') && (
                <button
                  className="btn-primary flex items-center gap-1.5"
                  onClick={openPoModal}
                >
                  Buat PO dari PR ini
                </button>
              )}
              {pr.status === 'Rejected' && (
                <button
                  className="btn-secondary flex items-center gap-1.5"
                  onClick={() => handleStatusAction('Draft', 'PR di-reset ke Draft')}
                  disabled={saving}
                >
                  Reset ke Draft
                </button>
              )}
              {pr.status === 'Ordered' && (
                <button
                  className="btn-secondary text-red-500 hover:bg-red-50 border-red-200"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Hapus
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Info Panel ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Kiri: Informasi Request */}
          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">
              Informasi Request
            </h3>
            <dl className="space-y-2 text-sm">
              {([
                ['Dibuat Oleh', pr.requestedByName],
                ['Tanggal', formatDate(pr.date)],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-32 text-muted-foreground flex-shrink-0">{label}</dt>
                  <dd className="font-500 text-foreground break-words">{value}</dd>
                </div>
              ))}
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground flex-shrink-0">Ref SO</dt>
                <dd className="font-500">
                  {pr.salesOrderId ? (
                    <Link
                      href={`/sales-order/${pr.salesOrderId}`}
                      className="text-primary hover:underline"
                    >
                      {pr.salesOrderNo}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground flex-shrink-0">Catatan</dt>
                <dd className="font-500 text-foreground break-words">{pr.notes || '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Kanan: Status Approval */}
          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">
              Status Approval
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-36 text-muted-foreground flex-shrink-0">Status</dt>
                <dd><StatusBadge status={pr.status as PurchaseRequestStatus} size="sm" /></dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 text-muted-foreground flex-shrink-0">Disetujui Tgl</dt>
                <dd className="font-500 text-foreground">
                  {pr.approvedAt
                    ? formatDate(pr.approvedAt)
                    : ['Ordered', 'Selesai', 'Completed'].includes(pr.status)
                      ? '—'
                      : 'Belum disetujui'}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 text-muted-foreground flex-shrink-0">Disetujui Oleh</dt>
                <dd className="font-500 text-foreground">{pr.approvedByName || '—'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ── Price verification banner ── */}
        {pr.itemsNeedingPriceVerification > 0 && (
          <div className="flex items-start gap-2.5 text-sm px-4 py-3 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              <strong>{pr.itemsNeedingPriceVerification} item</strong> menggunakan estimasi harga dari Quotation karena Harga Beli belum diisi di Item Master.
              Perbarui Harga Beli di{' '}
              <Link href="/item-master" className="underline font-600">Item Master</Link>
              {' '}agar harga estimasi lebih akurat.
            </span>
          </div>
        )}

        {/* ── Items Table ── */}
        <div className="erp-card">
          <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-4">
            Daftar Item
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/40">
                  {['#', 'Nama Item', 'Qty', 'Unit', 'Sudah di-PO', 'Sisa', 'Est. Harga/Unit', 'Est. Total', 'Catatan'].map((h) => (
                    <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pr.items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-muted-foreground">
                      Tidak ada item
                    </td>
                  </tr>
                ) : (
                  pr.items.map((item, i) => {
                    const remaining = item.qty - item.orderedQty;
                    return (
                      <tr key={item.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="erp-table-cell text-muted-foreground">{i + 1}</td>
                        <td className="erp-table-cell font-500">{item.itemName}</td>
                        <td className="erp-table-cell font-tabular">{item.qty}</td>
                        <td className="erp-table-cell text-muted-foreground">{item.unit}</td>
                        <td className="erp-table-cell font-tabular text-muted-foreground">
                          {item.orderedQty > 0 ? item.orderedQty : '—'}
                        </td>
                        <td className={`erp-table-cell font-tabular ${remaining > 0 ? 'text-amber-600 font-600' : 'text-emerald-600'}`}>
                          {remaining > 0 ? remaining : 'Selesai'}
                        </td>
                        <td className="erp-table-cell font-tabular text-right">{formatRp(item.estPrice)}</td>
                        <td className="erp-table-cell font-tabular font-700 text-right">{formatRp(item.qty * item.estPrice)}</td>
                        <td className="erp-table-cell text-muted-foreground">{item.notes || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={7} className="erp-table-cell text-right font-700 py-2.5">
                    Total Estimasi
                  </td>
                  <td className="erp-table-cell text-right font-tabular font-800 text-primary">
                    {formatRp(pr.total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Purchase Order Terkait (bisa lebih dari 1, hasil split per vendor) ── */}
        {(pr.status === 'Ordered' || pr.status === 'PartiallyOrdered') && (
          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-4">
              Purchase Order Terkait
            </h3>
            {loadingPOs ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Memuat data PO...</div>
            ) : relatedPOs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Belum ada Purchase Order.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/40">
                      {['No. PO', 'Vendor', 'Status', 'Total'].map((h) => (
                        <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {relatedPOs.map((po) => (
                      <tr key={po.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                        <td className="erp-table-cell font-600 text-primary">
                          <Link href={`/purchase-order/${po.id}`} className="hover:underline">{po.no}</Link>
                        </td>
                        <td className="erp-table-cell font-500">{po.supplierName}</td>
                        <td className="erp-table-cell">
                          <StatusBadge status={po.status as PurchaseOrderStatus} size="sm" />
                        </td>
                        <td className="erp-table-cell font-tabular font-700 text-right">{formatRp(po.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Buat PO ── */}
      <ERPModal
        isOpen={poModal}
        onClose={() => setPoModal(false)}
        title="Buat Purchase Order"
        subtitle={pr.no}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPoModal(false)} disabled={creating}>
              Batal
            </button>
            <button className="btn-primary" onClick={handleCreatePO} disabled={creating}>
              {creating ? 'Membuat...' : 'Buat PO'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {poError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {poError}
            </div>
          )}

          {/* Supplier combobox */}
          <div>
            <label className="erp-form-label">
              Supplier <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={comboRef}>
              <div className="relative">
                <input
                  type="text"
                  value={supplierSearch}
                  onChange={(e) => { setSupplierSearch(e.target.value); setComboOpen(true); }}
                  onFocus={() => setComboOpen(true)}
                  placeholder="Ketik nama supplier..."
                  className={`erp-input pr-8 ${poError && !selectedSupplierId ? 'border-red-400' : ''}`}
                  autoComplete="off"
                />
                {selectedSupplierId ? (
                  <button
                    type="button"
                    onClick={handleClearSupplier}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                )}
              </div>
              {comboOpen && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filteredSuppliers.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                      Supplier tidak ditemukan
                    </div>
                  ) : (
                    filteredSuppliers.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectSupplier(s)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 transition-colors ${
                          selectedSupplierId === s.id ? 'bg-primary/10 text-primary font-600' : 'text-foreground'
                        }`}
                      >
                        <span className="block font-500">{s.name}</span>
                        {s.city && <span className="block text-xs text-muted-foreground">{s.city}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedSupplierName && (
              <p className="text-xs text-green-600 mt-1">✓ {selectedSupplierName}</p>
            )}
          </div>

          {/* Pemilihan item + qty untuk vendor ini — PO Split per Vendor */}
          <div>
            <label className="erp-form-label">
              Item untuk PO ini <span className="text-red-500 ml-0.5">*</span>
              <span className="text-xs text-muted-foreground ml-1 font-400">
                (kosongkan/nolkan qty untuk item yang mau dialokasikan ke PO/vendor lain)
              </span>
            </label>
            {pr.items.every((i) => i.qty - i.orderedQty <= 0) ? (
              <p className="text-xs text-amber-600 mt-1">
                Semua item PR ini sudah teralokasi penuh ke PO lain — tidak ada sisa untuk PO baru.
              </p>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden mt-1">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="p-2 text-left font-600 text-muted-foreground">Item</th>
                      <th className="p-2 text-right font-600 text-muted-foreground">Sisa</th>
                      <th className="p-2 text-right font-600 text-muted-foreground w-24">Qty PO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pr.items.filter((i) => i.qty - i.orderedQty > 0).map((i) => {
                      const remaining = i.qty - i.orderedQty;
                      return (
                        <tr key={i.id} className="border-b border-border last:border-0">
                          <td className="p-2 font-500">{i.itemName}</td>
                          <td className="p-2 text-right text-muted-foreground font-tabular">{remaining} {i.unit}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              step="any"
                              className="erp-input text-xs w-20 text-right font-tabular py-1"
                              value={itemAllocations[i.id] ?? ''}
                              onChange={(e) => setItemAllocations((prev) => ({ ...prev, [i.id]: e.target.value }))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Delivery Date */}
          <div>
            <label className="erp-form-label">
              Delivery Date
              <span className="text-xs text-muted-foreground ml-1">(opsional)</span>
            </label>
            <input
              type="date"
              className="erp-input"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              placeholder="Estimasi tanggal terima barang"
            />
          </div>

          {/* Catatan */}
          <div>
            <label className="erp-form-label">
              Catatan
              <span className="text-xs text-muted-foreground ml-1">(opsional)</span>
            </label>
            <textarea
              className="erp-input resize-none"
              rows={3}
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
              placeholder="Catatan tambahan untuk PO ini..."
            />
          </div>
        </div>
      </ERPModal>
    </AppLayout>
  );
}
