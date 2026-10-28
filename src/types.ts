export type Mastery = '未掌握' | '复习中' | '已掌握';
export type Page = 'overview' | 'review' | 'boards' | 'history' | 'integrations';
export interface Question { id: string; title: string; subject: string; chapter: string; content: string; answer: string; analysis: string; errorType: string; difficulty: string; mastery: Mastery; tags: string[]; image: string; createdAt: string; updatedAt: string; nextReviewAt: string; reviewCount: number; lastReviewedAt: string; source: string }
export interface Revision { id: string; questionId: string; savedAt: string; summary: string; snapshot: Question }
export interface ReviewEvent { id: string; questionId: string; reviewedAt: string; mastery: Mastery; mode: 'scheduled' | 'free' }
export interface Stats { total: number; mastered: number; reviewing: number; due: number; totalPractices: number; weekPractices: number; bySubject: { subject: string; count: number }[] }
export interface KnowledgeSource { id: string; name: string; url: string; token: string; enabled: boolean }
export interface ModelConfig { enabled: boolean; baseUrl: string; apiKey: string; model: string }
export interface IntegrationConfig { cameraUrl: string; cameraToken: string; knowledgeSources: KnowledgeSource[]; model: ModelConfig }
export interface Workspace { id: string; name: string; path: string; addedAt: string; isDefault: boolean }
export interface WorkspaceSummary { activeId: string; workspaces: Workspace[] }
export interface BoardNode { id: string; type: 'text'; text: string; x: number; y: number; width: number; height: number; color?: string; questionId?: string }
export interface BoardEdge { id: string; fromNode: string; toNode: string; toEnd: 'arrow'; label?: string }
export interface Board { id: string; name: string; createdAt: string; updatedAt: string; nodes: BoardNode[]; edges: BoardEdge[] }
export interface BoardSummary { id: string; name: string; updatedAt: string; nodeCount: number; edgeCount: number }
export interface KnowledgeSearchGroup { sourceId: string; sourceName: string; ok: boolean; results: unknown; error?: string }
