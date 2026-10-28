import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NotebookStore } from '../server/store.mjs';
async function tempStore(t) { const dir = await fs.mkdtemp(path.resolve('.test-data-')); t.after(() => fs.rm(dir, { recursive: true, force: true })); return new NotebookStore(dir).init(); }
test('创建、自由课程分类与统计', async (t) => {
  const store = await tempStore(t);
  const created = await store.create({ title: '测试错题', subject: '操作系统', content: '什么是死锁？', answer: '四个必要条件', tags: ['OS'], errorType: '概念不清' });
  assert.ok(created.id);
  assert.equal(store.list({ subject: '操作系统', query: '死锁' })[0].title, '测试错题');
  assert.deepEqual(store.subjects(), ['操作系统']);
  assert.equal(store.stats().total, 1);
  assert.equal(store.revisions(created.id).length, 1);
});
test('每次编辑保留快照，回滚后恢复旧内容', async (t) => {
  const store = await tempStore(t);
  const created = await store.create({ title: '原始标题', subject: '物理', content: '原始题目', analysis: '原始复盘' });
  await store.update(created.id, { title: '修改标题', content: '修改题目' });
  const revisions = store.revisions(created.id);
  assert.equal(revisions.length, 2);
  const restored = await store.rollback(created.id, revisions[1].id);
  assert.equal(restored.title, '原始标题');
  assert.equal(store.revisions(created.id).length, 3);
  const persisted = await new NotebookStore(store.dataDir).init();
  assert.equal(persisted.get(created.id).title, '原始标题');
});
test('逐次练习记录与自由练习模式', async (t) => {
  const store = await tempStore(t);
  const created = await store.create({ title: '复习测试', content: '内容' });
  const reviewed = await store.review(created.id, '已掌握', 'free');
  assert.equal(reviewed.reviewCount, 1);
  assert.equal(store.reviews(created.id)[0].mode, 'free');
  assert.equal(store.stats().totalPractices, 1);
  assert.ok(new Date(reviewed.nextReviewAt) > new Date());
});
test('照片保存为工作文件夹内的相对附件', async (t) => {
  const store = await tempStore(t);
  const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const created = await store.create({ title: '照片题', content: '内容', image: pixel });
  assert.ok(created.image.startsWith('attachments/'));
  assert.ok(!created.image.startsWith('data:'));
  assert.ok((await fs.stat(path.join(store.dataDir, created.image))).isFile());
  const raw = JSON.parse(await fs.readFile(store.file, 'utf8'));
  assert.ok(!raw.questions[0].image.includes('base64'));
});
