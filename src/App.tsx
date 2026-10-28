import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, ChevronRight, Clock3, FileText, Loader2, Plus, RotateCcw, Search } from 'lucide-react';
import { api, assetUrl, initApi } from './api';
import Sidebar from './components/Sidebar';
import QuestionEditor from './components/QuestionEditor';
import QuestionDetail from './components/QuestionDetail';
import HistoryModal from './components/HistoryModal';
import Integrations from './components/Integrations';
import Whiteboard from './components/Whiteboard';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import Toast, { type ToastState } from './components/Toast';
import type { Page, Question, Revision, Stats } from './types';
import { formatDate, reviewLabel, subjectColors } from './utils';

const pageNames: Record<Page, string> = { overview: '全部错题', review: '复习', boards: '知识白板', history: '版本记录', integrations: '连接与接口' };
function QuestionCard({ question, onClick, onReview }: { question: Question; onClick: () => void; onReview?: (mastery: string) => void }) {
  const color = subjectColors[question.subject] || '#68758a';
  return <article className="question-card" onClick={onClick}>{question.image && <div className="question-thumb"><img src={assetUrl(question.image)} alt="题目照片" /></div>}<div className="question-main"><div className="question-labels"><span className="subject-label" style={{ color, background: `${color}10` }}><FileText size={13} />{question.subject}</span><span className={`mastery-badge ${question.mastery}`}>{question.mastery}</span></div><h3>{question.title}</h3><p>{question.content}</p><div className="question-footer"><div className="tag-row"><span>练习 {question.reviewCount} 次</span>{question.chapter && <span>{question.chapter}</span>}</div><time><Clock3 size={13} />{reviewLabel(question.nextReviewAt, question.mastery)}</time></div></div>{onReview ? <div className="quick-review" onClick={(e) => e.stopPropagation()}><button title="仍需巩固" onClick={() => onReview('未掌握')}><RotateCcw size={16} /></button><button title="已经掌握" onClick={() => onReview('已掌握')}><Check size={17} /></button></div> : <ChevronRight className="card-chevron" size={18} />}</article>;
}
function HistoryCenter({ questions, onOpen }: { questions: Question[]; onOpen: (q: Question) => void }) {
  const [items, setItems] = useState<{ revision: Revision; question: Question }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all(questions.map(async (question) => (await api.revisions(question.id)).map((revision) => ({ revision, question })))).then((groups) => setItems(groups.flat().sort((a, b) => +new Date(b.revision.savedAt) - +new Date(a.revision.savedAt)))).finally(() => setLoading(false)); }, [questions]);
  return <div className="history-page simple-page"><div className="page-title-row"><div><h1>版本记录</h1><p>编辑和回滚都会保留快照。</p></div><span className="quiet-count">{items.length} 个版本</span></div><section className="history-list"><div className="history-list-head"><span>题目与版本</span><span>保存时间</span><span>操作</span></div>{loading ? <div className="center-loading"><Loader2 className="spin" />正在读取</div> : items.map(({ revision, question }) => <div className="history-row" key={revision.id}><div className="history-question"><div><strong>{question.title}</strong><p>{revision.summary} · {question.subject}</p></div></div><time>{formatDate(revision.savedAt, true)}</time><button className="secondary-button small" onClick={() => onOpen(question)}>查看<ChevronRight size={14} /></button></div>)}</section></div>;
}

export default function App() {
  const [page, setPage] = useState<Page>('overview');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('全部');
  const [reviewMode, setReviewMode] = useState<'scheduled' | 'free'>('scheduled');
  const [editor, setEditor] = useState<{ open: boolean; question: Question | null }>({ open: false, question: null });
  const [detail, setDetail] = useState<Question | null>(null);
  const [detailMode, setDetailMode] = useState<'scheduled' | 'free'>('scheduled');
  const [history, setHistory] = useState<Question | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => { setToast({ message, type }); window.setTimeout(() => setToast(null), 3600); }, []);
  const refresh = useCallback(async () => { try { const [items, summary, subjectList] = await Promise.all([api.questions(), api.stats(), api.subjects()]); setQuestions(items); setStats(summary); setSubjects(subjectList); } catch (error) { notify((error as Error).message, 'error'); } finally { setLoading(false); } }, [notify]);
  useEffect(() => { initApi().then(refresh).catch((error) => { notify(error.message, 'error'); setLoading(false); }); }, [refresh, notify]);
  const filtered = useMemo(() => questions.filter((q) => (subject === '全部' || q.subject === subject) && `${q.title} ${q.content} ${q.subject} ${q.chapter} ${q.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())), [questions, search, subject]);
  const dueQuestions = useMemo(() => questions.filter((q) => q.mastery !== '已掌握' && new Date(q.nextReviewAt) <= new Date(Date.now() + 864e5)), [questions]);
  const reviewQuestions = reviewMode === 'free' ? questions : dueQuestions;
  const openDetail = (q: Question, mode: 'scheduled' | 'free' = 'scheduled') => { setDetail(q); setDetailMode(mode); };
  const reviewed = async (question: Question, mastery: string, mode = detailMode) => {
    try { const updated = await api.review(question.id, mastery, mode); setQuestions((old) => old.map((q) => q.id === updated.id ? updated : q)); setDetail((old) => old?.id === updated.id ? updated : old); setStats(await api.stats()); notify(`已记录第 ${updated.reviewCount} 次练习`); }
    catch (error) { notify((error as Error).message, 'error'); }
  };
  const remove = async (question: Question) => { if (!window.confirm(`确定删除“${question.title}”吗？相关历史版本也会删除。`)) return; try { await api.remove(question.id); setDetail(null); await refresh(); notify('错题已删除'); } catch (error) { notify((error as Error).message, 'error'); } };
  const workspaceChanged = () => { setLoading(true); setDetail(null); setHistory(null); setSubject('全部'); setWorkspaceVersion((v) => v + 1); refresh(); };

  return <div className="app-shell"><Sidebar page={page} onChange={setPage} stats={stats} /><main className="main-shell"><header className="topbar"><WorkspaceSwitcher onChanged={workspaceChanged} onError={(message) => notify(message, 'error')} /><div className="topbar-actions"><label className="global-search"><Search size={16} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage('overview'); }} placeholder="搜索错题…" /></label><button className="primary-button add-button" onClick={() => setEditor({ open: true, question: null })}><Plus size={17} />收录错题</button></div></header><div className="page-content">{loading ? <div className="page-loading"><Loader2 size={24} className="spin" /><span>正在打开工作空间…</span></div> : <>
    {page === 'overview' && <div className="overview-page simple-page"><div className="page-title-row"><div><h1>错题</h1><p>{pageNames[page]} · 共 {questions.length} 道</p></div></div><section className="stats-grid"><div className="stat-card"><span>待复习</span><strong>{stats?.due ?? 0}</strong></div><div className="stat-card"><span>本周练习</span><strong>{stats?.weekPractices ?? 0}</strong></div><div className="stat-card"><span>累计练习</span><strong>{stats?.totalPractices ?? 0}</strong></div><div className="stat-card"><span>已掌握</span><strong>{stats?.mastered ?? 0}</strong></div></section><section className="questions-panel"><div className="subject-tabs"><button className={subject === '全部' ? 'active' : ''} onClick={() => setSubject('全部')}>全部</button>{subjects.map((s) => <button key={s} className={subject === s ? 'active' : ''} onClick={() => setSubject(s)}>{s}</button>)}</div><div className="question-list">{filtered.map((q) => <QuestionCard key={q.id} question={q} onClick={() => openDetail(q)} />)}{!filtered.length && <div className="empty-state"><Search size={26} /><h3>没有找到相关错题</h3><button className="secondary-button" onClick={() => { setSearch(''); setSubject('全部'); }}>清除筛选</button></div>}</div></section></div>}
    {page === 'review' && <div className="review-page simple-page"><div className="page-title-row"><div><h1>复习</h1><p>先回忆答案，再按真实情况记录结果。</p></div><div className="review-mode"><button className={reviewMode === 'scheduled' ? 'active' : ''} onClick={() => setReviewMode('scheduled')}>今日计划 {dueQuestions.length}</button><button className={reviewMode === 'free' ? 'active' : ''} onClick={() => setReviewMode('free')}>自由练习</button></div></div><section className="review-list">{reviewQuestions.map((q) => <QuestionCard key={q.id} question={q} onClick={() => openDetail(q, reviewMode)} onReview={(mastery) => reviewed(q, mastery, reviewMode)} />)}{!reviewQuestions.length && <div className="empty-state"><CheckCircle2 size={30} /><h3>今天的计划已经完成</h3><p>仍可切换到自由练习，不受复习日期限制。</p></div>}</section></div>}
    {page === 'boards' && <Whiteboard key={workspaceVersion} questions={questions} onOpenQuestion={openDetail} notify={notify} />}
    {page === 'history' && <HistoryCenter key={workspaceVersion} questions={questions} onOpen={setHistory} />}
    {page === 'integrations' && <Integrations key={workspaceVersion} notify={notify} />}
  </>}</div></main>
    {editor.open && <QuestionEditor key={editor.question?.id || 'new'} question={editor.question} onClose={() => setEditor({ open: false, question: null })} onError={(message) => notify(message, 'error')} onSaved={async (saved) => { setEditor({ open: false, question: null }); await refresh(); notify(editor.question ? '更改已保存' : '错题收录成功'); openDetail(saved); }} />}
    {detail && <QuestionDetail question={detail} mode={detailMode} onClose={() => setDetail(null)} onEdit={() => { setEditor({ open: true, question: detail }); setDetail(null); }} onHistory={() => { setHistory(detail); setDetail(null); }} onDelete={() => remove(detail)} onReview={(mastery) => reviewed(detail, mastery)} />}
    {history && <HistoryModal question={history} onClose={() => setHistory(null)} onError={(message) => notify(message, 'error')} onRolledBack={async (updated) => { setHistory(null); await refresh(); openDetail(updated); notify('已恢复历史版本'); }} />}<Toast toast={toast} onClose={() => setToast(null)} />
  </div>;
}
