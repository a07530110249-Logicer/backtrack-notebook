import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowRight, Download, Grid3X3, Link2, Loader2, Plus, Save, StickyNote, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { Board, BoardEdge, BoardNode, BoardSummary, Question } from '../types';

interface Props {
  questions: Question[];
  onOpenQuestion: (question: Question) => void;
  notify: (message: string, type?: 'success' | 'error') => void;
}

function edgePoints(from: BoardNode, to: BoardNode) {
  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (!dx && !dy) return { x1: fromX, y1: fromY, x2: toX, y2: toY };
  const fromScale = Math.min((from.width / 2 + 3) / Math.abs(dx || 0.0001), (from.height / 2 + 3) / Math.abs(dy || 0.0001));
  const toScale = Math.min((to.width / 2 + 5) / Math.abs(dx || 0.0001), (to.height / 2 + 5) / Math.abs(dy || 0.0001));
  return {
    x1: fromX + dx * fromScale,
    y1: fromY + dy * fromScale,
    x2: toX - dx * toScale,
    y2: toY - dy * toScale,
  };
}

export default function Whiteboard({ questions, onOpenQuestion, notify }: Props) {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [edges, setEdges] = useState<BoardEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [concept, setConcept] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [fromNode, setFromNode] = useState('');
  const [selectedNode, setSelectedNode] = useState('');
  const [selectedEdge, setSelectedEdge] = useState('');
  const nodesRef = useRef(nodes); nodesRef.current = nodes;
  const edgesRef = useRef(edges); edgesRef.current = edges;
  const drag = useRef<{ id: string; startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null);
  const activeNode = nodes.find((node) => node.id === selectedNode);
  const activeEdge = edges.find((edge) => edge.id === selectedEdge);

  const clearSelection = () => { setSelectedNode(''); setSelectedEdge(''); };
  const openBoard = async (id: string) => {
    setLoading(true);
    clearSelection();
    setConnecting(false);
    setFromNode('');
    try {
      const data = await api.board(id);
      setBoard(data);
      setNodes(data.nodes);
      setEdges(data.edges);
    } catch (error) { notify((error as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.boards().then(async (items) => {
      setBoards(items);
      if (items[0]) await openBoard(items[0].id);
      else setLoading(false);
    }).catch((error) => { notify(error.message, 'error'); setLoading(false); });
  }, []);

  const save = async (nextNodes = nodesRef.current, nextEdges = edgesRef.current) => {
    if (!board) return;
    setSaving(true);
    try {
      const saved = await api.saveBoard(board.id, { name: board.name, nodes: nextNodes, edges: nextEdges });
      setBoard(saved);
      setBoards((old) => old.map((item) => item.id === saved.id ? { ...item, name: saved.name, updatedAt: saved.updatedAt, nodeCount: saved.nodes.length, edgeCount: saved.edges.length } : item));
    } catch (error) { notify((error as Error).message, 'error'); }
    finally { setSaving(false); }
  };

  const create = async () => {
    try {
      const created = await api.createBoard(newName || '知识梳理');
      setBoards((old) => [{ id: created.id, name: created.name, updatedAt: created.updatedAt, nodeCount: 0, edgeCount: 0 }, ...old]);
      setBoard(created);
      setNodes([]);
      setEdges([]);
      setNewName('');
      clearSelection();
    } catch (error) { notify((error as Error).message, 'error'); }
  };

  const removeBoard = async () => {
    if (!board || !window.confirm(`删除白板“${board.name}”？不会删除其中的错题。`)) return;
    try {
      await api.removeBoard(board.id);
      const rest = boards.filter((item) => item.id !== board.id);
      setBoards(rest);
      setBoard(null);
      setNodes([]);
      setEdges([]);
      clearSelection();
      if (rest[0]) await openBoard(rest[0].id);
    } catch (error) { notify((error as Error).message, 'error'); }
  };

  const addNode = (text: string, qid?: string) => {
    if (!board || !text.trim()) return;
    const index = nodes.length;
    const node: BoardNode = {
      id: crypto.randomUUID(), type: 'text', text: text.trim(),
      x: 60 + (index % 4) * 275, y: 60 + Math.floor(index / 4) * 185,
      width: 240, height: 140, ...(qid ? { questionId: qid } : {}),
    };
    const next = [...nodes, node];
    setNodes(next);
    setSelectedNode(node.id);
    setSelectedEdge('');
    save(next);
  };

  const cardClick = (node: BoardNode) => {
    if (drag.current?.moved) return;
    setSelectedNode(node.id);
    setSelectedEdge('');
    if (!connecting) return;
    if (!fromNode) { setFromNode(node.id); return; }
    if (fromNode === node.id) { setFromNode(''); return; }
    if (!edges.some((edge) => edge.fromNode === fromNode && edge.toNode === node.id)) {
      const edge: BoardEdge = { id: crypto.randomUUID(), fromNode, toNode: node.id, toEnd: 'arrow', label: '' };
      const next = [...edges, edge];
      setEdges(next);
      setSelectedEdge(edge.id);
      setSelectedNode('');
      save(nodes, next);
    }
    setFromNode('');
    setConnecting(false);
  };

  const pointerDown = (event: React.PointerEvent, node: BoardNode) => {
    if (event.button !== 0) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { id: node.id, startX: event.clientX, startY: event.clientY, x: node.x, y: node.y, moved: false };
  };
  const pointerMove = (event: React.PointerEvent) => {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true;
    setNodes((old) => old.map((node) => node.id === current.id ? { ...node, x: Math.max(0, Math.round(current.x + dx)), y: Math.max(0, Math.round(current.y + dy)) } : node));
  };
  const pointerUp = () => {
    if (drag.current?.moved) save();
    window.setTimeout(() => { drag.current = null; }, 0);
  };

  const arrange = () => {
    const next = nodes.map((node, index) => ({ ...node, x: 60 + (index % 4) * 275, y: 60 + Math.floor(index / 4) * 185 }));
    setNodes(next);
    save(next);
  };
  const removeNode = () => {
    if (!selectedNode) return;
    const nextNodes = nodes.filter((node) => node.id !== selectedNode);
    const nextEdges = edges.filter((edge) => edge.fromNode !== selectedNode && edge.toNode !== selectedNode);
    setNodes(nextNodes);
    setEdges(nextEdges);
    clearSelection();
    save(nextNodes, nextEdges);
  };
  const removeEdge = () => {
    if (!selectedEdge) return;
    const next = edges.filter((edge) => edge.id !== selectedEdge);
    setEdges(next);
    clearSelection();
    save(nodes, next);
  };
  const reverseEdge = () => {
    const next = edges.map((edge) => edge.id === selectedEdge ? { ...edge, fromNode: edge.toNode, toNode: edge.fromNode } : edge);
    setEdges(next);
    save(nodes, next);
  };
  const exportCanvas = () => {
    if (!board) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${board.name}.canvas`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="board-page simple-page">
    <div className="page-title-row">
      <div><h1>知识白板</h1><p>概念可以独立整理；用有方向的箭头说明先后、因果或推导关系。</p></div>
      {board && <div className="board-actions">
        <button className={`secondary-button ${connecting ? 'selected' : ''}`} onClick={() => { setConnecting(!connecting); setFromNode(''); clearSelection(); }}><Link2 size={15} />{connecting ? (fromNode ? '选择箭头终点' : '选择箭头起点') : '添加箭头'}</button>
        <button className="secondary-button" onClick={arrange}><Grid3X3 size={15} />整理</button>
        <button className="secondary-button" onClick={exportCanvas}><Download size={15} />导出 .canvas</button>
        <button className="primary-button" disabled={saving} onClick={() => save()}>{saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}保存</button>
      </div>}
    </div>
    <div className="board-layout">
      <aside className="board-sidebar">
        <div className="board-list-heading"><span>我的白板</span></div>
        {boards.map((item) => <button className={board?.id === item.id ? 'active' : ''} key={item.id} onClick={() => openBoard(item.id)}><span>{item.name}</span><small>{item.nodeCount} 张卡片 · {item.edgeCount} 条关系</small></button>)}
        <div className="new-board"><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="新白板名称" /><button title="创建白板" onClick={create}><Plus size={15} /></button></div>
        {board && <div className="node-palette">
          <label>添加概念（不需要关联错题）</label>
          <div><input value={concept} onChange={(event) => setConcept(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { addNode(concept); setConcept(''); } }} placeholder="如：极限、死锁、光合作用" /><button title="添加概念" onClick={() => { addNode(concept); setConcept(''); }}><StickyNote size={15} /></button></div>
          <label>添加错题</label>
          <div><select value={questionId} onChange={(event) => setQuestionId(event.target.value)}><option value="">选择一道错题</option>{questions.map((question) => <option key={question.id} value={question.id}>{question.title}</option>)}</select><button title="添加错题" disabled={!questionId} onClick={() => addNode(questions.find((question) => question.id === questionId)?.title || '', questionId)}><Plus size={15} /></button></div>
          <p>单击选中并编辑，拖动调整位置。双击错题卡片可打开原题。</p>
        </div>}
      </aside>
      <section className="board-workspace">
        {board ? <>
          <header><input value={board.name} onChange={(event) => setBoard({ ...board, name: event.target.value })} onBlur={() => save()} /><span>{nodes.length} 张卡片 · {edges.length} 条关系</span><div><button className="icon-button danger" title="删除白板" onClick={removeBoard}><Trash2 size={17} /></button></div></header>
          {(activeNode || activeEdge) && <div className="board-selection-bar">
            {activeNode && <><span className="selection-kind">{activeNode.questionId ? '错题卡片' : '概念卡片'}</span><input aria-label="卡片内容" value={activeNode.text} onChange={(event) => setNodes((old) => old.map((node) => node.id === activeNode.id ? { ...node, text: event.target.value } : node))} onBlur={() => save()} /><button className="text-link danger-text" onClick={removeNode}><Trash2 size={13} />移除卡片</button></>}
            {activeEdge && <><span className="selection-kind"><ArrowRight size={14} />关系</span><input aria-label="关系说明" value={activeEdge.label || ''} onChange={(event) => setEdges((old) => old.map((edge) => edge.id === activeEdge.id ? { ...edge, label: event.target.value } : edge))} onBlur={() => save()} placeholder="说明箭头含义，如：先修知识、导致、推导为" /><button className="text-link" onClick={reverseEdge}><ArrowLeftRight size={13} />反转方向</button><button className="text-link danger-text" onClick={removeEdge}><Trash2 size={13} />删除</button></>}
          </div>}
          <div className="board-scroll">
            {loading ? <div className="center-loading"><Loader2 className="spin" />正在打开白板</div> : <div className="board-canvas">
              <svg width="2400" height="1600" aria-label="知识关系连线">
                <defs>
                  <marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L9,4.5 L0,9 z" fill="#718078" /></marker>
                  <marker id="arrow-selected" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L9,4.5 L0,9 z" fill="#536b63" /></marker>
                </defs>
                {edges.map((edge) => {
                  const from = nodes.find((node) => node.id === edge.fromNode);
                  const to = nodes.find((node) => node.id === edge.toNode);
                  if (!from || !to) return null;
                  const { x1, y1, x2, y2 } = edgePoints(from, to);
                  const color = selectedEdge === edge.id ? '#536b63' : '#718078';
                  const labelX = (x1 + x2) / 2;
                  const labelY = (y1 + y2) / 2;
                  return <g key={edge.id} className="board-edge" onClick={(event) => { event.stopPropagation(); setSelectedEdge(edge.id); setSelectedNode(''); }}>
                    <line className="edge-hit-area" x1={x1} y1={y1} x2={x2} y2={y2} />
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={selectedEdge === edge.id ? 2.5 : 2} markerEnd={`url(#${selectedEdge === edge.id ? 'arrow-selected' : 'arrow'})`} />
                    {edge.label && <g className="edge-label"><rect x={labelX - Math.min(110, edge.label.length * 6.5 + 10)} y={labelY - 12} width={Math.min(220, edge.label.length * 13 + 20)} height="24" rx="5" /><text x={labelX} y={labelY + 4} textAnchor="middle">{edge.label.length > 16 ? `${edge.label.slice(0, 16)}…` : edge.label}</text><title>{edge.label}</title></g>}
                  </g>;
                })}
              </svg>
              {nodes.map((node) => <article key={node.id} className={`board-node ${selectedNode === node.id ? 'selected' : ''} ${fromNode === node.id ? 'connecting' : ''}`} style={{ left: node.x, top: node.y, width: node.width, height: node.height }} onPointerDown={(event) => pointerDown(event, node)} onPointerMove={pointerMove} onPointerUp={pointerUp} onClick={() => cardClick(node)} onDoubleClick={(event) => { event.stopPropagation(); if (node.questionId) { const question = questions.find((item) => item.id === node.questionId); if (question) onOpenQuestion(question); } }}><span>{node.questionId ? '错题' : '概念'}</span><p>{node.text}</p></article>)}
              {!nodes.length && <div className="board-empty"><StickyNote size={28} /><p>先添加一个概念，不需要先收录错题。</p><button className="secondary-button" onClick={() => addNode('新概念')}>添加第一个概念</button></div>}
            </div>}
          </div>
        </> : <div className="empty-state"><p>创建一块白板，从概念或错题开始整理。</p><button className="primary-button" onClick={create}>新建白板</button></div>}
      </section>
    </div>
  </div>;
}
