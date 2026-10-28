import { useEffect, useRef, useState } from 'react';
import { Aperture, Camera, ImagePlus, Loader2, RefreshCw, ScanLine, Trash2, Upload, X } from 'lucide-react';
import { api, assetUrl } from '../api';
import type { Question } from '../types';
import { compressImage } from '../utils';

interface Props {
  question: Question | null;
  onClose: () => void;
  onSaved: (question: Question) => void;
  onError: (message: string) => void;
}

export default function QuestionEditor({ question, onClose, onSaved, onError }: Props) {
  const [form, setForm] = useState<Partial<Question>>(question ? { ...question } : {
    title: '', subject: '', chapter: '', content: '', answer: '', analysis: '',
    errorType: '', difficulty: '', mastery: '未掌握', tags: [], image: '', source: '手动整理',
  });
  const [tags, setTags] = useState((question?.tags || []).join('，'));
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const set = (key: keyof Question, value: unknown) => setForm((old) => ({ ...old, [key]: value }));

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const upload = async (file?: File) => {
    if (!file) return;
    try { set('image', await compressImage(file)); } catch (error) { onError((error as Error).message); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1600 } }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => { if (videoRef.current) videoRef.current.srcObject = stream; });
    } catch { onError('无法打开摄像头，请检查系统相机权限，或改用照片上传'); }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    set('image', canvas.toDataURL('image/jpeg', 0.86));
    stopCamera();
  };

  const captureRemote = async () => {
    setCapturing(true);
    try {
      const { image } = await api.captureCamera('');
      set('image', image);
    } catch (error) { onError(`${(error as Error).message}。请先在“集成接口”配置摄像机快照地址`); }
    finally { setCapturing(false); }
  };

  const save = async () => {
    if (!form.title?.trim() && !form.content?.trim() && !form.image) return onError('至少填写标题、题目内容，或添加一张照片');
    setSaving(true);
    try {
      const payload = { ...form, tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) };
      const saved = question ? await api.update(question.id, { ...payload, revisionSummary: '编辑题目与解析' }) : await api.create(payload);
      onSaved(saved);
    } catch (error) { onError((error as Error).message); }
    finally { setSaving(false); }
  };

  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="editor-modal" aria-label={question ? '编辑错题' : '收录错题'}>
      <header className="modal-header">
        <div><span className="eyebrow">{question ? 'EDIT NOTE' : 'NEW NOTE'}</span><h2>{question ? '编辑错题' : '收录一道新错题'}</h2></div>
        <button className="icon-button" onClick={onClose}><X size={21} /></button>
      </header>
      <div className="editor-body">
        <div className="photo-column">
          <label className="field-label">题目照片 <span>保留原始思路与批注</span></label>
          <div className={`photo-drop ${form.image ? 'has-image' : ''}`}>
            {form.image ? <>
              <img src={assetUrl(form.image)} alt="错题照片预览" />
              <div className="photo-actions"><button onClick={() => fileRef.current?.click()}><RefreshCw size={15} />更换</button><button onClick={() => set('image', '')}><Trash2 size={15} />移除</button></div>
            </> : <div className="photo-empty"><div><ImagePlus size={28} /></div><strong>把错题拍下来</strong><p>支持 JPG、PNG，自动压缩存储</p><button className="secondary-button" onClick={() => fileRef.current?.click()}><Upload size={16} />选择照片</button></div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
          <div className="capture-grid">
            <button onClick={startCamera}><Camera size={17} /><span>设备摄像头</span></button>
            <button onClick={captureRemote} disabled={capturing}>{capturing ? <Loader2 size={17} className="spin" /> : <Aperture size={17} />}<span>外部摄像机</span></button>
          </div>
          <div className="photo-hint"><ScanLine size={17} /><span>拍照时保持纸面平整、光线均匀，题目边缘完整入镜。</span></div>
        </div>
        <div className="fields-column">
          <div className="field full"><label className="field-label">错题标题 <span>留空时自动命名为“未命名错题”</span></label><input value={form.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="按自己的习惯命名" autoFocus /></div>
          <div className="form-grid three">
            <div className="field"><label className="field-label">科目 / 课程</label><input value={form.subject || ''} onChange={(e) => set('subject', e.target.value)} placeholder="自己填写，不限学科" /></div>
            <div className="field"><label className="field-label">难度</label><input value={form.difficulty || ''} onChange={(e) => set('difficulty', e.target.value)} placeholder="可选，自己填写" /></div>
            <div className="field"><label className="field-label">掌握程度</label><select value={form.mastery} onChange={(e) => set('mastery', e.target.value)}><option>未掌握</option><option>复习中</option><option>已掌握</option></select></div>
          </div>
          <div className="form-grid two">
            <div className="field"><label className="field-label">章节 / 知识点</label><input value={form.chapter || ''} onChange={(e) => set('chapter', e.target.value)} placeholder="按自己的知识体系填写" /></div>
            <div className="field"><label className="field-label">错误类型</label><input value={form.errorType || ''} onChange={(e) => set('errorType', e.target.value)} placeholder="如：边界遗漏、概念混淆" /></div>
          </div>
          <div className="field full"><label className="field-label">题目内容 <span>只保存照片也可以</span></label><textarea className="question-textarea" value={form.content || ''} onChange={(e) => set('content', e.target.value)} placeholder="输入题目，或根据照片整理题目文字……" /></div>
          <div className="field full"><label className="field-label">正确答案与解题过程</label><textarea value={form.answer || ''} onChange={(e) => set('answer', e.target.value)} placeholder="记录关键步骤、公式与答案……" /></div>
          <div className="field full"><label className="field-label">我的错因复盘</label><textarea className="analysis-textarea" value={form.analysis || ''} onChange={(e) => set('analysis', e.target.value)} placeholder="当时为什么做错？下次如何避免？" /></div>
          <div className="field full"><label className="field-label">标签 <span>用逗号分隔</span></label><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="分类讨论，函数，易错题" /></div>
        </div>
      </div>
      <footer className="modal-footer"><span>{question ? '保存后会自动生成一个新版本，可随时回滚。' : '所有内容仅保存在你的本地学习空间。'}</span><div><button className="text-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving} onClick={save}>{saving && <Loader2 size={16} className="spin" />}{saving ? '正在保存' : question ? '保存更改' : '收录错题'}</button></div></footer>
      {cameraOpen && <div className="camera-overlay"><div className="camera-box"><header><strong>拍摄错题</strong><button className="icon-button" onClick={stopCamera}><X size={20} /></button></header><video ref={videoRef} autoPlay playsInline muted /><div className="viewfinder" /><footer><button className="text-button" onClick={stopCamera}>取消</button><button className="shutter" onClick={takePhoto} aria-label="拍照"><span /></button><span /></footer></div></div>}
    </section>
  </div>;
}
