import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NotebookStore } from './store.mjs';

export class WorkspaceManager {
  constructor(configDir) {
    this.configDir = path.resolve(configDir);
    this.configFile = path.join(this.configDir, 'workspaces.json');
    this.stores = new Map();
    this.state = null;
  }

  async init() {
    await fs.mkdir(this.configDir, { recursive: true });
    try {
      this.state = JSON.parse(await fs.readFile(this.configFile, 'utf8'));
      if (!Array.isArray(this.state.workspaces)) throw new Error('invalid');
    } catch {
      const id = randomUUID();
      this.state = { activeId: id, workspaces: [{ id, name: '我的错题本', path: this.configDir, addedAt: new Date().toISOString() }] };
      await this.persist();
    }
    await this.current();
    return this;
  }

  async persist() {
    const temp = `${this.configFile}.tmp`;
    await fs.writeFile(temp, JSON.stringify(this.state, null, 2), 'utf8');
    await fs.rename(temp, this.configFile);
  }

  summary() {
    return { activeId: this.state.activeId, workspaces: this.state.workspaces.map((item) => ({ ...item, isDefault: item.path === this.configDir })) };
  }

  async getStore(id) {
    const workspace = this.state.workspaces.find((item) => item.id === id);
    if (!workspace) throw Object.assign(new Error('没有找到这个文件夹工作空间'), { status: 404 });
    if (!this.stores.has(id)) {
      const store = await new NotebookStore(workspace.path).init({ seed: workspace.path === this.configDir });
      this.stores.set(id, store);
    }
    return this.stores.get(id);
  }

  current() { return this.getStore(this.state.activeId); }

  async add(input) {
    const folder = path.resolve(String(input.path || '').trim());
    if (!path.isAbsolute(folder) || !input.path) throw Object.assign(new Error('请提供有效的文件夹绝对路径'), { status: 400 });
    await fs.mkdir(folder, { recursive: true });
    const stat = await fs.stat(folder);
    if (!stat.isDirectory()) throw Object.assign(new Error('目标路径不是文件夹'), { status: 400 });
    let workspace = this.state.workspaces.find((item) => path.resolve(item.path).toLowerCase() === folder.toLowerCase());
    if (!workspace) {
      workspace = { id: randomUUID(), name: String(input.name || '').trim().slice(0, 100) || path.basename(folder) || '外部文件夹', path: folder, addedAt: new Date().toISOString() };
      this.state.workspaces.push(workspace);
    }
    this.state.activeId = workspace.id;
    await this.getStore(workspace.id);
    await this.persist();
    return this.summary();
  }

  async activate(id) {
    await this.getStore(id);
    this.state.activeId = id;
    await this.persist();
    return this.summary();
  }

  async remove(id) {
    if (this.state.workspaces.length <= 1) throw Object.assign(new Error('至少保留一个工作空间'), { status: 400 });
    const workspace = this.state.workspaces.find((item) => item.id === id);
    if (!workspace) throw Object.assign(new Error('没有找到这个工作空间'), { status: 404 });
    if (workspace.path === this.configDir) throw Object.assign(new Error('默认工作空间不能移除'), { status: 400 });
    this.state.workspaces = this.state.workspaces.filter((item) => item.id !== id);
    this.stores.delete(id);
    if (this.state.activeId === id) this.state.activeId = this.state.workspaces[0].id;
    await this.persist();
    return this.summary();
  }
}
