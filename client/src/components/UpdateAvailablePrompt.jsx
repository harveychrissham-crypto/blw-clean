import { useEffect, useState } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import { UPDATE_AVAILABLE_EVENT } from '../native';
import Button from './ui/Button';

export default function UpdateAvailablePrompt() {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const handler = (event) => setDetails(event.detail);
    window.addEventListener(UPDATE_AVAILABLE_EVENT, handler);
    return () => window.removeEventListener(UPDATE_AVAILABLE_EVENT, handler);
  }, []);

  if (!details) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/85 px-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="update-available-title">
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#151322] p-6 shadow-2xl">
        <Button variant="custom" size="none"
          type="button"
          onClick={() => setDetails(null)}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Close"
        >
          <FiX className="h-4 w-4" />
        </Button>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-500">
          <FiDownload className="h-7 w-7" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-gold-500">Update available</p>
        <h2 id="update-available-title" className="mt-2 text-2xl font-extrabold text-white">
          A new version is ready
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          You're on version {details.currentVersion}. Version {details.latestVersion} is available with the latest
          features and fixes.
        </p>

        <div className="mt-6 flex gap-3">
          {/* A real anchor, not a JS window.open() call: Capacitor's default
              WebViewClient reliably hands off <a target="_blank"> navigation
              to the system browser / Play Store app on Android, whereas
              window.open() from script is not consistently intercepted
              without adding the @capacitor/browser plugin. */}
          <a
            href={details.updateUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setDetails(null)}
            className="flex-1 rounded-full bg-gradient-to-r from-gold-500 to-[#FF8B5C] px-5 py-3 text-center text-sm font-bold text-slate-950 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Update Now
          </a>
          <Button variant="custom" size="none"
            type="button"
            onClick={() => setDetails(null)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
