import { useEffect, useState } from 'react';
import { Aperture, Database, CheckCircle2, ChevronRight, Clipboard, Cloud, Code2, ExternalLink, Globe2, KeyRound, Loader2, Network, PlugZap, Save, Search, Server, ShieldCheck, Unplug } from 'lucide-react';
import { api } from '../api';
import type { IntegrationConfig } from '../types';

interface Props { notify: (message: string, type?: 'success' | 'error') => void }

export default function Integrations({ notify }: Props) {
  const [config, setConfig] = useState<IntegrationConfig>({ cameraUrl: '', knowledgeUrl: '', knowledgeToken: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState('');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<unknown>(null);
  const [captured, setCaptured] = useState('');
  useEffect(() => { api.integrations().then(setConfig).catch((e) => notify(e.message, 'error')).finally(() => setLoading(false)); }, []);
  const update = (key: keyof IntegrationConfig, value: string) => setConfig((old) => ({ ...old, [key]: value }));
  const save = async () => {
    setSaving(true);
    try { setConfig(await api.saveIntegrations(config)); notify('连接配置已保存'); }
    catch (e) { notify((e as Error).message, 'error'); }
    finally { setSaving(false); }
  };
  const test = async (type: 'camera' | 'knowledge') => {
    const url = type === 'camera' ? config.cameraUrl : config.knowledgeUrl;
    if (!url) return notify('请先填写接口地址', 'error');
    setTesting(type);
    try { const result = await api.testIntegration(url, type === 'knowledge' ? config.knowledgeToken : ''); notify(`连接成功 · HTTP ${result.status}`); }
    catch (e) { notify((e as Error).message, 'error'); }
    finally { setTesting(''); }
  };
  const capture = async () => {
    setTesting('capture');
    try { setCaptured((await api.captureCamera(config.cameraUrl)).image); notify('已从外部摄像机获取快照'); }
    catch (e) { notify((e as Error).message, 'error'); }
    finally { setTesting(''); }
  };
  const search = async () => {
    if (!query.trim()) return notify('请输入要检索的知识内容', 'error');
    setSearching(true);
    try { setResults((await api.searchKnowledge(query)).results); }
    catch (e) { notify((e as Error).message, 'error'); }
    finally { setSearching(false); }
  };
  const copy = (text: string) => { navigator.clipboard.writeText(text).then(() => notify('接口示例已复制')); };
  if (loading) return <div className="page-loading"><Loader2 className="spin" />正在读取接口配置</div>;
  return <div className="integration-page">
    <div className="page-title-row"><div><span className="eyebrow">OPEN CONNECTIONS</span><h1>连接你的学习工具</h1><p>接入摄像机和外网知识库，让错题来源不只局限于这一台设备。</p></div><button className="primary-button" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}保存配置</button></div>
    <div className="integration-status"><div><span className="live-dot" /><strong>本地接口运行中</strong><span>REST API · JSON</span></div><div><ShieldCheck size={16} />桌面版默认仅监听本机回环地址</div></div>
    <div className="connector-grid">
      <section className="connector-card">
        <header><div className="connector-icon camera"><Aperture size={23} /></div><div><h2>外部摄像机</h2><p>HTTP 快照 / 网络摄像头</p></div><span className={`connection-pill ${config.cameraUrl ? 'configured' : ''}`}>{config.cameraUrl ? '已配置' : '未配置'}</span></header>
        <div className="connector-body"><label className="field-label">快照接口地址</label><div className="input-with-icon"><Globe2 size={17} /><input value={config.cameraUrl} onChange={(e) => update('cameraUrl', e.target.value)} placeholder="http://camera.example.com/snapshot.jpg" /></div><p className="field-help">接口需直接返回 JPG 或 PNG 图片。录入错题时可一键抓取画面。</p>
          {captured && <div className="captured-preview"><img src={captured} alt="外部摄像机快照" /><button onClick={() => setCaptured('')}>收起预览</button></div>}
          <div className="connector-actions"><button className="secondary-button" onClick={() => test('camera')} disabled={!!testing}>{testing === 'camera' ? <Loader2 className="spin" size={16} /> : <PlugZap size={16} />}测试连接</button><button className="text-button" onClick={capture} disabled={!!testing}>{testing === 'capture' ? <Loader2 className="spin" size={16} /> : <Aperture size={16} />}获取快照</button></div>
        </div>
      </section>
      <section className="connector-card">
        <header><div className="connector-icon knowledge"><Database size={23} /></div><div><h2>外部知识库</h2><p>外网检索 / RAG / 学习资料</p></div><span className={`connection-pill ${config.knowledgeUrl ? 'configured' : ''}`}>{config.knowledgeUrl ? '已配置' : '未配置'}</span></header>
        <div className="connector-body"><label className="field-label">知识检索接口</label><div className="input-with-icon"><Cloud size={17} /><input value={config.knowledgeUrl} onChange={(e) => update('knowledgeUrl', e.target.value)} placeholder="https://kb.example.com/api/search" /></div><label className="field-label token-label">访问令牌 <span>可选，Bearer Token</span></label><div className="input-with-icon"><KeyRound size={17} /><input type="password" value={config.knowledgeToken} onChange={(e) => update('knowledgeToken', e.target.value)} placeholder="只在发起请求时使用" /></div><p className="field-help">系统会以 GET 方式附加 q 参数，兼容数组或 results / items / data 返回结构。</p>
          <div className="connector-actions"><button className="secondary-button" onClick={() => test('knowledge')} disabled={!!testing}>{testing === 'knowledge' ? <Loader2 className="spin" size={16} /> : <Network size={16} />}测试连接</button></div>
        </div>
      </section>
    </div>
    <section className="knowledge-playground"><div className="playground-heading"><div><Search size={20} /><span><strong>知识库检索台</strong><small>验证外网知识库是否能返回可用结果</small></span></div><span>GET ?q=关键词</span></div><div className="search-console"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="例如：二次函数区间最值" /><button className="primary-button" onClick={search} disabled={searching}>{searching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}检索知识</button></div>{results !== null && <pre className="results-view">{JSON.stringify(results, null, 2)}</pre>}</section>
    <section className="api-section"><div className="section-heading"><div><Code2 size={20} /><h2>对外开放接口</h2></div><span>供其他设备和应用读写错题</span></div>
      <div className="api-grid"><div className="endpoint-list">
        {[['GET', '/api/questions', '获取与筛选错题'], ['POST', '/api/questions', '创建错题与照片'], ['PUT', '/api/questions/:id', '编辑并保存版本'], ['POST', '/api/questions/:id/rollback', '恢复指定历史版本']].map(([method, url, desc]) => <div className="endpoint" key={url + method}><b className={method.toLowerCase()}>{method}</b><code>{url}</code><span>{desc}</span></div>)}
      </div><div className="code-sample"><div><span>启动可访问的接口服务</span><button onClick={() => copy('API_HOST=0.0.0.0 API_TOKEN=your-long-token npm run api')}><Clipboard size={15} />复制</button></div><pre><code><em>API_HOST</em>=0.0.0.0 <em>API_TOKEN</em>=your-long-token{`\n`}npm run api{`\n\n`}<span># 请求时携带访问令牌</span>{`\n`}Authorization: Bearer your-long-token</code></pre></div></div>
      <div className="security-note"><ShieldCheck size={19} /><p><strong>外网部署提示</strong>不要直接把裸接口暴露到公网。请设置高强度 API_TOKEN，并通过 HTTPS 反向代理访问；摄像机与知识库密钥仅保存在本机配置中。</p></div>
    </section>
  </div>;
}
