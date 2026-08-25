import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiHeart, FiStar, FiMapPin, FiUsers, FiArrowRight, FiSend, FiCompass, FiX, FiShare2 } from 'react-icons/fi';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchOutreachStories } from '../utils/outreachStories';
import { Card, Eyebrow, StatGroup } from '../components/ui/Card';
import { shareContent } from '../utils/share';
import { hapticTap } from '../utils/haptics';

const stats = [
  { label: 'Souls Won', value: '12k+', icon: FiStar },
  { label: 'Outreach Trips', value: '240', icon: FiMapPin },
  { label: 'Active Cells', value: '85', icon: FiUsers },
  { label: 'Regions Reached', value: '16', icon: FiHeart },
];

const FALLBACK_ICONS = [FiCompass, FiSend, FiHeart];

const DEFAULT_STORIES = [
  { tag: 'Streets of Nairobi', title: 'Streets of Nairobi', subtitle: 'Reaching drivers & commuters with the Rhapsody', body: 'Every week, teams take to the busy streets of Nairobi, moving from car window to car window during traffic, sharing copies of Rhapsody of Realities and a word of hope with drivers, conductors, and commuters who would otherwise never set foot in a church. What starts as a brief conversation at a red light has, time and again, turned into a life transformed.' },
  { tag: 'Reachout World', title: 'Reachout World East Africa', subtitle: 'Distributing the Word from window to window', body: 'As part of the global Reachout World campaign, our East Africa region mobilizes volunteers to distribute copies of Rhapsody of Realities across homes, offices, and public spaces. The goal is simple: make sure no one in our communities goes without access to the Word, regardless of where they are or what they believe today.' },
  { tag: 'Traffic Outreach', title: 'Traffic Outreach', subtitle: 'No red light too long for the Gospel', body: 'Traffic jams are a daily frustration for most — but for our outreach teams, they are an opportunity. Armed with copies of the Word and warm smiles, volunteers turn standstill traffic into moments of genuine connection, prayer, and salvation, proving that no waiting line is ever wasted when there are souls to reach.' },
];

function StoryModal({ story, onClose }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0c18]/95 px-4 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]" onClick={onClose}>
    <div className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-[#15131f] shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <button onClick={onClose} className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 transition hover:bg-black/60"><FiX /></button>
      <button onClick={() => { hapticTap(); shareContent({ title: story.title, text: story.subtitle ? `${story.title} — ${story.subtitle}` : story.title, url: `${window.location.origin}/outreaches` }); }} className="absolute right-[4.25rem] top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 transition hover:bg-black/60" aria-label={`Share ${story.title}`}><FiShare2 className="h-4 w-4" /></button>
      <div className="max-h-[85vh] overflow-y-auto">
        {story.imageUrl ? <img src={story.imageUrl} alt={story.title} className="h-56 w-full object-cover" /> : <div className="flex h-40 items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(236,47,168,0.18), rgba(138,43,226,0.18), rgba(61,90,254,0.12))' }}><FiHeart className="h-10 w-10 text-white/30" /></div>}
        <div className="p-6 sm:p-8">{story.tag && <Eyebrow className="mb-2">{story.tag}</Eyebrow>}<h2 className="text-2xl font-extrabold text-white">{story.title}</h2>{story.subtitle && <p className="mt-2 text-sm text-white/50">{story.subtitle}</p>}<p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-white/75">{story.body || "The full story for this update hasn't been added yet — check back soon."}</p></div>
      </div>
    </div>
  </div>;
}

export default function Outreaches() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const notificationId = searchParams.get('notificationId') || '';
  const [stories, setStories] = useState(DEFAULT_STORIES);
  const [activeStory, setActiveStory] = useState(null);

  useEffect(() => {
    fetchOutreachStories().then((data) => {
      if (data.length) setStories(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!notificationId || !stories.length) return;
    const target = stories.find((story) => String(story.id) === notificationId);
    if (target) setActiveStory(target);
  }, [notificationId, stories]);

  return <section className="px-5 py-16">
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)' }}><FiHeart className="h-3.5 w-3.5" style={{ color: '#EC2FA8' }} /> Our Outreaches</div>
        <h1 className="text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">Taking the <span style={{ background: 'linear-gradient(135deg,#FF7A45,#EC2FA8,#8A2BE2)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Light</span><br />to every corner.</h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">From the busy streets of Nairobi to remote villages — we are committed to taking the divine presence of God to the nations and demonstrating the character of the Spirit.</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-12"><StatGroup items={stats.map((stat) => ({ label: stat.label, value: stat.value, icon: stat.icon, accent: '#FF8B5C' }))} /></motion.div>
    </div>
    <div className="mx-auto mt-20 max-w-6xl"><Eyebrow className="mb-2">Field Reports</Eyebrow><h2 className="text-2xl font-extrabold text-white sm:text-3xl">Stories from the field.</h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-3">{stories.map((story, i) => { const Icon = story.icon || FALLBACK_ICONS[i % FALLBACK_ICONS.length]; const highlighted = String(story.id || '') === notificationId; return <Card key={story.id || story.title} as={motion.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} onClick={() => setActiveStory(story)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveStory(story)} variant="raised" className={`cursor-pointer transition hover:-translate-y-0.5 ${highlighted ? 'ring-2 ring-[#F2A31C]/60' : ''}`}>
        <div className="relative flex h-44 items-center justify-center" style={story.imageUrl ? { backgroundImage: `url(${story.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg, rgba(236,47,168,0.18), rgba(138,43,226,0.18), rgba(61,90,254,0.12))' }}>{!story.imageUrl && <Icon className="h-10 w-10 text-white/30" />}{story.tag && <span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-widest text-white/70">{story.tag}</span>}</div>
        <div className="p-5"><h3 className="text-base font-bold text-white">{story.title}</h3><p className="mt-1 text-sm text-white/50">{story.subtitle}</p><Eyebrow className="mt-3">Read story →</Eyebrow></div>
      </Card>; })}</div>
    </div>
    <div className="mx-auto mt-16 max-w-6xl"><Card as={motion.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} variant="filled" className="px-6 py-16 text-center sm:px-12"><h2 className="text-3xl font-extrabold text-white sm:text-4xl">Join the next outreach</h2><p className="mx-auto mt-4 max-w-xl text-sm text-white/85 sm:text-base">Be part of the move. Sign up, show up, and let's reach a soul together.</p><button type="button" onClick={() => navigate('/connect')} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#0d0c18] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-black"><span>Get Involved</span><FiArrowRight className="h-4 w-4" /></button></Card></div>
    {activeStory && <StoryModal story={activeStory} onClose={() => setActiveStory(null)} />}
  </section>;
}
