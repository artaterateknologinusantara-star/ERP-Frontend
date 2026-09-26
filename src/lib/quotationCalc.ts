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
// Civil & ME: grup di-price lewat Subkontraktor SOW (FinalSellingPrice/FinalSubconCost),
// bukan split Jasa/Material per baris — jadi seluruh nilai grup dibawa sebagai "Jasa",
// dan Material selalu 0. Dipakai identik di GrandTotalPanel, TotalMarginSection, dan
// sticky summary bar mobile BuatPenawaranForm.

export function calcMaterialSubtotal(groups: CostingGroup[], isCivilMeMode: boolean): number {
  if (isCivilMeMode) return 0;
  return groups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + r.qty * r.materialPrice, 0), 0);
}

export function calcServiceSubtotal(groups: CostingGroup[], isCivilMeMode: boolean): number {
  return isCivilMeMode
    ? groups.reduce((s, g) => s + (g.finalSellingPrice ?? 0), 0)
    : groups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + r.qty * r.servicePrice, 0), 0);
}

export function calcCostSubtotal(groups: CostingGroup[], isCivilMeMode: boolean): number {
  return isCivilMeMode
    ? groups.reduce((s, g) => s + (g.finalSubconCost ?? 0), 0)
    : groups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + r.qty * r.costPrice, 0), 0);
}
