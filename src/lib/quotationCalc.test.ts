import { describe, expect, it } from 'vitest';
import {
  applyDiscount,
  applyTax,
  calcCostSubtotal,
  calcDiscountAmount,
  calcMaterialSubtotal,
  calcServiceSubtotal,
  calcTaxAmount,
} from './quotationCalc';
import type { CostingGroup } from '@/types';

function row(overrides: Partial<CostingGroup['rows'][number]> = {}): CostingGroup['rows'][number] {
  return {
    id: 'r1',
    no: '1',
    equipment: 'Eq',
    description: '',
    manufacturer: '',
    qty: 1,
    unit: 'pcs',
    servicePrice: 0,
    materialPrice: 0,
    costPrice: 0,
    sortOrder: 0,
    ...overrides,
  };
}

describe('quotationCalc — discount/tax', () => {
  it('applyDiscount matches subtract-fraction form used by GrandTotalPanel/mobile bar', () => {
    const amount = 1_000_000;
    expect(calcDiscountAmount(amount, 10)).toBe(100_000);
    expect(applyDiscount(amount, 10)).toBe(amount - amount * (10 / 100));
  });

  it('applyDiscount is algebraically equivalent to the old (1 - d/100) form used by TotalMarginSection', () => {
    const amount = 1_234_567;
    const oldForm = amount * (1 - 15 / 100);
    expect(applyDiscount(amount, 15)).toBeCloseTo(oldForm, 6);
  });

  it('applyTax matches afterDiscount + afterDiscount*(taxRate/100)', () => {
    const amount = 900_000;
    expect(calcTaxAmount(amount, 11)).toBe(99_000);
    expect(applyTax(amount, 11)).toBe(999_000);
  });

  it('0% discount/tax is a no-op', () => {
    expect(applyDiscount(500, 0)).toBe(500);
    expect(applyTax(500, 0)).toBe(500);
  });
});

describe('quotationCalc — subtotal (standard mode)', () => {
  const groups: CostingGroup[] = [
    {
      id: 'g1',
      name: 'Group 1',
      sortOrder: 0,
      rows: [
        row({ id: 'r1', qty: 2, materialPrice: 100_000, servicePrice: 50_000, costPrice: 60_000 }),
        row({ id: 'r2', qty: 3, materialPrice: 10_000, servicePrice: 20_000, costPrice: 5_000 }),
      ],
    },
  ];

  it('calcMaterialSubtotal sums qty*materialPrice across rows', () => {
    expect(calcMaterialSubtotal(groups, false)).toBe(2 * 100_000 + 3 * 10_000);
  });

  it('calcServiceSubtotal sums qty*servicePrice across rows', () => {
    expect(calcServiceSubtotal(groups, false)).toBe(2 * 50_000 + 3 * 20_000);
  });

  it('calcCostSubtotal sums qty*costPrice across rows', () => {
    expect(calcCostSubtotal(groups, false)).toBe(2 * 60_000 + 3 * 5_000);
  });
});

describe('quotationCalc — subtotal (Civil & ME mode)', () => {
  const groups: CostingGroup[] = [
    {
      id: 'g1',
      name: 'Group 1',
      sortOrder: 0,
      rows: [row({ qty: 5, materialPrice: 100_000, servicePrice: 100_000, costPrice: 100_000 })],
      finalSellingPrice: 12_000_000,
      finalSubconCost: 9_000_000,
    },
    {
      id: 'g2',
      name: 'Group 2',
      sortOrder: 1,
      rows: [],
      finalSellingPrice: 3_000_000,
      finalSubconCost: 2_000_000,
    },
  ];

  it('calcMaterialSubtotal is always 0 in Civil & ME mode, regardless of row data', () => {
    expect(calcMaterialSubtotal(groups, true)).toBe(0);
  });

  it('calcServiceSubtotal sums finalSellingPrice per group, ignoring row servicePrice', () => {
    expect(calcServiceSubtotal(groups, true)).toBe(12_000_000 + 3_000_000);
  });

  it('calcCostSubtotal sums finalSubconCost per group, ignoring row costPrice', () => {
    expect(calcCostSubtotal(groups, true)).toBe(9_000_000 + 2_000_000);
  });

  it('treats missing finalSellingPrice/finalSubconCost as 0', () => {
    const groupsWithNull: CostingGroup[] = [{ id: 'g3', name: 'G3', sortOrder: 0, rows: [] }];
    expect(calcServiceSubtotal(groupsWithNull, true)).toBe(0);
    expect(calcCostSubtotal(groupsWithNull, true)).toBe(0);
  });
});
