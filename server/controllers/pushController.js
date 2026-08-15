import crypto from 'crypto';
import { query } from '../db/index.js';

const sanitizeToken = (val) => (typeof val === 'string' ? val.trim() : '');
const sanitizePlatform = (val) => {
  const v = typeof val === 'string' ? val.trim().toLowerCase() : '';
  return v === 'ios' || v === 'android' || v === 'web' ? v : 'android';
};

const sanitizeText = (val, maxLength) => (typeof val === 'string' ? val.trim().slice(0, maxLength) : '');

function firebaseConfig() {
  const projectId = sanitizeText(process.env.FIREBASE_PROJECT_ID, 200);
  const clientEmail = sanitizeText(process.env.FIREBASE_CLIENT_EMAIL, 320);
  const privateKey = typeof process.env.FIREBASE_PRIVATE_KEY === 'string'
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').trim()
    : '';

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase service-account configuration is incomplete.');
  }

  return { projectId, clientEmail, privateKey };
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function getFirebaseAccessToken() {
  const { clientEmail, privateKey } = firebaseConfig();
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
  const assertion = `${unsignedToken}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
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
      'Content-Type': 'application/json',
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

// Called by the client after @capacitor/push-notifications successfully
// registers with FCM/APNs (see client/src/native.js setUpPushNotifications).
// Upserts on `token` so re-registering the same device (app reinstall,
// token refresh) just updates ownership/timestamp instead of duplicating.
export const registerToken = async (req, res) => {
  const token = sanitizeToken(req.body?.token);
  const platform = sanitizePlatform(req.body?.platform);
  const email = typeof req.user?.email === 'string' ? req.user.email.trim().toLowerCase() : '';

  if (!token) return res.status(400).json({ error: 'A device token is required.' });
  if (!email) return res.status(401).json({ error: 'Invalid authentication token.' });

  try {
    await query(
      `INSERT INTO push_tokens (user_email, token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token)
       DO UPDATE SET user_email = EXCLUDED.user_email, platform = EXCLUDED.platform, updated_at = NOW()`,
      [email, token, platform]
    );
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[push] token registration failed', err);
    res.status(500).json({ error: 'Unable to register for push notifications right now.' });
  }
};

// Called on logout so a signed-out device stops being a delivery target for
// the account that just logged out (the device itself may still be used by
// someone else afterwards).
export const unregisterToken = async (req, res) => {
  const token = sanitizeToken(req.body?.token);
  if (!token) return res.status(400).json({ error: 'A device token is required.' });

  try {
    await query('DELETE FROM push_tokens WHERE token = $1', [token]);
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[push] token unregistration failed', err);
    res.status(500).json({ error: 'Unable to unregister push token right now.' });
  }
};

// Leadership-only sender. Supply either `userEmails` or `broadcast: true`.
// `data` values are normalized to strings because FCM data payload values
// must be strings.
export const sendNotification = async (req, res) => {
  const title = sanitizeText(req.body?.title, 120);
  const body = sanitizeText(req.body?.body, 500);
  const broadcast = req.body?.broadcast === true;
  const userEmails = Array.isArray(req.body?.userEmails)
    ? [...new Set(req.body.userEmails.filter((email) => typeof email === 'string').map((email) => email.trim().toLowerCase()).filter(Boolean))].slice(0, 500)
    : [];
  const rawData = req.body?.data && typeof req.body.data === 'object' && !Array.isArray(req.body.data)
    ? req.body.data
    : {};
  const data = Object.fromEntries(
    Object.entries(rawData)
      .slice(0, 20)
      .map(([key, value]) => [sanitizeText(key, 100), sanitizeText(String(value), 1000)])
      .filter(([key]) => key)
  );

  if (!title || !body) return res.status(400).json({ error: 'Notification title and body are required.' });
  if (!broadcast && !userEmails.length) {
    return res.status(400).json({ error: 'Specify broadcast: true or provide at least one user email.' });
  }

  try {
    const targetQuery = broadcast
      ? "SELECT token FROM push_tokens WHERE token IS NOT NULL AND token <> ''"
      : "SELECT token FROM push_tokens WHERE LOWER(user_email) = ANY($1::text[]) AND token IS NOT NULL AND token <> ''";
    const result = broadcast ? await query(targetQuery) : await query(targetQuery, [userEmails]);
    const tokens = [...new Set(result.rows.map((row) => sanitizeToken(row.token)).filter(Boolean))];

    if (!tokens.length) return res.json({ status: 'ok', sent: 0, failed: 0, totalTokens: 0 });

    const accessToken = await getFirebaseAccessToken();
    const { projectId } = firebaseConfig();
    let sent = 0;
    let failed = 0;
    let removed = 0;

    for (const token of tokens) {
      try {
        const resultForToken = await sendToFcm({ token, title, body, data, accessToken, projectId });
        if (resultForToken.ok) {
          sent += 1;
          continue;
        }

        failed += 1;
        const errorString = JSON.stringify(resultForToken.responseBody || {});
        if (/UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/i.test(errorString)) {
          await query('DELETE FROM push_tokens WHERE token = $1', [token]);
          removed += 1;
        }
      } catch (error) {
        failed += 1;
        console.error('[push] individual notification send failed', error);
      }
    }

    res.json({ status: 'ok', sent, failed, removed, totalTokens: tokens.length });
  } catch (err) {
    console.error('[push] notification send failed', err);
    res.status(503).json({ error: err.message || 'Unable to send push notifications right now.' });
  }
};
