'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, PlusCircle } from 'lucide-react';
import ERPModal from '@/components/ui/ERPModal';
import type { CostingGroup } from '@/types';
import { matchGroupsAgainstExisting, type ParsedBoqDocument } from '@/lib/boqExcelImport';
import { formatInt } from '@/lib/format';

export type BoqImportMode = 'append' | 'replace';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: ParsedBoqDocument | null;
  existingGroups: CostingGroup[];
  onConfirm: (mode: BoqImportMode) => void;
}

export default function ImportBoqPreviewModal({
  isOpen,
  onClose,
  document: doc,
  existingGroups,
  onConfirm,
}: Props) {
  const [mode, setMode] = useState<BoqImportMode>('append');

  const plans = useMemo(
    () => (doc ? matchGroupsAgainstExisting(doc.groups, existingGroups) : []),
    [doc, existingGroups]
  );

  if (!isOpen || !doc) return null;

  const totalRows = doc.groups.reduce((s, g) => s + g.rows.length, 0);

  return (
    <ERPModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Import BOQ"
      subtitle={`${doc.groups.length} bagian, ${totalRows} baris detail terdeteksi`}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Batal
          </button>
          <button type="button" onClick={() => onConfirm(mode)} className="btn-primary">
            {mode === 'replace' ? 'Ganti & Import' : 'Import'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Mode */}
        <div className="space-y-2">
          <label className="erp-form-label">Mode Import</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setMode('append')}
              className={`flex-1 text-left p-3 rounded-lg border transition-colors ${
                mode === 'append'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <p className="font-600 text-sm">Tambahkan ke data yang ada</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Baris dari Excel ditambahkan sebagai Item Pekerjaan baru. Group yang namanya cocok
                dipakai ulang, Group baru dibuat kalau belum ada.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`flex-1 text-left p-3 rounded-lg border transition-colors ${
                mode === 'replace'
                  ? 'border-red-500 bg-red-50'
                  : 'border-border hover:border-red-300'
              }`}
            >
              <p className="font-600 text-sm text-red-700">Ganti semua isi dokumen</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                SELURUH Group/Item Pekerjaan/Detail Kerja yang sudah ada di Tab ini dihapus, diganti
                persis isi Excel.
              </p>
            </button>
          </div>
          {mode === 'replace' && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Semua Group yang sudah ada di Tab ini akan dihapus dan tidak bisa dikembalikan
                setelah Import. Pastikan ini yang dimaksud.
              </span>
            </div>
          )}
        </div>

        {/* Per-group breakdown */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 font-600">Bagian (Group)</th>
                <th className="text-left px-3 py-2 font-600">Status</th>
                <th className="text-right px-3 py-2 font-600">Baris</th>
                <th className="text-right px-3 py-2 font-600">Subtotal Jasa</th>
                <th className="text-right px-3 py-2 font-600">Subtotal Material</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(({ parsedGroup, targetGroupId }) => (
                <tr key={parsedGroup.name} className="border-t border-border">
                  <td className="px-3 py-2">{parsedGroup.name}</td>
                  <td className="px-3 py-2">
                    {targetGroupId ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 size={13} /> Ditambahkan ke Group yang ada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <PlusCircle size={13} /> Baru
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-tabular">{parsedGroup.rows.length}</td>
                  <td className="px-3 py-2 text-right font-tabular">
                    Rp {formatInt(parsedGroup.computedSubtotalJasa)}
                  </td>
                  <td className="px-3 py-2 text-right font-tabular">
                    Rp {formatInt(parsedGroup.computedSubtotalMaterial)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/50 font-700">
                <td className="px-3 py-2" colSpan={2}>
                  Total
                </td>
                <td className="px-3 py-2 text-right font-tabular">{totalRows}</td>
                <td className="px-3 py-2 text-right font-tabular">Rp {formatInt(doc.totalJasa)}</td>
                <td className="px-3 py-2 text-right font-tabular">
                  Rp {formatInt(doc.totalMaterial)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {doc.areaBlockTender && (
          <p className="text-xs text-muted-foreground">
            Ditemukan &quot;Area Block Tender: {doc.areaBlockTender}&quot; di file ini — field ini
            sudah dihapus dari sistem, jadi nilainya tidak disimpan ke mana pun (info saja).
          </p>
        )}

        {/* Warnings */}
        {doc.warnings.length > 0 && (
          <div className="space-y-1.5">
            <p className="erp-form-label flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-600" />
              {doc.warnings.length} peringatan (tidak menghalangi import)
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1 border border-amber-200 bg-amber-50 rounded-lg p-2.5">
              {doc.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-800">
                  {w.excelRowNumber !== null ? `Baris Excel ${w.excelRowNumber}: ` : ''}
                  {w.message}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </ERPModal>
  );
}
