import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiBookmark, FiFilm, FiHeart, FiLoader, FiMessageCircle, FiMoreHorizontal, FiPlus, FiSend, FiShare2, FiVolume2, FiVolumeX, FiWifiOff, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { fetchFeed, createFeedPost, toggleLike, toggleSave, fetchComments, addComment } from '../utils/feed';
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
  const match = String(source).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/i);
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
    sourceType: post?.source_type || rawType,
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

function Comments({ post, user, onUpdate, compact = false, controlledOpen, onControlledOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onControlledOpenChange || setInternalOpen;

  const loadComments = useCallback(async () => {
    if (items.length || loading) return;
    setLoading(true);
    try { setItems(await fetchComments(post.id)); }
    catch (error) { console.warn('[feed] comments failed:', error?.message || error); }
    finally { setLoading(false); }
  }, [items.length, loading, post.id]);

  useEffect(() => { if (open) loadComments(); }, [open, loadComments]);

  const toggle = () => { hapticTap(); setOpen(!open); };

  const submit = async (event) => {
    event.preventDefault();
    if (!user || !text.trim()) return;
    setLoading(true);
    try {
      const comment = await addComment(post.id, text.trim());
      setItems((current) => [...current, comment]);
      setText('');
      onUpdate(post.id, { commentCount: post.commentCount + 1 });
      hapticSuccess();
    } catch (error) { console.warn('[feed] comment failed:', error?.message || error); hapticError(); }
    finally { setLoading(false); }
  };

  return (
    <div className={compact ? 'mt-2' : 'mt-3'}>
      <button type="button" onClick={toggle} className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white">
        <FiMessageCircle className="h-4 w-4" /> {post.commentCount.toLocaleString()} {open ? 'Hide comments' : 'Comments'}
      </button>
      {open && (
        <div className="mt-3 border-t border-white/[0.08] pt-3">
          <div className="max-h-52 space-y-3 overflow-y-auto pr-1">
            {loading && items.length === 0 && <div className="flex items-center gap-2 text-xs text-white/40"><FiLoader className="animate-spin" /> Loading comments...</div>}
            {!loading && items.length === 0 && <p className="text-xs text-white/35">No comments yet. Start the conversation.</p>}
            {items.map((comment) => <div key={comment.id} className="text-sm"><span className="font-semibold text-white/80">{comment.author_name || comment.authorName || 'Member'}</span>{' '}<span className="text-white/55">{comment.body}</span></div>)}
          </div>
          {user ? (
            <form onSubmit={submit} className="mt-3 flex gap-2">
              <input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} placeholder="Add a comment..." className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
              <button type="submit" disabled={!text.trim() || loading} aria-label="Post comment" className="rounded-full p-2.5 text-white/70 disabled:opacity-30"><FiSend /></button>
            </form>
          ) : <p className="mt-3 text-xs text-white/35">Sign in to join the conversation.</p>}
        </div>
      )}
    </div>
  );
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
  return (
    <div className="flex items-center gap-3 pt-3 text-white/70">
      <button type="button" disabled={loading === 'like'} onClick={() => action('like')} aria-label={post.liked ? 'Unlike post' : 'Like post'} className={`inline-flex items-center gap-1.5 rounded-full p-2 transition hover:bg-white/5 ${post.liked ? 'text-pink-400' : ''}`}><FiHeart className="h-5 w-5" fill={post.liked ? 'currentColor' : 'none'} /><span className="text-xs">{post.likeCount.toLocaleString()}</span></button>
      <button type="button" onClick={onComments} aria-label="Comments" className="inline-flex items-center gap-1.5 rounded-full p-2 transition hover:bg-white/5"><FiMessageCircle className="h-5 w-5" /><span className="text-xs">{post.commentCount.toLocaleString()}</span></button>
      <button type="button" onClick={share} aria-label="Share post" className="rounded-full p-2 transition hover:bg-white/5"><FiSend className="h-5 w-5" /></button>
      <button type="button" disabled={loading === 'save'} onClick={() => action('save')} aria-label={post.saved ? 'Unsave post' : 'Save post'} className={`ml-auto rounded-full p-2 transition hover:bg-white/5 ${post.saved ? 'text-white' : ''}`}><FiBookmark className="h-5 w-5" fill={post.saved ? 'currentColor' : 'none'} /></button>
    </div>
  );
}

function PostCard({ post, user, onUpdate, notificationId }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const target = notificationId === String(post.id);
  const label = post.sourceType === 'sermon' ? 'Teaching' : post.sourceType === 'devotional' ? 'Devotional' : post.sourceType === 'testimony' ? 'Testimony' : post.type === 'video' ? 'Teaching' : 'Post';
  return (
    <article id={`feed-${post.id}`} className={`overflow-hidden border-y border-white/[0.07] bg-[#0d0c18] sm:rounded-2xl sm:border ${target ? 'ring-2 ring-gold-500/60 ring-offset-2 ring-offset-ink-900' : ''}`}>
      <div className="flex items-center justify-between px-4 py-3 sm:px-5"><div className="flex min-w-0 items-center gap-3"><img src="/logo.png" alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{post.author}</p><p className="text-[11px] text-white/40">{post.time} · Kenya Zone</p></div></div><button type="button" aria-label="More options" onClick={hapticTap} className="rounded-full p-2 text-white/45 hover:bg-white/5 hover:text-white"><FiMoreHorizontal /></button></div>
      {post.videoId ? <div className="aspect-video w-full bg-black"><iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(post.videoId)}?rel=0&modestbranding=1&playsinline=1`} title={post.title || 'Feed video'} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div> : post.image ? <div className="aspect-video overflow-hidden bg-black"><img src={post.image} alt="" className="h-full w-full object-cover" /></div> : null}
      <div className="px-4 pb-4 pt-3 sm:px-5"><span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white/45">{label}</span><h2 className="mt-2 text-base font-bold text-white">{post.title}</h2>{post.body && <p className="mt-2 text-sm leading-relaxed text-white/60">{post.body}</p>}<ActionRow post={post} user={user} onUpdate={onUpdate} onComments={() => setCommentsOpen(true)} /><div className="mt-1 text-xs text-white/30">{post.saveCount.toLocaleString()} saves</div><Comments post={post} user={user} onUpdate={onUpdate} controlledOpen={commentsOpen} onControlledOpenChange={setCommentsOpen} /></div>
    </article>
  );
}

function ReelCard({ post, user, onUpdate, notificationId, active }) {
  const [muted, setMuted] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const target = notificationId === String(post.id);
  const share = () => { hapticTap(); shareContent({ title: post.title, text: post.body || post.title, url: `${window.location.origin}/feed?notificationId=${encodeURIComponent(post.id)}` }); };
  const videoUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(post.videoId)}?autoplay=${active ? 1 : 0}&mute=${muted ? 1 : 0}&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${encodeURIComponent(post.videoId)}`;
  const toggleMute = () => { hapticTap(); setMuted((value) => !value); };
  const like = async () => { if (!user) return hapticError(); try { const result = await toggleLike(post.id); onUpdate(post.id, result); hapticSuccess(); } catch { hapticError(); } };
  const save = async () => { if (!user) return hapticError(); try { const result = await toggleSave(post.id); onUpdate(post.id, result); hapticSuccess(); } catch { hapticError(); } };
  return (
    <article id={`feed-${post.id}`} className={`relative h-[calc(100dvh-9rem)] min-h-[540px] w-full snap-start overflow-hidden bg-black sm:h-[calc(100dvh-8rem)] sm:rounded-3xl sm:border sm:border-white/[0.08] ${target ? 'ring-2 ring-gold-500/60' : ''}`}>
      <iframe key={`${post.videoId}-${active}-${muted}`} className="absolute inset-0 h-full w-full scale-[1.01]" src={videoUrl} title={post.title || 'Feed Reel'} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/90" />
      <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between pt-[env(safe-area-inset-top)]"><span className="rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/85 backdrop-blur">Reel</span><button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute reel' : 'Mute reel'} className="pointer-events-auto rounded-full bg-black/55 p-2.5 text-white backdrop-blur">{muted ? <FiVolumeX /> : <FiVolume2 />}</button></div>
      <div className="absolute bottom-0 left-0 right-0 z-10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7"><div className="flex items-end gap-5"><div className="min-w-0 flex-1"><div className="flex items-center gap-3"><img src="/logo.png" alt="" className="h-11 w-11 rounded-full border border-white/20 object-cover" /><div><p className="text-sm font-bold text-white">{post.author}</p><p className="text-[11px] text-white/55">{post.time}</p></div></div><h2 className="mt-3 text-base font-bold leading-snug text-white">{post.title}</h2>{post.body && post.body !== post.title && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-white/75">{post.body}</p>}</div><div className="flex shrink-0 flex-col items-center gap-4 pb-1 text-white"><button type="button" onClick={like} className={`flex flex-col items-center gap-1 ${post.liked ? 'text-pink-400' : ''}`} aria-label="Like reel"><FiHeart className="h-7 w-7" fill={post.liked ? 'currentColor' : 'none'} /><span className="text-[11px]">{post.likeCount.toLocaleString()}</span></button><button type="button" onClick={() => { hapticTap(); setCommentsOpen(true); }} className="flex flex-col items-center gap-1" aria-label="Open comments"><FiMessageCircle className="h-7 w-7" /><span className="text-[11px]">{post.commentCount.toLocaleString()}</span></button><button type="button" onClick={share} className="flex flex-col items-center gap-1" aria-label="Share reel"><FiShare2 className="h-7 w-7" /></button><button type="button" onClick={save} className={`flex flex-col items-center gap-1 ${post.saved ? 'text-white' : ''}`} aria-label="Save reel"><FiBookmark className="h-7 w-7" fill={post.saved ? 'currentColor' : 'none'} /></button></div></div></div>
      {commentsOpen && <div className="absolute inset-x-0 bottom-0 z-20 max-h-[72%] overflow-y-auto rounded-t-3xl bg-[#0d0c18]/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-white">Comments</h3><button type="button" onClick={() => setCommentsOpen(false)} className="rounded-full p-2 text-white/60" aria-label="Close comments"><FiX /></button></div><Comments post={post} user={user} onUpdate={onUpdate} controlledOpen={true} onControlledOpenChange={setCommentsOpen} /></div>}
    </article>
  );
}

function ReelFeed({ posts, user, onUpdate, notificationId }) {
  const [activeId, setActiveId] = useState(String(posts[0]?.id ?? ''));
  const containerRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const cards = Array.from(container.querySelectorAll('[data-reel-id]'));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveId(visible.target.getAttribute('data-reel-id') || '');
    }, { root: container, threshold: [0.55, 0.8] });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [posts]);
  return <div ref={containerRef} className="h-[calc(100dvh-9rem)] snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth sm:h-[calc(100dvh-8rem)]" style={{ scrollbarWidth: 'none' }}>{posts.map((post) => <div key={post.id} data-reel-id={String(post.id)} className="h-[calc(100dvh-9rem)] min-h-[540px] snap-start sm:h-[calc(100dvh-8rem)]"><ReelCard post={post} user={user} onUpdate={onUpdate} notificationId={notificationId} active={activeId === String(post.id)} /></div>)}</div>;
}

function CreatePostModal({ user, onClose, onPublished }) {
  const [type, setType] = useState('post');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const publish = async (event) => {
    event.preventDefault();
    if (!user) return;
    setPublishing(true); setError('');
    try {
      const created = await createFeedPost({ type, title, body, youtubeUrl, imageUrl });
      onPublished(normalizePost(created, Date.now()));
      hapticSuccess();
      onClose();
    } catch (err) { setError(err?.message || 'Unable to publish.'); hapticError(); }
    finally { setPublishing(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Create Feed post">
      <div className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0d0c18] p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Create</p><h2 className="mt-1 text-xl font-bold text-white">Share with the community</h2></div><button type="button" onClick={onClose} className="rounded-full p-2 text-white/55 hover:bg-white/5" aria-label="Close"><FiX /></button></div>
        {!user ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">Please <Link to="/auth" onClick={onClose} className="font-semibold text-white underline">sign in</Link> before publishing.</div> : (
          <form onSubmit={publish} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.04] p-1"><button type="button" onClick={() => setType('post')} className={`rounded-xl py-2.5 text-sm font-semibold ${type === 'post' ? 'bg-white text-ink-950' : 'text-white/50'}`}>Post</button><button type="button" onClick={() => setType('reel')} className={`rounded-xl py-2.5 text-sm font-semibold ${type === 'reel' ? 'bg-white text-ink-950' : 'text-white/50'}`}>Reel</button></div>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required placeholder={type === 'reel' ? 'Reel title' : 'What do you want to share?'} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" />
            <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={4} placeholder="Write something for the community..." className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" />
            {type === 'reel' ? <input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} required placeholder="YouTube or YouTube Shorts link" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" /> : <><input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="YouTube link (optional)" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" /><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Image URL (optional)" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" /></>}
            {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200">{error}</p>}
            <button type="submit" disabled={publishing} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-ink-950 disabled:opacity-50">{publishing ? <FiLoader className="animate-spin" /> : <FiPlus />} {publishing ? 'Publishing...' : `Publish ${type}`}</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Feed() {
  const [searchParams] = useSearchParams();
  const notificationId = searchParams.get('notificationId') || '';
  const { user } = useAuth();
  const online = useOnlineStatus();
  const [activeTab, setActiveTab] = useState('All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const data = await fetchFeed(); setPosts(data.map(normalizePost)); } catch (err) { setError(err?.message || 'Unable to load the Feed.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const { pullDistance, refreshing, bind } = usePullToRefresh(load);
  const feed = useMemo(() => activeTab === 'Reels' ? posts.filter((post) => post.type === 'reel' && post.videoId) : activeTab === 'Following' ? posts.filter((post) => post.following !== false) : activeTab === 'Ministry' ? posts.filter((post) => post.ministry !== false || post.sourceType === 'sermon' || post.sourceType === 'devotional' || post.sourceType === 'testimony' || post.type === 'video') : posts, [activeTab, posts]);
  const updatePost = useCallback((id, patch) => setPosts((current) => current.map((post) => String(post.id) === String(id) ? { ...post, ...patch, likeCount: Number(patch?.likeCount ?? post.likeCount), commentCount: Number(patch?.commentCount ?? post.commentCount), saveCount: Number(patch?.saveCount ?? post.saveCount), liked: patch?.liked ?? post.liked, saved: patch?.saved ?? post.saved } : post)), []);
  const addPublishedPost = useCallback((post) => { setPosts((current) => [post, ...current]); setActiveTab(post.type === 'reel' ? 'Reels' : 'All'); }, []);

  return (
    <div className="min-h-screen bg-ink-950 text-white" {...bind}>
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />
      {!online && <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 pt-3 text-xs text-white/45"><FiWifiOff /> You’re offline. Cached content may still be available.</div>}
      <div className="mx-auto max-w-3xl px-0 pb-24 sm:px-4 sm:pt-6">
        <div className="px-4 pt-4 sm:px-0"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">BLW Kenya Zone</p><h1 className="mt-1 text-2xl font-bold">Feed</h1></div><button type="button" onClick={() => setComposerOpen(true)} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink-950 shadow-lg"><FiPlus /> Create</button></div></div>
        <div className="mt-4"><StoriesRow stories={fallbackStories} /></div>
        <div className="sticky top-0 z-20 mt-2 border-b border-white/[0.06] bg-ink-950/95 px-4 py-2 backdrop-blur-xl sm:rounded-xl"><div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>{tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} aria-current={activeTab === tab ? 'true' : undefined} className={`shrink-0 px-4 py-2 text-xs font-semibold transition ${activeTab === tab ? 'border-b-2 border-white text-white' : 'border-b-2 border-transparent text-white/45 hover:text-white'}`}>{tab}</button>)}</div></div>
        {loading ? <div className="space-y-4 p-4">{[1, 2, 3].map((item) => <div key={item} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0c18]"><Skeleton className="h-14 w-full" /><Skeleton className="aspect-video w-full" /><div className="space-y-2 p-4"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div></div>)}</div> : error ? <div className="p-6"><EmptyState icon={<FiAlertCircle />} title="Feed unavailable" description={error} action={<button type="button" onClick={load} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink-950">Try again</button>} /></div> : feed.length === 0 ? <div className="p-6"><EmptyState icon={<FiFilm />} title={activeTab === 'Reels' ? 'No Reels yet' : 'Nothing here yet'} description={activeTab === 'Reels' ? 'Short-form video content will appear here as it is published.' : 'New ministry content will appear in your Feed.'} /></div> : activeTab === 'Reels' ? <ReelFeed posts={feed} user={user} onUpdate={updatePost} notificationId={notificationId} /> : <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }} className="space-y-4 pt-2">{feed.map((post) => <motion.div key={post.id} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><PostCard post={post} user={user} onUpdate={updatePost} notificationId={notificationId} /></motion.div>)}</motion.div>}
      </div>
      {composerOpen && <CreatePostModal user={user} onClose={() => setComposerOpen(false)} onPublished={addPublishedPost} />}
    </div>
  );
}
