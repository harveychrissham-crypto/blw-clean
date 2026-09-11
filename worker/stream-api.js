import jwt from 'jsonwebtoken';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

function getEmail(request, env) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!token || !secret) return '';
  try {
    const payload = jwt.verify(token, secret);
    return typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : '';
  } catch {
    return '';
  }
}

function streamConfig(env) {
  return {
    accountId: typeof env.CLOUDFLARE_ACCOUNT_ID === 'string' ? env.CLOUDFLARE_ACCOUNT_ID.trim() : '',
    token: typeof env.CLOUDFLARE_STREAM_TOKEN === 'string' ? env.CLOUDFLARE_STREAM_TOKEN.trim() : '',
    customerCode: typeof env.CLOUDFLARE_STREAM_CUSTOMER_CODE === 'string' ? env.CLOUDFLARE_STREAM_CUSTOMER_CODE.trim() : '',
  };
}

export async function handleStream(request, env, url) {
  if (!url.pathname.startsWith('/api/stream')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const email = getEmail(request, env);
  if (!email) return json({ error: 'Sign in required to upload videos.' }, 401, headers);

  const { accountId, token, customerCode } = streamConfig(env);
  if (!accountId || !token || !customerCode) {
    return json({ error: 'Cloudflare Stream is not configured on the server yet.' }, 503, headers);
  }

  if (url.pathname === '/api/stream/direct-upload' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const requestedDuration = Number(body?.maxDurationSeconds || 1200);
    const maxDurationSeconds = Math.min(Math.max(Number.isFinite(requestedDuration) ? requestedDuration : 1200, 1), 36000);

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/stream/direct_upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Upload-Creator': email.slice(0, 64),
      },
      body: JSON.stringify({
        maxDurationSeconds,
        meta: { app: 'blw-kenya-zone', creator: email },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.result?.uploadURL) {
      console.error('[worker] Cloudflare Stream direct upload creation failed', {
        status: response.status,
        errors: payload?.errors,
      });
      return json({ error: 'Unable to start the video upload right now.' }, response.status >= 400 && response.status < 500 ? response.status : 502, headers);
    }

    const uid = String(payload.result.uid || payload.result.id || '').trim();
    if (!uid) return json({ error: 'Cloudflare Stream did not return a video ID.' }, 502, headers);

    const playerUrl = `https://customer-${customerCode}.cloudflarestream.com/${encodeURIComponent(uid)}/iframe?autoplay=true&muted=true&controls=true`;
    return json({ uploadURL: payload.result.uploadURL, uid, playerUrl, mediaType: 'stream' }, 200, headers);
  }

  const statusMatch = url.pathname.match(/^\/api\/stream\/videos\/([^/]+)$/);
  if (statusMatch && request.method === 'GET') {
    const uid = decodeURIComponent(statusMatch[1] || '').trim();
    if (!uid || uid.length > 64) return json({ error: 'Invalid Stream video ID.' }, 400, headers);

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/stream/${encodeURIComponent(uid)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) return json({ error: 'Unable to read the video status.' }, response.status >= 400 && response.status < 500 ? response.status : 502, headers);

    return json({
      uid,
      readyToStream: Boolean(payload.result?.readyToStream),
      state: payload.result?.status?.state || 'unknown',
      duration: payload.result?.duration ?? null,
      thumbnail: payload.result?.thumbnail || null,
    }, 200, headers);
  }

  return json({ error: 'Not found.' }, 404, headers);
}
