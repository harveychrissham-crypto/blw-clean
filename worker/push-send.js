import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const json = (body, status = 200, origin = '') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
    vary: 'Origin',
  },
});

function bearer(request) {
  const header = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function jwtSecret(env) {
  const value = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!value) throw new Error('JWT_SECRET is not configured.');
  return value;
}

async function authenticateAdmin(request, env) {
  const token = bearer(request);
  if (!token) return { ok: false, status: 403, error: 'Administrator authorization is required.' };

  try {
    const payload = jwt.verify(token, jwtSecret(env));
    const email = typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : '';
    if (!email) return { ok: false, status: 403, error: 'Administrator authorization is required.' };

    const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
    if (!connectionString) return { ok: false, status: 503, error: 'Database connection is not configured.' };

    const { Client } = await import('pg');
    const client = new Client({ connectionString });
    await client.connect();
    try {
      const result = await client.query('SELECT is_admin FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
      if (result.rows[0]?.is_admin !== true) {
        return { ok: false, status: 403, error: 'Administrator authorization is required.' };
      }
    } finally {
      await client.end().catch(() => {});
    }

    return { ok: true, email };
  } catch (error) {
    console.error('[worker] push admin authentication failed', { message: error?.message });
    return { ok: false, status: 403, error: 'Administrator authorization is required.' };
  }
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function firebaseConfig(env) {
  const projectId = typeof env.FIREBASE_PROJECT_ID === 'string' ? env.FIREBASE_PROJECT_ID.trim() : '';
  const clientEmail = typeof env.FIREBASE_CLIENT_EMAIL === 'string' ? env.FIREBASE_CLIENT_EMAIL.trim() : '';
  const privateKey = typeof env.FIREBASE_PRIVATE_KEY === 'string'
    ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').trim()
    : '';

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase service-account configuration is incomplete.');
  }

  return { projectId, clientEmail, privateKey };
}

async function getFirebaseAccessToken(env) {
  const { clientEmail, privateKey } = firebaseConfig(env);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsignedToken = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey, 'base64url');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedToken}.${signature}`,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || 'Unable to obtain Firebase access token.');
  }
  return body.access_token;
}

async function sendToFcm({ token, title, body, data, accessToken, projectId }) {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        ...(data && Object.keys(data).length ? { data } : {}),
        android: {
          priority: 'HIGH',
          notification: {
            channel_id: 'blw_default',
            sound: 'default',
          },
        },
      },
    }),
  });
  const responseBody = await response.json().catch(() => ({}));
  return { ok: response.ok, responseBody };
}

export async function sendPushNotification(request, env) {
  const origin = request.headers.get('Origin') || new URL(request.url).origin;
  if (request.method === 'OPTIONS') return json(null, 204, origin);

  const admin = await authenticateAdmin(request, env);
  if (!admin.ok) return json({ error: admin.error }, admin.status, origin);

  const body = await request.clone().json().catch(() => ({}));
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : '';
  const message = typeof body?.body === 'string' ? body.body.trim().slice(0, 500) : '';
  const broadcast = body?.broadcast === true;
  const userEmails = Array.isArray(body?.userEmails)
    ? [...new Set(body.userEmails
      .filter((email) => typeof email === 'string')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean))]
    : [];

  if (!title || !message) return json({ error: 'Notification title and body are required.' }, 400, origin);
  if (!broadcast && !userEmails.length) {
    return json({ error: 'Specify broadcast: true or provide at least one user email.' }, 400, origin);
  }

  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) return json({ error: 'Database connection is not configured.' }, 503, origin);

  try {
    const { Client } = await import('pg');
    const client = new Client({ connectionString });
    await client.connect();
    let tokens;
    try {
      const query = broadcast
        ? 'SELECT token FROM push_tokens WHERE token IS NOT NULL AND token <> '''
        : 'SELECT token FROM push_tokens WHERE LOWER(user_email) = ANY($1::text[]) AND token IS NOT NULL AND token <> ''';
      const result = broadcast ? await client.query(query) : await client.query(query, [userEmails]);
      tokens = [...new Set(result.rows.map((row) => typeof row.token === 'string' ? row.token.trim() : '').filter(Boolean))];
    } finally {
      await client.end().catch(() => {});
    }

    if (!tokens.length) return json({ status: 'ok', sent: 0, failed: 0, totalTokens: 0 }, 200, origin);

    const { projectId } = firebaseConfig(env);
    const accessToken = await getFirebaseAccessToken(env);
    let sent = 0;
    let failed = 0;
    let removed = 0;

    for (const token of tokens) {
      try {
        const result = await sendToFcm({
          token,
          title,
          body: message,
          data: { type: 'announcement', source: 'leader_notification_center' },
          accessToken,
          projectId,
        });
        if (result.ok) {
          sent += 1;
          continue;
        }

        failed += 1;
        const errorString = JSON.stringify(result.responseBody || {});
        if (/UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/i.test(errorString)) {
          const cleanup = new Client({ connectionString });
          await cleanup.connect();
          try {
            await cleanup.query('DELETE FROM push_tokens WHERE token = $1', [token]);
          } finally {
            await cleanup.end().catch(() => {});
          }
          removed += 1;
        }
      } catch (error) {
        failed += 1;
        console.error('[worker] individual push send failed', { message: error?.message });
      }
    }

    return json({ status: 'ok', sent, failed, removed, totalTokens: tokens.length }, 200, origin);
  } catch (error) {
    console.error('[worker] push send failed', { message: error?.message, code: error?.code });
    return json({ error: error?.message || 'Unable to send push notifications right now.' }, 503, origin);
  }
}
