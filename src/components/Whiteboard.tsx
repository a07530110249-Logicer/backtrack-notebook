import { useEffect, useRef, useState } from 'react';
import { Download, Grid3X3, Link2, Loader2, Plus, Save, StickyNote, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { Board, BoardNode, BoardSummary, Question } from '../types';

interface Props { questions: Question[]; onOpenQuestion: (question: Question) => void; notify: (message: string, type?: 'success' | 'error') => void }

export default function Whiteboard({ questions, onOpenQuestion, notify }: Props) {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [edges, setEdges] = useState<Board['edges']>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [concept, setConcept] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [fromNode, setFromNode] = useState('');
  const [selected, setSelected] = useState('');
  const nodesRef = useRef(nodes); nodesRef.current = nodes;
  const edgesRef = useRef(edges); edgesRef.current = edges;
  const drag = useRef<{ id: string; startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null);

  const openBoard = async (id: string) => {
    setLoading(true);
    try { const data = await api.board(id); setBoard(data); setNodes(data.nodes); setEdges(data.edges); }
    catch (e) { notify((e as Error).message, 'error'); } finally { setLoading(false); }
  };
  useEffect(() => {
    api.boards().then(async (items) => { setBoards(items); if (items[0]) await openBoard(items[0].id); else setLoading(false); }).catch((e) => { notify(e.message, 'error'); setLoading(false); });
  }, []);
  const save = async (nextNodes = nodesRef.current, nextEdges = edgesRef.current) => {
    if (!board) return;
    setSaving(true);
    try { const saved = await api.saveBoard(board.id, { name: board.name, nodes: nextNodes, edges: nextEdges }); setBoard(saved); setBoards((old) => old.map((item) => item.id === saved.id ? { ...item, name: saved.name, updatedAt: saved.updatedAt, nodeCount: saved.nodes.length, edgeCount: saved.edges.length } : item)); }
    catch (e) { notify((e as Error).message, 'error'); } finally { setSaving(false); }
  };
  const create = async () => {
    try { const created = await api.createBoard(newName || '知识梳理'); setBoards((old) => [{ id: created.id, name: created.name, updatedAt: created.updatedAt, nodeCount: 0, edgeCount: 0 }, ...old]); setBoard(created); setNodes([]); setEdges([]); setNewName(''); }
    catch (e) { notify((e as Error).message, 'error'); }
  };
  const removeBoard = async () => {
    if (!board || !window.confirm(`删除白板“${board.name}”？不会删除其中的错题。`)) return;
    await api.removeBoard(board.id); const rest = boards.filter((item) => item.id !== board.id); setBoards(rest); setBoard(null); setNodes([]); setEdges([]); if (rest[0]) openBoard(rest[0].id);
  };
  const addNode = (text: string, qid?: string) => {
    if (!board || !text.trim()) return;
    const index = nodes.length;
    const next = [...nodes, { id: crypto.randomUUID(), type: 'text' as const, text: text.trim(), x: 60 + (index % 4) * 275, y: 60 + Math.floor(index / 4) * 185, width: 240, height: 140, ...(qid ? { questionId: qid } : {}) }];
    setNodes(next); save(next);
  };
  const cardClick = (node: BoardNode) => {
    if (drag.current?.moved) return;
    setSelected(node.id);
    if (!connecting) return;
    if (!fromNode) { setFromNode(node.id); return; }
    if (fromNode === node.id) { setFromNode(''); return; }
    if (!edges.some((edge) => edge.fromNode === fromNode && edge.toNode === node.id)) {
      const next = [...edges, { id: crypto.randomUUID(), fromNode, toNode: node.id, toEnd: 'arrow' as const }]; setEdges(next); save(nodes, next);
    }
    setFromNode(''); setConnecting(false);
  };
  const pointerDown = (e: React.PointerEvent, node: BoardNode) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: node.id, startX: e.clientX, startY: e.clientY, x: node.x, y: node.y, moved: false };
  };
  const pointerMove = (e: React.PointerEvent) => {
    const current = drag.current; if (!current) return;
    const dx = e.clientX - current.startX, dy = e.clientY - current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true;
    setNodes((old) => old.map((node) => node.id === current.id ? { ...node, x: Math.max(0, Math.round(current.x + dx)), y: Math.max(0, Math.round(current.y + dy)) } : node));
  };
  const pointerUp = () => { if (drag.current?.moved) save(); window.setTimeout(() => { drag.current = null; }, 0); };
  const arrange = () => { const next = nodes.map((node, index) => ({ ...node, x: 60 + (index % 4) * 275, y: 60 + Math.floor(index / 4) * 185 })); setNodes(next); save(next); };
  const removeNode = () => { if (!selected) return; const nextNodes = nodes.filter((node) => node.id !== selected); const nextEdges = edges.filter((edge) => edge.fromNode !== selected && edge.toNode !== selected); setNodes(nextNodes); setEdges(nextEdges); setSelected(''); save(nextNodes, nextEdges); };
  const exportCanvas = () => {
    if (!board) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${board.name}.canvas`; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="board-page simple-page"><div className="page-title-row"><div><h1>知识白板</h1><p>把错题和概念放在一起，拖动位置，用连线说明关系。</p></div>{board && <div className="board-actions"><button className={`secondary-button ${connecting ? 'selected' : ''}`} onClick={() => { setConnecting(!connecting); setFromNode(''); }}><Link2 size={15} />{connecting ? (fromNode ? '选择目标卡片' : '选择起点卡片') : '连线'}</button><button className="secondary-button" onClick={arrange}><Grid3X3 size={15} />整理</button><button className="secondary-button" onClick={exportCanvas}><Download size={15} />导出 .canvas</button><button className="primary-button" disabled={saving} onClick={() => save()}>{saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}保存</button></div>}</div>
    <div className="board-layout"><aside className="board-sidebar"><div className="board-list-heading"><span>我的白板</span></div>{boards.map((item) => <button className={board?.id === item.id ? 'active' : ''} key={item.id} onClick={() => openBoard(item.id)}><span>{item.name}</span><small>{item.nodeCount} 张卡片</small></button>)}<div className="new-board"><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新白板名称" /><button onClick={create}><Plus size={15} /></button></div>
      {board && <div className="node-palette"><label>添加概念</label><div><input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="如：牛顿第二定律" /><button onClick={() => { addNode(concept); setConcept(''); }}><StickyNote size={15} /></button></div><label>添加错题</label><div><select value={questionId} onChange={(e) => setQuestionId(e.target.value)}><option value="">选择一道错题</option>{questions.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</select><button disabled={!questionId} onClick={() => addNode(questions.find((q) => q.id === questionId)?.title || '', questionId)}><Plus size={15} /></button></div><p>双击错题卡片可打开原题。拖动只改变白板布局，不修改原笔记。</p></div>}
    </aside><section className="board-workspace">{board ? <><header><input value={board.name} onChange={(e) => setBoard({ ...board, name: e.target.value })} onBlur={() => save()} /><span>{nodes.length} 张卡片 · {edges.length} 条连线</span><div>{selected && <button className="icon-button danger" title="移除选中卡片" onClick={removeNode}><Trash2 size={16} /></button>}<button className="icon-button danger" title="删除白板" onClick={removeBoard}><Trash2 size={17} /></button></div></header><div className="board-scroll">{loading ? <div className="center-loading"><Loader2 className="spin" />正在打开白板</div> : <div className="board-canvas"><svg width="2400" height="1600"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9aa2b1" /></marker></defs>{edges.map((edge) => { const from = nodes.find((n) => n.id === edge.fromNode), to = nodes.find((n) => n.id === edge.toNode); if (!from || !to) return null; const x1 = from.x + from.width / 2, y1 = from.y + from.height / 2, x2 = to.x + to.width / 2, y2 = to.y + to.height / 2; return <line key={edge.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9aa2b1" strokeWidth="2" markerEnd="url(#arrow)" />; })}</svg>{nodes.map((node) => <article key={node.id} className={`board-node ${selected === node.id ? 'selected' : ''} ${fromNode === node.id ? 'connecting' : ''}`} style={{ left: node.x, top: node.y, width: node.width, height: node.height }} onPointerDown={(e) => pointerDown(e, node)} onPointerMove={pointerMove} onPointerUp={pointerUp} onClick={() => cardClick(node)} onDoubleClick={() => { if (node.questionId) { const q = questions.find((item) => item.id === node.questionId); if (q) onOpenQuestion(q); } }}><span>{node.questionId ? '错题' : '概念'}</span><p>{node.text}</p></article>)}{!nodes.length && <div className="board-empty"><StickyNote size={28} /><p>从左侧添加一个概念或一道错题</p></div>}</div>}</div></> : <div className="empty-state"><p>创建一块白板，开始整理知识之间的关系。</p><button className="primary-button" onClick={create}>新建白板</button></div>}</section></div>
  </div>;
}
