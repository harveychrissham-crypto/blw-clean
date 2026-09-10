import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const EXTENSIONS = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/gif', 'gif'], ['image/avif', 'avif'], ['video/mp4', 'mp4'], ['video/webm', 'webm'], ['video/quicktime', 'mov']]);

function getEmail(request, env) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!token || !secret) return '';
  try {
    const payload = jwt.verify(token, secret);
    return typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : '';
  } catch { return ''; }
}

export async function uploadImageToStorage(request, env, { bucket, fieldName = 'photo', allowVideo = false } = {}) {
  const supabaseUrl = typeof env.SUPABASE_URL === 'string' ? env.SUPABASE_URL.replace(/\/$/, '') : '';
  const serviceRoleKey = typeof env.SUPABASE_SERVICE_ROLE_KEY === 'string' ? env.SUPABASE_SERVICE_ROLE_KEY.trim() : '';
  if (!supabaseUrl || !serviceRoleKey) return { error: 'File storage is not configured on the server yet.', status: 503 };
  const form = await request.formData();
  const file = form.get(fieldName);
  if (!(file instanceof File)) return { error: `No file was uploaded. Attach it under the "${fieldName}" field.`, status: 400 };
  const contentType = typeof file.type === 'string' ? file.type.toLowerCase() : '';
  const isVideo = allowVideo && ALLOWED_VIDEO_TYPES.has(contentType);
  if (!isVideo && !ALLOWED_TYPES.has(contentType)) return { error: allowVideo ? 'Only JPEG, PNG, WebP, GIF, AVIF images or MP4/WebM/MOV videos are allowed.' : 'Only JPEG, PNG, WebP, GIF, and AVIF images are allowed.', status: 400 };
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_BYTES;
  if (file.size > maxBytes) return { error: `${isVideo ? 'Video' : 'Image'} must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller.`, status: 413 };
  const ext = EXTENSIONS.get(contentType) || 'bin';
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(fileName)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, 'Content-Type': contentType, 'x-upsert': 'false', 'cache-control': '31536000' },
    body: await file.arrayBuffer(),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[worker] Supabase storage upload failed', { status: response.status, detail, bucket });
    return { error: `Unable to store ${isVideo ? 'the video' : 'the photo'} right now.`, status: 500 };
  }
  return { url: `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURIComponent(fileName)}`, mediaType: isVideo ? 'video' : 'image' };
}

export async function handleUpload(request, env, url) {
  if (url.pathname !== '/api/uploads' || request.method !== 'POST') return null;
  const headers = corsHeaders(request, env);
  try {
    const bucket = typeof env.SUPABASE_STORAGE_BUCKET === 'string' && env.SUPABASE_STORAGE_BUCKET.trim() ? env.SUPABASE_STORAGE_BUCKET.trim() : 'outreach-photos';
    const result = await uploadImageToStorage(request, env, { bucket });
    if (result.error) return json({ error: result.error }, result.status, headers);
    return json({ url: result.url }, 201, headers);
  } catch (error) {
    console.error('[worker] upload API failed', { message: error?.message });
    return json({ error: 'Unable to upload the photo right now.' }, 500, headers);
  }
}

export async function handleFeedUpload(request, env, url) {
  if (url.pathname !== '/api/feed/upload' || request.method !== 'POST') return null;
  const headers = corsHeaders(request, env);
  if (!getEmail(request, env)) return json({ error: 'Sign in required to upload media.' }, 401, headers);
  try {
    const result = await uploadImageToStorage(request, env, { bucket: 'feed-media', fieldName: 'media', allowVideo: true });
    if (result.error) return json({ error: result.error }, result.status, headers);
    return json({ url: result.url, mediaType: result.mediaType }, 201, headers);
  } catch (error) {
    console.error('[worker] feed media upload failed', { message: error?.message });
    return json({ error: 'Unable to upload that media right now.' }, 500, headers);
  }
}
