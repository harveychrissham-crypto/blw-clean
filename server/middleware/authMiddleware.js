import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined. Set it in server/.env or the environment.');

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const tokenCookie = cookieHeader.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith('blw_auth_token='));
  if (!tokenCookie) return null;
  return decodeURIComponent(tokenCookie.split('=')[1] || '');
};

export const authenticateToken = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Authorization token missing.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const email = typeof decoded?.user?.email === 'string' ? decoded.user.email.trim().toLowerCase() : '';
    if (!email) return res.status(401).json({ error: 'Invalid authentication token.' });

    // JWTs remain valid until expiry, so also verify that the account still exists.
    const result = await query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (!result.rows.length) {
      res.setHeader('Set-Cookie', 'blw_auth_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict');
      return res.status(401).json({ error: 'Account no longer exists.' });
    }

    req.user = decoded.user;
    req.token = token;
    next();
  } catch (err) {
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    console.error('[auth] token/account validation error', err);
    return res.status(503).json({ error: 'Authentication service temporarily unavailable.' });
  }
};
