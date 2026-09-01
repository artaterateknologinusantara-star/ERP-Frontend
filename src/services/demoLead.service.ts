import { api } from '@/lib/api';

export const DEMO_LEAD_NEEDS = [
  'Beralih dari kerja manual ke sistem',
  'Ingin upgrade sistem lama',
  'Integrasi dengan sistem atau aplikasi lain',
] as const;

export interface CreateDemoLeadDto {
  fullName: string;
  whatsappNumber: string;
  companyEmail: string;
  companyName: string;
  industry: string;
  need: string;
  notes?: string;
}

export interface DemoLeadItem {
  id: string;
  fullName: string;
  whatsappNumber: string;
  companyEmail: string;
  companyName: string;
  industry: string;
  need: string;
  notes?: string;
  status: string;
  createdAt: string;
}

export const demoLeadService = {
  create(dto: CreateDemoLeadDto) {
    return api.post<null>('/demo-leads', dto);
  },

  async list(): Promise<DemoLeadItem[]> {
    const res = await api.get<DemoLeadItem[]>('/demo-leads');
    return res.data ?? [];
  },

  updateStatus(id: string, status: string) {
    return api.put<null>(`/demo-leads/${id}/status`, { status });
  },
};
