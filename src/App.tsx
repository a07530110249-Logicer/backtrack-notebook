import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookCheck, BookOpen, CalendarCheck2, Camera, Check, CheckCircle2, ChevronRight, CircleAlert, Clock3, FileText, Filter, FlaskConical, FunctionSquare, GraduationCap, History as HistoryIcon, Languages, Layers3, Leaf, Loader2, MoreHorizontal, Plus, RotateCcw, Search, Sparkles, Target, TrendingUp } from 'lucide-react';
import { api, initApi } from './api';
import Sidebar from './components/Sidebar';
import QuestionEditor from './components/QuestionEditor';
import QuestionDetail from './components/QuestionDetail';
import HistoryModal from './components/HistoryModal';
import Integrations from './components/Integrations';
import Toast, { type ToastState } from './components/Toast';
import type { Page, Question, Revision, Stats } from './types';
import { formatDate, reviewLabel, subjectColors, SUBJECTS } from './utils';

const subjectIcons: Record<string, typeof FunctionSquare> = { 数学: FunctionSquare, 物理: Target, 化学: FlaskConical, 英语: Languages, 语文: BookOpen, 生物: Leaf, 其他: Layers3 };
const pageNames: Record<Page, string> = { overview: '全部错题', review: '今日复习', subjects: '科目分类', history: '版本回滚', integrations: '集成接口' };

function QuestionCard({ question, onClick, onReview }: { question: Question; onClick: () => void; onReview?: (mastery: string) => void }) {
  const Icon = subjectIcons[question.subject] || Layers3;
  const color = subjectColors[question.subject] || '#7566d7';
  return <article className="question-card" onClick={onClick}>
    {question.image && <div className="question-thumb"><img src={question.image} alt="题目照片" /></div>}
    <div className="question-main"><div className="question-labels"><span className="subject-label" style={{ color, background: `${color}12` }}><Icon size={14} />{question.subject}</span><span className={`mastery-badge ${question.mastery}`}>{question.mastery}</span><span className="difficulty-label">{question.difficulty}</span></div>
      <h3>{question.title}</h3><p>{question.content}</p>
      <div className="question-footer"><div className="tag-row">{question.tags?.slice(0, 2).map((tag) => <span key={tag}>#{tag}</span>)}{!question.tags?.length && <span>#{question.errorType}</span>}</div><time className={reviewLabel(question.nextReviewAt, question.mastery) === '今天该复习' && question.mastery !== '已掌握' ? 'due' : ''}><Clock3 size={13} />{reviewLabel(question.nextReviewAt, question.mastery)}</time></div>
    </div>
    {onReview ? <div className="quick-review" onClick={(e) => e.stopPropagation()}><button title="仍需巩固" onClick={() => onReview('未掌握')}><RotateCcw size={16} /></button><button title="已经掌握" onClick={() => onReview('已掌握')}><Check size={17} /></button></div> : <ChevronRight className="card-chevron" size={19} />}
  </article>;
}

function HistoryCenter({ questions, onOpen }: { questions: Question[]; onOpen: (q: Question) => void }) {
  const [items, setItems] = useState<{ revision: Revision; question: Question }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all(questions.map(async (question) => (await api.revisions(question.id)).map((revision) => ({ revision, question }))))
      .then((groups) => setItems(groups.flat().sort((a, b) => +new Date(b.revision.savedAt) - +new Date(a.revision.savedAt))))
      .finally(() => setLoading(false));
  }, [questions]);
  return <div className="history-page"><div className="page-title-row"><div><span className="eyebrow">SAFE TO REWRITE</span><h1>每一次修改，都有迹可循</h1><p>查看题目的完整演变，随时找回曾经的思路和答案。</p></div><div className="history-count"><HistoryIcon size={19} /><strong>{items.length}</strong><span>个版本快照</span></div></div>
    <div className="history-explainer"><div><RotateCcw size={22} /></div><p><strong>放心回滚，不会弄丢现在的内容</strong><span>恢复旧版本之前，系统会自动保存当前快照。你的每一次订正都被认真对待。</span></p></div>
    <section className="history-list"><div className="history-list-head"><span>题目与版本</span><span>保存时间</span><span>操作</span></div>{loading ? <div className="center-loading"><Loader2 className="spin" />正在汇总历史版本</div> : items.map(({ revision, question }, index) => <div className="history-row" key={revision.id}><div className="history-question"><span className="history-node" style={{ borderColor: subjectColors[question.subject] }} /><div><strong>{question.title}</strong><p>{revision.summary} · {question.subject}<span className={index === 0 ? 'latest' : ''}>{index === 0 ? '最近更新' : '历史版本'}</span></p></div></div><time>{formatDate(revision.savedAt, true)}</time><button className="secondary-button small" onClick={() => onOpen(question)}>查看时间线<ChevronRight size={14} /></button></div>)}</section>
  </div>;
}

export default function App() {
  const [page, setPage] = useState<Page>('overview');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('全部');
  const [editor, setEditor] = useState<{ open: boolean; question: Question | null }>({ open: false, question: null });
  const [detail, setDetail] = useState<Question | null>(null);
  const [history, setHistory] = useState<Question | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  }, []);
  const refresh = useCallback(async () => {
    try { const [items, summary] = await Promise.all([api.questions(), api.stats()]); setQuestions(items); setStats(summary); }
    catch (error) { notify((error as Error).message, 'error'); }
    finally { setLoading(false); }
  }, [notify]);
  useEffect(() => { initApi().then(refresh).catch((error) => { notify(error.message, 'error'); setLoading(false); }); }, [refresh, notify]);

  const filtered = useMemo(() => questions.filter((q) => {
    const matchesSubject = subject === '全部' || q.subject === subject;
    const text = `${q.title} ${q.content} ${q.chapter} ${q.tags.join(' ')}`.toLowerCase();
    return matchesSubject && text.includes(search.toLowerCase());
  }), [questions, search, subject]);
  const dueQuestions = useMemo(() => questions.filter((q) => q.mastery !== '已掌握' && new Date(q.nextReviewAt) <= new Date(Date.now() + 864e5)), [questions]);

  const reviewed = async (question: Question, mastery: string) => {
    try {
      const updated = await api.review(question.id, mastery);
      setQuestions((old) => old.map((q) => q.id === updated.id ? updated : q));
      setDetail((old) => old?.id === updated.id ? updated : old);
      setStats(await api.stats());
      notify(mastery === '已掌握' ? '已标记掌握，7 天后再见' : mastery === '复习中' ? '已安排 3 天后复习' : '已加入明日复习');
    } catch (error) { notify((error as Error).message, 'error'); }
  };
  const remove = async (question: Question) => {
    if (!window.confirm(`确定删除“${question.title}”吗？相关历史版本也会一并删除。`)) return;
    try { await api.remove(question.id); setDetail(null); await refresh(); notify('错题已删除'); }
    catch (error) { notify((error as Error).message, 'error'); }
  };
  const openPage = (next: Page) => { setPage(next); if (next !== 'overview') setSubject('全部'); };

  return <div className="app-shell">
    <Sidebar page={page} onChange={openPage} stats={stats} />
    <main className="main-shell">
      <header className="topbar"><div className="breadcrumb"><span>我的学习空间</span><ChevronRight size={14} /><strong>{pageNames[page]}</strong></div><div className="topbar-actions"><label className="global-search"><Search size={17} /><input value={search} onChange={(e) => { setSearch(e.target.value); if (page !== 'overview') setPage('overview'); }} placeholder="搜索题目、知识点或标签…" /><kbd>⌘ K</kbd></label><button className="primary-button add-button" onClick={() => setEditor({ open: true, question: null })}><Plus size={18} />收录错题</button></div></header>
      <div className="page-content">
        {loading ? <div className="page-loading"><Loader2 size={25} className="spin" /><span>正在打开你的错题本…</span></div> : <>
          {page === 'overview' && <div className="overview-page">
            <section className="welcome"><div><span className="eyebrow">LEARN FROM EVERY MISTAKE</span><h1>把错题，变成进步的台阶。</h1><p> Frederick，今天也一起把模糊的知识变清晰。</p></div><div className="date-chip"><CalendarCheck2 size={18} /><span>{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())}</span></div></section>
            <section className="stats-grid">
              <div className="stat-card purple"><div className="stat-icon"><BookCheck size={21} /></div><div><span>错题总数</span><strong>{stats?.total ?? 0}<small>道</small></strong><p><TrendingUp size={13} />本周新增 {stats?.addedThisWeek ?? 0} 道</p></div></div>
              <div className="stat-card orange"><div className="stat-icon"><Clock3 size={21} /></div><div><span>待复习</span><strong>{stats?.due ?? 0}<small>道</small></strong><p>建议今天完成</p></div></div>
              <div className="stat-card blue"><div className="stat-icon"><Sparkles size={21} /></div><div><span>复习中</span><strong>{stats?.reviewing ?? 0}<small>道</small></strong><p>正在逐步掌握</p></div></div>
              <div className="stat-card green"><div className="stat-icon"><CheckCircle2 size={21} /></div><div><span>已掌握</span><strong>{stats?.mastered ?? 0}<small>道</small></strong><p>掌握率 {stats?.total ? Math.round(stats.mastered / stats.total * 100) : 0}%</p></div></div>
            </section>
            <div className="overview-columns"><section className="questions-panel"><div className="panel-heading"><div><h2>我的错题</h2><span>{filtered.length} 道记录</span></div><button className="filter-button"><Filter size={15} />最近更新</button></div>
              <div className="subject-tabs"><button className={subject === '全部' ? 'active' : ''} onClick={() => setSubject('全部')}>全部</button>{SUBJECTS.filter((s) => stats?.bySubject.some((item) => item.subject === s)).map((s) => <button key={s} className={subject === s ? 'active' : ''} onClick={() => setSubject(s)}>{s}</button>)}</div>
              <div className="question-list">{filtered.map((q) => <QuestionCard key={q.id} question={q} onClick={() => setDetail(q)} />)}{!filtered.length && <div className="empty-state"><Search size={30} /><h3>没有找到相关错题</h3><p>换个关键词或分类试试，也可以收录一道新错题。</p><button className="secondary-button" onClick={() => { setSearch(''); setSubject('全部'); }}>清除筛选</button></div>}</div>
            </section>
            <aside className="insights-column"><section className="review-card"><div className="review-card-top"><span><Clock3 size={18} /></span><b>今日复习</b></div><strong>{stats?.due ?? 0}<small>道</small></strong><p>温故而知新，<br />今天也是向前的一天。</p><button onClick={() => openPage('review')}>开始今日复习<ArrowRight size={16} /></button><div className="review-decoration"><span>✓</span><span>×</span><span>✓</span></div></section>
              <section className="distribution-card"><div className="panel-heading"><h2>科目分布</h2><button onClick={() => openPage('subjects')}><MoreHorizontal size={18} /></button></div><div className="distribution-list">{stats?.bySubject.slice(0, 5).map(({ subject: name, count }) => <div key={name}><div><span style={{ color: subjectColors[name] }}>{name}</span><b>{count} 道</b></div><div className="progress-track"><span style={{ width: `${Math.max(8, count / Math.max(stats.total, 1) * 100)}%`, background: subjectColors[name] }} /></div></div>)}</div><button className="text-link" onClick={() => openPage('subjects')}>查看全部分类<ChevronRight size={14} /></button></section>
              <section className="quick-capture"><div><Camera size={20} /></div><span><strong>遇到新错题？</strong><small>拍照收录，只需几秒钟</small></span><button onClick={() => setEditor({ open: true, question: null })}><Plus size={18} /></button></section>
            </aside></div>
          </div>}
          {page === 'review' && <div className="review-page"><div className="page-title-row"><div><span className="eyebrow">DAILY REVIEW</span><h1>今日复习</h1><p>不追求一次做对，追求每一次都更理解。</p></div><div className="review-progress-ring"><strong>{stats?.due ?? 0}</strong><span>道待复习</span></div></div>
            <div className="review-banner"><div><GraduationCap size={25} /></div><p><strong>主动回忆比重复阅读更有效</strong><span>打开题目后先独立思考，再展开答案核对，最后按真实感受标记掌握程度。</span></p></div>
            <section className="review-list"><div className="panel-heading"><div><h2>今天的复习清单</h2><span>{dueQuestions.length} 道</span></div></div>{dueQuestions.map((q) => <QuestionCard key={q.id} question={q} onClick={() => setDetail(q)} onReview={(mastery) => reviewed(q, mastery)} />)}{!dueQuestions.length && <div className="empty-state celebration"><CheckCircle2 size={38} /><h3>今天的复习全部完成</h3><p>做得很好！去整理新错题，或提前回顾其他内容吧。</p><button className="primary-button" onClick={() => openPage('overview')}>查看全部错题</button></div>}</section>
          </div>}
          {page === 'subjects' && <div className="subjects-page"><div className="page-title-row"><div><span className="eyebrow">KNOWLEDGE MAP</span><h1>按科目，看见知识全貌</h1><p>从科目到章节，从错误类型到掌握程度，建立自己的知识地图。</p></div></div><div className="subject-grid">{SUBJECTS.map((name) => { const Icon = subjectIcons[name]; const items = questions.filter((q) => q.subject === name); const mastered = items.filter((q) => q.mastery === '已掌握').length; return <button className="subject-card" key={name} onClick={() => { setSubject(name); setPage('overview'); }} style={{ '--subject-color': subjectColors[name] } as React.CSSProperties}><div className="subject-card-icon"><Icon size={25} /></div><div className="subject-card-title"><h2>{name}</h2><ChevronRight size={18} /></div><strong>{items.length}<small>道错题</small></strong><div className="progress-track"><span style={{ width: `${items.length ? mastered / items.length * 100 : 0}%` }} /></div><p>{items.length ? `已掌握 ${mastered} 道 · 复习中 ${items.filter((q) => q.mastery === '复习中').length} 道` : '还没有收录错题'}</p></button>; })}</div>
            <section className="error-analysis"><div className="section-heading"><div><CircleAlert size={20} /><h2>错因分布</h2></div><span>找到高频失分点，比刷更多题更重要</span></div><div className="error-bars">{['概念不清', '计算失误', '审题偏差', '方法不会', '知识遗忘', '表达不规范'].map((type, index) => { const count = questions.filter((q) => q.errorType === type).length; const max = Math.max(1, ...questions.map((q) => questions.filter((x) => x.errorType === q.errorType).length)); return <div key={type}><span>{type}</span><div className="progress-track"><i style={{ width: `${count / max * 100}%` }} /></div><b>{count}</b></div>; })}</div></section>
          </div>}
          {page === 'history' && <HistoryCenter questions={questions} onOpen={setHistory} />}
          {page === 'integrations' && <Integrations notify={notify} />}
        </>}
      </div>
    </main>
    {editor.open && <QuestionEditor key={editor.question?.id || 'new'} question={editor.question} onClose={() => setEditor({ open: false, question: null })} onError={(message) => notify(message, 'error')} onSaved={async (saved) => { setEditor({ open: false, question: null }); await refresh(); notify(editor.question ? '更改已保存，并生成历史版本' : '错题收录成功'); setDetail(saved); }} />}
    {detail && <QuestionDetail question={detail} onClose={() => setDetail(null)} onEdit={() => { setEditor({ open: true, question: detail }); setDetail(null); }} onHistory={() => { setHistory(detail); setDetail(null); }} onDelete={() => remove(detail)} onReview={(mastery) => reviewed(detail, mastery)} />}
    {history && <HistoryModal question={history} onClose={() => setHistory(null)} onError={(message) => notify(message, 'error')} onRolledBack={async (updated) => { setHistory(null); await refresh(); setDetail(updated); notify('已恢复历史版本，当前内容也已备份'); }} />}
    <Toast toast={toast} onClose={() => setToast(null)} />
  </div>;
}
