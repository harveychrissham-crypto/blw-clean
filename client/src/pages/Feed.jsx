import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiBookmark, FiChevronRight, FiFilm, FiHeart, FiLoader, FiMessageCircle, FiMoreHorizontal, FiPlay, FiSend, FiShare2, FiVolume2, FiWifiOff } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { fetchFeed, toggleLike, toggleSave, fetchComments, addComment } from '../utils/feed';
import { shareContent } from '../utils/share';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import StoriesRow from '../components/StoriesRow';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

const tabs = ['All', 'Following', 'Ministry', 'Reels'];

const fallbackStories = [
  { name: 'BLW Kenya', label: 'Zone Update', image: '/logo.png' },
  { name: 'Campus Life', label: 'Fellowship', image: '/illustration.png' },
  { name: 'Outreach', label: 'Soul Winning', image: '/illustration.png' },
  { name: 'Teachings', label: 'Word', image: '/illustration.png' },
  { name: 'Testimonies', label: 'Praise Report', image: '/logo.png' },
];

function getVideoId(post) {
  const direct = post?.youtube_id || post?.youtubeId || post?.video_id || post?.videoId;
  if (direct) return String(direct).trim();
  const source = post?.video_url || post?.videoUrl || post?.youtube_url || post?.youtubeUrl || post?.url;
  if (!source) return '';
  const value = String(source);
  const match = value.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/i);
  return match?.[1] || '';
}

function normalizePost(post, index) {
  const rawType = String(post?.type || post?.content_type || post?.contentType || 'post').toLowerCase();
  const videoId = getVideoId(post);
  const isReel = rawType === 'reel' || rawType === 'reels' || post?.is_reel === true || post?.isReel === true;
  return {
    ...post,
    id: post?.id ?? `feed-${index}`,
    type: isReel ? 'reel' : videoId ? 'video' : rawType,
    sourceType: rawType,
    videoId,
    author: post?.speaker || post?.author_name || post?.authorName || post?.author || 'BLW Campus Ministry Kenya Zone',
    time: post?.created_at || post?.createdAt || post?.time || 'Recently',
    title: post?.title || post?.caption || 'Untitled post',
    body: post?.description || post?.body || post?.caption || '',
    image: post?.image_url || post?.imageUrl || post?.thumbnail_url || post?.thumbnailUrl || '',
    likeCount: Number(post?.like_count ?? post?.likeCount ?? post?.likes ?? 0),
    commentCount: Number(post?.comment_count ?? post?.commentCount ?? post?.comments ?? 0),
    saveCount: Number(post?.save_count ?? post?.saveCount ?? post?.saves ?? 0),
    liked: Boolean(post?.liked),
    saved: Boolean(post?.saved),
  };
}

function YouTubePlayer({ post, reel = false }) {
  const isOnline = useOnlineStatus();
  if (!post.videoId) return null;
  if (!isOnline) return <div className={`${reel ? 'aspect-[9/16]' : 'aspect-video'} grid w-full place-items-center bg-black text-white/50`}><div className="text-center"><FiWifiOff className="mx-auto mb-2 h-7 w-7" /><p className="text-xs">Video needs an internet connection</p></div></div>;
  const params = reel ? 'autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1' : 'rel=0&modestbranding=1&playsinline=1';
  return <div className={`${reel ? 'aspect-[9/16]' : 'aspect-video'} w-full bg-black`}><iframe key={post.videoId} className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(post.videoId)}?${params}`} title={post.title || 'Feed video'} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>;
}

function ActionRow({ post, user, onUpdate, onComments }) {
  const [loading, setLoading] = useState('');
  const action = async (name) => {
    if (!user) { hapticError(); return; }
    setLoading(name);
    try {
      const result = name === 'like' ? await toggleLike(post.id) : await toggleSave(post.id);
      onUpdate(post.id, result);
      hapticSuccess();
    } catch (error) { console.warn(`[feed] ${name} failed:`, error?.message || error); hapticError(); }
    finally { setLoading(''); }
  };
  const share = () => { hapticTap(); shareContent({ title: post.title, text: post.author ? `${post.title} — ${post.author}` : post.title, url: `${window.location.origin}/feed?notificationId=${encodeURIComponent(post.id)}` }); };
  return <div className="flex items-center gap-3 pt-3 text-white/70">
    <button type="button" disabled={loading === 'like'} onClick={() => action('like')} aria-label={post.liked ? 'Unlike post' : 'Like post'} className={`inline-flex items-center gap-1.5 rounded-full p-2 transition hover:bg-white/5 ${post.liked ? 'text-pink-400' : ''}`}><FiHeart className="h-5 w-5" fill={post.liked ? 'currentColor' : 'none'} /><span className="text-xs">{post.likeCount.toLocaleString()}</span></button>
    <button type="button" onClick={onComments} aria-label="Comments" className="inline-flex items-center gap-1.5 rounded-full p-2 transition hover:bg-white/5"><FiMessageCircle className="h-5 w-5" /><span className="text-xs">{post.commentCount.toLocaleString()}</span></button>
    <button type="button" onClick={share} aria-label="Share post" className="rounded-full p-2 transition hover:bg-white/5"><FiSend className="h-5 w-5" /></button>
    <button type="button" disabled={loading === 'save'} onClick={() => action('save')} aria-label={post.saved ? 'Unsave post' : 'Save post'} className={`ml-auto rounded-full p-2 transition hover:bg-white/5 ${post.saved ? 'text-white' : ''}`}><FiBookmark className="h-5 w-5" fill={post.saved ? 'currentColor' : 'none'} /></button>
  </div>;
}

function Comments({ post, user, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const toggle = async () => {
    hapticTap(); setOpen((value) => !value);
    if (!open && items.length === 0) { setLoading(true); try { setItems(await fetchComments(post.id)); } catch (error) { console.warn('[feed] comments failed:', error?.message || error); } finally { setLoading(false); } }
  };
  const submit = async (event) => {
    event.preventDefault(); if (!user || !text.trim()) return; setLoading(true);
    try { const comment = await addComment(post.id, text.trim()); setItems((current) => [...current, comment]); setText(''); onUpdate(post.id, { commentCount: post.commentCount + 1 }); hapticSuccess(); } catch (error) { console.warn('[feed] comment failed:', error?.message || error); hapticError(); } finally { setLoading(false); }
  };
  return <>
    <button type="button" onClick={toggle} className="sr-only">Toggle comments</button>
    {open && <div className="mt-3 border-t border-white/[0.07] pt-3">
      <div className="max-h-64 space-y-3 overflow-y-auto pr-1">{loading && items.length === 0 && <div className="flex items-center gap-2 text-xs text-white/40"><FiLoader className="animate-spin" /> Loading comments...</div>}{!loading && items.length === 0 && <p className="text-xs text-white/35">No comments yet. Start the conversation.</p>}{items.map((comment) => <div key={comment.id} className="text-sm"><span className="font-semibold text-white/80">{comment.author_name || comment.authorName || 'Member'}</span>{' '}<span className="text-white/55">{comment.body}</span></div>)}</div>
      {user ? <form onSubmit={submit} className="mt-3 flex gap-2"><input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} placeholder="Add a comment..." className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30" /><button type="submit" disabled={!text.trim() || loading} aria-label="Post comment" className="rounded-full p-2.5 text-white/70 disabled:opacity-30"><FiSend /></button></form> : <p className="mt-3 text-xs text-white/35">Sign in to join the conversation.</p>}
    </div>}
  </>;
}

function PostCard({ post, user, onUpdate, notificationId }) {
  const target = notificationId === String(post.id);
  const hasVideo = Boolean(post.videoId);
  return <article id={`feed-${post.id}`} className={`overflow-hidden border-y border-white/[0.07] bg-[#0d0c18] sm:rounded-2xl sm:border ${target ? 'ring-2 ring-gold-500/60 ring-offset-2 ring-offset-ink-900' : ''}`}>
    <div className="flex items-center justify-between px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3"><img src="/logo.png" alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{post.author}</p><p className="text-[11px] text-white/40">{post.time} · Kenya Zone</p></div></div>
      <button type="button" aria-label="More options" onClick={hapticTap} className="rounded-full p-2 text-white/45 hover:bg-white/5 hover:text-white"><FiMoreHorizontal /></button>
    </div>
    {hasVideo ? <YouTubePlayer post={post} /> : post.image ? <div className="aspect-video overflow-hidden bg-black"><img src={post.image} alt="" className="h-full w-full object-cover" /></div> : null}
    <div className="px-4 pb-4 pt-3 sm:px-5"><div className="mb-2 flex items-center gap-2"><span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white/45">{post.sourceType === 'sermon' ? 'Teaching' : post.sourceType === 'devotional' ? 'Devotional' : post.sourceType === 'testimony' ? 'Testimony' : 'Post'}</span></div><h2 className="text-base font-bold text-white">{post.title}</h2>{post.body && <p className="mt-2 text-sm leading-relaxed text-white/60">{post.body}</p>}<ActionRow post={post} user={user} onUpdate={onUpdate} onComments={() => document.querySelector(`#feed-${post.id} button.sr-only`)?.click()} /><div className="mt-1 text-xs text-white/30">{post.saveCount.toLocaleString()} saves</div><Comments post={post} user={user} onUpdate={onUpdate} /></div>
  </article>;
}

function ReelCard({ post, user, onUpdate, notificationId }) {
  const target = notificationId === String(post.id);
  const share = () => { hapticTap(); shareContent({ title: post.title, text: post.body || post.title, url: `${window.location.origin}/feed?notificationId=${encodeURIComponent(post.id)}` }); };
  return <article id={`feed-${post.id}`} className={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-black shadow-2xl ${target ? 'ring-2 ring-gold-500/60' : ''}`}>
    <div className="relative bg-black"><YouTubePlayer post={post} reel /><div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/25" />
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between"><span className="rounded-full bg-black/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur">Reel</span><span className="rounded-full bg-black/50 p-2 text-white/80 backdrop-blur"><FiVolume2 /></span></div>
      <div className="absolute bottom-0 left-0 right-0 p-5"><div className="flex items-center gap-3"><img src="/logo.png" alt="" className="h-10 w-10 rounded-full border border-white/20 object-cover" /><div><p className="text-sm font-bold text-white">{post.author}</p><p className="text-[11px] text-white/55">{post.time}</p></div></div><p className="mt-3 max-w-[90%] text-sm font-medium leading-relaxed text-white">{post.body || post.title}</p><div className="mt-4 flex items-center gap-3 text-white"><button type="button" onClick={async () => { if (!user) return hapticError(); try { const result = await toggleLike(post.id); onUpdate(post.id, result); hapticSuccess(); } catch { hapticError(); } }} className={`inline-flex items-center gap-1.5 ${post.liked ? 'text-pink-400' : ''}`}><FiHeart fill={post.liked ? 'currentColor' : 'none'} /><span className="text-xs">{post.likeCount.toLocaleString()}</span></button><button type="button" onClick={() => document.querySelector(`#feed-${post.id} button.sr-only`)?.click()} className="inline-flex items-center gap-1.5"><FiMessageCircle /><span className="text-xs">{post.commentCount.toLocaleString()}</span></button><button type="button" onClick={share} className="ml-auto" aria-label="Share reel"><FiShare2 /></button><button type="button" onClick={async () => { if (!user) return hapticError(); try { const result = await toggleSave(post.id); onUpdate(post.id, result); hapticSuccess(); } catch { hapticError(); } }} aria-label="Save reel"><FiBookmark fill={post.saved ? 'currentColor' : 'none'} /></button></div></div>
    </div><div className="bg-[#0d0c18] px-5 pb-4"><Comments post={post} user={user} onUpdate={onUpdate} /></div>
  </article>;
}

export default function Feed() {
  const [searchParams] = useSearchParams();
  const notificationId = searchParams.get('notificationId') || '';
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const data = await fetchFeed(); setPosts(data.map(normalizePost)); } catch (err) { setError(err?.message || 'Unable to load the Feed.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const { pullDistance, refreshing, bind } = usePullToRefresh(load);
  const feed = useMemo(() => activeTab === 'Reels' ? posts.filter((post) => post.type === 'reel') : activeTab === 'Following' ? posts.filter((post) => post.following !== false) : activeTab === 'Ministry' ? posts.filter((post) => ['sermon', 'teaching', 'devotional', 'testimony', 'outreach', 'event'].includes(post.sourceType) || post.videoId) : posts, [activeTab, posts]);
  useEffect(() => { if (!notificationId || loading) return; const timer = setTimeout(() => document.getElementById(`feed-${notificationId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150); return () => clearTimeout(timer); }, [notificationId, loading]);
  const updatePost = (id, patch) => setPosts((current) => current.map((post) => post.id === id ? { ...post, liked: typeof patch?.liked === 'boolean' ? patch.liked : post.liked, saved: typeof patch?.saved === 'boolean' ? patch.saved : post.saved, likeCount: Number(patch?.likeCount ?? post.likeCount), saveCount: Number(patch?.saveCount ?? post.saveCount), commentCount: Number(patch?.commentCount ?? post.commentCount) } : post));

  return <section className="min-h-screen pb-16" {...bind}><PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} /><div className="border-b border-white/[0.07] px-4 pb-4 pt-6 sm:px-6"><div className="mx-auto max-w-3xl"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-500">BLW Kenya Zone</p><h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">Feed</h1><p className="mt-1 text-sm text-white/45">Stories, posts, Reels, teachings, testimonies and ministry life.</p></div><button type="button" className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 sm:block">Create</button></div><div className="mt-5 flex gap-1 overflow-x-auto rounded-2xl bg-white/[0.035] p-1 [scrollbar-width:none]">{tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${activeTab === tab ? 'bg-white/10 text-white shadow-sm' : 'text-white/45 hover:text-white/80'}`}>{tab}</button>)}</div></div></div><section className="border-b border-white/[0.07] px-4 py-4 sm:px-6"><div className="mx-auto max-w-3xl"><div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none]">{fallbackStories.map((story, index) => <div key={story.name} className="flex w-[72px] shrink-0 flex-col items-center gap-2 text-center"><span className={`rounded-full p-[2px] ${index === 0 ? 'bg-gradient-to-br from-pink-500 to-purple-500' : 'bg-white/15'}`}><span className="block rounded-full border-2 border-[#0d0c18] bg-[#171522] p-[2px]"><img src={story.image} alt="" className="h-12 w-12 rounded-full object-cover" /></span></span><span className="w-full truncate text-[10px] font-medium text-white/70">{story.name}</span></div>)}<div className="flex w-[72px] shrink-0 flex-col items-center gap-2 text-center text-white/50"><span className="grid h-[56px] w-[56px] place-items-center rounded-full border border-dashed border-white/20 bg-white/[0.03]"><FiChevronRight /></span><span className="text-[10px]">More</span></div></div></div></section><main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">{activeTab === 'All' && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-pink-500/15 bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-4"><p className="text-xs font-bold uppercase tracking-widest text-pink-300">Community</p><p className="mt-1 text-sm text-white/70">Stay connected to what God is doing across campus fellowships and the Kenya Zone.</p></motion.div>}{loading && <div className="space-y-4"><Skeleton className="h-[420px] w-full rounded-2xl" /><Skeleton className="h-36 w-full rounded-2xl" /></div>}{!loading && error && <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300"><FiAlertCircle className="h-5 w-5 shrink-0" /><span>{error}</span></div>}{!loading && !error && feed.length === 0 && <EmptyState icon={FiFilm} title="Nothing in the feed yet" hint="Posts from BLW Kenya Zone will appear here." />}{!loading && !error && feed.map((post) => post.type === 'reel' ? <ReelCard key={post.id} post={post} user={user} onUpdate={updatePost} notificationId={notificationId} /> : <PostCard key={post.id} post={post} user={user} onUpdate={updatePost} notificationId={notificationId} />)}</main></section>;
}
