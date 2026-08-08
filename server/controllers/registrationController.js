/**
 * registrationController.js
 *
 * Handles POST /api/registration — a legacy-compatible alias for /api/auth/register.
 * All data is stored directly in Postgres (Supabase) via userService.
 * KingsForms has been removed entirely.
 */
import jwt from 'jsonwebtoken';
import { findUserByEmailOrPhone, createUser } from '../services/userService.js';

const JWT_SECRET = process.env.JWT_SECRET;

const createToken = (user) => jwt.sign({ user }, JWT_SECRET, { expiresIn: '2h' });

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 2 * 60 * 60 * 1000,
  path: '/',
};

export const submitRegistration = async (req, res) => {
  const {
    fullName, email, password, phone,
    campusZone, chapter, country, residence,
    birthday, invitedBy, gender,
  } = req.body || {};

  if (!fullName || !email || !password || !phone || !campusZone || !chapter || !country || !residence || !invitedBy || !gender) {
    return res.status(400).json({ error: 'Missing required registration fields.' });
  }

  try {
    const duplicate = await findUserByEmailOrPhone(email, phone);
    if (duplicate.rows.length) {
      return res.status(409).json({ error: 'An account with that email or phone already exists.' });
    }

    const user = await createUser(req.body);

    const payloadUser = {
      email: user.email,
      name: user.full_name,
      phone: user.phone,
      campusZone: user.campus_zone,
      chapter: user.chapter,
      country: user.country,
      residence: user.residence,
      birthday: user.birthday,
      invitedBy: user.invited_by,
      gender: user.gender,
      membershipId: user.membership_id,
      badge: user.badge,
      status: user.status,
    };
    const token = createToken(payloadUser);
    res.cookie('blw_auth_token', token, authCookieOptions);
    return res.status(201).json({ user: payloadUser, token });
  } catch (err) {
    console.error('[registration] error', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email or phone already exists.' });
    }
    return res.status(500).json({ error: 'Unable to complete registration at this time.' });
  }
};
