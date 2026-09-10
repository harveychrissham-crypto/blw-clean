import { apiFetch } from '../config/api';

export async function fetchFeed() {
  const response = await apiFetch('/api/feed', { method: 'GET' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Unable to load the Feed.');
  return Array.isArray(body?.posts) ? body.posts : [];
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
  const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(id)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to add comment.');
  return result.comment;
}

export async function deleteComment(id, commentId) {
  const response = await apiFetch(`/api/feed/posts/${encodeURIComponent(id)}/comments?commentId=${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to delete comment.');
  return result;
}
