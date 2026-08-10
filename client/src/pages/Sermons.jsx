import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiFilm, FiWifiOff } from 'react-icons/fi';
import { fetchSermons } from '../utils/sermons';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function SermonPlayer({ sermon, isOnline }) {
  if (!sermon?.youtubeId) return null;

  if (!isOnline) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-black">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <FiWifiOff className="h-8 w-8 text-white/40" />

          <p className="text-sm font-semibold text-white/70">
            Video unavailable offline
          </p>

          <p className="text-xs text-white/40">
            Connect to the internet to watch this sermon on YouTube.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <div className="aspect-video w-full">
        <iframe
          key={sermon.id}
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${sermon.youtubeId}`}
          title={sermon.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default function Sermons() {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOnline = useOnlineStatus();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchSermons();
      setSermons(data);
    } catch (err) {
      setError(err.message || 'Unable to load sermons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeSermon =
    sermons.find((s) => s.isFeatured) ||
    sermons[0] ||
    null;

  const olderSermons = sermons.filter(
    (s) => s.id !== activeSermon?.id
  );

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">

      {/* Header */}
      <div className="mb-6">
        <p
          className="mb-3 text-xs font-bold uppercase tracking-widest"
          style={{ color: '#F2A31C' }}
        >
          Sermons
        </p>

        {loading && (
          <div className="flex aspect-video max-w-lg items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sm text-white/40">
            Loading sermons…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            <FiAlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && !activeSermon && (
          <div className="flex aspect-video max-w-lg flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] text-white/40">
            <FiFilm className="h-8 w-8" />
            <p className="text-sm">
              No sermons have been added yet.
            </p>
          </div>
        )}

        {!loading && activeSermon && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start"
          >
            <div className="w-full max-w-md lg:max-w-none">
              <SermonPlayer
                sermon={activeSermon}
                isOnline={isOnline}
              />
            </div>

            <div>
              <h2
                className="text-2xl font-extrabold text-white sm:text-3xl"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                {activeSermon.title}
              </h2>

              {activeSermon.speaker && (
                <p
                  className="mt-1 text-sm font-semibold"
                  style={{ color: '#F2A31C' }}
                >
                  {activeSermon.speaker}
                </p>
              )}

              {activeSermon.description && (
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {activeSermon.description}
                </p>
              )}

              {!isOnline && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/50">
                  <FiWifiOff className="h-4 w-4 shrink-0" />
                  You're offline. Sermon information is available from
                  your saved data, but YouTube videos require internet.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Older sermons */}
      {olderSermons.length > 0 && (
        <div className="mb-12 space-y-10">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/50">
            More Sermons
          </h3>

          {olderSermons.map((sermon, i) => (
            <div key={sermon.id}>
              <SermonPlayer
                sermon={sermon}
                isOnline={isOnline}
              />

              <div className="mt-3">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30">
                  Video {i + 2}
                </p>

                <h4 className="mt-1 text-lg font-bold text-white">
                  {sermon.title}
                </h4>

                {sermon.speaker && (
                  <p
                    className="mt-0.5 text-sm font-semibold"
                    style={{ color: '#F2A31C' }}
                  >
                    {sermon.speaker}
                  </p>
                )}

                {sermon.description && (
                  <p className="mt-1 text-sm leading-relaxed text-white/50">
                    {sermon.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}