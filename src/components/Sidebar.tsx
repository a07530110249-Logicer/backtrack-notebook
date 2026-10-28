import { Clock3, History, LayoutGrid, NotebookPen, PlugZap, Shapes } from 'lucide-react';
import type { Page, Stats } from '../types';
const nav = [
  { id: 'overview' as Page, label: '全部错题', icon: LayoutGrid },
  { id: 'review' as Page, label: '复习', icon: Clock3, badge: true },
  { id: 'boards' as Page, label: '知识白板', icon: Shapes },
  { id: 'history' as Page, label: '版本记录', icon: History },
];
export default function Sidebar({ page, onChange, stats }: { page: Page; onChange: (page: Page) => void; stats: Stats | null }) {
  return <aside className="sidebar"><div className="brand" onClick={() => onChange('overview')} role="button" tabIndex={0}><div className="brand-mark"><NotebookPen size={21} /></div><div><strong>回溯</strong><span>错题与复习</span></div></div><nav className="main-nav">{nav.map(({ id, label, icon: Icon, badge }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => onChange(id)}><Icon size={18} /><span>{label}</span>{badge && !!stats?.due && <b>{stats.due}</b>}</button>)}</nav><div className="sidebar-spacer" /><nav className="main-nav"><button className={page === 'integrations' ? 'active' : ''} onClick={() => onChange('integrations')}><PlugZap size={18} /><span>连接与接口</span></button></nav><div className="sidebar-note">本地优先 · 文件夹可迁移</div></aside>;
}
