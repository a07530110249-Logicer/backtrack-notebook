import { useEffect, useState } from 'react';
import { Folder, FolderOpen, Loader2, Plus, X } from 'lucide-react';
import { api } from '../api';
import type { WorkspaceSummary } from '../types';

export default function WorkspaceSwitcher({ onChanged, onError }: { onChanged: () => void; onError: (message: string) => void }) {
  const [data, setData] = useState<WorkspaceSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [folder, setFolder] = useState('');
  const [saving, setSaving] = useState(false);
  const load = () => api.workspaces().then(setData).catch((e) => onError(e.message));
  useEffect(() => { load(); }, []);
  const active = data?.workspaces.find((item) => item.id === data.activeId);
  const activate = async (id: string) => { try { setData(await api.activateWorkspace(id)); onChanged(); } catch (e) { onError((e as Error).message); } };
  const pick = async () => { const selected = await window.backtrackDesktop?.selectDirectory(); if (selected) setFolder(selected); };
  const add = async () => {
    if (!folder.trim()) return onError('请填写或选择文件夹路径');
    setSaving(true);
    try { setData(await api.addWorkspace({ name, path: folder })); setOpen(false); setName(''); setFolder(''); onChanged(); }
    catch (e) { onError((e as Error).message); } finally { setSaving(false); }
  };
  return <>
    <div className="workspace-switcher" title={active?.path}>
      <FolderOpen size={16} />
      <select value={data?.activeId || ''} onChange={(e) => activate(e.target.value)} aria-label="当前工作文件夹">
        {data?.workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}
      </select>
      <button onClick={() => setOpen(true)} title="接入文件夹"><Plus size={15} /></button>
    </div>
    {open && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}><section className="small-modal"><header className="modal-header"><div><h2>接入一个文件夹</h2><p>直接读写原文件夹，不复制内容。复制整个文件夹即可迁移到另一台设备。</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20} /></button></header><div className="small-modal-body"><label className="field-label">工作空间名称</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="默认使用文件夹名称" /><label className="field-label">文件夹路径</label><div className="folder-picker"><Folder size={17} /><input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder={window.backtrackDesktop ? '选择本地或外部文件夹' : '例如：D:\\Notes\\Backtrack'} /><button className="secondary-button" onClick={pick}>选择</button></div><p className="field-help">文件夹中将保存 notebook.json、attachments 附件目录和白板数据。移除工作空间不会删除原文件。</p></div><footer className="modal-footer"><span /><button className="primary-button" disabled={saving} onClick={add}>{saving && <Loader2 size={15} className="spin" />}打开文件夹</button></footer></section></div>}
  </>;
}
