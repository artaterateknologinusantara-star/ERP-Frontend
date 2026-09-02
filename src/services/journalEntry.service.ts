import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types';

// ── Types ──────────────────────────────────────

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntryListItem {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  sourceType: string;
  status: string;
  createdByName?: string;
  totalDebit: number;
  totalCredit: number;
}

export interface JournalEntryDetail extends JournalEntryListItem {
  sourceId?: string;
  reversedByEntryId?: string;
  postedAt?: string;
  postedByName?: string;
  lines: JournalEntryLine[];
  createdAt: string;
}

export interface JournalEntryListParams {
  page?: number;
  perPage?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  sourceType?: string;
  sourceId?: string;
}

export interface CreateJournalEntryLine {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface CreateJournalEntryRequest {
  description: string;
  date?: string;
  lines: CreateJournalEntryLine[];
}

export interface CreateOpeningBalanceLine {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface CreateOpeningBalanceRequest {
  date?: string;
  description?: string;
  lines: CreateOpeningBalanceLine[];
}

// ── Functions ──────────────────────────────────

export async function getJournalEntriesBySourceId(sourceId: string): Promise<JournalEntryListItem[]> {
  return api.getList<JournalEntryListItem>('/journal-entries', { sourceId, perPage: 10 })
    .then((res) => res.data);
}

export async function getJournalEntryDetail(id: string): Promise<JournalEntryDetail> {
  const res = await api.get<JournalEntryDetail>(`/journal-entries/${id}`);
  return res.data;
}

/** Cek Opening Balance yang sudah Posted sebelumnya — dipakai untuk peringatan anti-duplikasi. */
export async function getExistingPostedOpeningBalances(): Promise<JournalEntryListItem[]> {
  return api.getList<JournalEntryListItem>('/journal-entries', {
    sourceType: 'OpeningBalance',
    status: 'Posted',
    perPage: 5,
  }).then((res) => res.data);
}

export async function createOpeningBalance(payload: CreateOpeningBalanceRequest): Promise<JournalEntryDetail> {
  const res = await api.post<JournalEntryDetail>('/journal-entries/opening-balance', payload);
  return res.data;
}

export async function getJournalEntryList(params?: JournalEntryListParams): Promise<PaginatedResponse<JournalEntryListItem>> {
  return api.getList<JournalEntryListItem>('/journal-entries', { ...params });
}

// SourceType selalu 'ManualAdjustment' — form jurnal manual tidak menawarkan pilihan lain, jadi
// di-hardcode di sini (bukan diserahkan ke caller) supaya tidak bisa salah dikirim dari UI.
export async function createJournalEntry(payload: CreateJournalEntryRequest): Promise<JournalEntryDetail> {
  const res = await api.post<JournalEntryDetail>('/journal-entries', {
    ...payload,
    sourceType: 'ManualAdjustment',
  });
  return res.data;
}

export async function postJournalEntry(id: string): Promise<JournalEntryDetail> {
  const res = await api.post<JournalEntryDetail>(`/journal-entries/${id}/post`, {});
  return res.data;
}

export async function reverseJournalEntry(id: string): Promise<JournalEntryDetail> {
  const res = await api.post<JournalEntryDetail>(`/journal-entries/${id}/reverse`, {});
  return res.data;
}
