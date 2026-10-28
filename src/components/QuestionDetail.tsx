import { useEffect, useState } from 'react';
import { BookOpenCheck, CalendarDays, Check, ChevronDown, Clock3, Edit3, Eye, EyeOff, History, Image as ImageIcon, RotateCcw, Trash2, X } from 'lucide-react';
import { api, assetUrl } from '../api';
import type { Question, ReviewEvent } from '../types';
import { formatDate, reviewLabel } from '../utils';

interface Props { question: Question; mode?: 'scheduled' | 'free'; onClose: () => void; onEdit: () => void; onHistory: () => void; onDelete: () => void; onReview: (mastery: string) => void }

export default function QuestionDetail({ question, mode = 'scheduled', onClose, onEdit, onHistory, onDelete, onReview }: Props) {
  const [answerVisible, setAnswerVisible] = useState(false);
  const [reviews, setReviews] = useState<ReviewEvent[]>([]);
  useEffect(() => { setAnswerVisible(false); api.reviews(question.id).then(setReviews).catch(() => setReviews([])); }, [question.id, question.reviewCount]);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="detail-modal">
      <header className="detail-topbar"><div className="detail-breadcrumb">{question.subject}<b>/</b>{question.chapter || '未分章节'}<b>/</b>已练习 {question.reviewCount} 次</div><div><button className="icon-button" title="版本历史" onClick={onHistory}><History size={19} /></button><button className="icon-button" title="编辑" onClick={onEdit}><Edit3 size={19} /></button><button className="icon-button danger" title="删除" onClick={onDelete}><Trash2 size={19} /></button><button className="icon-button" onClick={onClose}><X size={21} /></button></div></header>
      <div className="detail-scroll">
        <div className="detail-heading"><div className="badges"><span className={`mastery-badge ${question.mastery}`}>{question.mastery}</span><span className="soft-badge">{question.difficulty}</span><span className="soft-badge">{question.errorType}</span></div><h1>{question.title}</h1><div className="detail-meta"><span><CalendarDays size={14} />收录于 {formatDate(question.createdAt)}</span><span><Clock3 size={14} />{reviewLabel(question.nextReviewAt, question.mastery)}</span></div></div>
        {question.image && <figure className="detail-image"><img src={assetUrl(question.image)} alt="错题原始照片" /><figcaption><ImageIcon size={14} />原始题目照片 · {question.source}</figcaption></figure>}
        <section className="detail-section"><h2>题目</h2><p className="preserve-lines">{question.content}</p></section>
        <section className={`detail-section answer-section ${answerVisible ? 'revealed' : ''}`}><h2>答案与解析<button onClick={() => setAnswerVisible(!answerVisible)}>{answerVisible ? <EyeOff size={15} /> : <Eye size={15} />}{answerVisible ? '收起答案' : '显示答案'}</button></h2>{answerVisible ? <p className="preserve-lines">{question.answer || '暂未填写答案'}</p> : <button className="answer-cover" onClick={() => setAnswerVisible(true)}><BookOpenCheck size={24} /><strong>先独立回忆，再核对答案</strong><ChevronDown size={18} /></button>}</section>
        <section className="detail-section reflection"><h2>我的复盘</h2><p className="preserve-lines">{question.analysis || '还没有写下复盘，点击编辑补充吧。'}</p></section>
        <section className="practice-history"><h2>练习记录 <span>共 {question.reviewCount} 次</span></h2>{reviews.length ? <div>{reviews.slice(0, 8).map((review, index) => <p key={review.id}><span>第 {Math.max(1, question.reviewCount - index)} 次 · {review.mode === 'free' ? '自由练习' : '计划复习'}</span><b>{review.mastery}</b><time>{formatDate(review.reviewedAt, true)}</time></p>)}</div> : <p className="muted">早期的累计次数已保留；新的练习结果会逐次显示在这里。</p>}</section>
      </div>
      <footer className="review-footer"><div><strong>{mode === 'free' ? '自由练习，随时检验掌握情况' : '这次回忆得怎么样？'}</strong><span>每次反馈都会计入练习次数</span></div><div className="review-actions"><button onClick={() => onReview('未掌握')}><RotateCcw size={16} />仍需巩固</button><button onClick={() => onReview('复习中')}><Clock3 size={16} />基本理解</button><button className="mastered" onClick={() => onReview('已掌握')}><Check size={16} />已经掌握</button></div></footer>
    </section>
  </div>;
}
