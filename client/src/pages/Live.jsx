import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRadio, FiClock, FiPlayCircle, FiCalendar, FiUsers, FiVideo } from 'react-icons/fi';
import DailyIframe from '@daily-co/daily-js';
import { fetchLiveStream, submitLiveViewer } from '../utils/live';

const schedule = [
  { day: 'Sunday', time: '10:00 AM', title: 'Main Worship Service' },
  { day: 'Wednesday', time: '7:30 PM', title: 'Midweek Prayer & Fellowship' },
  { day: 'Friday', time: '6:00 PM', title: 'Campus Connect Live' },
];

// Mandatory "who's watching" gate — shown every time someone opens this
// page, before any stream content is visible. There is no skip/close
// option; a viewer must submit their name (invitedBy stays optional) to
// reveal the page underneath. On a failed submit we show the error and let
// them retry rather than letting them through, since the whole point is
// that this step isn't optional.
function WelcomePopup({ onDone }) {
  const [name, setName] = useState('');
  const [invitedBy, setInvitedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name to continue.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitLiveViewer({ name: name.trim(), invitedBy: invitedBy.trim() });
      onDone();
    } catch (err) {
      setError(err.message || 'Could not save that — please try again.');
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-xs"
      >
        <form
          onSubmit={submit}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#14121f]/95 p-5 shadow-2xl"
        >
          <div className="flex items-center gap-2">
            <FiUsers className="text-[#F2A31C]" />
            <p className="text-sm font-bold text-white">Watching with us?</p>
          </div>
          <p className="mt-1 text-xs text-white/50">
            Let us know who's tuned in before you continue.
          </p>

          <div className="mt-4 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
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

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function Live() {
  const [live, setLive] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | loaded | error
  const [showWelcome, setShowWelcome] = useState(true);
  const dailyContainerRef = useRef(null);
  const callFrameRef = useRef(null);

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
  const hasDailyRoom = isLiveNow && !!live?.dailyRoomUrl;
  // The call embeds inline in dailyContainerRef; the YouTube stream (if also
  // set) still takes the main video slot when present, so Daily only claims
  // that slot when there's no YouTube stream to show.
  const showDailyEmbed = hasDailyRoom && !isStreaming;

  // Create/join the Daily call once the container is in the DOM and a room
  // is available, and always tear it down on unmount or when the room
  // changes — daily-js only supports one active call frame at a time.
  useEffect(() => {
    if (!showDailyEmbed || !dailyContainerRef.current) return;

    callFrameRef.current = DailyIframe.createFrame(dailyContainerRef.current, {
      iframeStyle: { width: '100%', height: '100%', border: '0' },
      showLeaveButton: false,
    });
    callFrameRef.current.join({ url: live.dailyRoomUrl });

    return () => {
      callFrameRef.current?.destroy();
      callFrameRef.current = null;
    };
  }, [showDailyEmbed, live?.dailyRoomUrl]);

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
            {isStreaming && showDailyEmbed
              ? 'YouTube & Live Call'
              : showDailyEmbed
                ? 'Live Call'
                : hasMeetLink && !isStreaming
                  ? 'Google Meet'
                  : 'Streaming across YouTube'}
          </span>
          {hasMeetLink && !showDailyEmbed && (
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
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : showDailyEmbed ? (
                <div ref={dailyContainerRef} className="h-full w-full" />
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
