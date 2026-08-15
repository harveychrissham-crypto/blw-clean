import { query } from '../db/index.js';

const sanitizeToken = (val) => (typeof val === 'string' ? val.trim() : '');
const sanitizePlatform = (val) => {
  const v = typeof val === 'string' ? val.trim().toLowerCase() : '';
  return v === 'ios' || v === 'android' || v === 'web' ? v : 'android';
};

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
