import type { CostingGroup } from '@/types';

// ─── Discount / Tax ─────────────────────────────────────────────────────────────
// Bentuk baku: A - A*(pct/100) untuk diskon, A + A*(pct/100) untuk pajak — dipilih
// karena 2 dari 3 pemanggil asal (GrandTotalPanel, sticky bar mobile di
// BuatPenawaranForm) sudah pakai bentuk ini, dan discountAmount butuh ditampilkan
// terpisah di GrandTotalPanel ("Potongan Diskon").

export function calcDiscountAmount(amount: number, discountPercent: number): number {
  return amount * (discountPercent / 100);
}

export function applyDiscount(amount: number, discountPercent: number): number {
  return amount - calcDiscountAmount(amount, discountPercent);
}

export function calcTaxAmount(amount: number, taxRate: number): number {
  return amount * (taxRate / 100);
}

export function applyTax(amount: number, taxRate: number): number {
  return amount + calcTaxAmount(amount, taxRate);
}

// ─── Material / Jasa / Cost subtotal ───────────────────────────────────────────
// Civil & ME: grup di-price lewat QuotationItem (rows) + QuotationWorkDetail (RAB/BQ) — mirror
// persis formula backend QuotationService.RecalcTotals (2-source, task RAB vendor-authored Sep
// 2026). Sebelumnya ada sumber ke-3 (QuotationGroup.FinalSellingPrice/FinalSubconCost, manual
// entry lewat panel Subkontraktor) yang dihapus total dari schema — lihat migration
// MigrateFinalSellingPriceToWorkDetailAndDropSubconFields (nilai lama sudah dipindah jadi
// WorkDetail asli sebelum kolomnya di-drop, jadi tetap ke-hitung lewat WorkDetail di bawah, bukan
// hilang). Dipakai identik di GrandTotalPanel, TotalMarginSection, dan sticky summary bar mobile
// BuatPenawaranForm.

export function calcMaterialSubtotal(groups: CostingGroup[], isCivilMeMode: boolean): number {
  if (isCivilMeMode) {
    const itemSum = groups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + r.qty * r.materialPrice, 0), 0);
    const workDetailSum = groups.reduce(
      (s, g) =>
        s + (g.workItems ?? []).reduce((ws, w) => ws + w.workDetails.reduce((ds, d) => ds + d.volume * d.materialPrice, 0), 0),
      0,
    );
    return itemSum + workDetailSum;
  }
  return groups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + r.qty * r.materialPrice, 0), 0);
}

export function calcServiceSubtotal(groups: CostingGroup[], isCivilMeMode: boolean): number {
  if (isCivilMeMode) {
    const itemSum = groups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + r.qty * r.servicePrice, 0), 0);
    const workDetailSum = groups.reduce(
      (s, g) =>
        s + (g.workItems ?? []).reduce((ws, w) => ws + w.workDetails.reduce((ds, d) => ds + d.volume * d.servicePrice, 0), 0),
      0,
    );
    return itemSum + workDetailSum;
  }
  return groups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + r.qty * r.servicePrice, 0), 0);
}

// Civil & ME never had a per-row cost-basis field (WorkDetail/QuotationItem only carry the
// selling price) — the group-level FinalSubconCost manual entry was the ONLY cost source, and it
// had no schema replacement when removed (its value is preserved as a text audit note, not a
// number, on the migrated WorkDetail's Spesifikasi — see the migration above). Returning 0 here
// is the honest answer ("no cost data available"), NOT "0 cost incurred" — callers must not
// present the resulting margin as 100% real margin. TotalMarginSection hides itself in Civil & ME
// mode for exactly this reason.
export function calcCostSubtotal(groups: CostingGroup[], isCivilMeMode: boolean): number {
  return isCivilMeMode
    ? 0
    : groups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + r.qty * r.costPrice, 0), 0);
}
