import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastState { message: string; type: 'success' | 'error' }

export default function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type}`} role="status">
    {toast.type === 'success' ? <CheckCircle2 size={19} /> : <XCircle size={19} />}
    <span>{toast.message}</span><button onClick={onClose}><X size={16} /></button>
  </div>;
}
