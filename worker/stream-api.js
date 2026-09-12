import jwt from 'jsonwebtoken';
import { corsHeaders } from './security.js';

const BUNNY_TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload';

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

function bunnyConfig(env) {
  return {
    libraryId: typeof env.BUNNY_STREAM_LIBRARY_ID === 'string' ? env.BUNNY_STREAM_LIBRARY_ID.trim() : '',
    apiKey: typeof env.BUNNY_STREAM_API_KEY === 'string' ? env.BUNNY_STREAM_API_KEY.trim() : '',
    cdnHostname: typeof env.BUNNY_STREAM_CDN_HOSTNAME === 'string' ? env.BUNNY_STREAM_CDN_HOSTNAME.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') : '',
  };
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeTitle(value, email) {
  const title = String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 180);
  return title || `BLW Feed Video — ${email}`;
}

export async function handleStream(request, env, url) {
  if (!url.pathname.startsWith('/api/stream')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const email = getEmail(request, env);
  if (!email) return json({ error: 'Sign in required to upload videos.' }, 401, headers);

  const { libraryId, apiKey, cdnHostname } = bunnyConfig(env);
  if (!libraryId || !apiKey || !cdnHostname) {
    return json({ error: 'Bunny Stream is not configured on the server yet.' }, 503, headers);
  }

  if (url.pathname === '/api/stream/direct-upload' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const title = safeTitle(body?.title, email);
    const response = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos`, {
      method: 'POST',
      headers: {
        AccessKey: apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.guid) {
      console.error('[worker] Bunny Stream video creation failed', { status: response.status, payload });
      return json({ error: 'Unable to start the video upload right now.' }, response.status >= 400 && response.status < 500 ? response.status : 502, headers);
    }

    const videoId = String(payload.guid).trim();
    const expirationTime = Math.floor(Date.now() / 1000) + 15 * 60;
    const signature = await sha256Hex(`${libraryId}${apiKey}${expirationTime}${videoId}`);
    const manifestUrl = `/api/stream/videos/${encodeURIComponent(videoId)}/manifest/video.m3u8`;
    const directManifestUrl = `https://${cdnHostname}/${encodeURIComponent(videoId)}/playlist.m3u8`;
    const thumbnailUrl = `https://${cdnHostname}/${encodeURIComponent(videoId)}/thumbnail.jpg`;

    return json({
      uploadURL: {
        endpoint: BUNNY_TUS_ENDPOINT,
        signature,
        expirationTime,
        videoId,
        libraryId,
      },
      endpoint: BUNNY_TUS_ENDPOINT,
      signature,
      expirationTime,
      videoId,
      uid: videoId,
      libraryId,
      manifestUrl,
      directManifestUrl,
      thumbnail: thumbnailUrl,
      mediaType: 'video',
    }, 200, headers);
  }

  const manifestMatch = url.pathname.match(/^\/api\/stream\/videos\/([^/]+)\/manifest\/video\.m3u8$/);
  if (manifestMatch && request.method === 'GET') {
    const videoId = decodeURIComponent(manifestMatch[1] || '').trim();
    if (!videoId || videoId.length > 100) return json({ error: 'Invalid Bunny video ID.' }, 400, headers);
    return Response.redirect(`https://${cdnHostname}/${encodeURIComponent(videoId)}/playlist.m3u8`, 302);
  }

  const statusMatch = url.pathname.match(/^\/api\/stream\/videos\/([^/]+)$/);
  if (statusMatch && request.method === 'GET') {
    const videoId = decodeURIComponent(statusMatch[1] || '').trim();
    if (!videoId || videoId.length > 100) return json({ error: 'Invalid Bunny video ID.' }, 400, headers);
    const response = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(videoId)}`, {
      headers: { AccessKey: apiKey, Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.guid) {
      return json({ error: 'Unable to read the video status.' }, response.status >= 400 && response.status < 500 ? response.status : 502, headers);
    }
    const status = Number(payload.status);
    const readyToStream = status >= 3 && Number(payload.encodeProgress || 0) >= 100;
    return json({
      uid: videoId,
      readyToStream,
      state: Number.isFinite(status) ? status : 'unknown',
      encodeProgress: Number(payload.encodeProgress || 0),
      duration: payload.length ?? null,
      width: payload.width ?? null,
      height: payload.height ?? null,
      thumbnail: `https://${cdnHostname}/${encodeURIComponent(videoId)}/thumbnail.jpg`,
      manifestUrl: `/api/stream/videos/${encodeURIComponent(videoId)}/manifest/video.m3u8`,
    }, 200, headers);
  }

  return json({ error: 'Not found.' }, 404, headers);
}
