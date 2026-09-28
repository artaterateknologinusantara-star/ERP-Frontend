// Operasi murni (pure functions) atas struktur WorkItem[]/WorkDetail milik satu CostingGroup —
// diekstrak dari GroupWorkItemsPanel.tsx (modal "Isi Detail RAB/BQ") supaya CostingTable.tsx
// (tabel Penawaran utama) bisa menyediakan editing inline atas data yang SAMA tanpa duplikasi
// implementasi (rule #6 CLAUDE.md) — kedua komponen menulis ke tabData.groups yang sama lewat
// onUpdate/onUpdateTab masing-masing, jadi tidak ada risiko 2 sumber kebenaran yang beda.
import type { CostingGroup, WorkItem, WorkDetail } from '@/types';

export function detailTotal(d: WorkDetail): { jasa: number; material: number } {
  return { jasa: d.volume * d.servicePrice, material: d.volume * d.materialPrice };
}

export function emptyWorkDetail(seed: string | number = Date.now()): WorkDetail {
  return {
    id: `wd-${seed}`,
    name: '',
    spesifikasi: '',
    volume: 0,
    unit: '',
    servicePrice: 0,
    materialPrice: 0,
    sortOrder: 0,
    attachments: [],
  };
}

// Detail baru selalu masuk ke WorkItem TERAKHIR di Group itu (bukan bikin WorkItem baru tiap
// kali) supaya penomoran WorkDetail (yang di PDF reset per-WorkItem) tetap 1..N berurutan. Kalau
// Group belum punya WorkItem sama sekali, buat 1 dengan Name kosong (WorkItem.name kosong berarti
// tidak dirender sebagai sub-judul di PDF/modal/tabel — lihat komentar di GroupWorkItemsPanel).
export function addWorkDetailToGroup(group: CostingGroup): {
  workItems: WorkItem[];
  newDetail: WorkDetail;
  targetWorkItemId: string;
} {
  const workItems = group.workItems ?? [];
  const newDetail = emptyWorkDetail(`${group.id}-${Date.now()}`);
  let targetWorkItemId: string;
  let nextWorkItems: WorkItem[];
  if (workItems.length === 0) {
    const newWorkItem: WorkItem = {
      id: `wi-${group.id}-${Date.now()}`,
      name: '',
      sortOrder: 0,
      workDetails: [newDetail],
    };
    nextWorkItems = [newWorkItem];
    targetWorkItemId = newWorkItem.id;
  } else {
    const last = workItems[workItems.length - 1];
    newDetail.sortOrder = last.workDetails.length;
    nextWorkItems = workItems.map((w, i) =>
      i === workItems.length - 1 ? { ...w, workDetails: [...w.workDetails, newDetail] } : w
    );
    targetWorkItemId = last.id;
  }
  return { workItems: nextWorkItems, newDetail, targetWorkItemId };
}

export function updateWorkDetailInGroup(
  workItems: WorkItem[] | undefined,
  workItemId: string,
  detailId: string,
  patch: Partial<WorkDetail>
): WorkItem[] {
  return (workItems ?? []).map((w) =>
    w.id !== workItemId
      ? w
      : { ...w, workDetails: w.workDetails.map((d) => (d.id === detailId ? { ...d, ...patch } : d)) }
  );
}

export function deleteWorkDetailInGroup(
  workItems: WorkItem[] | undefined,
  workItemId: string,
  detailId: string
): WorkItem[] {
  return (workItems ?? []).map((w) =>
    w.id !== workItemId ? w : { ...w, workDetails: w.workDetails.filter((d) => d.id !== detailId) }
  );
}
