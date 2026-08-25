import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(
  status === 204 ? null : JSON.stringify(body),
  { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } },
);

function getBearer(request) { const value = request.headers.get('Authorization') || request.headers.get('authorization') || ''; return value.startsWith('Bearer ') ? value.slice(7).trim() : ''; }
function getJwtSecret(env) { const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : ''; if (!secret) throw new Error('JWT_SECRET is not configured.'); return secret; }

async function verifyAdmin(request, env) {
  const token = getBearer(request); if (!token) return { ok: false, status: 403, error: 'Administrator authorization is required.' };
  try {
    const payload = jwt.verify(token, getJwtSecret(env));
    const email = typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : '';
    if (!email) return { ok: false, status: 403, error: 'Administrator authorization is required.' };
    const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
    if (!connectionString) return { ok: false, status: 503, error: 'Database connection is not configured.' };
    const { Client } = await import('pg'); const client = new Client({ connectionString }); await client.connect();
    try { const result = await client.query('SELECT is_admin FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]); if (result.rows[0]?.is_admin !== true) return { ok: false, status: 403, error: 'Administrator authorization is required.' }; }
    finally { await client.end().catch(() => {}); }
    return { ok: true };
  } catch (error) { console.error('[worker] push admin authentication failed', { message: error?.message }); return { ok: false, status: 403, error: 'Administrator authorization is required.' }; }
}

function firebaseConfig(env) {
  const projectId = typeof env.FIREBASE_PROJECT_ID === 'string' ? env.FIREBASE_PROJECT_ID.trim() : '';
  const clientEmail = typeof env.FIREBASE_CLIENT_EMAIL === 'string' ? env.FIREBASE_CLIENT_EMAIL.trim() : '';
  const privateKey = typeof env.FIREBASE_PRIVATE_KEY === 'string' ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').trim() : '';
  if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase service-account configuration is incomplete.');
  return { projectId, clientEmail, privateKey };
}
function base64url(value) { return Buffer.from(value).toString('base64url'); }
async function getFirebaseAccessToken(env) {
  const { clientEmail, privateKey } = firebaseConfig(env); const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({ iss: clientEmail, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claims}`; const signer = crypto.createSign('RSA-SHA256'); signer.update(unsigned); signer.end();
  const signature = signer.sign(privateKey, 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }) });
  const body = await response.json().catch(() => ({})); if (!response.ok || !body.access_token) throw new Error(body.error_description || body.error || 'Unable to obtain Firebase access token.'); return body.access_token;
}

function buildNotificationData(rawData) {
  const allowedTypes = new Set(['announcement', 'event', 'outreach', 'sermon', 'venue']);
  const type = typeof rawData?.type === 'string' && allowedTypes.has(rawData.type) ? rawData.type : 'announcement';
  const id = typeof rawData?.id === 'string' ? rawData.id.trim().slice(0, 120) : '';
  const source = typeof rawData?.source === 'string' ? rawData.source.trim().slice(0, 120) : 'leader_notification_center';
  return { type, id, source };
}

async function sendToken({ token, title, body, data, accessToken, projectId }) {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ message: { token, notification: { title, body }, data, android: { priority: 'HIGH', notification: { channel_id: 'blw_default', sound: 'default' } } } }),
  });
  return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
}

export async function sendPushNotification(request, env) {
  const headers = corsHeaders(request, env); if (request.method === 'OPTIONS') return json(null, 204, headers);
  const admin = await verifyAdmin(request, env); if (!admin.ok) return json({ error: admin.error }, admin.status, headers);
  const body = await request.clone().json().catch(() => ({}));
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : '';
  const message = typeof body?.body === 'string' ? body.body.trim().slice(0, 500) : '';
  const broadcast = body?.broadcast === true;
  const userEmails = Array.isArray(body?.userEmails) ? [...new Set(body.userEmails.filter((x) => typeof x === 'string').map((x) => x.trim().toLowerCase()).filter(Boolean))] : [];
  const data = buildNotificationData(body?.data);
  if (!title || !message) return json({ error: 'Notification title and body are required.' }, 400, headers);
  if (!broadcast && !userEmails.length) return json({ error: 'Specify broadcast: true or provide at least one user email.' }, 400, headers);
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || ''; if (!connectionString) return json({ error: 'Database connection is not configured.' }, 503, headers);
  try {
    const { Client } = await import('pg'); const client = new Client({ connectionString }); await client.connect(); let tokens = [];
    try {
      const sql = broadcast ? `SELECT token FROM push_tokens WHERE token IS NOT NULL AND token <> ''` : `SELECT token FROM push_tokens WHERE LOWER(user_email) = ANY($1::text[]) AND token IS NOT NULL AND token <> ''`;
      const result = broadcast ? await client.query(sql) : await client.query(sql, [userEmails]); tokens = [...new Set(result.rows.map((row) => typeof row.token === 'string' ? row.token.trim() : '').filter(Boolean))];
    } finally { await client.end().catch(() => {}); }
    if (!tokens.length) return json({ status: 'ok', sent: 0, failed: 0, removed: 0, totalTokens: 0 }, 200, headers);
    const { projectId } = firebaseConfig(env); const accessToken = await getFirebaseAccessToken(env); let sent = 0; let failed = 0; let removed = 0; const failures = [];
    for (const token of tokens) {
      const result = await sendToken({ token, title, body: message, data, accessToken, projectId });
      if (result.ok) { sent += 1; continue; }
      failed += 1; const errorString = JSON.stringify(result.body || {}); failures.push({ status: result.status, error: result.body?.error?.status || result.body?.error?.message || 'FCM send failed' });
      if (/UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/i.test(errorString)) {
        const cleanup = new Client({ connectionString }); await cleanup.connect(); try { await cleanup.query('DELETE FROM push_tokens WHERE token = $1', [token]); } finally { await cleanup.end().catch(() => {}); } removed += 1;
      }
    }
    console.log('[worker] push send result', { sent, failed, removed, totalTokens: tokens.length, data, failures });
    return json({ status: 'ok', sent, failed, removed, totalTokens: tokens.length, failures }, 200, headers);
  } catch (error) { console.error('[worker] push send failed', { message: error?.message, code: error?.code }); return json({ error: error?.message || 'Unable to send push notifications right now.' }, 503, headers); }
}
