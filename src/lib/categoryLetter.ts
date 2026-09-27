import type { CostingTab } from '@/types';

// Mirror PERSIS dari backend QuotationPdfService.ToCategoryLetter / BuildGroupCategoryLetters
// (ERP-Backend/SynteraERP.Api/Services/QuotationPdfService.cs, ditest di
// QuotationPdfCategoryLetterTests.cs — task #45). Huruf kategori (A, B, C, ... Z, AA, AB, ...)
// dihitung SEKALI dari urutan Tab.sortOrder lalu Group.sortOrder, lintas SEMUA Tab dalam satu
// Quotation — BUKAN per-Tab dan BUKAN per-WorkItem.
//
// PENTING (dibuktikan lewat test Group_letter_stays_correct_when_an_earlier_group_would_be_filtered_out_of_BOQ
// di backend): SETIAP Group mendapat huruf, termasuk yang belum punya WorkItem/isi sama sekali —
// tidak ada filter "skip Group kosong" di sini. Kalau versi ini pernah nge-filter Group kosong,
// huruf yang tampil di UI akan bergeser dan tidak match dengan huruf yang benar-benar dicetak di
// PDF untuk Quotation yang sama.
export function toCategoryLetter(index: number): string {
  let n = index + 1;
  let result = '';
  while (n > 0) {
    n -= 1;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

/** groupId -> huruf kategori ("A", "B", ..., "AA", ...), dihitung lintas semua Tab. */
export function getGroupCategoryLetters(tabs: CostingTab[]): Record<string, string> {
  const orderedGroupIds = [...tabs]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((tab) => [...tab.groups].sort((a, b) => a.sortOrder - b.sortOrder).map((g) => g.id));

  const letters: Record<string, string> = {};
  orderedGroupIds.forEach((groupId, index) => {
    letters[groupId] = toCategoryLetter(index);
  });
  return letters;
}
