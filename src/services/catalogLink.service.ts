import { api } from '@/lib/api';

export interface UnlinkedCatalogItem {
  itemRowId: string;
  sourceType: 'Quotation' | 'SalesOrder';
  sourceNo: string;
  description: string;
  sku?: string;
  qty: number;
  uom: string;
}

export const catalogLinkService = {
  async getUnlinked(): Promise<UnlinkedCatalogItem[]> {
    const res = await api.get<UnlinkedCatalogItem[]>('/catalog-links/unlinked');
    return res.data ?? [];
  },

  async link(sourceType: string, itemRowId: string, itemMasterId: string): Promise<void> {
    await api.post(`/catalog-links/${sourceType}/${itemRowId}/link`, { itemMasterId });
  },
};
