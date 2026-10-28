import { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Search, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { IntegrationConfig, KnowledgeSearchGroup } from '../types';

export default function Integrations({ notify }: { notify: (message: string, type?: 'success' | 'error') => void }) {
  const [config, setConfig] = useState<IntegrationConfig>({ cameraUrl: '', knowledgeSources: [], model: { enabled: false, baseUrl: 'http://127.0.0.1:11434/v1', apiKey: '', model: 'qwen3:4b' } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [groups, setGroups] = useState<KnowledgeSearchGroup[]>([]);
  useEffect(() => { api.integrations().then(setConfig).catch((e) => notify(e.message, 'error')).finally(() => setLoading(false)); }, []);
  const save = async () => { setSaving(true); try { setConfig(await api.saveIntegrations(config)); notify('连接配置已保存'); } catch (e) { notify((e as Error).message, 'error'); } finally { setSaving(false); } };
  const addSource = () => setConfig((old) => ({ ...old, knowledgeSources: [...old.knowledgeSources, { id: crypto.randomUUID(), name: '', url: '', token: '', enabled: true }] }));
  const updateSource = (id: string, key: string, value: unknown) => setConfig((old) => ({ ...old, knowledgeSources: old.knowledgeSources.map((source) => source.id === id ? { ...source, [key]: value } : source) }));
  const test = async (id: string, url: string, token = '') => { if (!url) return notify('请先填写接口地址', 'error'); setTesting(id); try { const result = await api.testIntegration(url, token); notify(`连接成功 · HTTP ${result.status}`); } catch (e) { notify((e as Error).message, 'error'); } finally { setTesting(''); } };
  const search = async () => {
    if (!query.trim()) return notify('请输入检索内容', 'error');
    setTesting('search'); setGroups([]);
    try { setGroups((await api.searchKnowledge(query, selected)).sources); } catch (e) { notify((e as Error).message, 'error'); } finally { setTesting(''); }
  };
  if (loading) return <div className="page-loading"><Loader2 className="spin" />正在读取配置</div>;
  return <div className="integration-page simple-page">
    <div className="page-title-row"><div><h1>连接</h1><p>每个知识库独立配置；检索时可全选或只选部分来源。</p></div><button className="primary-button" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}保存配置</button></div>
    <section className="plain-section"><div className="section-heading"><div><h2>摄像机快照</h2></div><button className="text-link" onClick={() => test('camera', config.cameraUrl)}>{testing === 'camera' ? '测试中…' : '测试连接'}</button></div><div className="inline-form"><input value={config.cameraUrl} onChange={(e) => setConfig({ ...config, cameraUrl: e.target.value })} placeholder="http://camera.example.com/snapshot.jpg" /><span>返回 JPG / PNG 图片</span></div></section>
    <section className="plain-section"><div className="section-heading"><div><h2>知识库来源</h2><span>{config.knowledgeSources.length} 个</span></div><button className="secondary-button small" onClick={addSource}><Plus size={14} />添加来源</button></div>
      {!config.knowledgeSources.length && <p className="muted">无需预先打包知识库。添加多个兼容 HTTP GET q 参数的检索接口即可。</p>}
      <div className="source-list">{config.knowledgeSources.map((source) => <article className="source-row" key={source.id}><div className="source-row-top"><input className="source-name" value={source.name} onChange={(e) => updateSource(source.id, 'name', e.target.value)} placeholder="来源名称，如：课程资料库" /><label className="check-label"><input type="checkbox" checked={source.enabled} onChange={(e) => updateSource(source.id, 'enabled', e.target.checked)} />启用</label><button className="icon-button danger" onClick={() => setConfig((old) => ({ ...old, knowledgeSources: old.knowledgeSources.filter((item) => item.id !== source.id) }))}><Trash2 size={16} /></button></div><input value={source.url} onChange={(e) => updateSource(source.id, 'url', e.target.value)} placeholder="https://kb.example.com/api/search" /><div className="source-row-bottom"><input type="password" value={source.token} onChange={(e) => updateSource(source.id, 'token', e.target.value)} placeholder="Bearer Token（可选）" /><button className="text-link" onClick={() => test(source.id, source.url, source.token)}>{testing === source.id ? '测试中…' : '测试'}</button></div></article>)}</div>
    </section>
    <section className="plain-section"><div className="section-heading"><div><h2>跨知识库检索</h2></div><span>不选来源时检索全部已启用来源</span></div><div className="search-console"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="输入要查找的知识内容" /><button className="primary-button" onClick={search} disabled={testing === 'search'}>{testing === 'search' ? <Loader2 size={16} className="spin" /> : <Search size={16} />}检索</button></div>
      {!!config.knowledgeSources.length && <div className="source-checkboxes">{config.knowledgeSources.filter((s) => s.enabled).map((source) => <label key={source.id} className="check-label"><input type="checkbox" checked={selected.includes(source.id)} onChange={(e) => setSelected((old) => e.target.checked ? [...old, source.id] : old.filter((id) => id !== source.id))} />{source.name || '未命名来源'}</label>)}</div>}
      {!!groups.length && <div className="search-results">{groups.map((group) => <article key={group.sourceId}><h3>{group.sourceName}<span>{group.ok ? '已返回' : group.error}</span></h3>{group.ok ? <pre>{JSON.stringify(group.results, null, 2)}</pre> : <p className="muted">这个来源暂时不可用，其他来源的结果不受影响。</p>}</article>)}</div>}
    </section>
    <section className="plain-section"><div className="section-heading"><div><h2>联网 / 本地大模型</h2></div><label className="check-label"><input type="checkbox" checked={config.model.enabled} onChange={(e) => setConfig({ ...config, model: { ...config.model, enabled: e.target.checked } })} />启用接口</label></div><p className="field-help">使用 OpenAI 兼容的 /chat/completions 接口，可连接本地 Ollama、LM Studio 或外部模型服务。模型只通过后端调用，生成内容不会自动覆盖笔记。</p><div className="form-grid two"><div className="field"><label className="field-label">Base URL</label><input value={config.model.baseUrl} onChange={(e) => setConfig({ ...config, model: { ...config.model, baseUrl: e.target.value } })} placeholder="http://127.0.0.1:11434/v1" /></div><div className="field"><label className="field-label">模型名称</label><input value={config.model.model} onChange={(e) => setConfig({ ...config, model: { ...config.model, model: e.target.value } })} placeholder="qwen3:4b" /></div></div><div className="field"><label className="field-label">API Key <span>本地模型通常可留空</span></label><input type="password" value={config.model.apiKey} onChange={(e) => setConfig({ ...config, model: { ...config.model, apiKey: e.target.value } })} /></div></section>
    <section className="plain-section api-compact"><div className="section-heading"><div><h2>应用接口</h2></div><span>本地 REST · Bearer Token · JSON</span></div><p><code>GET /api/questions</code>　<code>POST /api/questions/:id/review</code>　<code>GET /api/workspaces</code>　<code>PUT /api/boards/:id</code></p><p className="field-help">公网部署时请设置 API_TOKEN 并使用 HTTPS 反向代理。健康检查无需鉴权，其余接口默认需要访问令牌。</p></section>
  </div>;
}
