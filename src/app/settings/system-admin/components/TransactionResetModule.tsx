'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle, FileText, ShoppingCart, ShoppingBag,
  Wallet, FolderKanban, Package, Database, RotateCcw,
  ShieldAlert, CheckCircle2, ChevronRight, Trash2,
} from 'lucide-react';
import ERPModal from '@/components/ui/ERPModal';
import { systemResetService } from '@/services/system-reset.service';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResetCategory {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  affects: string[];
  colorClass: string;
  iconBg: string;
  serviceMethod: () => Promise<unknown>;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MASTER_DATA_PRESERVED = [
  'Customers', 'Vendors / Suppliers', 'Item Master', 'Service Master',
  'Users & Roles', 'Company Settings', 'Templates', 'Numbering Formats',
];

const RESET_CATEGORIES: ResetCategory[] = [
  {
    id: 'quotations',
    label: 'Reset Quotation Transactions',
    description: 'Clears all quotation and customer PO history.',
    icon: <FileText size={20} />,
    affects: ['Quotations (Penawaran)', 'Customer Purchase Orders'],
    colorClass: 'text-orange-600',
    iconBg: 'bg-orange-50',
    serviceMethod: systemResetService.resetQuotations,
  },
  {
    id: 'sales',
    label: 'Reset Sales Transactions',
    description: 'Clears all sales orders and invoice records.',
    icon: <ShoppingCart size={20} />,
    affects: ['Sales Orders', 'Invoices', 'Accounts Receivable'],
    colorClass: 'text-blue-600',
    iconBg: 'bg-blue-50',
    serviceMethod: systemResetService.resetSales,
  },
  {
    id: 'purchasing',
    label: 'Reset Purchasing Transactions',
    description: 'Clears all purchase requests and purchase orders.',
    icon: <ShoppingBag size={20} />,
    affects: ['Purchase Requests', 'Purchase Orders', 'Accounts Payable'],
    colorClass: 'text-purple-600',
    iconBg: 'bg-purple-50',
    serviceMethod: systemResetService.resetPurchasing,
  },
  {
    id: 'finance',
    label: 'Reset Finance Transactions',
    description: 'Clears all finance ledger and cash flow entries.',
    icon: <Wallet size={20} />,
    affects: ['Accounts Receivable', 'Accounts Payable', 'Cash In / Out Records', 'Finance Reports'],
    colorClass: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    serviceMethod: systemResetService.resetFinance,
  },
  {
    id: 'projects',
    label: 'Reset Project Transactions',
    description: 'Clears all project records, tasks, and assignments.',
    icon: <FolderKanban size={20} />,
    affects: ['Projects', 'Tasks', 'Engineer Assignments', 'Timelines', 'Approval History'],
    colorClass: 'text-amber-600',
    iconBg: 'bg-amber-50',
    serviceMethod: systemResetService.resetProjects,
  },
  {
    id: 'inventory',
    label: 'Reset Inventory Transactions',
    description: 'Clears all stock movement and inventory logs.',
    icon: <Package size={20} />,
    affects: ['Stock In Records', 'Stock Out Records', 'Stock Adjustments', 'Inventory Transaction Logs'],
    colorClass: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    serviceMethod: systemResetService.resetInventory,
  },
];

// ─── Reset Confirmation Modal ─────────────────────────────────────────────────

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: ResetCategory | null;
  isAll?: boolean;
  onConfirm: (category: ResetCategory | null, isAll: boolean) => Promise<void>;
  loading: boolean;
}

function ResetConfirmModal({ isOpen, onClose, category, isAll = false, onConfirm, loading }: ResetModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const canExecute = confirmText === 'RESET' && !loading;

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const affectedList = isAll
    ? RESET_CATEGORIES.flatMap((c) => c.affects)
    : (category?.affects ?? []);

  const title = isAll ? 'Reset All Transaction Data' : (category?.label ?? '');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canExecute) onConfirm(category, isAll);
  };

  return (
    <ERPModal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title=""
      size="md"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Batal
          </button>
          <button
            className="btn-danger"
            onClick={() => onConfirm(category, isAll)}
            disabled={!canExecute}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                Menghapus data...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Trash2 size={14} />
                Jalankan Reset
              </span>
            )}
          </button>
        </>
      }
    >
      {/* Warning header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-700 text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {isAll
              ? 'This will permanently delete ALL transaction data across every module. This action cannot be undone.'
              : `This will permanently delete all records in the selected category. This action cannot be undone.`}
          </p>
        </div>
      </div>

      {/* Data that will be deleted */}
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50/60 p-4">
        <p className="text-xs font-600 text-red-700 uppercase tracking-wide mb-2">Data yang akan dihapus</p>
        <ul className="space-y-1">
          {affectedList.map((item, i) => (
            <li key={`${i}-${item}`} className="flex items-center gap-2 text-sm text-red-800">
              <ChevronRight size={12} className="text-red-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Master data preserved */}
      <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-xs font-600 text-emerald-700 uppercase tracking-wide mb-2">Master data yang dipertahankan</p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
          {MASTER_DATA_PRESERVED.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Audit log notice */}
      <div className="mb-5 flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
        <ShieldAlert size={14} className="mt-0.5 flex-shrink-0 text-primary" />
        <span>This action will be recorded in the <strong>Audit Log</strong> with your user identity, timestamp, and scope of reset.</span>
      </div>

      {/* RESET text confirmation */}
      <div>
        <label className="erp-form-label mb-1.5 block">
          Ketik <span className="font-800 text-red-600 tracking-widest">RESET</span> untuk mengkonfirmasi
        </label>
        <input
          ref={inputRef}
          type="text"
          className="erp-input font-mono tracking-widest"
          placeholder="RESET"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoComplete="off"
        />
        {confirmText.length > 0 && confirmText !== 'RESET' && (
          <p className="mt-1 text-xs text-red-500">Teks harus persis &quot;RESET&quot;</p>
        )}
      </div>
    </ERPModal>
  );
}

// ─── Category Card ─────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: ResetCategory;
  onSelect: (category: ResetCategory) => void;
}

function CategoryCard({ category, onSelect }: CategoryCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-red-300 hover:shadow-sm transition-all duration-150 group">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${category.iconBg} flex items-center justify-center flex-shrink-0 ${category.colorClass}`}>
          {category.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-700 text-foreground leading-tight">{category.label}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
        </div>
      </div>

      <ul className="space-y-1">
        {category.affects.map((item) => (
          <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(category)}
        className="mt-auto w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-600 text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors"
      >
        <RotateCcw size={12} />
        Reset Kategori Ini
      </button>
    </div>
  );
}

// ─── Main Module ───────────────────────────────────────────────────────────────

export default function TransactionResetModule() {
  const [selectedCategory, setSelectedCategory] = useState<ResetCategory | null>(null);
  const [isAll, setIsAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const isModalOpen = selectedCategory !== null || isAll;

  const handleClose = () => {
    if (loading) return;
    setSelectedCategory(null);
    setIsAll(false);
  };

  const handleConfirm = async (category: ResetCategory | null, all: boolean) => {
    setLoading(true);
    try {
      if (all) {
        await systemResetService.resetAll();
        toast.success('Semua data transaksi berhasil direset.');
      } else if (category) {
        await category.serviceMethod();
        toast.success(`${category.label} berhasil direset.`);
      }
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mereset data. Silakan coba lagi.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50/70 p-5">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Database size={20} className="text-amber-600" />
        </div>
        <div>
          <h2 className="text-base font-700 text-foreground">Transaction Reset</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Clear transaction history for testing and UAT without affecting master data.
            Only Super Admins can perform these operations. All actions are recorded in the Audit Log.
          </p>
        </div>
      </div>

      {/* Category cards */}
      <div>
        <h3 className="text-sm font-700 text-foreground mb-3">Reset by Category</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RESET_CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onSelect={(c) => { setIsAll(false); setSelectedCategory(c); }}
            />
          ))}
        </div>
      </div>

      {/* Reset All section */}
      <div className="rounded-xl border-2 border-red-200 bg-red-50/40 p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-700 text-red-700">Reset All Transaction Data</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently removes <strong>all transaction records</strong> across every module — Quotations, Sales, Purchasing,
                Finance, Projects, and Inventory. Master data (Customers, Vendors, Items, Users, Settings) is <strong>never touched</strong>.
                Use this to prepare a completely clean environment for UAT or demos.
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
                {RESET_CATEGORIES.flatMap((c) => c.affects).slice(0, 10).map((item, i) => (
                  <li key={`${i}-${item}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={() => { setSelectedCategory(null); setIsAll(true); }}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <Trash2 size={15} />
              Reset All Data
            </button>
          </div>
        </div>
      </div>

      {/* Preserved master data notice */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
        <h3 className="text-sm font-700 text-emerald-700 mb-3">Master Data yang Selalu Dipertahankan</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MASTER_DATA_PRESERVED.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation modal */}
      <ResetConfirmModal
        isOpen={isModalOpen}
        onClose={handleClose}
        category={selectedCategory}
        isAll={isAll}
        onConfirm={handleConfirm}
        loading={loading}
      />
    </div>
  );
}
