import crypto from 'node:crypto';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const EXTENSIONS = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/gif', 'gif'], ['image/avif', 'avif']]);

export async function handleUpload(request, env, url) {
  if (url.pathname !== '/api/uploads' || request.method !== 'POST') return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  const supabaseUrl = typeof env.SUPABASE_URL === 'string' ? env.SUPABASE_URL.replace(/\/$/, '') : '';
  const serviceRoleKey = typeof env.SUPABASE_SERVICE_ROLE_KEY === 'string' ? env.SUPABASE_SERVICE_ROLE_KEY.trim() : '';
  const bucket = typeof env.SUPABASE_STORAGE_BUCKET === 'string' && env.SUPABASE_STORAGE_BUCKET.trim() ? env.SUPABASE_STORAGE_BUCKET.trim() : 'outreach-photos';
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'File storage is not configured on the server yet.' }, 503, headers);
  try {
    const form = await request.formData();
    const file = form.get('photo');
    if (!(file instanceof File)) return json({ error: 'No file was uploaded. Attach it under the "photo" field.' }, 400, headers);
    const contentType = typeof file.type === 'string' ? file.type.toLowerCase() : '';
    if (!ALLOWED_TYPES.has(contentType) || contentType === 'image/svg+xml') return json({ error: 'Only JPEG, PNG, WebP, GIF, and AVIF images are allowed.' }, 400, headers);
    if (file.size > MAX_BYTES) return json({ error: 'Image must be 5 MB or smaller.' }, 413, headers);
    const ext = EXTENSIONS.get(contentType) || 'bin';
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(fileName)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, 'Content-Type': contentType, 'x-upsert': 'false', 'cache-control': '31536000' },
      body: await file.arrayBuffer(),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[worker] Supabase storage upload failed', { status: response.status, detail });
      return json({ error: 'Unable to store the photo right now.' }, 500, headers);
    }
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURIComponent(fileName)}`;
    return json({ url: publicUrl }, 201, headers);
  } catch (error) {
    console.error('[worker] upload API failed', { message: error?.message });
    return json({ error: 'Unable to upload the photo right now.' }, 500, headers);
  }
}
