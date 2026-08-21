import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

function authSecret() {
  const secret = typeof process.env.JWT_SECRET === 'string' ? process.env.JWT_SECRET.trim() : '';
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
}

export async function requireLeaderAdmin(req, res, next) {
  const authorization = req.headers.authorization || req.headers.Authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Administrator authorization is required.' });
  }

  try {
    const token = authorization.slice(7).trim();
    const payload = jwt.verify(token, authSecret());
    const email = typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : '';
    if (!email) return res.status(403).json({ error: 'Administrator authorization is required.' });

    const result = await query('SELECT is_admin FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (result.rows[0]?.is_admin !== true) {
      return res.status(403).json({ error: 'Administrator authorization is required.' });
    }

    req.leaderAdmin = true;
    req.user = { ...(req.user || {}), ...payload.user, email };
    next();
  } catch (error) {
    console.error('[auth] admin authorization failed', error?.message || error);
    return res.status(403).json({ error: 'Administrator authorization is required.' });
  }
}
