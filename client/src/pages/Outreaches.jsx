import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiHeart, FiStar, FiMapPin, FiUsers, FiArrowRight, FiSend, FiCompass } from 'react-icons/fi';
import { fetchOutreachStories } from '../utils/outreachStories';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' };

const stats = [
  { label: 'Souls Won', value: '12k+', icon: FiStar },
  { label: 'Outreach Trips', value: '240', icon: FiMapPin },
  { label: 'Active Cells', value: '85', icon: FiUsers },
  { label: 'Regions Reached', value: '16', icon: FiHeart },
];

const FALLBACK_ICONS = [FiCompass, FiSend, FiHeart];

const DEFAULT_STORIES = [
  { tag: 'Streets of Nairobi', title: 'Streets of Nairobi', subtitle: 'Reaching drivers & commuters with the Rhapsody' },
  { tag: 'Reachout World', title: 'Reachout World East Africa', subtitle: 'Distributing the Word from window to window' },
  { tag: 'Traffic Outreach', title: 'Traffic Outreach', subtitle: 'No red light too long for the Gospel' },
];

export default function Outreaches() {
  const [stories, setStories] = useState(DEFAULT_STORIES);

  useEffect(() => {
    fetchOutreachStories()
      .then((data) => { if (data.length) setStories(data); })
      .catch(() => { /* keep defaults if the API isn't reachable */ });
  }, []);

  return (
    <section className="px-5 py-16">
      {/* ── Hero ── */}
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)' }}
          >
            <FiHeart className="h-3.5 w-3.5" style={{ color: '#EC2FA8' }} /> Our Outreaches
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Taking the{' '}
            <span style={{ background: 'linear-gradient(135deg,#FF7A45,#EC2FA8,#8A2BE2)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Light
            </span>
            <br />
            to every corner.
          </h1>

          <p className="mt-6 max-w-2xl text-base text-white/55 leading-relaxed sm:text-lg">
            From the busy streets of Nairobi to remote villages — we are committed to taking the divine presence
            of God to the nations and demonstrating the character of the Spirit.
          </p>
        </motion.div>

        {/* ── Stats ── */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl p-5"
                style={card}
              >
                <Icon className="mb-3 h-4 w-4 text-white/40" />
                <p className="text-3xl font-extrabold sm:text-4xl" style={{ color: '#FF6B4A', fontFamily: 'Montserrat, sans-serif' }}>{stat.value}</p>
                <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-widest text-white/40">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Field reports ── */}
      <div className="mx-auto mt-20 max-w-6xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>Field Reports</p>
        <h2 className="text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>Stories from the field.</h2>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {stories.map((story, i) => {
            const Icon = story.icon || FALLBACK_ICONS[i % FALLBACK_ICONS.length];
            return (
              <motion.div
                key={story.id || story.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="overflow-hidden rounded-2xl"
                style={card}
              >
                <div
                  className="relative flex h-44 items-center justify-center"
                  style={
                    story.imageUrl
                      ? { backgroundImage: `url(${story.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: 'linear-gradient(135deg, rgba(236,47,168,0.18), rgba(138,43,226,0.18), rgba(61,90,254,0.12))' }
                  }
                >
                  {!story.imageUrl && <Icon className="h-10 w-10 text-white/30" />}
                  {story.tag && (
                    <span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-widest text-white/70">
                      {story.tag}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>{story.title}</h3>
                  <p className="mt-1 text-sm text-white/50">{story.subtitle}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="mx-auto mt-16 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-12"
          style={{ background: 'linear-gradient(120deg,#EC2FA8,#8A2BE2,#3D5AFE)' }}
        >
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Join the next outreach
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/85 sm:text-base">
            Be part of the move. Sign up, show up, and let's reach a soul together.
          </p>
          <button className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#0d0c18] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-black">
            Get Involved <FiArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
