import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

function bearer(request) {
  const header = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return '';
}

function b64(value) {
  return Buffer.from(value).toString('base64url');
}

function signLiveKitToken(apiKey, apiSecret, identity, roomName, canPublish) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64(JSON.stringify({
    iss: apiKey,
    sub: identity,
    iat: now,
    nbf: now,
    exp: now + 3600,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    },
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', apiSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export async function handleLiveKitToken(request, env, headers) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers);

  const authToken = bearer(request);
  if (!authToken) return json({ error: 'Authorization token missing.' }, 401, headers);

  let auth;
  try {
    auth = jwt.verify(authToken, typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '');
  } catch {
    return json({ error: 'Invalid authentication token.' }, 401, headers);
  }

  const userEmail = typeof auth?.user?.email === 'string' ? auth.user.email.trim().toLowerCase() : '';
  if (!userEmail) return json({ error: 'Authenticated member identity is missing.' }, 401, headers);

  const body = await request.clone().json().catch(() => ({}));
  const requestedRoom = typeof body?.room_name === 'string' ? body.room_name.trim() : '';
  const participantName = typeof body?.participant_name === 'string' ? body.participant_name.trim().slice(0, 80) : 'BLW Member';
  const roomName = requestedRoom.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  if (!roomName) return json({ error: 'A valid room_name is required.' }, 400, headers);

  const livekitUrl = typeof env.LIVEKIT_URL === 'string' ? env.LIVEKIT_URL.trim() : '';
  const apiKey = typeof env.LIVEKIT_API_KEY === 'string' ? env.LIVEKIT_API_KEY.trim() : '';
  const apiSecret = typeof env.LIVEKIT_API_SECRET === 'string' ? env.LIVEKIT_API_SECRET.trim() : '';
  if (!livekitUrl || !apiKey || !apiSecret) {
    return json({ error: 'LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to the Worker environment.' }, 503, headers);
  }

  // Use an opaque identity so email addresses never become LiveKit participant IDs.
  const identity = `member-${crypto.createHash('sha256').update(userEmail).digest('hex').slice(0, 24)}`;
  const canPublish = body?.role === 'viewer' ? false : true;
  const token = signLiveKitToken(apiKey, apiSecret, identity, roomName, canPublish);

  return json({
    server_url: livekitUrl,
    participant_token: token,
    participant_identity: identity,
    participant_name: participantName || 'BLW Member',
  }, 201, headers);
}
