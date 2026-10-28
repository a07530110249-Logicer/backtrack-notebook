import { useState } from 'react';
import { BookOpenCheck, CalendarDays, Check, ChevronDown, Clock3, Edit3, Eye, EyeOff, History, Image as ImageIcon, RotateCcw, Tag, Trash2, X } from 'lucide-react';
import type { Question } from '../types';
import { formatDate, reviewLabel, subjectColors } from '../utils';

interface Props {
  question: Question;
  onClose: () => void;
  onEdit: () => void;
  onHistory: () => void;
  onDelete: () => void;
  onReview: (mastery: string) => void;
}

export default function QuestionDetail({ question, onClose, onEdit, onHistory, onDelete, onReview }: Props) {
  const [answerVisible, setAnswerVisible] = useState(false);
  const color = subjectColors[question.subject] || '#7566d7';
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="detail-modal">
      <header className="detail-topbar"><div className="detail-breadcrumb"><span style={{ background: color }} />{question.subject}<b>/</b>{question.chapter || '未分章节'}</div><div><button className="icon-button" title="版本历史" onClick={onHistory}><History size={19} /></button><button className="icon-button" title="编辑" onClick={onEdit}><Edit3 size={19} /></button><button className="icon-button danger" title="删除" onClick={onDelete}><Trash2 size={19} /></button><button className="icon-button" onClick={onClose}><X size={21} /></button></div></header>
      <div className="detail-scroll">
        <div className="detail-heading"><div className="badges"><span className={`mastery-badge ${question.mastery}`}>{question.mastery}</span><span className="soft-badge">{question.difficulty}</span><span className="soft-badge">{question.errorType}</span></div><h1>{question.title}</h1><div className="detail-meta"><span><CalendarDays size={14} />收录于 {formatDate(question.createdAt)}</span><span><RotateCcw size={14} />已复习 {question.reviewCount} 次</span><span><Clock3 size={14} />{reviewLabel(question.nextReviewAt, question.mastery)}</span></div></div>
        {question.image && <figure className="detail-image"><img src={question.image} alt="错题原始照片" /><figcaption><ImageIcon size={14} />原始题目照片 · {question.source}</figcaption></figure>}
        <section className="detail-section"><h2><span>01</span>题目内容</h2><p className="preserve-lines">{question.content}</p></section>
        <section className={`detail-section answer-section ${answerVisible ? 'revealed' : ''}`}><h2><span>02</span>正确答案与解析<button onClick={() => setAnswerVisible(!answerVisible)}>{answerVisible ? <EyeOff size={15} /> : <Eye size={15} />}{answerVisible ? '收起答案' : '先回忆，再看答案'}</button></h2>{answerVisible ? <p className="preserve-lines">{question.answer || '暂未填写答案'}</p> : <button className="answer-cover" onClick={() => setAnswerVisible(true)}><BookOpenCheck size={25} /><strong>先在心里复述解题思路</strong><span>点击查看答案与关键步骤</span><ChevronDown size={18} /></button>}</section>
        <section className="detail-section reflection"><h2><span>03</span>我的错因复盘</h2><p className="preserve-lines">{question.analysis || '还没有写下复盘，点击编辑补充吧。'}</p></section>
        {!!question.tags?.length && <div className="detail-tags"><Tag size={15} />{question.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
      </div>
      <footer className="review-footer"><div><strong>这次复习，感觉怎么样？</strong><span>根据反馈自动安排下一次复习</span></div><div className="review-actions"><button onClick={() => onReview('未掌握')}><RotateCcw size={16} />仍需巩固</button><button onClick={() => onReview('复习中')}><Clock3 size={16} />基本理解</button><button className="mastered" onClick={() => onReview('已掌握')}><Check size={16} />已经掌握</button></div></footer>
    </section>
  </div>;
}
