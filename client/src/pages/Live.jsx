import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRadio, FiClock, FiPlayCircle, FiCalendar, FiX, FiUsers, FiVideo } from 'react-icons/fi';
import { fetchLiveStream, submitLiveViewer } from '../utils/live';

const schedule = [
  { day: 'Sunday', time: '10:00 AM', title: 'Main Worship Service' },
  { day: 'Wednesday', time: '7:30 PM', title: 'Midweek Prayer & Fellowship' },
  { day: 'Friday', time: '6:00 PM', title: 'Campus Connect Live' },
];

// Small, dismissible "who's watching" card — shown every time someone opens
// this page. It never blocks the stream: closing it (or just ignoring it)
// gives full access, filling it in is a bonus for the leaders' records.
function WelcomePopup({ onDone }) {
  const [name, setName] = useState('');
  const [invitedBy, setInvitedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name, or just skip this.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitLiveViewer({ name: name.trim(), invitedBy: invitedBy.trim() });
      onDone();
    } catch (err) {
      // Don't trap the viewer behind a failed request — let them through.
      setError(err.message || 'Could not save that, but you can keep watching.');
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ duration: 0.35 }}
      className="fixed bottom-4 right-4 left-4 z-40 sm:left-auto sm:w-full sm:max-w-sm"
    >
      <form
        onSubmit={submit}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#14121f]/95 p-5 shadow-2xl backdrop-blur"
      >
        <button
          type="button"
          onClick={onDone}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <FiX className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 pr-8">
          <FiUsers className="text-[#F2A31C]" />
          <p className="text-sm font-bold text-white">Watching with us?</p>
        </div>
        <p className="mt-1 text-xs text-white/50">
          Let us know who's tuned in — totally optional, you can watch either way.
        </p>

        <div className="mt-4 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#F2A31C]/50"
          />
          <input
            value={invitedBy}
            onChange={(e) => setInvitedBy(e.target.value)}
            placeholder="Invited by (optional)"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#F2A31C]/50"
          />
        </div>

        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/[0.05] hover:text-white"
          >
            Skip
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default function Live() {
  const [live, setLive] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | loaded | error
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLiveStream()
      .then((data) => {
        if (cancelled) return;
        setLive(data);
        setStatus('loaded');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, []);

  const isLiveNow = status === 'loaded' && !!live?.isLive;
  const isStreaming = isLiveNow && !!live?.youtubeId;
  const hasMeetLink = isLiveNow && !!live?.googleMeetUrl;

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <AnimatePresence>
        {showWelcome && <WelcomePopup onDone={() => setShowWelcome(false)} />}
      </AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          {isLiveNow ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-300">
              <FiRadio className="animate-pulse" /> Live Now
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#A53DFF]/20 px-3 py-1 text-sm font-semibold text-[#D8B2FF]">
              <FiRadio /> Offline
            </span>
          )}
          <span className="text-sm text-slate-400">
            {isStreaming && hasMeetLink ? 'YouTube & Google Meet' : hasMeetLink && !isStreaming ? 'Google Meet' : 'Streaming across YouTube'}
          </span>
          {hasMeetLink && (
            <a
              href={live.googleMeetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
            >
              <FiVideo /> Join via Google Meet
            </a>
          )}
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6">
            <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
              {isStreaming ? (
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${live.youtubeId}?autoplay=0`}
                  title={live.title || 'Live service'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center">
                  <div>
                    <FiPlayCircle className="mx-auto text-5xl text-[#D8B2FF]" />
                    {status === 'loading' && <p className="mt-3 text-lg font-semibold">Checking stream status…</p>}
                    {status === 'error' && <p className="mt-3 text-lg font-semibold">Unable to check live status right now.</p>}
                    {status === 'loaded' && isLiveNow && hasMeetLink && (
                      <>
                        <p className="mt-3 text-lg font-semibold">We're live on Google Meet</p>
                        <p className="mt-2 text-sm text-slate-400">This service is streaming via Google Meet today — tap "Join via Google Meet" above to jump in.</p>
                      </>
                    )}
                    {status === 'loaded' && isLiveNow && !hasMeetLink && !isStreaming && (
                      <>
                        <p className="mt-3 text-lg font-semibold">We're live</p>
                        <p className="mt-2 text-sm text-slate-400">Check back in a moment — the stream link is being set up.</p>
                      </>
                    )}
                    {status === 'loaded' && !isLiveNow && (
                      <>
                        <p className="mt-3 text-lg font-semibold">We're not live right now</p>
                        <p className="mt-2 text-sm text-slate-400">Check the schedule alongside — the stream starts automatically here when the team goes live.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            {isStreaming && live?.title && (
              <p className="mt-4 text-lg font-semibold text-white">{live.title}</p>
            )}
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400"><FiClock /> Next service</div>
              <p className="mt-4 text-sm text-slate-400">See the schedule below for the next broadcast.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400"><FiCalendar /> Service schedule</div>
              <div className="mt-4 space-y-3">
                {schedule.map((item) => (
                  <div key={item.day} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">{item.day}</span>
                      <span className="text-slate-400">{item.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
