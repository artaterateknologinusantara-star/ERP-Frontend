import type { CostingGroup } from '@/types';

// Parser untuk import BOQ Excel utuh (semua Group A-F sekaligus dalam 1 sheet), format sesuai
// file BOQ asli (deskripsi struktur dikonfirmasi oleh product owner, bukan tebakan dari mockup
// saja): metadata di atas tabel, judul "BILL OF QUANTITY (BOQ)", header 2-baris (No/Scope of
// Works/Specification/Unit/Qty/Price per Unit[Jasa,Material]/Price Total[Jasa,Material]), baris
// judul bagian (= Group, huruf+nama dalam 1 sel ATAU huruf di kolom No + nama di kolom Scope
// terpisah), baris detail bernomor 1..N per bagian, baris "Total" per bagian, baris kosong.
//
// Posisi kolom TIDAK di-hardcode — semuanya dicari dari teks header, supaya robust terhadap
// kolom yang digeser/ditambah di file nyata.

// ── Helper angka/teks yang dipakai bersama parser & mapping (satu-satunya sumber, jangan
//    duplikat lagi di GroupWorkItemsPanel.tsx — itu sebabnya import Excel lama sempat salah
//    tempat menaruh logic serupa) ──────────────────────────────────────────────────────────
export function parseNumberLoose(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (raw === null || raw === undefined) return 0;
  let s = String(raw).trim().replace(/rp/gi, '').trim();
  if (s === '') return 0;
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else {
    s = s.replace(/\.(?=\d{3}(\D|$))/g, '');
  }
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function normalizeUnit(raw: string): string {
  const trimmed = raw.trim();
  return /^m2$/i.test(trimmed) ? 'm²' : trimmed;
}

function cellText(raw: unknown): string {
  return String(raw ?? '').trim();
}

function isCellBlank(raw: unknown): boolean {
  if (raw === undefined || raw === null) return true;
  if (typeof raw === 'number') return false;
  return String(raw).trim() === '';
}

function isRowBlank(row: unknown[]): boolean {
  return row.every((c) => isCellBlank(c));
}

function normalizeHeaderText(raw: unknown): string {
  return cellText(raw).toLowerCase().replace(/\s+/g, ' ');
}

function findColumnExact(row: unknown[], text: string): number {
  return row.findIndex((c) => normalizeHeaderText(c) === text);
}

function findColumnContains(row: unknown[], aliases: string[]): number {
  return row.findIndex((c) => {
    const norm = normalizeHeaderText(c);
    return norm !== '' && aliases.some((a) => norm.includes(a));
  });
}

function roundMoney(n: number): number {
  return Math.round(n);
}

const TOLERANCE = 1; // Rp1, sama seperti konvensi pembulatan di backend (MoneyMath.Round dst.)

// ── Tipe hasil parse ─────────────────────────────────────────────────────────────────────

export interface ParsedBoqDetailRow {
  excelRowNumber: number; // 1-indexed, untuk pesan warning
  name: string;
  spesifikasi: string;
  unit: string;
  volume: number;
  servicePrice: number;
  materialPrice: number;
}

export interface ParsedBoqGroup {
  name: string;
  rows: ParsedBoqDetailRow[];
  computedSubtotalJasa: number;
  computedSubtotalMaterial: number;
  excelSubtotalJasa: number | null;
  excelSubtotalMaterial: number | null;
}

export interface BoqImportWarning {
  excelRowNumber: number | null; // null = warning level dokumen/Group, bukan baris spesifik
  message: string;
}

export interface ParsedBoqDocument {
  groups: ParsedBoqGroup[];
  warnings: BoqImportWarning[];
  totalJasa: number;
  totalMaterial: number;
  areaBlockTender: string | null;
}

export type ParseBoqResult =
  { ok: true; document: ParsedBoqDocument } | { ok: false; error: string };

// ── Deteksi baris judul bagian (Group) ───────────────────────────────────────────────────
// Dua bentuk: (a) "A. Preliminaries" dalam SATU sel (No ATAU Scope), (b) huruf saja di kolom
// No ("A"/"A.") + nama di kolom Scope terpisah. Kolom lain (Unit/Qty/Price per Unit) harus
// kosong — itu yang membedakannya dari baris detail.
const GROUP_HEADER_COMBINED_RE = /^([A-Za-z]{1,2})\.\s*(.+?)\s*$/;
const GROUP_HEADER_BARE_LETTER_RE = /^([A-Za-z]{1,2})\.?$/;

function tryParseGroupHeader(
  noRaw: unknown,
  scopeRaw: unknown,
  priceCellsBlank: boolean
): { name: string } | null {
  if (!priceCellsBlank) return null;
  const noText = cellText(noRaw);
  const scopeText = cellText(scopeRaw);

  const combinedSource = noText || scopeText;
  const combined = combinedSource.match(GROUP_HEADER_COMBINED_RE);
  if (combined) return { name: combined[2].trim() };

  const bareLetter = noText.match(GROUP_HEADER_BARE_LETTER_RE);
  if (bareLetter && scopeText) return { name: scopeText };

  return null;
}

function tryParsePositiveInt(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isInteger(raw) && raw > 0 ? raw : null;
  const s = cellText(raw);
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return n > 0 ? n : null;
}

// ── Metadata "Area Block Tender:" di atas tabel — SENGAJA TIDAK dipakai untuk mengisi field
// apa pun. Field itu sudah dihapus total dari sistem (task #46, backend+frontend, migration
// sudah jalan) atas instruksi eksplisit sebelumnya — menghidupkannya lagi di sini akan
// membalik keputusan itu tanpa konfirmasi baru. Nilainya tetap dibaca & dikembalikan (kalau
// ada) supaya tidak hilang diam-diam, tapi caller (GroupWorkItemsPanel) tidak menuliskannya
// ke field manapun — cuma ditampilkan sebagai info di preview kalau product owner mau lihat.
function findAreaBlockTender(rows: unknown[][], headerRowIndex: number): string | null {
  for (let i = 0; i < headerRowIndex; i++) {
    const row = rows[i];
    for (let c = 0; c < row.length; c++) {
      if (normalizeHeaderText(row[c]).includes('area block tender')) {
        for (let c2 = c + 1; c2 < row.length; c2++) {
          const v = cellText(row[c2]);
          if (v) return v;
        }
      }
    }
  }
  return null;
}

// ── Parser utama ──────────────────────────────────────────────────────────────────────────

export function parseBoqWorkbook(rows: unknown[][]): ParseBoqResult {
  // 1. Cari baris header (berisi "No" persis dan "Scope of Works").
  let headerRowIndex = -1;
  let colNo = -1;
  let colScope = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const no = findColumnExact(row, 'no');
    const scope = findColumnContains(row, ['scope of works']);
    if (no >= 0 && scope >= 0) {
      headerRowIndex = i;
      colNo = no;
      colScope = scope;
      break;
    }
  }
  if (headerRowIndex === -1) {
    return {
      ok: false,
      error: 'Header tabel (kolom "No" dan "Scope of Works") tidak ditemukan di file ini.',
    };
  }

  const headerRow1 = rows[headerRowIndex];
  const colSpec = findColumnContains(headerRow1, ['specification']);
  const colUnit = findColumnContains(headerRow1, ['unit']);
  const colQty = findColumnContains(headerRow1, ['qty']);
  const colPriceUnitStart = findColumnContains(headerRow1, ['price per unit']);
  const colPriceTotalStart = findColumnContains(headerRow1, ['price total']);

  if (colPriceUnitStart === -1 || colPriceTotalStart === -1) {
    return {
      ok: false,
      error: 'Header "Price per Unit" / "Price Total" tidak ditemukan di baris header.',
    };
  }

  const headerRow2 = rows[headerRowIndex + 1] ?? [];
  const jasaCols: number[] = [];
  const materialCols: number[] = [];
  headerRow2.forEach((cell, c) => {
    const norm = normalizeHeaderText(cell);
    if (norm === '') return;
    if (norm.includes('jasa')) jasaCols.push(c);
    else if (norm.includes('material')) materialCols.push(c);
  });

  const unitJasaCol = jasaCols.find((c) => c < colPriceTotalStart);
  const totalJasaCol = jasaCols.find((c) => c >= colPriceTotalStart);
  const unitMaterialCol = materialCols.find((c) => c < colPriceTotalStart);
  const totalMaterialCol = materialCols.find((c) => c >= colPriceTotalStart);

  if (
    unitJasaCol === undefined ||
    totalJasaCol === undefined ||
    unitMaterialCol === undefined ||
    totalMaterialCol === undefined
  ) {
    return {
      ok: false,
      error:
        'Sub-kolom "Jasa & Instalasi" / "Material" di bawah "Price per Unit" dan "Price Total" tidak ditemukan (baris header ke-2).',
    };
  }

  const areaBlockTender = findAreaBlockTender(rows, headerRowIndex);

  // 2. Iterasi baris data.
  const groups: ParsedBoqGroup[] = [];
  const warnings: BoqImportWarning[] = [];
  let currentGroup: ParsedBoqGroup | null = null;

  for (let i = headerRowIndex + 2; i < rows.length; i++) {
    const row = rows[i];
    const excelRowNumber = i + 1;
    if (!row || isRowBlank(row)) continue;

    const noRaw = row[colNo];
    const scopeRaw = row[colScope];
    const specRaw = colSpec >= 0 ? row[colSpec] : undefined;
    const unitRaw = colUnit >= 0 ? row[colUnit] : undefined;
    const qtyRaw = colQty >= 0 ? row[colQty] : undefined;
    const unitJasaRaw = row[unitJasaCol];
    const unitMaterialRaw = row[unitMaterialCol];
    const totalJasaRaw = row[totalJasaCol];
    const totalMaterialRaw = row[totalMaterialCol];

    const priceCellsBlank =
      isCellBlank(unitRaw) &&
      isCellBlank(qtyRaw) &&
      isCellBlank(unitJasaRaw) &&
      isCellBlank(unitMaterialRaw);

    // 2a. Baris "Total" per-bagian — No/Scope/Specification kosong, teks "Total" ada di sel
    //     Price per Unit - Material.
    const isTotalRow =
      isCellBlank(noRaw) &&
      isCellBlank(scopeRaw) &&
      isCellBlank(specRaw) &&
      normalizeHeaderText(unitMaterialRaw).includes('total');
    if (isTotalRow) {
      if (!currentGroup) {
        warnings.push({
          excelRowNumber,
          message: 'Baris "Total" ditemukan sebelum ada bagian (Group) — dilewati.',
        });
        continue;
      }
      currentGroup.excelSubtotalJasa = parseNumberLoose(totalJasaRaw);
      currentGroup.excelSubtotalMaterial = parseNumberLoose(totalMaterialRaw);
      continue;
    }

    // 2b. Baris judul bagian (Group).
    const groupHeader = tryParseGroupHeader(noRaw, scopeRaw, priceCellsBlank);
    if (groupHeader) {
      currentGroup = {
        name: groupHeader.name,
        rows: [],
        computedSubtotalJasa: 0,
        computedSubtotalMaterial: 0,
        excelSubtotalJasa: null,
        excelSubtotalMaterial: null,
      };
      groups.push(currentGroup);
      continue;
    }

    // 2c. Baris detail — No berupa bilangan bulat positif.
    const detailNo = tryParsePositiveInt(noRaw);
    if (detailNo !== null) {
      if (!currentGroup) {
        return {
          ok: false,
          error: `Baris detail (No. ${detailNo}) ditemukan di baris Excel ${excelRowNumber}, sebelum baris judul bagian pertama — import dibatalkan.`,
        };
      }
      const volume = parseNumberLoose(qtyRaw);
      const servicePrice = parseNumberLoose(unitJasaRaw);
      const materialPrice = parseNumberLoose(unitMaterialRaw);
      const detailRow: ParsedBoqDetailRow = {
        excelRowNumber,
        name: cellText(scopeRaw),
        spesifikasi: colSpec >= 0 ? cellText(specRaw) : '',
        unit: normalizeUnit(colUnit >= 0 ? cellText(unitRaw) : ''),
        volume,
        servicePrice,
        materialPrice,
      };
      currentGroup.rows.push(detailRow);

      const rowJasa = roundMoney(volume * servicePrice);
      const rowMaterial = roundMoney(volume * materialPrice);
      currentGroup.computedSubtotalJasa += rowJasa;
      currentGroup.computedSubtotalMaterial += rowMaterial;

      if (!isCellBlank(totalJasaRaw)) {
        const excelRowTotal = parseNumberLoose(totalJasaRaw);
        if (Math.abs(rowJasa - excelRowTotal) > TOLERANCE) {
          warnings.push({
            excelRowNumber,
            message: `Total Jasa & Instalasi baris ini (dihitung Rp${rowJasa.toLocaleString('id-ID')}) berbeda dari Excel (Rp${excelRowTotal.toLocaleString('id-ID')}).`,
          });
        }
      }
      if (!isCellBlank(totalMaterialRaw)) {
        const excelRowTotal = parseNumberLoose(totalMaterialRaw);
        if (Math.abs(rowMaterial - excelRowTotal) > TOLERANCE) {
          warnings.push({
            excelRowNumber,
            message: `Total Material baris ini (dihitung Rp${rowMaterial.toLocaleString('id-ID')}) berbeda dari Excel (Rp${excelRowTotal.toLocaleString('id-ID')}).`,
          });
        }
      }
      continue;
    }

    // 2d. Tidak dikenali — bukan pemblokir, cukup peringatan.
    warnings.push({
      excelRowNumber,
      message: `Baris tidak dikenali (No="${cellText(noRaw) || '-'}"), dilewati.`,
    });
  }

  if (groups.length === 0) {
    return { ok: false, error: 'Tidak ada bagian (Group) yang terdeteksi di file ini.' };
  }

  let totalJasa = 0;
  let totalMaterial = 0;
  for (const g of groups) {
    if (
      g.excelSubtotalJasa !== null &&
      Math.abs(g.computedSubtotalJasa - g.excelSubtotalJasa) > TOLERANCE
    ) {
      warnings.push({
        excelRowNumber: null,
        message: `Subtotal Jasa & Instalasi bagian "${g.name}" (dihitung Rp${g.computedSubtotalJasa.toLocaleString('id-ID')}) berbeda dari baris Total di Excel (Rp${g.excelSubtotalJasa.toLocaleString('id-ID')}).`,
      });
    }
    if (
      g.excelSubtotalMaterial !== null &&
      Math.abs(g.computedSubtotalMaterial - g.excelSubtotalMaterial) > TOLERANCE
    ) {
      warnings.push({
        excelRowNumber: null,
        message: `Subtotal Material bagian "${g.name}" (dihitung Rp${g.computedSubtotalMaterial.toLocaleString('id-ID')}) berbeda dari baris Total di Excel (Rp${g.excelSubtotalMaterial.toLocaleString('id-ID')}).`,
      });
    }
    totalJasa += g.computedSubtotalJasa;
    totalMaterial += g.computedSubtotalMaterial;
  }

  return {
    ok: true,
    document: {
      groups,
      warnings,
      totalJasa: roundMoney(totalJasa),
      totalMaterial: roundMoney(totalMaterial),
      areaBlockTender,
    },
  };
}

/** Wrapper baca file .xlsx (ArrayBuffer) -> array-of-arrays -> parseBoqWorkbook. */
export async function parseBoqExcelFile(file: File): Promise<ParseBoqResult> {
  const XLSXLib = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSXLib.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { ok: false, error: 'File Excel tidak punya sheet.' };
  const rows: unknown[][] = XLSXLib.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    blankrows: false,
    defval: '',
  });
  return parseBoqWorkbook(rows);
}

// ── Pencocokan Group hasil parse terhadap Group yang sudah ada di Tab (nama, case/spasi-
//    insensitive) — dipakai preview modal untuk menampilkan status "Baru"/"Ditambahkan ke
//    Group yang ada" dan menentukan target commit. ──────────────────────────────────────

export interface GroupImportPlan {
  parsedGroup: ParsedBoqGroup;
  targetGroupId: string | null; // null = akan dibuat baru
}

function normalizeGroupName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function matchGroupsAgainstExisting(
  parsedGroups: ParsedBoqGroup[],
  existingGroups: CostingGroup[]
): GroupImportPlan[] {
  return parsedGroups.map((parsedGroup) => {
    const match = existingGroups.find(
      (eg) => normalizeGroupName(eg.name) === normalizeGroupName(parsedGroup.name)
    );
    return { parsedGroup, targetGroupId: match?.id ?? null };
  });
}
