import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiFilm, FiWifiOff, FiShare2, FiHeart, FiMessageCircle, FiSend, FiMoreHorizontal, FiBookmark, FiX, FiLoader } from 'react-icons/fi';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import { shareContent } from '../utils/share';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import StoriesRow from '../components/StoriesRow';
import { fetchFeed, toggleLike, toggleSave, fetchComments, addComment } from '../utils/feed';

function SermonPlayer({ sermon }) {
  const isOnline = useOnlineStatus();
  if (!sermon?.youtube_url) return <Card variant="subtle" className="flex aspect-square w-full items-center justify-center text-sm text-white/60 sm:aspect-video"><div className="text-center"><FiFilm className="mx-auto mb-2 h-8 w-8" /><p>Video unavailable</p></div></Card>;
  if (!isOnline) return <Card variant="subtle" className="flex aspect-square w-full items-center justify-center px-6 text-sm text-white/60 sm:aspect-video"><div className="text-center"><FiWifiOff className="mx-auto mb-2 h-8 w-8" /><p>Video needs an internet connection</p><p className="mt-1 text-xs text-white/50">The post details are still available.</p></div></Card>;
  return <div className="w-full overflow-hidden bg-black sm:rounded-none"><div className="aspect-square w-full sm:aspect-video"><iframe key={sermon.id} className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${sermon.youtube_url}`} title={sermon.title || 'Sermon'} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div></div>;
}

function FeedPost({ post, index, user, notificationId, onUpdate }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const isTarget = notificationId === String(post.id);
  const author = post.speaker || 'BLW Campus Ministry Kenya Zone';
  const initials = author.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'BLW';

  const updateAction = async (action) => {
    if (!user) { hapticError(); return; }
    setActionLoading(action);
    try {
      const result = action === 'like' ? await toggleLike(post.id) : await toggleSave(post.id);
      onUpdate(post.id, result);
      hapticSuccess();
    } catch (error) { console.warn('[feed] action failed:', error?.message || error); hapticError(); }
    finally { setActionLoading(''); }
  };

  const openComments = async () => {
    hapticTap();
    setCommentsOpen((value) => !value);
    if (!commentsOpen && comments.length === 0) {
      setCommentLoading(true);
      try { setComments(await fetchComments(post.id)); } catch (error) { console.warn('[feed] comments failed:', error?.message || error); }
      finally { setCommentLoading(false); }
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!user || !commentText.trim()) { if (!user) hapticError(); return; }
    setCommentLoading(true);
    try {
      const comment = await addComment(post.id, commentText.trim());
      setComments((current) => [...current, comment]);
      setCommentText('');
      onUpdate(post.id, { commentCount: Number(post.comment_count || 0) + 1 });
      hapticSuccess();
    } catch (error) { console.warn('[feed] comment failed:', error?.message || error); hapticError(); }
    finally { setCommentLoading(false); }
  };

  const share = () => {
    hapticTap();
    shareContent({ title: post.title, text: post.speaker ? `${post.title} — ${post.speaker}` : post.title, url: `${window.location.origin}/sermons?notificationId=${encodeURIComponent(post.id)}` });
  };

  return (
    <article id={`sermon-${post.id}`} className={`overflow-hidden border-y border-white/[0.07] bg-[#0d0c18] sm:rounded-2xl sm:border ${isTarget ? 'ring-2 ring-gold-500/60 ring-offset-2 ring-offset-ink-900' : ''}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full p-[2px]" style={{ background: 'linear-gradient(135deg,#EC2FA8,#8A2BE2,#F2A31C)' }}><div className="grid h-full w-full place-items-center rounded-full border-2 border-[#0d0c18] bg-white/10 text-[11px] font-bold text-white">{initials}</div></div>
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{author}</p><p className="text-xs text-white/40">BLW Kenya Zone · Post {index + 1}</p></div>
        </div>
        <button type="button" aria-label="More options" className="rounded-full p-2 text-white/45 transition hover:bg-white/5 hover:text-white" onClick={hapticTap}><FiMoreHorizontal className="h-5 w-5" /></button>
      </div>

      <SermonPlayer sermon={post} />

      <div className="px-4 pb-3 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => updateAction('like')} disabled={actionLoading === 'like'} aria-label={post.liked ? 'Unlike post' : 'Like post'} className={`rounded-full p-2 transition hover:bg-white/5 ${post.liked ? 'text-[#EC2FA8]' : 'text-white/75 hover:text-white'}`}><FiHeart className="h-5 w-5" fill={post.liked ? 'currentColor' : 'none'} /></button>
            <button type="button" aria-label="Comments" className="rounded-full p-2 text-white/75 transition hover:bg-white/5 hover:text-white" onClick={openComments}><FiMessageCircle className="h-5 w-5" /></button>
            <button type="button" aria-label="Share post" className="rounded-full p-2 text-white/75 transition hover:bg-white/5 hover:text-white" onClick={share}><FiSend className="h-5 w-5" /></button>
          </div>
          <button type="button" onClick={() => updateAction('save')} disabled={actionLoading === 'save'} aria-label={post.saved ? 'Unsave post' : 'Save post'} className={`rounded-full p-2 transition hover:bg-white/5 ${post.saved ? 'text-white' : 'text-white/65 hover:text-white'}`}><FiBookmark className="h-5 w-5" fill={post.saved ? 'currentColor' : 'none'} /></button>
        </div>

        <div className="mt-1 text-xs font-semibold text-white/50">{Number(post.like_count || 0).toLocaleString()} likes · {Number(post.comment_count || 0).toLocaleString()} comments · {Number(post.save_count || 0).toLocaleString()} saves</div>
        <p className="mt-2 text-sm leading-6 text-white/90"><span className="font-semibold">{author}</span>{' '}{post.title}</p>
        {post.description && <p className="mt-1 text-sm leading-6 text-white/50">{post.description}</p>}

        {commentsOpen && <div className="mt-4 border-t border-white/[0.07] pt-3">
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {commentLoading && comments.length === 0 && <div className="flex items-center gap-2 text-xs text-white/40"><FiLoader className="animate-spin" /> Loading comments...</div>}
            {!commentLoading && comments.length === 0 && <p className="text-xs text-white/35">No comments yet. Start the conversation.</p>}
            {comments.map((comment) => <div key={comment.id} className="text-sm"><span className="font-semibold text-white/80">{comment.author_name}</span>{' '}<span className="text-white/55">{comment.body}</span></div>)}
          </div>
          {user ? <form onSubmit={submitComment} className="mt-3 flex items-center gap-2"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} placeholder="Add a comment..." className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20" /><button type="submit" disabled={!commentText.trim() || commentLoading} aria-label="Post comment" className="rounded-full p-2.5 text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-30"><FiSend className="h-4 w-4" /></button></form> : <p className="mt-3 text-xs text-white/35">Sign in to join the conversation.</p>}
        </div>}

        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Sermon {index + 1}</p>
      </div>
    </article>
  );
}

export default function Sermons() {
  const [searchParams] = useSearchParams();
  const notificationId = searchParams.get('notificationId') || '';
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setPosts(await fetchFeed()); }
    catch (err) { setError(err?.message || 'Unable to load the Feed.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const { pullDistance, refreshing, bind } = usePullToRefresh(load);

  useEffect(() => {
    if (!notificationId || loading) return;
    const timer = setTimeout(() => document.getElementById(`sermon-${notificationId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    return () => clearTimeout(timer);
  }, [notificationId, loading]);

  const updatePost = (id, patch) => setPosts((current) => current.map((post) => post.id === id ? {
    ...post,
    ...(typeof patch.liked === 'boolean' ? { liked: patch.liked } : {}),
    ...(typeof patch.saved === 'boolean' ? { saved: patch.saved } : {}),
    ...(typeof patch.likeCount === 'number' ? { like_count: patch.likeCount } : {}),
    ...(typeof patch.saveCount === 'number' ? { save_count: patch.saveCount } : {}),
    ...(typeof patch.commentCount === 'number' ? { comment_count: patch.commentCount } : {}),
  } : post));

  return <section className="min-h-screen" {...bind}>
    <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />
    <div className="mx-auto w-full max-w-2xl pt-5 sm:pt-8">
      <div className="flex items-center justify-between px-5 pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F2A31C]">Believers' LoveWorld</p><h1 className="mt-1 text-2xl font-extrabold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Feed</h1></div></div>
      <StoriesRow />
      <div className="mt-4 sm:mt-6">
        {loading && <div className="space-y-4"><Skeleton className="mx-auto h-[420px] w-full max-w-2xl rounded-none sm:rounded-2xl" /><Skeleton className="mx-auto h-36 w-full max-w-2xl rounded-none sm:rounded-2xl" /></div>}
        {!loading && error && <div className="mx-5 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300"><FiAlertCircle className="h-5 w-5 shrink-0" /><span>{error}</span></div>}
        {!loading && !error && posts.length === 0 && <div className="px-5"><EmptyState icon={FiFilm} title="Nothing in the feed yet" hint="Posts from BLW Kenya Zone will appear here." /></div>}
        {!loading && !error && posts.length > 0 && <div className="space-y-4">{posts.map((post, index) => <FeedPost key={post.id} post={post} index={index} user={user} notificationId={notificationId} onUpdate={updatePost} />)}</div>}
      </div>
    </div>
  </section>;
}
