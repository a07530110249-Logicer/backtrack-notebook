import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const ERROR_TYPES = ['概念不清', '计算失误', '审题偏差', '方法不会', '知识遗忘', '表达不规范', '其他'];
const MASTERIES = ['未掌握', '复习中', '已掌握'];
const DIFFICULTIES = ['基础', '中等', '困难'];
const nowIso = () => new Date().toISOString();
const text = (value, max = 10000) => String(value ?? '').trim().slice(0, max);

function svgNote(title, subtitle, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#fffdf8"/><rect x="70" y="55" width="760" height="490" rx="18" fill="none" stroke="${color}" stroke-width="3"/><path d="M110 170H790M110 270H790M110 370H790M110 470H790" stroke="#e7e3da" stroke-width="2"/><text x="110" y="135" font-family="Arial,sans-serif" font-size="40" font-weight="700" fill="#263449">${title}</text><text x="110" y="230" font-family="Arial,sans-serif" font-size="28" fill="#4f5b6c">${subtitle}</text><text x="110" y="330" font-family="Arial,sans-serif" font-size="26" fill="${color}">错因：公式适用条件没有核对</text><path d="M110 410L330 500M330 410L110 500" stroke="#e26757" stroke-width="8" stroke-linecap="round"/><text x="390" y="470" font-family="Arial,sans-serif" font-size="26" fill="#596579">先定义域，再变形，最后检验。</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function seedData() {
  const now = Date.now();
  const iso = (offset) => new Date(now + offset).toISOString();
  const questions = [
    { id: randomUUID(), title: '二次函数的最值与定义域', subject: '数学', chapter: '函数与导数', content: '已知 f(x)=x²-2ax+3 在区间 [0,2] 上的最小值为 2，求实数 a 的取值。', answer: '按对称轴 x=a 与区间 [0,2] 的位置分三类讨论，比较端点与顶点函数值。', analysis: '上次直接代入顶点，忽略了对称轴可能落在区间外。先画数轴分段，可避免漏解。', errorType: '方法不会', difficulty: '中等', mastery: '复习中', tags: ['二次函数', '分类讨论'], image: svgNote('二次函数 · 区间最值', 'f(x)=x²-2ax+3,  x∈[0,2]', '#7767d8'), createdAt: iso(-6 * 864e5), updatedAt: iso(-2 * 864e5), nextReviewAt: iso(0), reviewCount: 2, lastReviewedAt: iso(-2 * 864e5), source: '拍照导入' },
    { id: randomUUID(), title: '斜面模型中的摩擦力方向', subject: '物理', chapter: '相互作用与牛顿定律', content: '物块沿粗糙斜面向上减速滑动，分析物块受到的各力并求加速度。', answer: '重力竖直向下，支持力垂直斜面向上，滑动摩擦力沿斜面向下。', analysis: '摩擦力方向取决于相对运动趋势，不是固定指向斜面下方。', errorType: '概念不清', difficulty: '基础', mastery: '未掌握', tags: ['受力分析', '摩擦力'], image: svgNote('斜面受力分析', '先确定相对运动，再判断摩擦力方向', '#318b85'), createdAt: iso(-3 * 864e5), updatedAt: iso(-1 * 864e5), nextReviewAt: iso(-864e5), reviewCount: 1, lastReviewedAt: iso(-1 * 864e5), source: '手动整理' },
    { id: randomUUID(), title: '虚拟语气的时态回退', subject: '英语', chapter: 'Grammar · Subjunctive', content: 'If I ___ (know) the answer yesterday, I would have told you.', answer: 'had known。与过去事实相反的 if 条件句使用过去完成时。', analysis: '主句 would have done 提示与过去相反，从句要回退到 had done。', errorType: '知识遗忘', difficulty: '中等', mastery: '已掌握', tags: ['虚拟语气', '语法'], image: '', createdAt: iso(-15 * 864e5), updatedAt: iso(-4 * 864e5), nextReviewAt: iso(7 * 864e5), reviewCount: 4, lastReviewedAt: iso(-4 * 864e5), source: '外部知识库' },
    { id: randomUUID(), title: '离子方程式的电荷守恒', subject: '化学', chapter: '离子反应', content: '写出氯化铁溶液与氢氧化钠溶液反应的离子方程式。', answer: 'Fe³⁺ + 3OH⁻ = Fe(OH)₃↓', analysis: '配平后既检查原子个数，也检查两侧总电荷。', errorType: '表达不规范', difficulty: '基础', mastery: '复习中', tags: ['离子反应', '配平'], image: '', createdAt: iso(-8 * 864e5), updatedAt: iso(-5 * 864e5), nextReviewAt: iso(864e5), reviewCount: 1, lastReviewedAt: iso(-5 * 864e5), source: '拍照导入' },
  ];
  return { version: 2, questions, revisions: questions.map((q) => ({ id: randomUUID(), questionId: q.id, savedAt: q.updatedAt, summary: '首次收录', snapshot: { ...q } })), reviews: [], boards: [], integrations: defaultIntegrations() };
}

function defaultIntegrations() {
  return { cameraUrl: '', knowledgeSources: [], model: { enabled: false, baseUrl: 'http://127.0.0.1:11434/v1', apiKey: '', model: 'qwen3:4b' } };
}

function cleanQuestion(input, existing = {}) {
  const mastery = MASTERIES.includes(input.mastery) ? input.mastery : (existing.mastery || '未掌握');
  return {
    ...existing,
    title: text(input.title, 160) || '未命名错题',
    subject: text(input.subject, 80) || existing.subject || '未分类',
    chapter: text(input.chapter, 120), content: text(input.content), answer: text(input.answer), analysis: text(input.analysis),
    errorType: ERROR_TYPES.includes(input.errorType) ? input.errorType : text(input.errorType, 60) || existing.errorType || '其他',
    difficulty: DIFFICULTIES.includes(input.difficulty) ? input.difficulty : (existing.difficulty || '中等'), mastery,
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => text(tag, 30)).filter(Boolean).slice(0, 12) : (existing.tags || []),
    image: typeof input.image === 'string' && input.image.length < 20_000_000 ? input.image : (existing.image || ''),
    source: text(input.source, 80) || existing.source || '手动整理', updatedAt: nowIso(),
  };
}

function cleanIntegrations(input = {}, existing = defaultIntegrations()) {
  let sources = Array.isArray(input.knowledgeSources) ? input.knowledgeSources : existing.knowledgeSources;
  if (!Array.isArray(sources)) sources = [];
  sources = sources.map((source) => ({ id: text(source.id, 100) || randomUUID(), name: text(source.name, 100) || '未命名知识库', url: text(source.url, 2000), token: String(source.token || '').slice(0, 2000), enabled: source.enabled !== false })).filter((source) => source.url);
  const model = input.model || existing.model || {};
  return {
    cameraUrl: text(input.cameraUrl ?? existing.cameraUrl, 2000), knowledgeSources: sources,
    knowledgeUrl: '', knowledgeToken: '',
    model: { enabled: model.enabled === true, baseUrl: text(model.baseUrl, 2000) || 'http://127.0.0.1:11434/v1', apiKey: String(model.apiKey || '').slice(0, 2000), model: text(model.model, 160) || 'qwen3:4b' },
  };
}

export class NotebookStore {
  constructor(dataDir) {
    this.dataDir = path.resolve(dataDir);
    this.file = path.join(this.dataDir, 'notebook.json');
    this.attachmentsDir = path.join(this.dataDir, 'attachments');
    this.data = null;
    this.writeQueue = Promise.resolve();
  }

  async init({ seed = false } = {}) {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.attachmentsDir, { recursive: true });
    let changed = false;
    try {
      this.data = JSON.parse(await fs.readFile(this.file, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') await fs.rename(this.file, `${this.file}.corrupt-${Date.now()}`).catch(() => {});
      this.data = seed ? seedData() : { version: 2, questions: [], revisions: [], reviews: [], boards: [], integrations: defaultIntegrations() };
      changed = true;
    }
    for (const key of ['questions', 'revisions', 'reviews', 'boards']) {
      if (!Array.isArray(this.data[key])) { this.data[key] = []; changed = true; }
    }
    if (!this.data.integrations) { this.data.integrations = defaultIntegrations(); changed = true; }
    const legacy = this.data.integrations;
    if (!Array.isArray(legacy.knowledgeSources)) {
      legacy.knowledgeSources = legacy.knowledgeUrl ? [{ id: randomUUID(), name: '默认知识库', url: legacy.knowledgeUrl, token: legacy.knowledgeToken || '', enabled: true }] : [];
      changed = true;
    }
    if (!legacy.model) { legacy.model = defaultIntegrations().model; changed = true; }
    this.data.integrations = cleanIntegrations(legacy, defaultIntegrations());
    this.data.version = 2;
    changed = await this.materializeExistingImages() || changed;
    if (changed) await this.persist();
    return this;
  }

  async materializeExistingImages() {
    let changed = false;
    const owners = [...this.data.questions, ...this.data.revisions.map((revision) => revision.snapshot)];
    for (const owner of owners) {
      if (owner?.image?.startsWith('data:image/')) {
        owner.image = await this.saveDataImage(owner.image, owner.id || randomUUID());
        changed = true;
      }
    }
    return changed;
  }

  async saveDataImage(dataUrl, stem) {
    const match = /^data:(image\/(png|jpeg|jpg|webp|svg\+xml|gif));base64,(.+)$/s.exec(dataUrl);
    if (!match) throw Object.assign(new Error('不支持的照片格式'), { status: 400 });
    const extension = match[2] === 'jpeg' ? 'jpg' : match[2] === 'svg+xml' ? 'svg' : match[2];
    const filename = `${String(stem).replace(/[^a-zA-Z0-9-]/g, '')}.${extension}`;
    await fs.writeFile(path.join(this.attachmentsDir, filename), Buffer.from(match[3], 'base64'));
    return `attachments/${filename}`;
  }

  async persist() {
    const payload = JSON.stringify(this.data, null, 2);
    this.writeQueue = this.writeQueue.then(async () => {
      const temp = `${this.file}.tmp`;
      await fs.writeFile(temp, payload, 'utf8');
      await fs.rename(temp, this.file);
    });
    return this.writeQueue;
  }

  list(filters = {}) {
    const query = String(filters.query || '').toLowerCase();
    let result = [...this.data.questions];
    if (filters.subject && filters.subject !== '全部') result = result.filter((q) => q.subject === filters.subject);
    if (filters.mastery) result = result.filter((q) => q.mastery === filters.mastery);
    if (filters.review === 'today') result = result.filter((q) => q.mastery !== '已掌握' && new Date(q.nextReviewAt) <= new Date(Date.now() + 864e5));
    if (query) result = result.filter((q) => [q.title, q.content, q.subject, q.chapter, q.errorType, ...(q.tags || [])].join(' ').toLowerCase().includes(query));
    return result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  get(id) {
    const question = this.data.questions.find((q) => q.id === id);
    if (!question) throw Object.assign(new Error('没有找到这道错题'), { status: 404 });
    return question;
  }

  subjects() { return [...new Set(this.data.questions.map((q) => q.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN')); }

  stats() {
    const today = new Date(); today.setHours(23, 59, 59, 999);
    const questions = this.data.questions;
    const subjects = this.subjects();
    return {
      total: questions.length, mastered: questions.filter((q) => q.mastery === '已掌握').length,
      reviewing: questions.filter((q) => q.mastery === '复习中').length,
      due: questions.filter((q) => q.mastery !== '已掌握' && new Date(q.nextReviewAt) <= today).length,
      totalPractices: questions.reduce((sum, q) => sum + (q.reviewCount || 0), 0),
      weekPractices: this.data.reviews.filter((review) => new Date(review.reviewedAt) >= new Date(Date.now() - 7 * 864e5)).length,
      bySubject: subjects.map((subject) => ({ subject, count: questions.filter((q) => q.subject === subject).length })),
    };
  }

  async create(input) {
    const now = nowIso();
    const question = cleanQuestion(input, { id: randomUUID(), createdAt: now, reviewCount: 0, nextReviewAt: input.nextReviewAt || now, lastReviewedAt: '' });
    if (question.image.startsWith('data:image/')) question.image = await this.saveDataImage(question.image, question.id);
    this.data.questions.unshift(question);
    this.data.revisions.unshift({ id: randomUUID(), questionId: question.id, savedAt: now, summary: '首次收录', snapshot: { ...question } });
    await this.persist();
    return question;
  }

  async update(id, input, summary = '内容编辑') {
    const current = this.get(id);
    const updated = cleanQuestion({ ...current, ...input }, current);
    if (updated.image.startsWith('data:image/')) updated.image = await this.saveDataImage(updated.image, id);
    Object.assign(current, updated);
    this.data.revisions.unshift({ id: randomUUID(), questionId: id, savedAt: current.updatedAt, summary: text(summary, 100), snapshot: { ...current } });
    await this.persist();
    return current;
  }

  async remove(id) {
    this.get(id);
    this.data.questions = this.data.questions.filter((q) => q.id !== id);
    this.data.revisions = this.data.revisions.filter((r) => r.questionId !== id);
    this.data.reviews = this.data.reviews.filter((r) => r.questionId !== id);
    for (const board of this.data.boards) {
      const removed = board.nodes.filter((node) => node.questionId === id).map((node) => node.id);
      board.nodes = board.nodes.filter((node) => node.questionId !== id);
      board.edges = board.edges.filter((edge) => !removed.includes(edge.fromNode) && !removed.includes(edge.toNode));
    }
    await this.persist();
  }

  revisions(id) { this.get(id); return this.data.revisions.filter((r) => r.questionId === id).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)); }
  reviews(id) { this.get(id); return this.data.reviews.filter((r) => r.questionId === id).sort((a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt)); }

  async rollback(id, revisionId) {
    const current = this.get(id);
    const revision = this.data.revisions.find((r) => r.id === revisionId && r.questionId === id);
    if (!revision) throw Object.assign(new Error('没有找到这个历史版本'), { status: 404 });
    Object.assign(current, { ...revision.snapshot, id, createdAt: current.createdAt, updatedAt: nowIso() });
    this.data.revisions.unshift({ id: randomUUID(), questionId: id, savedAt: current.updatedAt, summary: `回滚至 ${new Date(revision.savedAt).toLocaleString('zh-CN')}`, snapshot: { ...current } });
    await this.persist();
    return current;
  }

  async review(id, mastery, mode = 'scheduled') {
    if (!MASTERIES.includes(mastery)) throw Object.assign(new Error('无效的掌握状态'), { status: 400 });
    const question = this.get(id);
    const now = new Date();
    question.mastery = mastery;
    question.reviewCount = (question.reviewCount || 0) + 1;
    question.lastReviewedAt = now.toISOString();
    question.updatedAt = now.toISOString();
    const days = mastery === '已掌握' ? 7 : mastery === '复习中' ? 3 : 1;
    question.nextReviewAt = new Date(now.getTime() + days * 864e5).toISOString();
    this.data.reviews.unshift({ id: randomUUID(), questionId: id, reviewedAt: now.toISOString(), mastery, mode: mode === 'free' ? 'free' : 'scheduled' });
    await this.persist();
    return question;
  }

  getIntegrations() { return this.data.integrations; }
  async updateIntegrations(input) { this.data.integrations = cleanIntegrations(input, this.data.integrations); await this.persist(); return this.data.integrations; }

  listBoards() { return this.data.boards.map(({ id, name, updatedAt, nodes, edges }) => ({ id, name, updatedAt, nodeCount: nodes.length, edgeCount: edges.length })); }
  getBoard(id) {
    const board = this.data.boards.find((item) => item.id === id);
    if (!board) throw Object.assign(new Error('没有找到这块白板'), { status: 404 });
    return board;
  }
  async createBoard(input) {
    const now = nowIso();
    const board = { id: randomUUID(), name: text(input.name, 120) || '未命名白板', createdAt: now, updatedAt: now, nodes: [], edges: [] };
    this.data.boards.unshift(board); await this.persist(); return board;
  }
  async updateBoard(id, input) {
    const board = this.getBoard(id);
    const nodes = Array.isArray(input.nodes) ? input.nodes.slice(0, 500).map((node) => ({
      id: text(node.id, 100) || randomUUID(), type: 'text', text: text(node.text, 5000),
      x: Number(node.x) || 0, y: Number(node.y) || 0, width: Math.max(160, Math.min(600, Number(node.width) || 240)), height: Math.max(90, Math.min(500, Number(node.height) || 140)),
      ...(node.color ? { color: text(node.color, 20) } : {}), ...(node.questionId ? { questionId: text(node.questionId, 100) } : {}),
    })) : board.nodes;
    const ids = new Set(nodes.map((node) => node.id));
    const edges = Array.isArray(input.edges) ? input.edges.filter((edge) => ids.has(edge.fromNode) && ids.has(edge.toNode)).slice(0, 1000).map((edge) => ({ id: text(edge.id, 100) || randomUUID(), fromNode: edge.fromNode, toNode: edge.toNode, toEnd: 'arrow', ...(edge.label ? { label: text(edge.label, 100) } : {}) })) : board.edges;
    Object.assign(board, { name: text(input.name, 120) || board.name, nodes, edges, updatedAt: nowIso() });
    await this.persist(); return board;
  }
  async removeBoard(id) { this.getBoard(id); this.data.boards = this.data.boards.filter((board) => board.id !== id); await this.persist(); }
}
