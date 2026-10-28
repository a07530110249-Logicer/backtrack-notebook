import { useEffect, useState } from 'react';
import { Check, Clock3, GitCommitVertical, Loader2, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { api } from '../api';
import type { Question, Revision } from '../types';
import { formatDate } from '../utils';

interface Props { question: Question; onClose: () => void; onRolledBack: (q: Question) => void; onError: (message: string) => void }

export default function HistoryModal({ question, onClose, onRolledBack, onError }: Props) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  useEffect(() => { api.revisions(question.id).then(setRevisions).catch((e) => onError(e.message)).finally(() => setLoading(false)); }, [question.id]);
  const rollback = async (revision: Revision) => {
    if (!window.confirm(`确定回滚到 ${formatDate(revision.savedAt, true)} 的版本吗？当前内容也会保留在历史记录中。`)) return;
    setWorking(revision.id);
    try { onRolledBack(await api.rollback(question.id, revision.id)); }
    catch (error) { onError((error as Error).message); }
    finally { setWorking(''); }
  };
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="history-modal">
      <header className="modal-header"><div><span className="eyebrow">VERSION HISTORY</span><h2>版本回滚</h2><p>{question.title}</p></div><button className="icon-button" onClick={onClose}><X size={21} /></button></header>
      <div className="history-notice"><ShieldCheck size={18} /><span>每次编辑都会留下快照。回滚不是删除，你仍能恢复到回滚前的状态。</span></div>
      <div className="timeline">
        {loading ? <div className="center-loading"><Loader2 className="spin" />正在读取历史版本</div> : revisions.map((revision, index) => <article className="revision" key={revision.id}>
          <div className="revision-line"><span>{index === 0 ? <Check size={14} /> : <GitCommitVertical size={15} />}</span></div>
          <div className="revision-content"><div className="revision-top"><div><strong>{revision.summary}</strong>{index === 0 && <b>当前版本</b>}</div><time><Clock3 size={13} />{formatDate(revision.savedAt, true)}</time></div>
            <h3>{revision.snapshot.title}</h3><p>{revision.snapshot.analysis || revision.snapshot.content || '暂无文字内容'}</p>
            <div className="revision-meta"><span>{revision.snapshot.subject}</span><span>{revision.snapshot.errorType}</span><span>{revision.snapshot.mastery}</span></div>
          </div>
          {index !== 0 && <button className="rollback-button" disabled={!!working} onClick={() => rollback(revision)}>{working === revision.id ? <Loader2 size={15} className="spin" /> : <RotateCcw size={15} />}恢复此版本</button>}
        </article>)}
      </div>
      <footer className="modal-footer"><span>共 {revisions.length} 个历史版本</span><button className="secondary-button" onClick={onClose}>完成</button></footer>
    </section>
  </div>;
}
