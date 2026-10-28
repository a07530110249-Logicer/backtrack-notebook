import { BookOpen, Boxes, Clock3, History, LayoutGrid, NotebookPen, PlugZap, SearchCheck, Settings2 } from 'lucide-react';
import type { Page, Stats } from '../types';

interface Props {
  page: Page;
  onChange: (page: Page) => void;
  stats: Stats | null;
}

const nav = [
  { id: 'overview' as Page, label: '全部错题', icon: LayoutGrid },
  { id: 'review' as Page, label: '今日复习', icon: Clock3, badge: true },
  { id: 'subjects' as Page, label: '科目分类', icon: Boxes },
  { id: 'history' as Page, label: '版本回滚', icon: History },
];

export default function Sidebar({ page, onChange, stats }: Props) {
  return <aside className="sidebar">
    <div className="brand" onClick={() => onChange('overview')} role="button" tabIndex={0}>
      <div className="brand-mark"><NotebookPen size={23} strokeWidth={2.2} /></div>
      <div><strong>回溯</strong><span>BACKTRACK</span></div>
    </div>
    <div className="nav-caption">我的学习空间</div>
    <nav className="main-nav">
      {nav.map(({ id, label, icon: Icon, badge }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => onChange(id)}>
        <Icon size={19} /><span>{label}</span>{badge && !!stats?.due && <b>{stats.due}</b>}
      </button>)}
    </nav>
    <div className="nav-caption second">连接与扩展</div>
    <nav className="main-nav">
      <button className={page === 'integrations' ? 'active' : ''} onClick={() => onChange('integrations')}><PlugZap size={19} /><span>集成接口</span><i className="status-dot" /></button>
    </nav>
    <div className="sidebar-spacer" />
    <div className="sidebar-tip">
      <div className="tip-icon"><SearchCheck size={19} /></div>
      <strong>小步复盘，持续进步</strong>
      <p>今天已为你整理好<br />{stats?.due ?? 0} 道待复习错题</p>
      <button onClick={() => onChange('review')}>开始复习 <span>→</span></button>
    </div>
    <div className="profile">
      <div className="avatar">F</div>
      <div><strong>Frederick</strong><span>本地学习空间</span></div>
      <Settings2 size={17} />
    </div>
  </aside>;
}
