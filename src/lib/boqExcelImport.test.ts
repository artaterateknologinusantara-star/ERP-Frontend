import { describe, expect, it } from 'vitest';
import {
  parseBoqWorkbook,
  matchGroupsAgainstExisting,
  normalizeUnit,
  parseNumberLoose,
} from './boqExcelImport';
import type { CostingGroup } from '@/types';

// ── Fixture builders — reflect the real BOQ layout: 2-row merged header (No / Scope of Works /
//    Specification / Unit / Qty / Price per Unit[Jasa,Material] / Price Total[Jasa,Material]),
//    Group-header rows (letter in "No" + name in "Scope of Works"), numbered detail rows, and
//    optional "Total" rows. Columns are fixed here only because this is a hand-built fixture —
//    the parser itself never assumes these positions (see parseBoqWorkbook's header text search).

const HEADER_ROW_1 = [
  'No',
  'Scope of Works',
  'Specification',
  'Unit',
  'Qty',
  'Price per Unit',
  '',
  'Price Total',
  '',
];
const HEADER_ROW_2 = [
  '',
  '',
  '',
  '',
  '',
  'Jasa & Instalasi',
  'Material',
  'Jasa & Instalasi',
  'Material',
];

function groupRow(letter: string, name: string): unknown[] {
  return [letter, name, '', '', '', '', '', '', ''];
}

function detailRow(
  no: number,
  name: string,
  service: number,
  material: number,
  opts?: { unit?: string; totalJasa?: number; totalMaterial?: number }
): unknown[] {
  const unit = opts?.unit ?? 'Ls';
  const totalJasa = opts?.totalJasa ?? service;
  const totalMaterial = opts?.totalMaterial ?? material;
  return [no, name, `Spesifikasi ${name}`, unit, 1, service, material, totalJasa, totalMaterial];
}

function totalRow(jasa: number, material: number): unknown[] {
  return ['', '', '', '', '', '', 'Total', jasa, material];
}

function serviceOf(k: number): number {
  return 1_000_000 + 10_000 * k;
}
function materialOf(k: number): number {
  return 2_000_000 + 15_000 * k;
}

// Group order in the document determines the resulting A/B/C... position once imported (letters
// are never read from the Excel itself — see tryParseGroupHeader, which discards the "No"
// column's letter and keeps only the name). This fixture's 2nd group is "B" purely by position.
function buildPrimaryFixtureRows(): unknown[][] {
  const rows: unknown[][] = [HEADER_ROW_1, HEADER_ROW_2];
  let no = 1;

  const pushRange = (
    from: number,
    to: number,
    override?: { service: number; material: number }
  ) => {
    for (let k = from; k <= to; k++) {
      const isOverridden = override && k === to;
      const service = isOverridden ? override!.service : serviceOf(k);
      const material = isOverridden ? override!.material : materialOf(k);
      rows.push(detailRow(no, `Item ${k}`, service, material));
      no += 1;
    }
  };

  rows.push(groupRow('A', 'Pekerjaan Persiapan'));
  pushRange(1, 6);

  rows.push(groupRow('B', 'Pekerjaan Sipil'));
  rows.push(detailRow(no, 'Item Group B', 135_085_000, 9_665_000));
  no += 1;

  rows.push(groupRow('C', 'Pekerjaan Jaringan'));
  pushRange(7, 12);

  rows.push(groupRow('D', 'Pekerjaan CCTV'));
  pushRange(13, 18);

  rows.push(groupRow('E', 'Pekerjaan Fiber Optik'));
  pushRange(19, 24);

  rows.push(groupRow('F', 'Pekerjaan Data Center'));
  pushRange(25, 31, { service: 58_950_500, material: 183_348_500 });

  return rows;
}

describe('parseBoqWorkbook — primary fixture (6 groups, 32 detail rows)', () => {
  const result = parseBoqWorkbook(buildPrimaryFixtureRows());

  it('parses successfully with zero warnings', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.warnings).toEqual([]);
  });

  it('detects exactly 6 groups and 32 detail rows', () => {
    if (!result.ok) throw new Error('parse failed');
    expect(result.document.groups).toHaveLength(6);
    const totalRows = result.document.groups.reduce((s, g) => s + g.rows.length, 0);
    expect(totalRows).toBe(32);
  });

  it('computes Group B (2nd group) subtotal exactly', () => {
    if (!result.ok) throw new Error('parse failed');
    const groupB = result.document.groups[1];
    expect(groupB.name).toBe('Pekerjaan Sipil');
    expect(groupB.rows).toHaveLength(1);
    expect(groupB.computedSubtotalJasa).toBe(135_085_000);
    expect(groupB.computedSubtotalMaterial).toBe(9_665_000);
  });

  it('computes exact document-wide grand totals', () => {
    if (!result.ok) throw new Error('parse failed');
    expect(result.document.totalJasa).toBe(228_685_500);
    expect(result.document.totalMaterial).toBe(259_988_500);
  });
});

describe('parseBoqWorkbook — abort conditions', () => {
  it('aborts when the No/Scope of Works header is not found', () => {
    const rows = [
      ['Not', 'A Header', 'At All'],
      [1, 'Some item', 10, 20],
    ];
    const result = parseBoqWorkbook(rows);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/header tabel/i);
  });

  it('aborts when a detail row appears before the first Group header', () => {
    const rows = [
      HEADER_ROW_1,
      HEADER_ROW_2,
      detailRow(1, 'Orphan detail row', 100, 200),
      groupRow('A', 'Pekerjaan Persiapan'),
      detailRow(2, 'Item after group', 100, 200),
    ];
    const result = parseBoqWorkbook(rows);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/sebelum baris judul bagian pertama/i);
  });
});

describe('parseBoqWorkbook — non-blocking warnings', () => {
  it('warns (not aborts) on a row-level total mismatch, keeping the computed value', () => {
    const rows = [
      HEADER_ROW_1,
      HEADER_ROW_2,
      groupRow('A', 'Pekerjaan Persiapan'),
      detailRow(1, 'Item mismatch', 1_000_000, 2_000_000, { totalJasa: 999_000_000 }),
    ];
    const result = parseBoqWorkbook(rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.groups[0].computedSubtotalJasa).toBe(1_000_000);
    expect(result.document.warnings).toHaveLength(1);
    expect(result.document.warnings[0].excelRowNumber).toBe(4);
    expect(result.document.warnings[0].message).toMatch(/berbeda dari excel/i);
  });

  it('warns (not aborts) on a group-level subtotal mismatch against a Total row', () => {
    const rows = [
      HEADER_ROW_1,
      HEADER_ROW_2,
      groupRow('A', 'Pekerjaan Persiapan'),
      detailRow(1, 'Item A', 1_000_000, 2_000_000),
      totalRow(999_000_000, 2_000_000),
    ];
    const result = parseBoqWorkbook(rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.groups[0].computedSubtotalJasa).toBe(1_000_000);
    expect(result.document.groups[0].excelSubtotalJasa).toBe(999_000_000);
    expect(
      result.document.warnings.some((w) => /subtotal jasa.*pekerjaan persiapan/i.test(w.message))
    ).toBe(true);
  });

  it('warns (not aborts) on an unrecognized row, reporting the correct Excel row number', () => {
    const rows = [
      HEADER_ROW_1,
      HEADER_ROW_2,
      groupRow('A', 'Pekerjaan Persiapan'),
      detailRow(1, 'Item A', 1_000_000, 2_000_000),
      ['???', 'garbage row', '', '', '', '', '', '', ''],
      detailRow(2, 'Item B', 1_000_000, 2_000_000),
    ];
    const result = parseBoqWorkbook(rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.groups[0].rows).toHaveLength(2);
    expect(result.document.warnings).toHaveLength(1);
    // Row 1-2 = header, row 3 = group header, row 4 = detail 1, row 5 = the garbage row.
    expect(result.document.warnings[0].excelRowNumber).toBe(5);
    expect(result.document.warnings[0].message).toMatch(/tidak dikenali/i);
  });

  it('skips fully blank rows without producing a warning', () => {
    const rows = [
      HEADER_ROW_1,
      HEADER_ROW_2,
      groupRow('A', 'Pekerjaan Persiapan'),
      detailRow(1, 'Item A', 1_000_000, 2_000_000),
      ['', '', '', '', '', '', '', '', ''],
      detailRow(2, 'Item B', 1_000_000, 2_000_000),
    ];
    const result = parseBoqWorkbook(rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.warnings).toEqual([]);
    expect(result.document.groups[0].rows).toHaveLength(2);
  });
});

describe('parseBoqWorkbook — Group header cell formats', () => {
  it('accepts a combined "A. Name" cell as well as the split letter+name form', () => {
    const rows = [
      HEADER_ROW_1,
      HEADER_ROW_2,
      ['A. Pekerjaan Persiapan', '', '', '', '', '', '', '', ''],
      detailRow(1, 'Item A', 1_000_000, 2_000_000),
    ];
    const result = parseBoqWorkbook(rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.groups).toHaveLength(1);
    expect(result.document.groups[0].name).toBe('Pekerjaan Persiapan');
  });
});

describe('parseBoqWorkbook — unit normalization', () => {
  it('normalizes "m2" (case-insensitive) to "m²", leaving other units untouched', () => {
    const rows = [
      HEADER_ROW_1,
      HEADER_ROW_2,
      groupRow('A', 'Pekerjaan Persiapan'),
      detailRow(1, 'Item m2', 1_000_000, 2_000_000, { unit: 'M2' }),
      detailRow(2, 'Item Ls', 1_000_000, 2_000_000, { unit: 'Ls' }),
    ];
    const result = parseBoqWorkbook(rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.groups[0].rows[0].unit).toBe('m²');
    expect(result.document.groups[0].rows[1].unit).toBe('Ls');
  });
});

describe('normalizeUnit (standalone)', () => {
  it('handles mixed case and leaves unrelated text alone', () => {
    expect(normalizeUnit('m2')).toBe('m²');
    expect(normalizeUnit('M2')).toBe('m²');
    expect(normalizeUnit('Unit')).toBe('Unit');
  });
});

describe('parseNumberLoose (standalone)', () => {
  it('parses Indonesian thousands/decimal formats and native numbers', () => {
    expect(parseNumberLoose(202_020_000)).toBe(202_020_000);
    expect(parseNumberLoose('202.020.000')).toBe(202_020_000);
    expect(parseNumberLoose('1.250,50')).toBe(1250.5);
    expect(parseNumberLoose('Rp 500.000')).toBe(500_000);
    expect(parseNumberLoose('')).toBe(0);
    expect(parseNumberLoose(undefined)).toBe(0);
  });
});

describe('matchGroupsAgainstExisting', () => {
  it('matches existing groups case- and whitespace-insensitively, and reports new groups as null', () => {
    const existing: CostingGroup[] = [
      { id: 'g1', name: '  Pekerjaan   Persiapan ', rows: [], sortOrder: 0, workItems: [] },
      { id: 'g2', name: 'PEKERJAAN SIPIL', rows: [], sortOrder: 1, workItems: [] },
    ];
    const parsed = [
      {
        name: 'pekerjaan persiapan',
        rows: [],
        computedSubtotalJasa: 0,
        computedSubtotalMaterial: 0,
        excelSubtotalJasa: null,
        excelSubtotalMaterial: null,
      },
      {
        name: 'Pekerjaan Baru',
        rows: [],
        computedSubtotalJasa: 0,
        computedSubtotalMaterial: 0,
        excelSubtotalJasa: null,
        excelSubtotalMaterial: null,
      },
    ];
    const plans = matchGroupsAgainstExisting(parsed, existing);
    expect(plans[0].targetGroupId).toBe('g1');
    expect(plans[1].targetGroupId).toBeNull();
  });
});
