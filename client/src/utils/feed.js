import { apiFetch } from '../config/api';

const FEED_CACHE_KEY = 'blw_feed_cache_v2';

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
  const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Please sign in to use this feature.');
  return body;
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
  const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(id)}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to add comment.');
  return result.comment;
}
export async function deleteComment(id, commentId) {
  const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(id)}/comments?commentId=${encodeURIComponent(commentId)}`, { method: 'DELETE' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to delete comment.');
  return result;
}
