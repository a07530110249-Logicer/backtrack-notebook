import type { IntegrationConfig, Question, Revision, Stats } from './types';

let baseUrl = '/api';
let token = '';

export async function initApi() {
  if (window.backtrackDesktop) {
    const info = await window.backtrackDesktop.getApiInfo();
    baseUrl = info.baseUrl;
    token = info.token;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `请求失败（${response.status}）`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  questions: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
    return request<Question[]>(`/questions?${query}`);
  },
  stats: () => request<Stats>('/stats'),
  create: (data: Partial<Question>) => request<Question>('/questions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Question> & { revisionSummary?: string }) => request<Question>(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/questions/${id}`, { method: 'DELETE' }),
  revisions: (id: string) => request<Revision[]>(`/questions/${id}/revisions`),
  rollback: (id: string, revisionId: string) => request<Question>(`/questions/${id}/rollback`, { method: 'POST', body: JSON.stringify({ revisionId }) }),
  review: (id: string, mastery: string) => request<Question>(`/questions/${id}/review`, { method: 'POST', body: JSON.stringify({ mastery }) }),
  integrations: () => request<IntegrationConfig>('/integrations'),
  saveIntegrations: (data: IntegrationConfig) => request<IntegrationConfig>('/integrations', { method: 'PUT', body: JSON.stringify(data) }),
  testIntegration: (url: string, token = '') => request<{ ok: boolean; status: number; contentType: string; preview?: unknown }>('/integrations/test', { method: 'POST', body: JSON.stringify({ url, token }) }),
  captureCamera: (url: string) => request<{ image: string }>('/integrations/camera/capture', { method: 'POST', body: JSON.stringify({ url }) }),
  searchKnowledge: (query: string) => request<{ results: unknown; source: string }>('/integrations/knowledge/search', { method: 'POST', body: JSON.stringify({ query }) }),
};
