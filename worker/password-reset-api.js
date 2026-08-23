import { corsHeaders, rateLimit } from './security.js';
import { sendEmail } from './email.js';
import { hashPassword } from '../server/utils/crypto.js';

const RESET_TTL_MINUTES = 30;

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

const normalizeEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';

async function db(env, fn) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try { return await fn(client); } finally { await client.end().catch(() => {}); }
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function ensureResetTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens (user_id)');
  await client.query('CREATE INDEX IF NOT EXISTS password_reset_tokens_expiry_idx ON password_reset_tokens (expires_at)');
  await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE');
}

async function handleRequestReset(request, env, headers) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  if (!email || !/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(email)) {
    return json({ message: 'If an account with that email exists, we’ve sent a reset link.' }, 200, headers);
  }

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const resetUrl = new URL('/reset-password', request.url);
  resetUrl.searchParams.set('token', token);

  await db(env, async (client) => {
    await ensureResetTable(client);
    await client.query('DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL');
    const result = await client.query('SELECT id, email, full_name FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
    if (!result.rows.length) return;

    const user = result.rows[0];
    await client.query('DELETE FROM password_reset_tokens WHERE user_id=$1 AND used_at IS NULL', [user.id]);
    await client.query(`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '${RESET_TTL_MINUTES} minutes')`, [user.id, tokenHash]);

    const apiConfigured = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
    if (!apiConfigured) return;

    const safeName = String(user.full_name || 'there').replace(/[<>&"']/g, '');
    const html = `<!doctype html><html><body style="margin:0;background:#0d0c18;color:#f7f7fb;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:32px 18px"><div style="background:#161426;border:1px solid rgba(255,255,255,.09);border-radius:24px;overflow:hidden"><div style="padding:28px;background:linear-gradient(135deg,#17152b,#11101e)"><p style="margin:0;color:#f2a31c;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">BLW Kenya Zone</p><h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;color:#fff">Reset your password</h1></div><div style="padding:28px;color:#ddd9e8;font-size:16px;line-height:1.7"><p>Dear <strong>${safeName}</strong>,</p><p>We received a request to reset your BLW Kenya Zone account password.</p><p><a href="${resetUrl.toString()}" style="display:inline-block;margin:12px 0;padding:13px 20px;border-radius:999px;background:#ec2fa8;color:#fff;text-decoration:none;font-weight:700">Reset password</a></p><p>This link expires in ${RESET_TTL_MINUTES} minutes and can only be used once.</p><p>If you did not request this, you can safely ignore this email.</p><p style="margin-bottom:0">With love,<br><strong>BLW Kenya Zone</strong></p></div></div></div></body></html>`;
    await sendEmail(env, { to: user.email, subject: 'Reset your BLW Kenya Zone password', html });
  });

  return json({ message: 'If an account with that email exists, we’ve sent a reset link.' }, 200, headers);
}

async function handleReset(request, env, headers) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!token || password.length < 8) return json({ error: 'Enter a valid reset token and a password of at least 8 characters.' }, 400, headers);

  const tokenHash = await sha256Hex(token);
  await db(env, async (client) => {
    await ensureResetTable(client);
    await client.query('BEGIN');
    try {
      const result = await client.query(`SELECT pr.id, pr.user_id FROM password_reset_tokens pr WHERE pr.token_hash=$1 AND pr.used_at IS NULL AND pr.expires_at>NOW() FOR UPDATE`, [tokenHash]);
      if (!result.rows.length) {
        await client.query('ROLLBACK');
        throw Object.assign(new Error('Reset link is invalid or expired.'), { status: 400 });
      }

      const passwordHash = await hashPassword(password);
      await client.query('UPDATE users SET password_hash=$1, password_changed_at=NOW() WHERE id=$2', [passwordHash, result.rows[0].user_id]);
      await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [result.rows[0].user_id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    }
  });

  return json({ message: 'Your password has been reset successfully.' }, 200, headers);
}

export async function handlePasswordReset(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/auth/forgot-password' && url.pathname !== '/api/auth/reset-password') return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers);

  const key = url.pathname.endsWith('/reset-password') ? 'password-reset' : 'password-reset-request';
  const limit = rateLimit(request, key, url.pathname.endsWith('/reset-password') ? 8 : 3);
  if (!limit.allowed) return json({ error: 'Too many password reset attempts. Please try again later.' }, 429, { ...headers, 'retry-after': String(limit.retryAfter) });

  try {
    if (url.pathname.endsWith('/forgot-password')) return await handleRequestReset(request, env, headers);
    return await handleReset(request, env, headers);
  } catch (error) {
    console.error('[worker] password reset failed', { message: error?.message, code: error?.code });
    return json({ error: error?.status === 400 ? error.message : 'Unable to process the password reset right now.' }, error?.status || 503, headers);
  }
}
