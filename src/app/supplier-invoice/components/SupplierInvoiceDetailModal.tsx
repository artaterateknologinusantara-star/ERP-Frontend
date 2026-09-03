'use client';

import React, { useEffect, useState } from 'react';
import ERPModal from '@/components/ui/ERPModal';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatRp, formatDate } from '@/lib/format';
import { getSupplierInvoiceDetail, SupplierInvoiceDetail } from '@/services/supplierInvoice.service';
import { SupplierInvoiceStatus } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
}

export default function SupplierInvoiceDetailModal({ isOpen, onClose, invoiceId }: Props) {
  const [invoice, setInvoice] = useState<SupplierInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getSupplierInvoiceDetail(invoiceId)
      .then(setInvoice)
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [isOpen, invoiceId]);

  return (
    <ERPModal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Supplier Invoice"
      subtitle={invoice?.no}
      size="lg"
      footer={<button className="btn-secondary" onClick={onClose}>Tutup</button>}
    >
      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">Memuat data...</div>
      ) : !invoice ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Supplier Invoice tidak ditemukan.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground flex-shrink-0">PO Terkait</span>
                <span className="font-600">{invoice.purchaseOrderNo}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground flex-shrink-0">Supplier</span>
                <span className="font-600">{invoice.supplierName}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground flex-shrink-0">No. Invoice Vendor</span>
                <span className="font-600">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground flex-shrink-0">No. Faktur Pajak</span>
                <span className="font-600">{invoice.nomorFakturPajak || '—'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground flex-shrink-0">Tanggal Invoice</span>
                <span className="font-600">{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground flex-shrink-0">Jatuh Tempo</span>
                <span className="font-600">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground flex-shrink-0">Status</span>
                <StatusBadge status={invoice.status as SupplierInvoiceStatus} size="sm" />
              </div>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {['Item', 'Qty', 'Harga/Unit', 'Amount'].map((h) => (
                    <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((i) => (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="erp-table-cell font-500">{i.itemName}</td>
                    <td className="erp-table-cell font-tabular">{i.qty}</td>
                    <td className="erp-table-cell font-tabular text-right">{formatRp(i.price)}</td>
                    <td className="erp-table-cell font-tabular text-right">{formatRp(i.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td colSpan={3} className="erp-table-cell text-right font-600">Subtotal</td>
                  <td className="erp-table-cell text-right font-tabular font-700">{formatRp(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="erp-table-cell text-right font-600">PPN Masukan</td>
                  <td className="erp-table-cell text-right font-tabular font-700">{formatRp(invoice.ppnMasukan)}</td>
                </tr>
                <tr className="border-t border-border">
                  <td colSpan={3} className="erp-table-cell text-right font-700 text-base">Total</td>
                  <td className="erp-table-cell text-right font-tabular font-800 text-base text-primary">{formatRp(invoice.total)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="erp-table-cell text-right font-600 text-emerald-600">Terbayar</td>
                  <td className="erp-table-cell text-right font-tabular font-700 text-emerald-600">{formatRp(invoice.paid)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="erp-table-cell text-right font-700">Sisa</td>
                  <td className={`erp-table-cell text-right font-tabular font-800 ${invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {invoice.balance > 0 ? formatRp(invoice.balance) : 'Lunas'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </ERPModal>
  );
}
