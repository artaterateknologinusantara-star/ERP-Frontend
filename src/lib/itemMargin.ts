// ─── Item Master margin math ────────────────────────────────────────────────
// Mirrors ItemPricingCalculator.cs (backend) so Item Master and Quotation
// forms compute the same auto price / floor price without a round trip.

import { formatRp } from '@/lib/format';

export type ItemMarginType = 'percent' | 'nominal';

function compute(purchasePrice: number | undefined | null, marginType: ItemMarginType | undefined | null, margin: number | undefined | null): number | null {
  if (purchasePrice == null || !marginType || margin == null) return null;
  return marginType === 'percent' ? purchasePrice * (1 + margin / 100) : purchasePrice + margin;
}

export function computeAutoSellingPrice(purchasePrice: number | undefined | null, marginType: ItemMarginType | undefined | null, marginDefault: number | undefined | null): number | null {
  return compute(purchasePrice, marginType, marginDefault);
}

export function computeFloorPrice(purchasePrice: number | undefined | null, marginType: ItemMarginType | undefined | null, marginMinimum: number | undefined | null): number | null {
  return compute(purchasePrice, marginType, marginMinimum);
}

export function isBelowMinimumMargin(sellingPrice: number, floor: number | null | undefined): boolean {
  return floor != null && sellingPrice < floor;
}

/** Current margin expressed the same way marginType is configured (percent or nominal), for warning text. */
export function currentMarginValue(purchasePrice: number | undefined | null, marginType: ItemMarginType | undefined | null, sellingPrice: number): number | null {
  if (purchasePrice == null || !marginType) return null;
  return marginType === 'percent'
    ? (purchasePrice > 0 ? ((sellingPrice - purchasePrice) / purchasePrice) * 100 : 0)
    : sellingPrice - purchasePrice;
}

/** Generic below-floor warning from a standalone floor snapshot (e.g. a quotation row that only kept the floor, not the full margin config). */
export function floorWarningText(floor: number | undefined | null, currentPrice: number): string | null {
  if (!isBelowMinimumMargin(currentPrice, floor) || floor == null) return null;
  return `Harga di bawah batas minimum margin item ini (minimum ${formatRp(floor)}).`;
}

export function marginWarningText(purchasePrice: number | undefined | null, marginType: ItemMarginType | undefined | null, marginMinimum: number | undefined | null, sellingPrice: number): string | null {
  const floor = computeFloorPrice(purchasePrice, marginType, marginMinimum);
  if (!isBelowMinimumMargin(sellingPrice, floor)) return null;

  const current = currentMarginValue(purchasePrice, marginType, sellingPrice);
  if (current == null || marginMinimum == null) return null;

  return marginType === 'percent'
    ? `Margin saat ini ${current.toFixed(1)}%, di bawah minimum ${marginMinimum}%.`
    : `Margin saat ini ${formatRp(current)}, di bawah minimum ${formatRp(marginMinimum)}.`;
}
