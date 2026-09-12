import { useEffect, useState } from 'react';
import { FiCheck, FiRefreshCw, FiWifiOff, FiX } from 'react-icons/fi';
import { hapticError, hapticSuccess } from '../utils/haptics';

const actionLabel = (action) => action === 'comment' ? 'comment' : action === 'save' ? 'save' : 'like';

export default function FeedActionToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;
    const show = (next, duration = 2800) => {
      window.clearTimeout(timer);
      setToast(next);
      timer = window.setTimeout(() => setToast(null), duration);
    };

    const onQueued = (event) => {
      const action = actionLabel(event.detail?.action);
      hapticSuccess();
      show({ kind: 'queued', icon: FiWifiOff, text: action === 'comment' ? 'Comment saved — it will sync when you’re back online.' : `${action[0].toUpperCase()}${action.slice(1)} saved — it will sync when you’re back online.` });
    };
    const onSynced = (event) => {
      const action = actionLabel(event.detail?.action);
      show({ kind: 'synced', icon: FiCheck, text: `Back online — your ${action} synced.` }, 2200);
    };
    const onDropped = (event) => {
      const action = actionLabel(event.detail?.action);
      hapticError();
      show({ kind: 'dropped', icon: FiX, text: `Couldn’t sync your ${action}. Please try again.` }, 3600);
    };

    window.addEventListener('feed-action-queued', onQueued);
    window.addEventListener('feed-action-synced', onSynced);
    window.addEventListener('feed-action-dropped', onDropped);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('feed-action-queued', onQueued);
      window.removeEventListener('feed-action-synced', onSynced);
      window.removeEventListener('feed-action-dropped', onDropped);
    };
  }, []);

  if (!toast) return null;
  const Icon = toast.icon;
  const tone = toast.kind === 'dropped' ? 'border-red-400/20 bg-red-400/10 text-red-100' : 'border-white/10 bg-[#171526]/95 text-white';

  return <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[140] w-[min(92vw,420px)] -translate-x-1/2 pointer-events-none" role="status" aria-live="polite">
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${tone}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"><Icon className="h-4 w-4" /></span>
      <p className="min-w-0 flex-1 text-xs font-semibold leading-5">{toast.text}</p>
      {toast.kind === 'queued' && <FiRefreshCw className="h-4 w-4 shrink-0 animate-spin text-white/35" />}
    </div>
  </div>;
}
