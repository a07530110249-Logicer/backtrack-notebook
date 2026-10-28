import type { Board, BoardSummary, IntegrationConfig, KnowledgeSearchGroup, Question, ReviewEvent, Revision, Stats, WorkspaceSummary } from './types';
let baseUrl = '/api';
let token = '';
export async function initApi() { if (window.backtrackDesktop) { const info = await window.backtrackDesktop.getApiInfo(); baseUrl = info.baseUrl; token = info.token; } }
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || `请求失败（${response.status}）`); }
  return response.status === 204 ? undefined as T : response.json();
}
export function assetUrl(value: string) {
  if (!value || value.startsWith('data:') || value.startsWith('http:') || value.startsWith('https:')) return value;
  return `${baseUrl}/${value}${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
}
export const api = {
  questions: (params: Record<string, string> = {}) => request<Question[]>(`/questions?${new URLSearchParams(Object.entries(params).filter(([, value]) => value))}`),
  stats: () => request<Stats>('/stats'), subjects: () => request<string[]>('/subjects'),
  workspaces: () => request<WorkspaceSummary>('/workspaces'),
  addWorkspace: (data: { name: string; path: string }) => request<WorkspaceSummary>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
  activateWorkspace: (id: string) => request<WorkspaceSummary>(`/workspaces/${id}/activate`, { method: 'POST' }),
  removeWorkspace: (id: string) => request<WorkspaceSummary>(`/workspaces/${id}`, { method: 'DELETE' }),
  create: (data: Partial<Question>) => request<Question>('/questions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Question> & { revisionSummary?: string }) => request<Question>(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/questions/${id}`, { method: 'DELETE' }),
  revisions: (id: string) => request<Revision[]>(`/questions/${id}/revisions`), reviews: (id: string) => request<ReviewEvent[]>(`/questions/${id}/reviews`),
  rollback: (id: string, revisionId: string) => request<Question>(`/questions/${id}/rollback`, { method: 'POST', body: JSON.stringify({ revisionId }) }),
  review: (id: string, mastery: string, mode = 'scheduled') => request<Question>(`/questions/${id}/review`, { method: 'POST', body: JSON.stringify({ mastery, mode }) }),
  boards: () => request<BoardSummary[]>('/boards'), board: (id: string) => request<Board>(`/boards/${id}`),
  createBoard: (name: string) => request<Board>('/boards', { method: 'POST', body: JSON.stringify({ name }) }),
  saveBoard: (id: string, data: Partial<Board>) => request<Board>(`/boards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeBoard: (id: string) => request<void>(`/boards/${id}`, { method: 'DELETE' }),
  integrations: () => request<IntegrationConfig>('/integrations'), saveIntegrations: (data: IntegrationConfig) => request<IntegrationConfig>('/integrations', { method: 'PUT', body: JSON.stringify(data) }),
  testIntegration: (data: { kind: 'camera' | 'knowledge' | 'model'; url: string; token?: string; model?: string }) => request<{ ok: boolean; status: number; contentType: string; message?: string }>('/integrations/test', { method: 'POST', body: JSON.stringify(data) }),
  captureCamera: (url: string, token = '') => request<{ image: string }>('/integrations/camera/capture', { method: 'POST', body: JSON.stringify({ url, token }) }),
  searchKnowledge: (query: string, sourceIds: string[] = []) => request<{ query: string; sources: KnowledgeSearchGroup[] }>('/integrations/knowledge/search', { method: 'POST', body: JSON.stringify({ query, sourceIds }) }),
};
