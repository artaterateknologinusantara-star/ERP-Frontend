import { api } from '@/lib/api';

export interface ProjectListItem {
  id: string;
  code: string;
  name: string;
  customerName: string;
  projectManagerName?: string;
  status: string;
  progress: number;
  budget: number;
  startDate: string;
  endDate?: string;
  taskCount: number;
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  assignedToId?: string;
  assignedToName?: string;
  status: string;
  priority: string;
  dueDate?: string;
  sortOrder: number;
}

export interface ProjectDetail extends ProjectListItem {
  customerId: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  projectManagerId?: string;
  notes?: string;
  tasks: ProjectTask[];
}

export interface ProjectStats {
  total: number;
  running: number;
  onHold: number;
  completed: number;
  planning: number;
}

export interface CreateProjectDto {
  name: string;
  customerId: string;
  salesOrderId?: string;
  projectManagerId?: string;
  startDate: string;
  endDate?: string;
  budget: number;
  notes?: string;
}

export interface UpdateProjectDto extends CreateProjectDto {
  progress: number;
  status: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  assignedToId?: string;
  dueDate?: string;
  priority: string;
  sortOrder: number;
  notes?: string;
}

export interface ProjectCostSummary {
  projectId: string;
  projectName: string;
  salesOrderNo?: string;
  revenue: number;
  procurementCost: number;
  vendorPayment: number;
  customerBilling: number;
  customerPayment: number;
  outstandingAR: number;
  outstandingAP: number;
  estimatedMargin: number;
}

export const projectService = {
  async getStats(): Promise<ProjectStats> {
    const res = await api.get<ProjectStats>('/projects/stats');
    return res.data!;
  },

  async list(params?: { page?: number; perPage?: number; search?: string }) {
    return api.getList<ProjectListItem>('/projects', params);
  },

  async getById(id: string): Promise<ProjectDetail> {
    const res = await api.get<ProjectDetail>(`/projects/${id}`);
    return res.data!;
  },

  create(dto: CreateProjectDto) {
    return api.post<ProjectListItem>('/projects', dto);
  },

  update(id: string, dto: UpdateProjectDto) {
    return api.put<object>(`/projects/${id}`, dto);
  },

  delete(id: string) {
    return api.delete(`/projects/${id}`);
  },

  addTask(projectId: string, dto: CreateTaskDto) {
    return api.post<ProjectTask>(`/projects/${projectId}/tasks`, dto);
  },

  updateTaskStatus(projectId: string, taskId: string, status: string) {
    return api.patch(`/projects/${projectId}/tasks/${taskId}/status`, { status });
  },

  deleteTask(projectId: string, taskId: string) {
    return api.delete(`/projects/${projectId}/tasks/${taskId}`);
  },

  async getCostSummary(id: string): Promise<ProjectCostSummary> {
    const res = await api.get<ProjectCostSummary>(`/projects/${id}/cost`);
    return res.data!;
  },
};
