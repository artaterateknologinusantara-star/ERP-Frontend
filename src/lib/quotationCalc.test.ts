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
import type { CostingGroup, WorkDetail, WorkItem } from '@/types';

function workDetail(overrides: Partial<WorkDetail> = {}): WorkDetail {
  return {
    id: 'wd1',
    name: 'Detail',
    spesifikasi: '',
    volume: 0,
    unit: 'm3',
    servicePrice: 0,
    materialPrice: 0,
    sortOrder: 0,
    attachments: [],
    ...overrides,
  };
}

function workItem(workDetails: WorkDetail[]): WorkItem {
  return { id: 'wi1', name: 'Pekerjaan', sortOrder: 0, workDetails };
}

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

// Civil & ME mode used to price a Group via QuotationGroup.FinalSellingPrice/FinalSubconCost
// (manual entry, panel Subkontraktor) — that field pair was removed entirely from the schema
// (see backend migration MigrateFinalSellingPriceToWorkDetailAndDropSubconFields) once vendors
// started authoring real RAB/BQ (QuotationItem + QuotationWorkDetail) instead. Civil & ME now
// mirrors the backend's 2-source RecalcTotals formula: Item (rows) + WorkDetail.
describe('quotationCalc — subtotal (Civil & ME mode)', () => {
  const groups: CostingGroup[] = [
    {
      id: 'g1',
      name: 'Group 1',
      sortOrder: 0,
      rows: [row({ qty: 2, materialPrice: 100_000, servicePrice: 50_000, costPrice: 999 })],
      workItems: [workItem([workDetail({ volume: 3, materialPrice: 10_000, servicePrice: 20_000 })])],
    },
    {
      id: 'g2',
      name: 'Group 2',
      sortOrder: 1,
      rows: [row({ qty: 1, materialPrice: 5_000, servicePrice: 7_000, costPrice: 999 })],
    },
    {
      id: 'g3',
      name: 'Group 3 (empty)',
      sortOrder: 2,
      rows: [],
    },
  ];

  // Group 1: item material 2*100.000=200.000 + WD material 3*10.000=30.000 = 230.000
  // Group 2: item material 1*5.000=5.000
  // Group 3: 0
  it('calcMaterialSubtotal sums Item.qty*materialPrice + WorkDetail.volume*materialPrice', () => {
    expect(calcMaterialSubtotal(groups, true)).toBe(230_000 + 5_000);
  });

  // Group 1: item service 2*50.000=100.000 + WD service 3*20.000=60.000 = 160.000
  // Group 2: item service 1*7.000=7.000
  // Group 3: 0
  it('calcServiceSubtotal sums Item.qty*servicePrice + WorkDetail.volume*servicePrice', () => {
    expect(calcServiceSubtotal(groups, true)).toBe(160_000 + 7_000);
  });

  it('calcCostSubtotal is always 0 in Civil & ME mode — no cost-basis data source exists anymore', () => {
    expect(calcCostSubtotal(groups, true)).toBe(0);
  });

  it('treats a Group with no rows/workItems as 0, not an error', () => {
    const groupsWithNull: CostingGroup[] = [{ id: 'g4', name: 'G4', sortOrder: 0, rows: [] }];
    expect(calcMaterialSubtotal(groupsWithNull, true)).toBe(0);
    expect(calcServiceSubtotal(groupsWithNull, true)).toBe(0);
    expect(calcCostSubtotal(groupsWithNull, true)).toBe(0);
  });
});
