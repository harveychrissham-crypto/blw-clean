import { useEffect, useState } from 'react';
import { FiBell, FiX } from 'react-icons/fi';
import { requestPushNotificationPermission, setUpPushNotifications } from '../native';

const PROMPT_EVENT = 'blw:push-permission-prompt';
const DENIED_EVENT = 'blw:push-permission-denied';

export default function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const showPrompt = () => {
      setDenied(false);
      setVisible(true);
    };
    const showDenied = () => {
      setDenied(true);
      setVisible(true);
    };

    window.addEventListener(PROMPT_EVENT, showPrompt);
    window.addEventListener(DENIED_EVENT, showDenied);
    return () => {
      window.removeEventListener(PROMPT_EVENT, showPrompt);
      window.removeEventListener(DENIED_EVENT, showDenied);
    };
  }, []);

  if (!visible) return null;

  const handleAllow = async () => {
    setBusy(true);
    try {
      const permission = await requestPushNotificationPermission();
      if (permission === 'granted') {
        setVisible(false);
        setDenied(false);
        await setUpPushNotifications();
      } else {
        setDenied(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/85 px-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="notification-permission-title">
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#151322] p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Close"
        >
          <FiX className="h-4 w-4" />
        </button>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F2A31C]/15 text-[#F2A31C]">
          <FiBell className="h-7 w-7" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-[#F2A31C]">Stay updated</p>
        <h2 id="notification-permission-title" className="mt-2 text-2xl font-extrabold text-white">
          Stay updated with BLW
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          Allow notifications to receive ministry announcements, fellowship updates, and important updates from BLW Kenya Zone.
        </p>

        {denied ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-white">Notifications are currently off.</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Android has blocked the permission request. Open your phone's Settings, find BLW Kenya Zone, then enable Notifications.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex gap-3">
          {!denied && (
            <button
              type="button"
              disabled={busy}
              onClick={handleAllow}
              className="flex-1 rounded-full bg-gradient-to-r from-[#F2A31C] to-[#FF8B5C] px-5 py-3 text-sm font-bold text-slate-950 transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {busy ? 'Requesting…' : 'Allow Notifications'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {denied ? 'Close' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  );
}
