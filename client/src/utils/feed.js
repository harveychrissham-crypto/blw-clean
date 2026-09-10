import { apiFetch } from '../config/api';

const FEED_CACHE_KEY = 'blw_feed_cache_v2';

export async function fetchFeed({ limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const response = await apiFetch(`/api/feed?${params.toString()}`, { method: 'GET' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Unable to load the Feed.');
  return {
    posts: Array.isArray(body?.posts) ? body.posts : [],
    hasMore: Boolean(body?.hasMore),
  };
}

export function readCachedFeed() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FEED_CACHE_KEY) || 'null');
    return Array.isArray(parsed?.posts) ? parsed.posts : [];
  } catch { return []; }
}

export function writeCachedFeed(posts) {
  try { localStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ posts: posts.slice(0, 40), cachedAt: Date.now() })); } catch {}
}

export async function uploadFeedMedia(file) {
  const form = new FormData();
  form.append('media', file);
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
  return result.post;
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
