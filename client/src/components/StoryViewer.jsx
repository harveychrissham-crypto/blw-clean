import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiVolume2, FiVolumeX, FiTrash2, FiSend, FiLoader, FiEye } from 'react-icons/fi';
import { apiFetch } from '../config/api';
import { hapticError, hapticSuccess, hapticTap } from '../utils/haptics';

const IMAGE_DURATION_MS = 5000;

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function ViewerAvatar({ viewer, size = 'h-7 w-7' }) {
  return viewer?.avatarUrl ? (
    <img src={viewer.avatarUrl} alt="" className={`${size} shrink-0 rounded-full border border-black/70 object-cover`} />
  ) : (
    <div className={`${size} grid shrink-0 place-items-center rounded-full border border-black/70 bg-white/15 text-[9px] font-bold text-white`}>
      {(viewer?.name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function StoryViewer({ stories, initialIndex = 0, viewerEmail, onClose, onViewed, onDeleted, onSwipeGroup }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const rafRef = useRef(null);
  const elapsedRef = useRef(0);
  const pressStartRef = useRef(0);
  const videoRef = useRef(null);
  const viewedRef = useRef(new Set());
  const swipeStartRef = useRef(null);

  const story = stories[index];
  const isOwn = viewerEmail && story?.authorEmail?.toLowerCase() === viewerEmail.toLowerCase();

  const goNext = useCallback(() => {
    hapticTap();
    setIndex((i) => {
      if (i + 1 >= stories.length) {
        if (onSwipeGroup?.(1)) return i;
        onClose();
        return i;
      }
      return i + 1;
    });
  }, [stories.length, onClose, onSwipeGroup]);

  const goPrev = useCallback(() => {
    hapticTap();
    setIndex((i) => {
      if (i <= 0) {
        if (onSwipeGroup?.(-1)) return i;
        return i;
      }
      return i - 1;
    });
  }, [onSwipeGroup]);

  useEffect(() => {
    if (!story || viewedRef.current.has(story.id)) return;
    viewedRef.current.add(story.id);
    onViewed?.(story.id);
    apiFetch(`/api/stories/${story.id}/view`, { method: 'POST' }).catch(() => {});
  }, [story, onViewed]);

  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    setReply('');
    setViewers([]);
    setViewersOpen(false);
  }, [index, story?.id]);

  useEffect(() => {
    if (!isOwn || !story?.id) return undefined;
    let cancelled = false;
    setLoadingViewers(true);
    apiFetch(`/api/stories/${story.id}/viewers`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!cancelled && response.ok) setViewers(Array.isArray(body?.viewers) ? body.viewers : []);
      })
      .catch(() => {
        if (!cancelled) setViewers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingViewers(false);
      });
    return () => { cancelled = true; };
  }, [isOwn, story?.id]);

  useEffect(() => {
    if (story?.mediaType === 'video') return undefined;
    if (paused) return undefined;
    const start = performance.now() - elapsedRef.current;
    const tick = (now) => {
      const elapsed = now - start;
      elapsedRef.current = elapsed;
      const pct = Math.min(1, elapsed / IMAGE_DURATION_MS);
      setProgress(pct);
      if (pct >= 1) { goNext(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [index, story?.id, paused, story?.mediaType, goNext]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || story?.mediaType !== 'video') return undefined;
    if (paused) { video.pause(); return undefined; }
    video.play().catch(() => {});
    const onTime = () => { if (video.duration) setProgress(video.currentTime / video.duration); };
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('ended', goNext);
    return () => { video.removeEventListener('timeupdate', onTime); video.removeEventListener('ended', goNext); };
  }, [index, paused, story?.mediaType, goNext]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goNext, goPrev]);

  const handleDelete = async () => {
    if (!story) return;
    try {
      await apiFetch(`/api/stories/${story.id}`, { method: 'DELETE' });
      onDeleted?.(story.id);
      if (stories.length <= 1) onClose(); else goNext();
    } catch {
      hapticError();
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    const body = reply.trim();
    if (!body || !story?.authorEmail || isOwn || sendingReply) return;
    setSendingReply(true);
    setPaused(true);
    try {
      const conversationRes = await apiFetch('/api/messages/conversations', {
        method: 'POST',
        body: JSON.stringify({ recipientEmail: story.authorEmail }),
      });
      const conversationBody = await conversationRes.json().catch(() => ({}));
      if (!conversationRes.ok || !conversationBody.conversationId) throw new Error(conversationBody.error || 'Unable to start conversation.');

      const messageRes = await apiFetch(`/api/messages/conversations/${encodeURIComponent(conversationBody.conversationId)}`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      const messageBody = await messageRes.json().catch(() => ({}));
      if (!messageRes.ok) throw new Error(messageBody.error || 'Unable to send reply.');

      setReply('');
      hapticSuccess();
      onClose?.();
      navigate(`/feed?messages=1&conversation=${encodeURIComponent(conversationBody.conversationId)}`);
    } catch {
      setPaused(false);
      hapticError();
    } finally {
      setSendingReply(false);
    }
  };

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    const start = swipeStartRef.current;
    const touch = event.changedTouches?.[0];
    swipeStartRef.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    setPaused(false);
    if (dx < 0) onSwipeGroup?.(1);
    else onSwipeGroup?.(-1);
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label={`${story.authorName}'s story`}>
      <div className="flex gap-1 px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {stories.map((s, i) => (
          <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <div className="h-full bg-white" style={{ width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%', transition: i === index && story.mediaType === 'video' ? 'none' : undefined }} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {story.authorAvatarUrl ? <img src={story.authorAvatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">{(story.authorName || '?').charAt(0).toUpperCase()}</div>}
          <span className="truncate text-sm font-semibold text-white">{story.authorName}</span>
          <span className="shrink-0 text-xs text-white/50">{timeAgo(story.createdAt)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {story.mediaType === 'video' && <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10">{muted ? <FiVolumeX className="h-4 w-4" /> : <FiVolume2 className="h-4 w-4" />}</button>}
          {isOwn && <button type="button" onClick={handleDelete} aria-label="Delete story" className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10"><FiTrash2 className="h-4 w-4" /></button>}
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10"><FiX className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 select-none" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {story.mediaType === 'video' ? <video ref={videoRef} src={story.mediaUrl} muted={muted} playsInline autoPlay className="h-full w-full object-contain" /> : <img src={story.mediaUrl} alt="" className="h-full w-full object-contain" />}
        {story.caption && <p className={`absolute inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-6 pt-10 text-center text-sm text-white ${isOwn ? 'bottom-16' : 'bottom-20'}`}>{story.caption}</p>}

        <button type="button" aria-label="Previous" onPointerDown={() => { pressStartRef.current = Date.now(); setPaused(true); }} onPointerUp={() => { setPaused(false); if (Date.now() - pressStartRef.current < 300) goPrev(); }} onPointerLeave={() => setPaused(false)} className="absolute inset-y-0 left-0 w-1/3 cursor-default" />
        <button type="button" aria-label="Next" onPointerDown={() => { pressStartRef.current = Date.now(); setPaused(true); }} onPointerUp={() => { setPaused(false); if (Date.now() - pressStartRef.current < 300) goNext(); }} onPointerLeave={() => setPaused(false)} className="absolute inset-y-0 right-0 w-2/3 cursor-default" />

        {isOwn && (
          <div className="absolute inset-x-3 bottom-3 z-20">
            <button
              type="button"
              onClick={() => setViewersOpen((value) => !value)}
              onPointerDown={(event) => event.stopPropagation()}
              aria-expanded={viewersOpen}
              aria-label="See who viewed your story"
              className="flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-3 py-2 backdrop-blur-xl"
            >
              <FiEye className="h-4 w-4 text-white/70" />
              {viewers.length > 0 ? (
                <span className="flex -space-x-2">
                  {viewers.slice(0, 4).map((viewer) => <ViewerAvatar key={viewer.email} viewer={viewer} />)}
                </span>
              ) : loadingViewers ? (
                <span className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
              ) : null}
              <span className="text-xs font-semibold text-white/80">{viewers.length} {viewers.length === 1 ? 'view' : 'views'}</span>
            </button>

            {viewersOpen && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-white/15 bg-black/75 p-2 shadow-2xl backdrop-blur-xl" onPointerDown={(event) => event.stopPropagation()}>
                {loadingViewers ? (
                  <div className="px-3 py-4 text-xs text-white/45">Loading viewers…</div>
                ) : viewers.length ? (
                  viewers.map((viewer) => (
                    <div key={viewer.email} className="flex items-center gap-3 rounded-xl px-3 py-2">
                      <ViewerAvatar viewer={viewer} size="h-9 w-9" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white">{viewer.name}</p>
                        <p className="text-[10px] text-white/35">Viewed {timeAgo(viewer.viewedAt)} ago</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-xs text-white/45">No one has viewed this story yet.</div>
                )}
              </div>
            )}
          </div>
        )}

        {!isOwn && story.authorEmail && (
          <form onSubmit={sendReply} className="absolute inset-x-3 bottom-3 z-20 flex items-center gap-2 rounded-full border border-white/20 bg-black/55 p-1.5 backdrop-blur-xl" onPointerDown={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()}>
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value.slice(0, 1000))}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              placeholder="Reply to story…"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/45"
              aria-label="Reply to story"
              disabled={sendingReply}
            />
            <button type="submit" disabled={!reply.trim() || sendingReply} aria-label="Send story reply" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#0d0c18] disabled:cursor-not-allowed disabled:opacity-35">
              {sendingReply ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiSend className="h-4 w-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
