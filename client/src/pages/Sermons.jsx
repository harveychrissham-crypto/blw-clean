import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiFilm, FiWifiOff, FiLock, FiUserPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { fetchSermons } from '../utils/sermons';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../context/AuthContext';
import { Card, Eyebrow } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

function SermonPlayer({ sermon }) {
  const isOnline = useOnlineStatus();

  if (!sermon?.youtubeId) {
    return (
      <Card variant="subtle" className="flex aspect-video w-full items-center justify-center text-sm text-white/60">
        <div className="text-center">
          <FiFilm className="mx-auto mb-2 h-8 w-8" />
          <p>Video unavailable</p>
        </div>
      </Card>
    );
  }

  if (!isOnline) {
    return (
      <Card variant="subtle" className="flex aspect-video w-full items-center justify-center text-sm text-white/60">
        <div className="text-center">
          <FiWifiOff className="mx-auto mb-2 h-8 w-8" />
          <p>Video needs an internet connection</p>
          <p className="mt-1 text-xs text-white/30">Details are saved, but playback requires you to be online.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg">
      <div className="aspect-video w-full">
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

function OfflineSermonRow({ sermon, index }) {
  return (
    <Card variant="subtle" className="flex gap-4 p-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/30">
        <FiFilm className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-white/30">Sermon {index + 2}</p>
        <h4 className="mt-1 text-base font-bold text-white">{sermon.title}</h4>
        {sermon.speaker && <p className="mt-1 text-sm font-semibold" style={{ color: '#F2A31C' }}>{sermon.speaker}</p>}
        {sermon.description && <p className="mt-2 text-sm leading-relaxed text-white/50">{sermon.description}</p>}
      </div>
    </Card>
  );
}

function LockedSermon({ sermon, index }) {
  return (
    <Card variant="subtle" className="overflow-hidden">
      <div className="flex min-h-[190px] w-full items-center justify-center bg-black/30 px-5 py-7">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/5">
            <FiLock className="h-5 w-5 text-white/50" />
          </div>
          <h4 className="text-base font-bold text-white">Create an account to watch this sermon</h4>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-white/45">
            The featured sermon is public. Create a free account to access the rest of our sermons and teachings.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#EC2FA8 0%,#8A2BE2 55%,#3D5AFE 100%)' }}
          >
            <FiUserPlus className="h-3.5 w-3.5" />
            Create Account
          </Link>
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-white/30">Sermon {index + 2}</p>
        <h4 className="mt-1 text-base font-bold text-white">{sermon.title}</h4>
        {sermon.speaker && <p className="mt-1 text-sm font-semibold" style={{ color: '#F2A31C' }}>{sermon.speaker}</p>}
      </div>
    </Card>
  );
}

export default function Sermons() {
  const isOnline = useOnlineStatus();
  const { user, loading: authLoading } = useAuth();
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSermons();
      console.log('Sermons loaded:', data);
      setSermons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Unable to load sermons:', err);
      setError(err?.message || 'Unable to load sermons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeSermon = sermons.find((sermon) => sermon.isFeatured) || sermons[0] || null;
  const olderSermons = sermons.filter((sermon) => sermon.id !== activeSermon?.id);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <Eyebrow className="mb-3">Sermons</Eyebrow>
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>Sermons &amp; Teachings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">Watch sermons and teachings from Believers' LoveWorld Campus Ministry.</p>
      </div>

      {loading && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-start">
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <div className="pt-1">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="mt-4 h-8 w-3/4" />
            <Skeleton className="mt-3 h-4 w-1/3" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <FiAlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && !activeSermon && (
        <div className="max-w-2xl">
          <EmptyState icon={FiFilm} title="No sermons yet" hint="Sermons and teachings will show up here once they're added." />
        </div>
      )}

      {!loading && activeSermon && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-start">
          <div className="w-full lg:justify-self-start"><SermonPlayer sermon={activeSermon} /></div>
          <div className="pt-1 lg:text-left">
            <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">Featured Sermon</div>
            <h2 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>{activeSermon.title}</h2>
            {activeSermon.speaker && <p className="mt-2 text-sm font-semibold" style={{ color: '#F2A31C' }}>{activeSermon.speaker}</p>}
            {activeSermon.description && <p className="mt-4 text-sm leading-7 text-white/55">{activeSermon.description}</p>}
          </div>
        </motion.div>
      )}

      {!loading && olderSermons.length > 0 && (
        <div className="mt-14">
          <h3 className="mb-6 text-sm font-bold uppercase tracking-widest text-white/50">More Sermons</h3>
          <div className="space-y-6">
            {olderSermons.map((sermon, index) => {
              if (authLoading) {
                return <Card key={sermon.id} variant="subtle" className="flex min-h-[120px] w-full items-center justify-center text-sm text-white/30">Checking account access...</Card>;
              }
              if (!user) return <LockedSermon key={sermon.id} sermon={sermon} index={index} />;
              return isOnline ? (
                <motion.div key={sermon.id} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <SermonPlayer sermon={sermon} />
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/30">Sermon {index + 2}</p>
                    <h4 className="mt-1 text-lg font-bold text-white">{sermon.title}</h4>
                    {sermon.speaker && <p className="mt-1 text-sm font-semibold" style={{ color: '#F2A31C' }}>{sermon.speaker}</p>}
                    {sermon.description && <p className="mt-2 text-sm leading-relaxed text-white/50">{sermon.description}</p>}
                  </div>
                </motion.div>
              ) : (
                <OfflineSermonRow key={sermon.id} sermon={sermon} index={index} />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
