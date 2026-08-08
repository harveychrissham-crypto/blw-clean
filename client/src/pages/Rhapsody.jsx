import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiBookOpen, FiHeart, FiBarChart2, FiAlertCircle, FiFilm } from 'react-icons/fi';
import { fetchSermons } from '../utils/sermons';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' };

// Embeds via youtube-nocookie.com so the video plays right here in the page
// instead of sending the user to youtube.com.
function SermonPlayer({ sermon }) {
  if (!sermon?.youtubeId) return null;
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

export default function Rhapsody() {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => { load(); }, [load]);

  // The admin-chosen featured sermon plays as the main video; if none has
  // been marked featured yet, fall back to the most recently added one.
  const activeSermon = sermons.find((s) => s.isFeatured) || sermons[0] || null;
  const olderSermons = sermons.filter((s) => s.id !== activeSermon?.id);

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      {/* ── Sermon video: main focus ─────────────────────────────────────── */}
      <div className="mb-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>Sermons</p>

        {loading && (
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sm text-white/40">
            Loading sermon…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            <FiAlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {!loading && !error && !activeSermon && (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] text-white/40">
            <FiFilm className="h-8 w-8" />
            <p className="text-sm">No sermons have been added yet.</p>
          </div>
        )}

        {!loading && activeSermon && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <SermonPlayer sermon={activeSermon} />
            <div className="mt-4">
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {activeSermon.title}
              </h2>
              {activeSermon.speaker && (
                <p className="mt-1 text-sm font-semibold" style={{ color: '#F2A31C' }}>{activeSermon.speaker}</p>
              )}
              {activeSermon.description && (
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{activeSermon.description}</p>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Past sermons: each one embedded and playable, stacked in order ── */}
      {olderSermons.length > 0 && (
        <div className="mb-12 space-y-10">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/50">More Sermons</h3>
          {olderSermons.map((sermon, i) => (
            <div key={sermon.id}>
              <SermonPlayer sermon={sermon} />
              <div className="mt-3">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30">Video {i + 2}</p>
                <h4 className="mt-1 text-lg font-bold text-white">{sermon.title}</h4>
                {sermon.speaker && (
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: '#F2A31C' }}>{sermon.speaker}</p>
                )}
                {sermon.description && (
                  <p className="mt-1 text-sm text-white/50 leading-relaxed">{sermon.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Rhapsody publication ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-8" style={card}>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>Rhapsody of Realities</p>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>Current Edition: Hope in the Waiting</h2>
          <p className="mt-4 text-sm text-white/55 leading-relaxed">A publication designed to encourage and strengthen believers with devotional insights, stories, and practical guidance.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#EC2FA8,#8A2BE2)' }}>
              <FiDownload /> Download
            </a>
            <a href="#" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
              <FiBookOpen /> Read Online
            </a>
          </div>
        </motion.div>
        <div className="space-y-4">
          <div className="rounded-2xl p-6" style={card}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>
              <FiHeart /> Sponsor Copies
            </div>
            <p className="mt-2 text-sm text-white/50">Partner with us to distribute Rhapsody across campuses and communities.</p>
          </div>
          <div className="rounded-2xl p-6" style={card}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>
              <FiBarChart2 /> Distribution Stats
            </div>
            <div className="mt-3 space-y-3 text-sm">
              {[['Copies shared this month','2,400'],['Campus partners','96'],['Countries reached','14']].map(([label,val]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-white/50">{label}</span>
                  <span className="font-bold text-white">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
