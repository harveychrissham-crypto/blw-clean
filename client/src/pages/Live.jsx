import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRadio, FiClock, FiPlayCircle, FiCalendar, FiUsers, FiVideo, FiLogIn } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import DailyIframe from '@daily-co/daily-js';
import { fetchLiveStream, submitLiveViewer, sendLiveHeartbeat, sendLiveHeartbeatBeacon } from '../utils/live';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';

const schedule = [
  { day: 'Sunday', time: '10:00 AM', title: 'Main Worship Service' },
  { day: 'Wednesday', time: '7:30 PM', title: 'Midweek Prayer & Fellowship' },
  { day: 'Friday', time: '6:00 PM', title: 'Campus Connect Live' },
];

function WelcomePopup({ onDone }) {
  const navigate = useNavigate();
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
    } catch {
      // Continue locally. This allows YouTube/Daily/Meet to remain usable
      // during a temporary API outage.
    } finally {
      setSubmitting(false);
      onDone();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-40 flex items-center justify-center overscroll-contain bg-black/30 p-4 backdrop-blur-md"
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
            {submitting ? 'Continuing…' : 'Continue to Live'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.08]"
          >
            <FiLogIn /> Sign in / Create account
          </button>

          <p className="mt-2 text-center text-[10px] text-white/30">
            You can watch the live service without an account.
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function Live() {
  const [live, setLive] = useState(null);
  const [status, setStatus] = useState('loading');
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

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (!showWelcome) return undefined;

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
    };
  }, [showWelcome]);

  const isLiveNow = status === 'loaded' && !!live?.isLive;
  const isStreaming = isLiveNow && !!live?.youtubeId;
  const hasMeetLink = isLiveNow && !!live?.googleMeetUrl;
  const hasDailyRoom = isLiveNow && !!live?.dailyRoomUrl;
  const showDailyEmbed = hasDailyRoom && !isStreaming;

  const pendingSecondsRef = useRef(0);
  useEffect(() => {
    if (showWelcome) return;

    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') pendingSecondsRef.current += 1;
    }, 1000);

    const flush = setInterval(() => {
      if (pendingSecondsRef.current > 0) {
        sendLiveHeartbeat(pendingSecondsRef.current);
        pendingSecondsRef.current = 0;
      }
    }, 20000);

    const flushOnHide = () => {
      if (document.visibilityState === 'hidden' && pendingSecondsRef.current > 0) {
        sendLiveHeartbeatBeacon(pendingSecondsRef.current);
        pendingSecondsRef.current = 0;
      }
    };
    document.addEventListener('visibilitychange', flushOnHide);

    return () => {
      clearInterval(tick);
      clearInterval(flush);
      document.removeEventListener('visibilitychange', flushOnHide);
      if (pendingSecondsRef.current > 0) {
        sendLiveHeartbeatBeacon(pendingSecondsRef.current);
        pendingSecondsRef.current = 0;
      }
    };
  }, [showWelcome]);

  useEffect(() => {
    if (!showDailyEmbed || !dailyContainerRef.current) return;

    callFrameRef.current = DailyIframe.createFrame(dailyContainerRef.current, {
      iframeStyle: { width: '100%', height: '100%', border: '0' },
      showLeaveButton: false,
    });
    callFrameRef.current.join({ url: live.dailyRoomUrl }).catch(() => {});

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
      <Card as={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} variant="raised" className="p-8 shadow-soft">
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
            {isStreaming && showDailyEmbed ? 'YouTube & Live Call' : showDailyEmbed ? 'Live Call' : hasMeetLink && !isStreaming ? 'Google Meet' : 'Streaming across YouTube'}
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
              ) : status === 'loading' ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center">
                  <div>
                    <FiPlayCircle className="mx-auto text-5xl text-[#D8B2FF]" />
                    {status === 'error' && (
                      <>
                        <p className="mt-3 text-lg font-semibold">Live service is temporarily unavailable.</p>
                        <p className="mt-2 text-sm text-slate-400">The page is still available. Please try again shortly.</p>
                      </>
                    )}
                    {status === 'loaded' && isLiveNow && hasMeetLink && (
                      <>
                        <p className="mt-3 text-lg font-semibold">We're live on Google Meet</p>
                        <p className="mt-2 text-sm text-slate-400">Tap "Join via Google Meet" above to join the service.</p>
                      </>
                    )}
                    {status === 'loaded' && isLiveNow && !hasMeetLink && !isStreaming && (
                      <>
                        <p className="mt-3 text-lg font-semibold">We're live</p>
                        <p className="mt-2 text-sm text-slate-400">The stream link is being set up.</p>
                      </>
                    )}
                    {status === 'loaded' && !isLiveNow && (
                      <>
                        <p className="mt-3 text-lg font-semibold">We're not live right now</p>
                        <p className="mt-2 text-sm text-slate-400">Check the schedule for the next broadcast.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            {isStreaming && live?.title && <p className="mt-4 text-lg font-semibold text-white">{live.title}</p>}
          </div>
          <div className="space-y-6">
            <Card variant="subtle" className="p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400"><FiClock /> Next service</div>
              <p className="mt-4 text-sm text-slate-400">See the schedule below for the next broadcast.</p>
            </Card>
            <Card variant="subtle" className="p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400"><FiCalendar /> Service schedule</div>
              <div className="mt-4 space-y-3">
                {schedule.map((item) => (
                  <Card key={item.day} variant="subtle" className="p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">{item.day}</span>
                      <span className="text-slate-400">{item.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{item.title}</p>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </section>
  );
}
