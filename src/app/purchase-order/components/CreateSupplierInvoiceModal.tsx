'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ERPModal from '@/components/ui/ERPModal';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { PurchaseOrderDetail, POItem } from '@/services/purchase.service';
import { createSupplierInvoice } from '@/services/supplierInvoice.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrderDetail;
  onCreated: () => void;
}

export default function CreateSupplierInvoiceModal({ isOpen, onClose, po, onCreated }: Props) {
  const [itemQtys, setItemQtys]           = useState<Record<string, string>>({});
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate]     = useState('');
  const [dueDate, setDueDate]             = useState('');
  const [ppnMasukan, setPpnMasukan]       = useState(0);
  const [nomorFakturPajak, setNomorFakturPajak] = useState('');
  const [error, setError]                 = useState('');
  const [saving, setSaving]               = useState(false);

  const invoicableItems = po.items.filter((i) => i.receivedQty - i.invoicedQty > 0);

  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, string> = {};
    invoicableItems.forEach((i) => {
      initial[i.id] = String(i.receivedQty - i.invoicedQty);
    });
    setItemQtys(initial);
    setInvoiceNumber('');
    const today = new Date().toISOString().split('T')[0];
    setInvoiceDate(today);
    setDueDate('');
    setPpnMasukan(0);
    setNomorFakturPajak('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, po.id]);

  const handleSubmit = async () => {
    if (!invoiceNumber.trim()) {
      setError('Nomor invoice vendor wajib diisi');
      return;
    }
    if (!invoiceDate) {
      setError('Tanggal invoice wajib diisi');
      return;
    }
    if (!dueDate) {
      setError('Jatuh tempo wajib diisi');
      return;
    }

    const items = Object.entries(itemQtys)
      .map(([purchaseOrderItemId, qtyStr]) => ({ purchaseOrderItemId, qty: parseFloat(qtyStr) || 0 }))
      .filter((i) => i.qty > 0);

    if (items.length === 0) {
      setError('Pilih minimal 1 item dengan qty lebih dari 0');
      return;
    }

    for (const it of items) {
      const poItem = invoicableItems.find((i) => i.id === it.purchaseOrderItemId);
      const available = (poItem?.receivedQty ?? 0) - (poItem?.invoicedQty ?? 0);
      if (it.qty > available) {
        setError(`Qty untuk ${poItem?.itemName} (${it.qty}) melebihi qty yang belum di-invoice (${available})`);
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const invoice = await createSupplierInvoice({
        purchaseOrderId: po.id,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        dueDate,
        ppnMasukan,
        nomorFakturPajak: nomorFakturPajak.trim() || undefined,
        items,
      });
      toast.success(`Supplier Invoice ${invoice.no} berhasil dibuat`);
      onClose();
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal membuat Supplier Invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ERPModal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Supplier Invoice"
      subtitle={po.no}
      size="md"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Batal</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Buat Supplier Invoice'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Supplier</span>
            <span className="font-600">{po.supplierName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tanggal PO</span>
            <span className="font-600">{po.date}</span>
          </div>
        </div>

        {/* Item selection */}
        <div>
          <label className="erp-form-label">
            Item yang di-invoice <span className="text-red-500 ml-0.5">*</span>
          </label>
          {invoicableItems.length === 0 ? (
            <p className="text-xs text-amber-600 mt-1">
              Semua item PO ini sudah selesai di-invoice — tidak ada sisa untuk Supplier Invoice baru.
            </p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden mt-1">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="p-2 text-left font-600 text-muted-foreground">Item</th>
                    <th className="p-2 text-right font-600 text-muted-foreground">Diterima</th>
                    <th className="p-2 text-right font-600 text-muted-foreground">Sudah Di-invoice</th>
                    <th className="p-2 text-right font-600 text-muted-foreground">Sisa</th>
                    <th className="p-2 text-right font-600 text-muted-foreground w-24">Qty Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicableItems.map((i: POItem) => {
                    const available = i.receivedQty - i.invoicedQty;
                    return (
                      <tr key={i.id} className="border-b border-border last:border-0">
                        <td className="p-2 font-500">{i.itemName}</td>
                        <td className="p-2 text-right text-muted-foreground font-tabular">{i.receivedQty} {i.unit}</td>
                        <td className="p-2 text-right text-muted-foreground font-tabular">{i.invoicedQty} {i.unit}</td>
                        <td className="p-2 text-right text-muted-foreground font-tabular">{available} {i.unit}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            max={available}
                            step="any"
                            className="erp-input text-xs w-20 text-right font-tabular py-1"
                            value={itemQtys[i.id] ?? ''}
                            onChange={(e) => setItemQtys((prev) => ({ ...prev, [i.id]: e.target.value }))}
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

        <div>
          <label className="erp-form-label">Nomor Invoice Vendor <span className="text-red-500">*</span></label>
          <input
            type="text"
            className="erp-input"
            placeholder="No. invoice dari supplier"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="erp-form-label">Tanggal Invoice <span className="text-red-500">*</span></label>
            <input type="date" className="erp-input" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <label className="erp-form-label">Jatuh Tempo <span className="text-red-500">*</span></label>
            <input type="date" className="erp-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="erp-form-label">PPN Masukan</label>
          <CurrencyInput value={ppnMasukan} onChange={setPpnMasukan} />
        </div>

        <div>
          <label className="erp-form-label">Nomor Faktur Pajak <span className="text-xs text-muted-foreground">(opsional)</span></label>
          <input
            type="text"
            className="erp-input"
            placeholder="Nomor faktur pajak"
            value={nomorFakturPajak}
            onChange={(e) => setNomorFakturPajak(e.target.value)}
          />
        </div>
      </div>
    </ERPModal>
  );
}
