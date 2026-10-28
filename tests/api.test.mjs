import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { createApiApp } from '../server/app.mjs';

test('REST API 支持鉴权、错题 CRUD、回滚及知识库连接', async (t) => {
  const dir = await fs.mkdtemp(path.resolve('.test-api-'));
  const { app: api } = await createApiApp({ dataDir: dir, token: 'test-secret' });
  const app = express();
  app.use('/api', api);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/api`;
  const headers = { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' };
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await fs.rm(dir, { recursive: true, force: true }); });

  const health = await fetch(`${base}/health`).then((r) => r.json());
  assert.equal(health.ok, true);
  assert.equal((await fetch(`${base}/questions`)).status, 401);
  const createdResponse = await fetch(`${base}/questions`, { method: 'POST', headers, body: JSON.stringify({ title: 'API 错题', content: '测试内容', subject: '化学' }) });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  await fetch(`${base}/questions/${created.id}`, { method: 'PUT', headers, body: JSON.stringify({ title: 'API 新标题' }) });
  const revisions = await fetch(`${base}/questions/${created.id}/revisions`, { headers }).then((r) => r.json());
  assert.equal(revisions.length, 2);
  const restored = await fetch(`${base}/questions/${created.id}/rollback`, { method: 'POST', headers, body: JSON.stringify({ revisionId: revisions[1].id }) }).then((r) => r.json());
  assert.equal(restored.title, 'API 错题');

  const knowledge = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ results: [{ title: '二次函数', query: new URL(req.url, 'http://localhost').searchParams.get('q') }] }));
  });
  knowledge.listen(0, '127.0.0.1');
  await new Promise((resolve) => knowledge.once('listening', resolve));
  t.after(() => new Promise((resolve) => knowledge.close(resolve)));
  await fetch(`${base}/integrations`, { method: 'PUT', headers, body: JSON.stringify({ knowledgeUrl: `http://127.0.0.1:${knowledge.address().port}/search` }) });
  const results = await fetch(`${base}/integrations/knowledge/search`, { method: 'POST', headers, body: JSON.stringify({ query: '函数' }) }).then((r) => r.json());
  assert.equal(results.results[0].query, '函数');
});
