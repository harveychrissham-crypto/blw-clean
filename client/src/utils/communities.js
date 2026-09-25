import { apiFetch } from '../config/api';

export async function fetchCommunities({ query = '', category = '' } = {}) {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (category && category !== 'All') params.set('category', category);
  const response = await apiFetch(`/api/communities?${params.toString()}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to load communities.');
  return Array.isArray(result?.communities) ? result.communities : [];
}

export async function toggleCommunityMembership(id) {
  const response = await apiFetch(`/api/communities/${encodeURIComponent(id)}/join`, { method: 'POST' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to update membership.');
  return result;
}

export async function createCommunity({ name, description, category }) {
  const response = await apiFetch('/api/communities', {
    method: 'POST',
    body: JSON.stringify({ name, description, category }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to create community.');
  return result.community;
}

export async function fetchCommunity(id) {
  const response = await apiFetch(`/api/communities/${encodeURIComponent(id)}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to load community.');
  return result;
}

export async function createCommunityPost(id, body) {
  const response = await apiFetch(`/api/communities/${encodeURIComponent(id)}/posts`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Unable to publish community post.');
  return result.post;
}
