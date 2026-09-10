import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiBookmark, FiChevronRight, FiHeart, FiMessageCircle, FiMoreHorizontal, FiPlay, FiSend, FiShare2, FiVolume2 } from 'react-icons/fi';

const stories = [
  { name: 'BLW Kenya', label: 'Zone Update', image: '/logo.png' },
  { name: 'Campus Life', label: 'Fellowship', image: '/illustration.png' },
  { name: 'Outreach', label: 'Soul Winning', image: '/illustration.png' },
  { name: 'Teachings', label: 'Word', image: '/illustration.png' },
  { name: 'Testimonies', label: 'Praise Report', image: '/logo.png' },
];

const initialPosts = [
  {
    id: 'p1', type: 'post', author: 'BLW Campus Ministry Kenya Zone', time: '2h', avatar: '/logo.png',
    title: 'Fellowship Without Borders',
    body: 'A new week is another opportunity to grow in the Word, reach someone with the Gospel, and strengthen the people around you.',
    image: '/illustration.png', likes: 128, comments: 19, saved: false,
  },
  {
    id: 'r1', type: 'reel', author: 'BLW Kenya Zone', time: '5h', avatar: '/logo.png',
    title: 'A word for your week',
    body: 'Keep your focus on the Word and keep moving forward.',
    image: '/illustration.png', likes: 342, comments: 31, saved: false,
    videoId: 'fUSY2WPc1Aw',
  },
  {
    id: 'p2', type: 'post', author: 'Campus Fellowship', time: 'Yesterday', avatar: '/logo.png',
    title: 'Campus fellowship updates',
    body: 'Connect with believers around you, find a fellowship, and stay plugged into what is happening in your zone.',
    likes: 74, comments: 8, saved: false,
  },
];

const tabs = ['All', 'Following', 'Ministry', 'Reels'];

function StoryStrip() {
  return (
    <section className="border-b border-white/[0.07] px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none]">
          {stories.map((story, index) => (
            <button key={story.name} type="button" className="group flex w-[72px] shrink-0 flex-col items-center gap-2 text-center">
              <span className={`rounded-full p-[2px] ${index === 0 ? 'bg-gradient-to-br from-pink-500 to-purple-500' : 'bg-white/15'}`}>
                <span className="block rounded-full border-2 border-[#0d0c18] bg-[#171522] p-[2px]">
                  <img src={story.image} alt="" className="h-12 w-12 rounded-full object-cover" />
                </span>
              </span>
              <span className="w-full truncate text-[10px] font-medium text-white/70 group-hover:text-white">{story.name}</span>
            </button>
          ))}
          <button type="button" className="flex w-[72px] shrink-0 flex-col items-center gap-2 text-center text-white/50">
            <span className="grid h-[56px] w-[56px] place-items-center rounded-full border border-dashed border-white/20 bg-white/[0.03]"><FiChevronRight /></span>
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function ActionRow({ post, onLike, onSave }) {
  return (
    <div className="flex items-center gap-4 pt-3 text-white/60">
      <button type="button" onClick={() => onLike(post.id)} className={`inline-flex items-center gap-1.5 transition hover:text-white ${post.liked ? 'text-pink-400' : ''}`} aria-label="Like post"><FiHeart className={post.liked ? 'fill-current' : ''} /> <span className="text-xs">{post.likes}</span></button>
      <button type="button" className="inline-flex items-center gap-1.5 transition hover:text-white" aria-label="Comments"><FiMessageCircle /><span className="text-xs">{post.comments}</span></button>
      <button type="button" className="transition hover:text-white" aria-label="Share"><FiSend /></button>
      <button type="button" onClick={() => onSave(post.id)} className={`ml-auto transition hover:text-white ${post.saved ? 'text-gold-400' : ''}`} aria-label="Save post"><FiBookmark className={post.saved ? 'fill-current' : ''} /></button>
    </div>
  );
}

function PostCard({ post, onLike, onSave }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.035] shadow-xl shadow-black/10">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <img src={post.avatar} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{post.author}</p><p className="text-[11px] text-white/40">{post.time} · Kenya Zone</p></div>
        <button type="button" className="rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white" aria-label="More options"><FiMoreHorizontal /></button>
      </div>
      {post.image && <div className="aspect-[16/9] overflow-hidden bg-black"><img src={post.image} alt="" className="h-full w-full object-cover opacity-90" /></div>}
      <div className="px-4 pb-4 pt-4 sm:px-5">
        <h2 className="text-base font-bold text-white">{post.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{post.body}</p>
        <ActionRow post={post} onLike={onLike} onSave={onSave} />
      </div>
    </article>
  );
}

function ReelCard({ post, onLike, onSave }) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-black shadow-2xl">
      <div className="relative aspect-[9/16] max-h-[680px] min-h-[520px] bg-[#16131f]">
        <img src={post.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <button type="button" className="grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition hover:scale-105" aria-label="Play reel"><FiPlay className="ml-1 h-6 w-6 fill-current" /></button>
        </div>
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <span className="rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur">Reel</span>
          <button type="button" className="rounded-full bg-black/45 p-2 text-white backdrop-blur" aria-label="Audio"><FiVolume2 /></button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-3">
            <img src={post.avatar} alt="" className="h-10 w-10 rounded-full border border-white/20 object-cover" />
            <div><p className="text-sm font-bold text-white">{post.author}</p><p className="text-[11px] text-white/55">{post.time}</p></div>
          </div>
          <p className="mt-3 max-w-[90%] text-sm font-medium leading-relaxed text-white">{post.body}</p>
          <div className="mt-4 flex items-center gap-4 text-white">
            <button type="button" onClick={() => onLike(post.id)} className={`inline-flex items-center gap-1.5 ${post.liked ? 'text-pink-400' : ''}`} aria-label="Like reel"><FiHeart className={post.liked ? 'fill-current' : ''} /><span className="text-xs">{post.likes}</span></button>
            <button type="button" className="inline-flex items-center gap-1.5" aria-label="Comments"><FiMessageCircle /><span className="text-xs">{post.comments}</span></button>
            <button type="button" className="ml-auto" aria-label="Share reel"><FiShare2 /></button>
            <button type="button" onClick={() => onSave(post.id)} aria-label="Save reel"><FiBookmark className={post.saved ? 'fill-current text-gold-400' : ''} /></button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Feed() {
  const [activeTab, setActiveTab] = useState('All');
  const [posts, setPosts] = useState(initialPosts);
  const feed = useMemo(() => activeTab === 'Reels' ? posts.filter((post) => post.type === 'reel') : posts, [activeTab, posts]);

  const onLike = (id) => setPosts((current) => current.map((post) => post.id === id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post));
  const onSave = (id) => setPosts((current) => current.map((post) => post.id === id ? { ...post, saved: !post.saved } : post));

  return (
    <section className="min-h-screen pb-16">
      <div className="border-b border-white/[0.07] px-4 pb-4 pt-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-400">BLW Kenya Zone</p><h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">Feed</h1><p className="mt-1 text-sm text-white/45">Stories, conversations, Reels, teachings and ministry life.</p></div>
            <button type="button" className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 sm:block">Create</button>
          </div>
          <div className="mt-5 flex gap-1 overflow-x-auto rounded-2xl bg-white/[0.035] p-1 [scrollbar-width:none]">
            {tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${activeTab === tab ? 'bg-white/10 text-white shadow-sm' : 'text-white/45 hover:text-white/80'}`}>{tab}</button>)}
          </div>
        </div>
      </div>

      <StoryStrip />

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
        {activeTab === 'All' && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-pink-500/15 bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-4"><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Community</p><p className="mt-1 text-sm text-white/70">Stay connected to what God is doing across campus fellowships and the Kenya Zone.</p></motion.div>}
        {feed.map((post) => post.type === 'reel' ? <ReelCard key={post.id} post={post} onLike={onLike} onSave={onSave} /> : <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} />)}
      </main>
    </section>
  );
}
