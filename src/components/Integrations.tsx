import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Plus, Save, Search, Trash2, XCircle } from 'lucide-react';
import { api } from '../api';
import type { IntegrationConfig, KnowledgeSearchGroup } from '../types';

type TestKind = 'camera' | 'knowledge' | 'model';
type ConnectionStatus = { ok: boolean; message: string };

function KnowledgeResults({ results }: { results: unknown }) {
  if (!Array.isArray(results)) return <pre>{JSON.stringify(results, null, 2)}</pre>;
  if (!results.length) return <p className="muted">没有找到相关内容，可以换一个关键词。</p>;
  return <div className="knowledge-items">{results.map((item, index) => {
    if (!item || typeof item !== 'object') return <p key={index}>{String(item)}</p>;
    const data = item as Record<string, unknown>;
    const title = String(data.title || data.name || `检索结果 ${index + 1}`);
    const content = data.content || data.text || data.snippet || data.summary;
    const url = typeof data.url === 'string' ? data.url : '';
    return <article key={index}><strong>{title}</strong>{content ? <p>{String(content)}</p> : <pre>{JSON.stringify(item, null, 2)}</pre>}{url && <a href={url} target="_blank" rel="noreferrer">打开原文</a>}</article>;
  })}</div>;
}

export default function Integrations({ notify }: { notify: (message: string, type?: 'success' | 'error') => void }) {
  const [config, setConfig] = useState<IntegrationConfig>({ cameraUrl: '', cameraToken: '', knowledgeSources: [], model: { enabled: false, baseUrl: 'http://127.0.0.1:11434/v1', apiKey: '', model: 'qwen3:4b' } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState('');
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [groups, setGroups] = useState<KnowledgeSearchGroup[]>([]);

  useEffect(() => { api.integrations().then(setConfig).catch((error) => notify(error.message, 'error')).finally(() => setLoading(false)); }, []);
  const save = async () => {
    setSaving(true);
    try { setConfig(await api.saveIntegrations(config)); notify('连接设置已保存'); }
    catch (error) { notify((error as Error).message, 'error'); }
    finally { setSaving(false); }
  };
  const addSource = () => setConfig((old) => ({ ...old, knowledgeSources: [...old.knowledgeSources, { id: crypto.randomUUID(), name: '', url: '', token: '', enabled: true }] }));
  const updateSource = (id: string, key: string, value: unknown) => setConfig((old) => ({ ...old, knowledgeSources: old.knowledgeSources.map((source) => source.id === id ? { ...source, [key]: value } : source) }));

  const test = async (id: string, kind: TestKind, url: string, token = '', model = '') => {
    if (!url.trim()) {
      notify('请先填写服务地址', 'error');
      setStatuses((old) => ({ ...old, [id]: { ok: false, message: '请先填写服务地址' } }));
      return;
    }
    if (kind === 'model' && !model.trim()) return notify('请填写模型名称，需与模型软件中显示的一致', 'error');
    setTesting(id);
    setStatuses((old) => { const next = { ...old }; delete next[id]; return next; });
    try {
      setConfig(await api.saveIntegrations(config));
      const result = await api.testIntegration({ kind, url, token, model });
      const message = result.message || '连接成功';
      setStatuses((old) => ({ ...old, [id]: { ok: true, message } }));
      notify(message);
    } catch (error) {
      const message = (error as Error).message;
      setStatuses((old) => ({ ...old, [id]: { ok: false, message } }));
      notify(message, 'error');
    } finally { setTesting(''); }
  };
  const search = async () => {
    if (!query.trim()) return notify('请输入要查找的内容', 'error');
    setTesting('search');
    setGroups([]);
    try {
      setConfig(await api.saveIntegrations(config));
      setGroups((await api.searchKnowledge(query, selected)).sources);
    } catch (error) { notify((error as Error).message, 'error'); }
    finally { setTesting(''); }
  };
  const status = (id: string) => statuses[id] && <p className={`connection-status ${statuses[id].ok ? 'success' : 'error'}`}>{statuses[id].ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{statuses[id].message}</p>;

  if (loading) return <div className="page-loading"><Loader2 className="spin" />正在读取配置</div>;
  return <div className="integration-page simple-page">
    <div className="page-title-row"><div><h1>连接</h1><p>按用途逐项设置。保存并测试成功后，就可以直接使用。</p></div><button className="primary-button" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}保存全部</button></div>
    <details className="beginner-guide"><summary>第一次使用？先看这份简单说明</summary><div><p><strong>摄像机：</strong>需要一个打开后能直接看到照片的网址，不是摄像机管理页面。</p><p><strong>知识库：</strong>可以同时连接多个资料库，不需要提前合并或打包。没有知识库也能正常使用其他功能。</p><p><strong>大模型：</strong>先启动 Ollama、LM Studio 或联网模型服务，再填写地址和模型名称。点击下面的软件名称可自动填入常用地址。</p></div></details>

    <section className="plain-section">
      <div className="section-heading"><div><h2>1. 外部摄像机</h2><span>可选</span></div><button className="secondary-button small" disabled={testing === 'camera'} onClick={() => test('camera', 'camera', config.cameraUrl, config.cameraToken)}>{testing === 'camera' ? <Loader2 className="spin" size={13} /> : null}{testing === 'camera' ? '正在测试' : '保存并测试'}</button></div>
      <p className="field-help">用于收录错题时直接获取照片。粘贴一个能直接显示 JPG 或 PNG 图片的网址。</p>
      <div className="field"><label className="field-label">照片地址</label><input value={config.cameraUrl} onChange={(event) => setConfig({ ...config, cameraUrl: event.target.value })} placeholder="例如：http://192.168.1.20/snapshot.jpg" /></div>
      <div className="field"><label className="field-label">访问密钥 <span>摄像机没有要求时留空</span></label><input type="password" value={config.cameraToken} onChange={(event) => setConfig({ ...config, cameraToken: event.target.value })} placeholder="可选" /></div>
      {status('camera')}
    </section>

    <section className="plain-section">
      <div className="section-heading"><div><h2>2. 知识库</h2><span>{config.knowledgeSources.length} 个来源</span></div><button className="secondary-button small" onClick={addSource}><Plus size={14} />添加知识库</button></div>
      <p className="field-help">每个知识库单独填写、单独测试，不必先打包。检索时可以选择一个，也可以一起查找。</p>
      {!config.knowledgeSources.length && <div className="integration-empty">还没有连接知识库。此步骤可跳过，不影响错题、复习和白板。</div>}
      <div className="source-list">{config.knowledgeSources.map((source) => <article className="source-row" key={source.id}>
        <div className="source-row-top"><input className="source-name" value={source.name} onChange={(event) => updateSource(source.id, 'name', event.target.value)} placeholder="起个好认的名字，如：操作系统课件" /><label className="check-label"><input type="checkbox" checked={source.enabled} onChange={(event) => updateSource(source.id, 'enabled', event.target.checked)} />参与检索</label><button className="icon-button danger" title="移除知识库" onClick={() => setConfig((old) => ({ ...old, knowledgeSources: old.knowledgeSources.filter((item) => item.id !== source.id) }))}><Trash2 size={16} /></button></div>
        <label className="mini-label">检索地址</label><input value={source.url} onChange={(event) => updateSource(source.id, 'url', event.target.value)} placeholder="例如：https://kb.example.com/api/search" />
        <div className="source-row-bottom"><input type="password" value={source.token} onChange={(event) => updateSource(source.id, 'token', event.target.value)} placeholder="访问密钥（没有就留空）" /><button className="secondary-button small" disabled={testing === source.id} onClick={() => test(source.id, 'knowledge', source.url, source.token)}>{testing === source.id ? <Loader2 className="spin" size={12} /> : null}{testing === source.id ? '测试中' : '保存并测试'}</button></div>
        {status(source.id)}
      </article>)}</div>
    </section>

    {!!config.knowledgeSources.length && <section className="plain-section">
      <div className="section-heading"><div><h2>试一次检索</h2></div><span>不勾选时查找全部已启用来源</span></div>
      <div className="search-console"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && search()} placeholder="输入要查找的知识内容" /><button className="primary-button" onClick={search} disabled={testing === 'search'}>{testing === 'search' ? <Loader2 size={16} className="spin" /> : <Search size={16} />}检索</button></div>
      <div className="source-checkboxes">{config.knowledgeSources.filter((source) => source.enabled).map((source) => <label key={source.id} className="check-label"><input type="checkbox" checked={selected.includes(source.id)} onChange={(event) => setSelected((old) => event.target.checked ? [...old, source.id] : old.filter((id) => id !== source.id))} />{source.name || '未命名知识库'}</label>)}</div>
      {!!groups.length && <div className="search-results">{groups.map((group) => <article key={group.sourceId}><h3>{group.sourceName}<span>{group.ok ? '检索完成' : group.error}</span></h3>{group.ok ? <KnowledgeResults results={group.results} /> : <p className="muted">这个来源暂时不可用，其他来源的结果不受影响。</p>}</article>)}</div>}
    </section>}

    <section className="plain-section">
      <div className="section-heading"><div><h2>3. 联网或本地大模型</h2><span>可选</span></div><label className="check-label"><input type="checkbox" checked={config.model.enabled} onChange={(event) => setConfig({ ...config, model: { ...config.model, enabled: event.target.checked } })} />启用模型连接</label></div>
      <p className="field-help">支持 OpenAI 兼容接口。本地模型通常不需要密钥，模型名称必须与软件中已安装的名称一致。</p>
      <div className="model-presets"><span>自动填常用地址：</span><button onClick={() => setConfig({ ...config, model: { ...config.model, baseUrl: 'http://127.0.0.1:11434/v1' } })}>Ollama</button><button onClick={() => setConfig({ ...config, model: { ...config.model, baseUrl: 'http://127.0.0.1:1234/v1' } })}>LM Studio</button></div>
      <div className="form-grid two"><div className="field"><label className="field-label">服务地址</label><input value={config.model.baseUrl} onChange={(event) => setConfig({ ...config, model: { ...config.model, baseUrl: event.target.value } })} placeholder="http://127.0.0.1:11434/v1" /></div><div className="field"><label className="field-label">模型名称</label><input value={config.model.model} onChange={(event) => setConfig({ ...config, model: { ...config.model, model: event.target.value } })} placeholder="与模型软件中的名称一致" /></div></div>
      <div className="field"><label className="field-label">访问密钥 <span>本地模型通常留空</span></label><input type="password" value={config.model.apiKey} onChange={(event) => setConfig({ ...config, model: { ...config.model, apiKey: event.target.value } })} /></div>
      <button className="secondary-button" disabled={testing === 'model'} onClick={() => test('model', 'model', config.model.baseUrl, config.model.apiKey, config.model.model)}>{testing === 'model' ? <Loader2 className="spin" size={14} /> : null}{testing === 'model' ? '正在请模型回应' : '保存并测试模型'}</button>
      {status('model')}
    </section>

    <details className="developer-api"><summary>开发者接口（普通使用无需设置）</summary><p><code>GET /api/questions</code>　<code>POST /api/questions/:id/review</code>　<code>GET /api/workspaces</code>　<code>PUT /api/boards/:id</code></p><p className="field-help">开放到公网时必须设置 API_TOKEN 并配置 HTTPS，避免学习资料被未授权访问。</p></details>
  </div>;
}
