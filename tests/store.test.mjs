import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NotebookStore } from '../server/store.mjs';

async function tempStore(t) {
  const dir = await fs.mkdtemp(path.resolve('.test-data-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return new NotebookStore(dir).init();
}

test('创建、分类筛选与统计', async (t) => {
  const store = await tempStore(t);
  const created = await store.create({ title: '测试错题', subject: '数学', content: '1+1=?', answer: '2', tags: ['基础', '计算'], errorType: '计算失误' });
  assert.ok(created.id);
  assert.equal(store.list({ subject: '数学', query: '测试' })[0].title, '测试错题');
  assert.equal(store.stats().total, 5);
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
  assert.equal(restored.content, '原始题目');
  assert.equal(store.revisions(created.id).length, 3);
  const persisted = await new NotebookStore(store.dataDir).init();
  assert.equal(persisted.get(created.id).title, '原始标题');
});

test('复习反馈更新掌握程度与下次复习时间', async (t) => {
  const store = await tempStore(t);
  const created = await store.create({ title: '复习测试', content: '内容' });
  const reviewed = await store.review(created.id, '已掌握');
  assert.equal(reviewed.mastery, '已掌握');
  assert.equal(reviewed.reviewCount, 1);
  assert.ok(new Date(reviewed.nextReviewAt) > new Date());
});
