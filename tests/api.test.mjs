import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { createApiApp } from '../server/app.mjs';

test('REST API 覆盖鉴权、回滚、多知识库与本地模型兼容接口', async (t) => {
  const dir = await fs.mkdtemp(path.resolve('.test-api-'));
  const { app: api } = await createApiApp({ dataDir: dir, token: 'test-secret' });
  const app = express(); app.use('/api', api);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const headers = { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' };
  const external = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url.startsWith('/search')) return res.end(JSON.stringify({ results: [{ title: '操作系统', query: new URL(req.url, 'http://localhost').searchParams.get('q') }] }));
    if (req.url.startsWith('/v1/chat/completions')) return res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: '本地回答' } }] }));
    res.statusCode = 404; res.end('{}');
  });
  external.listen(0, '127.0.0.1'); await new Promise((resolve) => external.once('listening', resolve));
  const externalBase = `http://127.0.0.1:${external.address().port}`;
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await new Promise((resolve) => external.close(resolve)); await fs.rm(dir, { recursive: true, force: true }); });

  assert.equal((await fetch(`${base}/health`).then((r) => r.json())).ok, true);
  assert.equal((await fetch(`${base}/questions`)).status, 401);
  const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const createdResponse = await fetch(`${base}/questions`, { method: 'POST', headers, body: JSON.stringify({ title: 'API 错题', content: '测试内容', subject: '操作系统', image: pixel }) });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  const image = await fetch(`${base}/${created.image}`, { headers });
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/png');
  await fetch(`${base}/questions/${created.id}`, { method: 'PUT', headers, body: JSON.stringify({ title: 'API 新标题' }) });
  const revisions = await fetch(`${base}/questions/${created.id}/revisions`, { headers }).then((r) => r.json());
  const restored = await fetch(`${base}/questions/${created.id}/rollback`, { method: 'POST', headers, body: JSON.stringify({ revisionId: revisions[1].id }) }).then((r) => r.json());
  assert.equal(restored.title, 'API 错题');

  await fetch(`${base}/integrations`, { method: 'PUT', headers, body: JSON.stringify({ knowledgeSources: [{ id: 'course', name: '课程库', url: `${externalBase}/search`, enabled: true }], model: { enabled: true, baseUrl: `${externalBase}/v1`, model: 'local-test' } }) });
  const search = await fetch(`${base}/integrations/knowledge/search`, { method: 'POST', headers, body: JSON.stringify({ query: '死锁' }) }).then((r) => r.json());
  assert.equal(search.sources.length, 1);
  assert.equal(search.sources[0].results[0].query, '死锁');
  const model = await fetch(`${base}/model/chat`, { method: 'POST', headers, body: JSON.stringify({ messages: [{ role: 'user', content: '解释死锁' }] }) }).then((r) => r.json());
  assert.equal(model.choices[0].message.content, '本地回答');
});
