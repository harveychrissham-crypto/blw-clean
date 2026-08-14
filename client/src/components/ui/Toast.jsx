// Lightweight toast for inline confirmations on form submits (Record Souls,
// Edit Profile, Check-In, etc). Controlled by the parent — pass the message
// and it renders, auto-dismissing itself after `duration`.
//
// Usage:
//   const [toast, setToast] = useState(null); // { type: 'success'|'error', message }
//   <Toast toast={toast} onClose={() => setToast(null)} />
//   setToast({ type: 'success', message: 'Soul entry saved.' })

import { useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';

const STYLES = {
  success: {
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-950/90',
    text: 'text-emerald-200',
    icon: FiCheckCircle,
    iconColor: 'text-emerald-400',
  },
  error: {
    border: 'border-red-500/25',
    bg: 'bg-red-950/90',
    text: 'text-red-200',
    icon: FiAlertCircle,
    iconColor: 'text-red-400',
  },
};

export function Toast({ toast, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => onClose?.(), duration);
    return () => window.clearTimeout(timer);
  }, [toast, duration, onClose]);

  if (!toast) return null;
  const style = STYLES[toast.type] || STYLES.success;
  const Icon = style.icon;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[200] flex justify-center px-4 sm:bottom-8">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex items-center gap-3 rounded-full border ${style.border} ${style.bg} px-4 py-3 shadow-2xl backdrop-blur-xl animate-toast-in`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${style.iconColor}`} />
        <p className={`text-sm font-medium ${style.text}`}>{toast.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <FiX className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default Toast;
