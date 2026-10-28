import express from 'express';
import { NotebookStore } from './store.mjs';

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function validHttpUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('只支持 HTTP 或 HTTPS 地址');
  return url;
}

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

export async function createApiApp({ dataDir, token = '' } = {}) {
  const store = await new NotebookStore(dataDir).init();
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20mb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (token && req.path !== '/health' && req.get('authorization') !== `Bearer ${token}`) {
      return res.status(401).json({ error: '接口令牌无效或缺失' });
    }
    next();
  });

  app.get('/health', (req, res) => res.json({ ok: true, service: 'backtrack-notebook', version: '1.0.0' }));
  app.get('/questions', (req, res) => res.json(store.list(req.query)));
  app.get('/stats', (req, res) => res.json(store.stats()));
  app.get('/questions/:id', (req, res) => res.json(store.get(req.params.id)));
  app.post('/questions', asyncRoute(async (req, res) => res.status(201).json(await store.create(req.body))));
  app.put('/questions/:id', asyncRoute(async (req, res) => res.json(await store.update(req.params.id, req.body, req.body.revisionSummary))));
  app.delete('/questions/:id', asyncRoute(async (req, res) => { await store.remove(req.params.id); res.status(204).end(); }));
  app.get('/questions/:id/revisions', (req, res) => res.json(store.revisions(req.params.id)));
  app.post('/questions/:id/rollback', asyncRoute(async (req, res) => res.json(await store.rollback(req.params.id, req.body.revisionId))));
  app.post('/questions/:id/review', asyncRoute(async (req, res) => res.json(await store.review(req.params.id, req.body.mastery))));
  app.get('/integrations', (req, res) => res.json(store.getIntegrations()));
  app.put('/integrations', asyncRoute(async (req, res) => res.json(await store.updateIntegrations(req.body))));

  app.post('/integrations/test', asyncRoute(async (req, res) => {
    const url = validHttpUrl(req.body.url);
    const headers = { Accept: 'application/json, image/*;q=0.9, */*;q=0.5' };
    if (req.body.token) headers.Authorization = `Bearer ${req.body.token}`;
    const response = await fetchWithTimeout(url, { headers });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) return res.status(502).json({ error: `目标服务返回 ${response.status}`, ok: false });
    if (contentType.includes('application/json')) {
      const body = await response.json();
      return res.json({ ok: true, status: response.status, contentType, preview: body });
    }
    res.json({ ok: true, status: response.status, contentType });
  }));

  app.post('/integrations/camera/capture', asyncRoute(async (req, res) => {
    const url = validHttpUrl(req.body.url || store.getIntegrations().cameraUrl);
    const response = await fetchWithTimeout(url, { headers: { Accept: 'image/*' } });
    if (!response.ok) return res.status(502).json({ error: `摄像机返回 ${response.status}` });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return res.status(415).json({ error: '目标地址没有返回图片' });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 15 * 1024 * 1024) return res.status(413).json({ error: '照片超过 15 MB 限制' });
    res.json({ image: `data:${contentType};base64,${buffer.toString('base64')}`, contentType });
  }));

  app.post('/integrations/knowledge/search', asyncRoute(async (req, res) => {
    const config = store.getIntegrations();
    const url = validHttpUrl(req.body.url || config.knowledgeUrl);
    url.searchParams.set('q', String(req.body.query || '').slice(0, 300));
    const headers = { Accept: 'application/json' };
    const auth = req.body.token || config.knowledgeToken;
    if (auth) headers.Authorization = `Bearer ${auth}`;
    const response = await fetchWithTimeout(url, { headers });
    if (!response.ok) return res.status(502).json({ error: `知识库返回 ${response.status}` });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json')) return res.status(415).json({ error: '知识库接口需要返回 JSON' });
    const data = await response.json();
    res.json({ results: Array.isArray(data) ? data : (data.results || data.items || data.data || data), source: url.origin });
  }));

  app.use((error, req, res, next) => {
    const status = error.status || (error.name === 'AbortError' ? 504 : 500);
    res.status(status).json({ error: error.name === 'AbortError' ? '外部服务连接超时' : (error.message || '服务器错误') });
  });
  return { app, store };
}
