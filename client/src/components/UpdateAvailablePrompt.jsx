import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiDownload, FiX } from 'react-icons/fi';
import { UPDATE_AVAILABLE_EVENT, clearPendingAppUpdate, getPendingAppUpdate, installApk } from '../appUpdater';
import Button from './ui/Button';

export default function UpdateAvailablePrompt() {
  const [details, setDetails] = useState(() => getPendingAppUpdate());
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (event) => {
      setError('');
      setInstalling(false);
      setDetails(event.detail || getPendingAppUpdate());
    };

    window.addEventListener(UPDATE_AVAILABLE_EVENT, handler);
    const pending = getPendingAppUpdate();
    if (pending) setDetails(pending);

    return () => window.removeEventListener(UPDATE_AVAILABLE_EVENT, handler);
  }, []);

  if (!details || typeof document === 'undefined') return null;

  const dismiss = () => {
    clearPendingAppUpdate();
    setDetails(null);
  };

  const handleInstall = async () => {
    setInstalling(true);
    setError('');

    try {
      const result = await installApk(details.updateUrl);
      if (result?.requiresPermission) {
        setError('Allow BLW Kenya Zone to install apps from this source in Android settings, then tap Install update again.');
        return;
      }
      dismiss();
    } catch (installError) {
      setError(installError?.message || 'The update could not be installed. Please try again.');
    } finally {
      setInstalling(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] grid place-items-center bg-slate-950/85 px-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-available-title"
      style={{ zIndex: 2147483647 }}
    >
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#151322] p-6 shadow-2xl">
        <Button
          variant="custom"
          size="none"
          type="button"
          onClick={dismiss}
          disabled={installing}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-40"
          aria-label="Close"
        >
          <FiX className="h-4 w-4" />
        </Button>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-500">
          <FiDownload className="h-7 w-7" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-gold-500">New app version</p>
        <h2 id="update-available-title" className="mt-2 text-2xl font-extrabold text-white">
          Please install the latest app
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          You're on version {details.currentVersion}. Version {details.latestVersion} is ready with the latest features and fixes.
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="flex-1"
          >
            {installing ? 'Preparing update…' : 'Install update'}
          </Button>
          <Button
            variant="custom"
            size="none"
            type="button"
            onClick={dismiss}
            disabled={installing}
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-40"
          >
            Later
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
