import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { verifyPassword } from '../utils/crypto.js';
import { findUserByEmailOrPhone, createUser, deleteUserByEmail } from '../services/userService.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined. Set it in server/.env or the environment.');
}

// ── Sanitization helpers ──────────────────────────────────────────────────────
// Strips HTML/script tags and trims whitespace to block XSS stored via DB.
const sanitizeString = (val) => {
  if (typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/<[^>]*>/g, '')     // strip HTML tags
    .replace(/[<>"']/g, (c) =>   // encode remaining special chars
      ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
};

const sanitizeEmail = (val) => {
  if (typeof val !== 'string') return '';
  return val.trim().toLowerCase();
};

// ── Token ─────────────────────────────────────────────────────────────────────
// Token lifetime matches the cookie lifetime (7 days).
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // seconds
const COOKIE_MAX_AGE = TOKEN_MAX_AGE * 1000; // milliseconds

const createToken = (user) =>
  jwt.sign({ user }, JWT_SECRET, { expiresIn: TOKEN_MAX_AGE });

// ── Cookie ────────────────────────────────────────────────────────────────────
const authCookieOptions = {
  httpOnly: true,                                        // JS cannot read it
  secure: process.env.NODE_ENV === 'production',         // HTTPS only in prod
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // stricter in prod
  maxAge: COOKIE_MAX_AGE,                                // 7 days
  path: '/',
};

const setAuthCookie = (res, token) =>
  res.cookie('blw_auth_token', token, authCookieOptions);

// ── Route handlers ────────────────────────────────────────────────────────────
export const health = (_req, res) =>
  res.json({ status: 'ok', message: 'Auth service ready' });

export const login = async (req, res) => {
  const email = sanitizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  try {
    const result = await query(
      `SELECT full_name, email, phone, campus_zone, chapter, password_hash
       FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    if (!(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const payloadUser = {
      email: user.email,
      name: user.full_name,
      phone: user.phone,
      campusZone: user.campus_zone,
      chapter: user.chapter,
    };
    const token = createToken(payloadUser);
    setAuthCookie(res, token);
    return res.json({ user: payloadUser, token });
  } catch (err) {
    console.error('[auth] login error', err);
    return res.status(500).json({ error: 'Unable to process login at this time.' });
  }
};

export const register = async (req, res) => {
  const body = req.body || {};

  // Sanitize all string inputs
  const fullName    = sanitizeString(body.fullName);
  const email       = sanitizeEmail(body.email);
  const password    = body.password; // don't sanitize — hashed immediately
  const phone       = sanitizeString(body.phone);
  const campusZone  = sanitizeString(body.campusZone);
  const chapter     = sanitizeString(body.chapter);
  const country     = sanitizeString(body.country);
  const residence   = sanitizeString(body.residence);
  const birthday    = sanitizeString(body.birthday);
  const invitedBy   = sanitizeString(body.invitedBy);
  const gender      = sanitizeString(body.gender);

  if (!fullName || !email || !password || !phone || !campusZone || !chapter || !country || !residence || !invitedBy || !gender) {
    return res.status(400).json({ error: 'Missing required registration fields.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  // Enforce minimum password strength
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const duplicate = await findUserByEmailOrPhone(email, phone);
    if (duplicate.rows.length) {
      return res.status(409).json({ error: 'An account with that email or phone already exists.' });
    }

    const user = await createUser({
      fullName, email, password, phone,
      campusZone, chapter, country, residence,
      birthday, invitedBy, gender,
    });

    const payloadUser = {
      email: user.email,
      name: user.full_name,
      phone: user.phone,
      campusZone: user.campus_zone,
      chapter: user.chapter,
    };
    const token = createToken(payloadUser);
    setAuthCookie(res, token);
    return res.status(201).json({ user: payloadUser, token });
  } catch (err) {
    console.error('[auth] register error', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email or phone already exists.' });
    }
    return res.status(500).json({ error: 'Unable to process registration at this time.' });
  }
};

export const deleteAccount = async (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'Authorization token missing or invalid.' });

  try {
    const result = await deleteUserByEmail(email);
    if (!result.rows.length) return res.status(404).json({ error: 'Account not found.' });
    res.clearCookie('blw_auth_token', { path: '/' });
    return res.json({ status: 'ok', message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('[auth] delete account error', err);
    return res.status(500).json({ error: 'Unable to delete account at this time.' });
  }
};

export const me = (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });

  // Issue a fresh token on every /me call to slide the 7-day window
  const freshToken = createToken(req.user);
  setAuthCookie(res, freshToken);
  return res.json({ user: req.user, token: freshToken });
};

export const logout = (_req, res) => {
  res.clearCookie('blw_auth_token', { path: '/' });
  return res.json({ status: 'ok' });
};
