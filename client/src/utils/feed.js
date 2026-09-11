import { apiFetch } from '../config/api';

const FEED_CACHE_KEY = 'blw_feed_cache_v2';
const FEED_ACTION_QUEUE_KEY = 'blw_feed_action_queue_v1';
const recordedFeedViews = new Set();
const inFlightFeedViews = new Map();

function formatFeedTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function normalizePost(row = {}) {
  return {
    ...row,
    id: String(row.id ?? ''),
    title: row.title || '',
    author: row.author || row.author_name || 'BLW Kenya Zone',
    body: row.body || '',
    type: row.type || 'post',
    sourceType: row.source_type || row.sourceType || '',
    isOfficial: Boolean(row.is_official ?? row.isOfficial ?? row.is_featured),
    isUserPost: Boolean(row.is_user_post ?? row.isUserPost),
    isOwner: Boolean(row.is_owner ?? row.isOwner),
    viewCount: Number(row.view_count ?? row.viewCount ?? 0),
    videoId: row.youtube_id || row.video_id || row.videoId || '',
    mediaUrl: row.media_url || row.mediaUrl || row.image_url || row.image || '',
    mediaType: row.media_type || row.mediaType || (row.image_url || row.image ? 'image' : ''),
    avatarUrl: row.avatar_url || row.avatarUrl || '',
    likeCount: Number(row.like_count ?? row.likeCount ?? 0),
    commentCount: Number(row.comment_count ?? row.commentCount ?? 0),
    saveCount: Number(row.save_count ?? row.saveCount ?? 0),
    liked: Boolean(row.liked),
    saved: Boolean(row.saved),
    time: row.time || formatFeedTime(row.created_at),
  };
}

function readActionQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FEED_ACTION_QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeActionQueue(queue) {
  try {
    if (queue.length) localStorage.setItem(FEED_ACTION_QUEUE_KEY, JSON.stringify(queue));
    else localStorage.removeItem(FEED_ACTION_QUEUE_KEY);
  } catch {}
}

function queueAction(entry) {
  const queue = readActionQueue();
  if (entry.action === 'like' || entry.action === 'save') {
    const index = queue.findIndex((item) => item.postId === entry.postId && item.action === entry.action);
    if (index >= 0) {
      queue.splice(index, 1);
      writeActionQueue(queue);
      return;
    }
  }
  const queued = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), ...entry };
  queue.push(queued);
  writeActionQueue(queue);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('feed-action-queued', { detail: queued }));
}

async function runQueuedAction(entry) {
  const action = entry.action;
  if (action === 'comment') {
    const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(entry.postId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: entry.body }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      const error = new Error(result?.error || 'Unable to sync Feed comment.');
      error.status = response.status;
      throw error;
    }
    return response.json().catch(() => ({}));
  }

  const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(entry.postId)}/${action}`, { method: 'POST' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const error = new Error(result?.error || 'Unable to sync Feed action.');
    error.status = response.status;
    throw error;
  }
  return response.json().catch(() => ({}));
}

let flushingQueue = false;
export async function flushFeedActionQueue() {
  if (flushingQueue || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  const queue = readActionQueue();
  if (!queue.length) return;
  flushingQueue = true;
  const remaining = [];
  try {
    for (const entry of queue) {
      try {
        const result = await runQueuedAction(entry);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('feed-action-synced', { detail: { ...entry, result } }));
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('feed-action-dropped', { detail: entry }));
          continue;
        }
        remaining.push(entry);
      }
    }
    writeActionQueue(remaining);
  } finally {
    flushingQueue = false;
  }
}

if (typeof window !== 'undefined') {
  const flushWhenAvailable = () => { flushFeedActionQueue().catch(() => {}); };
  window.addEventListener('online', flushWhenAvailable);
  window.addEventListener('pageshow', flushWhenAvailable);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushWhenAvailable();
  });
  if (navigator.onLine) flushWhenAvailable();
}

export async function fetchFeed({ limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const response = await apiFetch(`/api/feed?${params.toString()}`, { method: 'GET' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Unable to load the Feed.');
  return {
    posts: Array.isArray(body?.posts) ? body.posts.map(normalizePost) : [],
    hasMore: Boolean(body?.hasMore),
  };
}

export async function recordFeedView(id) {
  const key = String(id ?? '');
  if (!key) return {};
  if (recordedFeedViews.has(key)) return { deduped: true };
  const existing = inFlightFeedViews.get(key);
  if (existing) return existing;

  const request = (async () => {
    const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(key)}/view`, { method: 'POST' });
    const body = await response.json().catch(() => ({}));
    if (response.ok) recordedFeedViews.add(key);
    if (!response.ok && response.status !== 401) throw new Error(body?.error || 'Unable to record Feed view.');
    return body;
  })();

  inFlightFeedViews.set(key, request);
  try {
    return await request;
  } finally {
    inFlightFeedViews.delete(key);
  }
}

export function readCachedFeed() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FEED_CACHE_KEY) || 'null');
    return Array.isArray(parsed?.posts) ? parsed.posts.map(normalizePost) : [];
  } catch { return []; }
}

export function writeCachedFeed(posts) {
  try { localStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ posts: posts.slice(0, 40), cachedAt: Date.now() })); } catch {}
}

export async function prepareImageForUpload(file, { maxBytes = 5 * 1024 * 1024, maxDimension = 2200 } = {}) {
  if (!(file instanceof File) || !file.type.startsWith('image/')) return file;
  if (file.size <= maxBytes && file.type === 'image/webp') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    let quality = 0.84;
    let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    while (blob && blob.size > maxBytes && quality > 0.5) {
      quality -= 0.08;
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    }
    if (!blob || blob.size > maxBytes) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${base}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function uploadFeedMedia(file) {
  const uploadFile = file?.type?.startsWith('image/') ? await prepareImageForUpload(file) : file;
  const form = new FormData();
  form.append('media', uploadFile);
  const response = await apiFetch('/api/feed/upload', { method: 'POST', body: form });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Unable to upload that media.');
  return body;
}

export async function createFeedPost({ type = 'post', title, body = '', imageUrl = '', youtubeUrl = '', mediaUrl = '', mediaType = '' }) {
  const response = await apiFetch('/api/feed/posts', {
    method: 'POST',
    body: JSON.stringify({ type, title, body, imageUrl, youtubeUrl, mediaUrl, mediaType }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to publish your post.');
  return normalizePost(result.post);
}

async function postAction(id, action) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueAction({ action, postId: String(id) });
    return { queued: true };
  }
  try {
    const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body?.error || 'Please sign in to use this feature.'), { status: response.status });
    return body;
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueAction({ action, postId: String(id) });
      return { queued: true };
    }
    throw error;
  }
}
export const toggleLike = (id) => postAction(id, 'like');
export const toggleSave = (id) => postAction(id, 'save');

export async function fetchComments(id) {
  const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(id)}/comments`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Unable to load comments.');
  return Array.isArray(body?.comments) ? body.comments : [];
}

export async function addComment(id, body) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueAction({ action: 'comment', postId: String(id), body: String(body || '').trim() });
    return {
      id: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      postId: String(id),
      body: String(body || '').trim(),
      author: 'You',
      avatarUrl: '',
      queued: true,
    };
  }
  try {
    const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(id)}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(result?.error || 'Unable to add comment.'), { status: response.status });
    return result.comment;
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueAction({ action: 'comment', postId: String(id), body: String(body || '').trim() });
      return {
        id: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        postId: String(id),
        body: String(body || '').trim(),
        author: 'You',
        avatarUrl: '',
        queued: true,
      };
    }
    throw error;
  }
}

export async function deleteComment(id, commentId) {
  const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(id)}/comments?commentId=${encodeURIComponent(commentId)}`, { method: 'DELETE' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to delete comment.');
  return result;
}

export async function reportPost(id, reason) {
  const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(id)}/report`, { method: 'POST', body: JSON.stringify({ reason }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to report this right now.');
  return result;
}
