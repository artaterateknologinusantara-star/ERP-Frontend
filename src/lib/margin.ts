// ─── Margin health ──────────────────────────────────────────────────────────
// Shared thresholds so the margin color-coding reads the same everywhere
// (item cards, table rows, totals panel): red = rugi, yellow = tipis, green = sehat.

export type MarginTier = 'green' | 'yellow' | 'red';

export const MARGIN_THIN_THRESHOLD = 15; // percent

export function getMarginTier(marginPercent: number): MarginTier {
  if (marginPercent < 0) return 'red';
  if (marginPercent < MARGIN_THIN_THRESHOLD) return 'yellow';
  return 'green';
}

export const marginTierClasses: Record<MarginTier, { bg: string; text: string; border: string }> = {
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  yellow: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
};
