export type Mastery = '未掌握' | '复习中' | '已掌握';
export type Page = 'overview' | 'review' | 'subjects' | 'history' | 'integrations';

export interface Question {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  content: string;
  answer: string;
  analysis: string;
  errorType: string;
  difficulty: string;
  mastery: Mastery;
  tags: string[];
  image: string;
  createdAt: string;
  updatedAt: string;
  nextReviewAt: string;
  reviewCount: number;
  lastReviewedAt: string;
  source: string;
}

export interface Revision {
  id: string;
  questionId: string;
  savedAt: string;
  summary: string;
  snapshot: Question;
}

export interface Stats {
  total: number;
  mastered: number;
  reviewing: number;
  due: number;
  addedThisWeek: number;
  bySubject: { subject: string; count: number }[];
}

export interface IntegrationConfig {
  cameraUrl: string;
  knowledgeUrl: string;
  knowledgeToken: string;
}
