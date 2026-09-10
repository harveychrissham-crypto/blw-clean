import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiFilm, FiWifiOff, FiShare2, FiHeart, FiMessageCircle, FiSend, FiMoreHorizontal } from 'react-icons/fi';
import { fetchSermons } from '../utils/sermons';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Card } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import { shareContent } from '../utils/share';
import { hapticTap } from '../utils/haptics';
import StoriesRow from '../components/StoriesRow';

function SermonPlayer({ sermon }) {
  const isOnline = useOnlineStatus();

  if (!sermon?.youtubeId) {
    return <Card variant="subtle" className="flex aspect-square w-full items-center justify-center text-sm text-white/60 sm:aspect-video"><div className="text-center"><FiFilm className="mx-auto mb-2 h-8 w-8" /><p>Video unavailable</p></div></Card>;
  }

  if (!isOnline) {
    return <Card variant="subtle" className="flex aspect-square w-full items-center justify-center text-sm text-white/60 sm:aspect-video"><div className="text-center px-6"><FiWifiOff className="mx-auto mb-2 h-8 w-8" /><p>Video needs an internet connection</p><p className="mt-1 text-xs text-white/50">The post details are still available.</p></div></Card>;
  }

  return (
    <div className="w-full overflow-hidden bg-black sm:rounded-none">
      <div className="aspect-square w-full sm:aspect-video">
        <iframe
          key={sermon.id}
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${sermon.youtubeId}`}
          title={sermon.title || 'Sermon'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}

function FeedPost({ sermon, index, notificationId }) {
  const [liked, setLiked] = useState(false);
  const isTarget = notificationId === String(sermon.id);
  const author = sermon.speaker || 'BLW Campus Ministry Kenya Zone';
  const initials = author.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'BLW';

  const share = () => {
    hapticTap();
    shareContent({
      title: sermon.title,
      text: sermon.speaker ? `${sermon.title} — ${sermon.speaker}` : sermon.title,
      url: `${window.location.origin}/sermons?notificationId=${encodeURIComponent(sermon.id)}`,
    });
  };

  return (
    <article id={`sermon-${sermon.id}`} className={`overflow-hidden border-y border-white/[0.07] bg-[#0d0c18] sm:rounded-2xl sm:border ${isTarget ? 'ring-2 ring-gold-500/60 ring-offset-2 ring-offset-ink-900' : ''}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full p-[2px]" style={{ background: 'linear-gradient(135deg,#EC2FA8,#8A2BE2,#F2A31C)' }}>
            <div className="grid h-full w-full place-items-center rounded-full border-2 border-[#0d0c18] bg-white/10 text-[11px] font-bold text-white">{initials}</div>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{author}</p>
            <p className="text-xs text-white/40">BLW Kenya Zone · Post {index + 1}</p>
          </div>
        </div>
        <button type="button" aria-label="More options" className="rounded-full p-2 text-white/45 transition hover:bg-white/5 hover:text-white" onClick={hapticTap}>
          <FiMoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <SermonPlayer sermon={sermon} />

      <div className="px-4 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => { hapticTap(); setLiked((value) => !value); }} aria-label={liked ? 'Unlike post' : 'Like post'} className={`rounded-full p-2 transition hover:bg-white/5 ${liked ? 'text-[#EC2FA8]' : 'text-white/75 hover:text-white'}`}>
              <FiHeart className="h-5 w-5" fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button type="button" aria-label="Comments" className="rounded-full p-2 text-white/75 transition hover:bg-white/5 hover:text-white" onClick={hapticTap}>
              <FiMessageCircle className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Share post" className="rounded-full p-2 text-white/75 transition hover:bg-white/5 hover:text-white" onClick={share}>
              <FiSend className="h-5 w-5" />
            </button>
          </div>
          <button type="button" aria-label="Share sermon" className="rounded-full p-2 text-white/65 transition hover:bg-white/5 hover:text-white" onClick={share}>
            <FiShare2 className="h-5 w-5" />
          </button>
        </div>

        {liked && <p className="mt-1 text-xs font-semibold text-white/65">Liked</p>}
        <p className="mt-2 text-sm leading-6 text-white/90"><span className="font-semibold">{author}</span>{' '}{sermon.title}</p>
        {sermon.description && <p className="mt-1 text-sm leading-6 text-white/50">{sermon.description}</p>}
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Sermon {index + 1}</p>
      </div>
    </article>
  );
}

export default function Sermons() {
  const [searchParams] = useSearchParams();
  const notificationId = searchParams.get('notificationId') || '';
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSermons();
      setSermons(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Unable to load the feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { pullDistance, refreshing, bind } = usePullToRefresh(load);

  useEffect(() => {
    if (!notificationId || loading) return;
    const timer = setTimeout(() => document.getElementById(`sermon-${notificationId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    return () => clearTimeout(timer);
  }, [notificationId, loading]);

  return (
    <section className="min-h-screen" {...bind}>
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />

      <div className="mx-auto w-full max-w-2xl pt-5 sm:pt-8">
        <div className="flex items-center justify-between px-5 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F2A31C]">Believers' LoveWorld</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Feed</h1>
          </div>
        </div>

        <StoriesRow />

        <div className="mt-4 sm:mt-6">
          {loading && <div className="space-y-4 px-0 sm:px-0"><Skeleton className="mx-auto h-[420px] w-full max-w-2xl rounded-none sm:rounded-2xl" /><Skeleton className="mx-auto h-36 w-full max-w-2xl rounded-none sm:rounded-2xl" /></div>}

          {!loading && error && <div className="mx-5 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300"><FiAlertCircle className="h-5 w-5 shrink-0" /><span>{error}</span></div>}

          {!loading && !error && sermons.length === 0 && <div className="px-5"><EmptyState icon={FiFilm} title="Nothing in the feed yet" hint="Posts from BLW Kenya Zone will appear here." /></div>}

          {!loading && !error && sermons.length > 0 && <div className="space-y-4">{sermons.map((sermon, index) => <FeedPost key={sermon.id} sermon={sermon} index={index} notificationId={notificationId} />)}</div>}
        </div>
      </div>
    </section>
  );
}
