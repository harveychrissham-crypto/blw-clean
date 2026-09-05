import crypto from 'node:crypto';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const EXTENSIONS = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/gif', 'gif'], ['image/avif', 'avif']]);

// Shared upload path: validates the file and stores it in Supabase Storage.
// Returns { url } on success or { error, status } on failure — callers
// decide how to wrap that in a Response, since some (avatar upload) need to
// do a follow-up database write in the same request.
export async function uploadImageToStorage(request, env, { bucket, fieldName = 'photo' } = {}) {
  const supabaseUrl = typeof env.SUPABASE_URL === 'string' ? env.SUPABASE_URL.replace(/\/$/, '') : '';
  const serviceRoleKey = typeof env.SUPABASE_SERVICE_ROLE_KEY === 'string' ? env.SUPABASE_SERVICE_ROLE_KEY.trim() : '';
  if (!supabaseUrl || !serviceRoleKey) return { error: 'File storage is not configured on the server yet.', status: 503 };
  const form = await request.formData();
  const file = form.get(fieldName);
  if (!(file instanceof File)) return { error: `No file was uploaded. Attach it under the "${fieldName}" field.`, status: 400 };
  const contentType = typeof file.type === 'string' ? file.type.toLowerCase() : '';
  if (!ALLOWED_TYPES.has(contentType) || contentType === 'image/svg+xml') return { error: 'Only JPEG, PNG, WebP, GIF, and AVIF images are allowed.', status: 400 };
  if (file.size > MAX_BYTES) return { error: 'Image must be 5 MB or smaller.', status: 413 };
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
    return { error: 'Unable to store the photo right now.', status: 500 };
  }
  return { url: `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURIComponent(fileName)}` };
}

export async function handleUpload(request, env, url) {
  if (url.pathname !== '/api/uploads' || request.method !== 'POST') return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
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
