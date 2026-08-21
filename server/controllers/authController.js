import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { verifyPassword } from '../utils/crypto.js';
import { findUserByEmailOrPhone, createUser, deleteUserByEmail } from '../services/userService.js';

const getJwtSecret = () => {
  const secret = typeof process.env.JWT_SECRET === 'string' ? process.env.JWT_SECRET.trim() : '';
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
};

const sanitizeString = (val) => {
  if (typeof val !== 'string') return '';
  return val.trim().replace(/<[^>]*>/g, '').replace(/[<>"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
};

const sanitizeEmail = (val) => typeof val === 'string' ? val.trim().toLowerCase() : '';
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60;
const COOKIE_MAX_AGE = TOKEN_MAX_AGE * 1000;

const createToken = (user) => jwt.sign({ user }, getJwtSecret(), { expiresIn: TOKEN_MAX_AGE });

const setAuthCookie = (res, token) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `blw_auth_token=${encodeURIComponent(token)}; Max-Age=${TOKEN_MAX_AGE}; Path=/; HttpOnly; SameSite=Strict${secure}`
  );
};

const clearAuthCookie = (res) => {
  res.setHeader(
    'Set-Cookie',
    'blw_auth_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict'
  );
};

export const health = (_req, res) => res.json({ status: 'ok', message: 'Auth service ready' });

export const login = async (req, res) => {
  const email = sanitizeEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format.' });

  try {
    const result = await query(
      `SELECT full_name, email, phone, campus_zone, chapter, country, residence,
              birthday, invited_by, gender, membership_id, badge, status, password_hash, is_admin
       FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid email or password.' });
    const user = result.rows[0];
    if (!(await verifyPassword(password, user.password_hash))) return res.status(401).json({ error: 'Invalid email or password.' });

    const payloadUser = {
      email: user.email, name: user.full_name, phone: user.phone,
      campusZone: user.campus_zone, chapter: user.chapter, country: user.country,
      residence: user.residence, birthday: user.birthday, invitedBy: user.invited_by,
      gender: user.gender, membershipId: user.membership_id, badge: user.badge, status: user.status,
      isAdmin: !!user.is_admin,
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
  const fullName = sanitizeString(body.fullName);
  const email = sanitizeEmail(body.email);
  const password = body.password;
  const phone = sanitizeString(body.phone);
  const campusZone = sanitizeString(body.campusZone);
  const chapter = sanitizeString(body.chapter);
  const country = sanitizeString(body.country);
  const residence = sanitizeString(body.residence);
  const birthday = sanitizeString(body.birthday);
  const invitedBy = sanitizeString(body.invitedBy);
  const gender = sanitizeString(body.gender);

  if (!fullName || !email || !password || !phone || !campusZone || !chapter || !country || !residence || !invitedBy || !gender) {
    return res.status(400).json({ error: 'Missing required registration fields.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const duplicate = await findUserByEmailOrPhone(email, phone);
    if (duplicate.rows.length) return res.status(409).json({ error: 'An account with that email or phone already exists.' });

    const user = await createUser({ fullName, email, password, phone, campusZone, chapter, country, residence, birthday, invitedBy, gender });
    const payloadUser = {
      email: user.email, name: user.full_name, phone: user.phone,
      campusZone: user.campus_zone, chapter: user.chapter, country: user.country,
      residence: user.residence, birthday: user.birthday, invitedBy: user.invited_by,
      gender: user.gender, membershipId: user.membership_id, badge: user.badge, status: user.status,
      isAdmin: false,
    };
    const token = createToken(payloadUser);
    setAuthCookie(res, token);
    return res.status(201).json({ user: payloadUser, token });
  } catch (err) {
    console.error('[auth] register error', err);
    if (err.code === '23505') return res.status(409).json({ error: 'An account with that email or phone already exists.' });
    return res.status(500).json({ error: 'Unable to process registration at this time.' });
  }
};

export const deleteAccount = async (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'Authorization token missing or invalid.' });
  try {
    const result = await deleteUserByEmail(email);
    if (!result.rows.length) return res.status(404).json({ error: 'Account not found.' });
    clearAuthCookie(res);
    return res.json({ status: 'ok', message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('[auth] delete account error', err);
    return res.status(500).json({ error: 'Unable to delete account at this time.' });
  }
};

export const me = (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  const freshToken = createToken(req.user);
  setAuthCookie(res, freshToken);
  return res.json({ user: req.user, token: freshToken });
};

export const logout = (_req, res) => {
  clearAuthCookie(res);
  return res.json({ status: 'ok' });
};
