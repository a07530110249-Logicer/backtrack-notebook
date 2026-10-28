import express from 'express';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { WorkspaceManager } from './workspaces.mjs';

function asyncRoute(handler) { return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next); }
function validHttpUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url;
  } catch {
    throw Object.assign(new Error('请输入以 http:// 或 https:// 开头的完整地址'), { status: 400 });
  }
}
function connectionError(error) {
  if (error.name === 'AbortError') return '连接超时，请确认服务已经启动、地址正确';
  const code = error.cause?.code || error.code;
  if (code === 'ECONNREFUSED') return '无法连接，目标服务可能还没有启动';
  if (code === 'ENOTFOUND') return '找不到这个地址，请检查网址是否填写正确';
  if (code === 'CERT_HAS_EXPIRED' || code === 'DEPTH_ZERO_SELF_SIGNED_CERT') return '安全证书有问题，请检查 HTTPS 配置';
  return error.message || '连接失败，请检查地址和网络';
}
function chatCompletionsUrl(value) {
  const base = validHttpUrl(value).href.replace(/\/$/, '');
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
}
function statusError(status, target = '目标服务') {
  if (status === 401 || status === 403) return `${target}拒绝了访问，请检查密钥或令牌`;
  if (status === 404) return '没有找到这个接口，请检查地址是否完整';
  return `${target}返回错误（HTTP ${status}）`;
}
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' }); }
  finally { clearTimeout(timer); }
}
async function queryKnowledge(source, query) {
  try {
    const url = validHttpUrl(source.url);
    url.searchParams.set('q', query);
    const headers = { Accept: 'application/json' };
    if (source.token) headers.Authorization = `Bearer ${source.token}`;
    const response = await fetchWithTimeout(url, { headers });
    if (!response.ok) throw new Error(statusError(response.status, '知识库'));
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json')) throw new Error('知识库没有返回 JSON 数据，请检查检索地址');
    const payload = await response.json();
    return { sourceId: source.id, sourceName: source.name, ok: true, results: Array.isArray(payload) ? payload : (payload.results || payload.items || payload.data || payload) };
  } catch (error) {
    return { sourceId: source.id, sourceName: source.name, ok: false, error: connectionError(error), results: [] };
  }
}

export async function createApiApp({ dataDir, token = '' } = {}) {
  const manager = await new WorkspaceManager(dataDir).init();
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20mb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const suppliedToken = req.get('authorization') === `Bearer ${token}` || (req.path.startsWith('/attachments/') && req.query.access_token === token);
    if (token && req.path !== '/health' && !suppliedToken) return res.status(401).json({ error: '接口令牌无效或缺失' });
    next();
  });
  const current = () => manager.current();

  app.get('/health', (req, res) => res.json({ ok: true, service: 'rethink', version: '2.1.0' }));
  app.get('/workspaces', (req, res) => res.json(manager.summary()));
  app.post('/workspaces', asyncRoute(async (req, res) => res.status(201).json(await manager.add(req.body))));
  app.post('/workspaces/:id/activate', asyncRoute(async (req, res) => res.json(await manager.activate(req.params.id))));
  app.delete('/workspaces/:id', asyncRoute(async (req, res) => res.json(await manager.remove(req.params.id))));

  app.get('/questions', asyncRoute(async (req, res) => res.json((await current()).list(req.query))));
  app.get('/stats', asyncRoute(async (req, res) => res.json((await current()).stats())));
  app.get('/subjects', asyncRoute(async (req, res) => res.json((await current()).subjects())));
  app.get('/questions/:id', asyncRoute(async (req, res) => res.json((await current()).get(req.params.id))));
  app.post('/questions', asyncRoute(async (req, res) => res.status(201).json(await (await current()).create(req.body))));
  app.put('/questions/:id', asyncRoute(async (req, res) => res.json(await (await current()).update(req.params.id, req.body, req.body.revisionSummary))));
  app.delete('/questions/:id', asyncRoute(async (req, res) => { await (await current()).remove(req.params.id); res.status(204).end(); }));
  app.get('/questions/:id/revisions', asyncRoute(async (req, res) => res.json((await current()).revisions(req.params.id))));
  app.get('/questions/:id/reviews', asyncRoute(async (req, res) => res.json((await current()).reviews(req.params.id))));
  app.post('/questions/:id/rollback', asyncRoute(async (req, res) => res.json(await (await current()).rollback(req.params.id, req.body.revisionId))));
  app.post('/questions/:id/review', asyncRoute(async (req, res) => res.json(await (await current()).review(req.params.id, req.body.mastery, req.body.mode))));

  app.get('/boards', asyncRoute(async (req, res) => res.json((await current()).listBoards())));
  app.post('/boards', asyncRoute(async (req, res) => res.status(201).json(await (await current()).createBoard(req.body))));
  app.get('/boards/:id', asyncRoute(async (req, res) => res.json((await current()).getBoard(req.params.id))));
  app.put('/boards/:id', asyncRoute(async (req, res) => res.json(await (await current()).updateBoard(req.params.id, req.body))));
  app.delete('/boards/:id', asyncRoute(async (req, res) => { await (await current()).removeBoard(req.params.id); res.status(204).end(); }));

  app.get('/integrations', asyncRoute(async (req, res) => res.json((await current()).getIntegrations())));
  app.put('/integrations', asyncRoute(async (req, res) => res.json(await (await current()).updateIntegrations(req.body))));
  app.post('/integrations/test', asyncRoute(async (req, res) => {
    const kind = ['camera', 'knowledge', 'model'].includes(req.body.kind) ? req.body.kind : 'generic';
    const url = kind === 'model' ? new URL(chatCompletionsUrl(req.body.url)) : validHttpUrl(req.body.url);
    const headers = { Accept: kind === 'camera' ? 'image/*' : 'application/json' };
    if (req.body.token) headers.Authorization = `Bearer ${req.body.token}`;
    if (kind === 'knowledge') url.searchParams.set('q', '连接测试');
    const options = { headers };
    if (kind === 'model') {
      headers['Content-Type'] = 'application/json';
      options.method = 'POST';
      options.body = JSON.stringify({ model: String(req.body.model || ''), messages: [{ role: 'user', content: '只回复：连接成功' }], stream: false, max_tokens: 12 });
    }
    const response = await fetchWithTimeout(url, options, kind === 'model' ? 60000 : 10000);
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) return res.status(502).json({ error: statusError(response.status, kind === 'model' ? '模型服务' : kind === 'camera' ? '摄像机' : '知识库'), ok: false });
    if (kind === 'camera' && !contentType.startsWith('image/')) return res.status(415).json({ error: '地址可以打开，但没有返回图片。请填写直接显示 JPG 或 PNG 的照片地址', ok: false });
    if (['knowledge', 'model'].includes(kind) && !contentType.includes('json')) return res.status(415).json({ error: '服务没有返回正确的 JSON 数据，请检查接口地址', ok: false });
    if (kind === 'model') {
      const payload = await response.json();
      if (!Array.isArray(payload.choices)) return res.status(502).json({ error: '模型已经响应，但格式不兼容。请使用 OpenAI 兼容接口', ok: false });
      return res.json({ ok: true, status: response.status, contentType, message: '模型连接成功，可以开始对话' });
    }
    if (contentType.includes('json')) return res.json({ ok: true, status: response.status, contentType, message: kind === 'knowledge' ? '知识库连接成功，可以检索' : '连接成功', preview: await response.json() });
    res.json({ ok: true, status: response.status, contentType, message: kind === 'camera' ? '摄像机连接成功，可以获取照片' : '连接成功' });
  }));
  app.post('/integrations/camera/capture', asyncRoute(async (req, res) => {
    const config = (await current()).getIntegrations();
    const url = validHttpUrl(req.body.url || config.cameraUrl);
    const cameraToken = req.body.token || config.cameraToken;
    const headers = { Accept: 'image/*', ...(cameraToken ? { Authorization: `Bearer ${cameraToken}` } : {}) };
    const response = await fetchWithTimeout(url, { headers });
    if (!response.ok) return res.status(502).json({ error: statusError(response.status, '摄像机') });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return res.status(415).json({ error: '目标地址没有返回图片' });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 15 * 1024 * 1024) return res.status(413).json({ error: '照片超过 15 MB 限制' });
    res.json({ image: `data:${contentType};base64,${buffer.toString('base64')}`, contentType });
  }));
  app.post('/integrations/knowledge/search', asyncRoute(async (req, res) => {
    const config = (await current()).getIntegrations();
    const query = String(req.body.query || '').trim().slice(0, 300);
    if (!query) return res.status(400).json({ error: '请输入检索内容' });
    let sources = config.knowledgeSources.filter((source) => source.enabled);
    if (Array.isArray(req.body.sourceIds) && req.body.sourceIds.length) sources = sources.filter((source) => req.body.sourceIds.includes(source.id));
    if (!sources.length) return res.status(400).json({ error: '请先启用至少一个知识库' });
    res.json({ query, sources: await Promise.all(sources.map((source) => queryKnowledge(source, query))) });
  }));
  app.post('/model/chat', asyncRoute(async (req, res) => {
    const { model } = (await current()).getIntegrations();
    if (!model.enabled) return res.status(400).json({ error: '请先在集成接口中启用模型连接' });
    const endpoint = chatCompletionsUrl(model.baseUrl);
    const messages = Array.isArray(req.body.messages) ? req.body.messages.slice(0, 20).map((message) => ({ role: ['system', 'user', 'assistant'].includes(message.role) ? message.role : 'user', content: String(message.content || '').slice(0, 20000) })) : [];
    if (!messages.length) return res.status(400).json({ error: 'messages 不能为空' });
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (model.apiKey) headers.Authorization = `Bearer ${model.apiKey}`;
    const response = await fetchWithTimeout(endpoint, { method: 'POST', headers, body: JSON.stringify({ model: model.model, messages, stream: false, temperature: req.body.temperature ?? 0.2 }) }, 60000);
    if (!response.ok) return res.status(502).json({ error: statusError(response.status, '模型服务') });
    res.json(await response.json());
  }));

  app.get('/attachments/:filename', asyncRoute(async (req, res) => {
    const store = await current();
    const requested = path.basename(String(req.params.filename || ''));
    const file = path.resolve(store.attachmentsDir, requested);
    if (!file.startsWith(`${store.attachmentsDir}${path.sep}`)) return res.status(400).json({ error: '附件路径无效' });
    const contentTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
    res.setHeader('Content-Type', contentTypes[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  }));
  app.use((error, req, res, next) => {
    const status = error.status || (error.name === 'AbortError' ? 504 : 500);
    res.status(status).json({ error: connectionError(error) });
  });
  return { app, store: await current(), manager };
}
