import { query } from '../db/index.js';
import { hashPassword } from '../utils/crypto.js';

const createMembershipId = () => `M-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
const createBadge = () => `BLW-2026-${Math.floor(100 + Math.random() * 900)}`;

export const findUserByEmailOrPhone = async (email, phone) => {
  return query(
    `SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) OR phone = $2 LIMIT 1`,
    [email, phone]
  );
};

export const createUser = async ({
  fullName,
  email,
  password,
  phone,
  campusZone,
  chapter,
  country,
  residence,
  birthday,
  invitedBy,
  gender,
}) => {
  const membershipId = createMembershipId();
  const badge = createBadge();
  const hashedPassword = await hashPassword(password);
  const result = await query(
    `INSERT INTO users (full_name, email, password_hash, phone, campus_zone, chapter, country, residence, birthday, invited_by, gender, membership_id, badge, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Verified')
     RETURNING email, full_name, phone, campus_zone, chapter, country, residence, birthday, invited_by, gender, membership_id, badge, status`,
    [
      fullName,
      email.toLowerCase(),
      hashedPassword,
      phone,
      campusZone,
      chapter,
      country,
      residence,
      birthday || null,
      invitedBy,
      gender,
      membershipId,
      badge,
    ]
  );

  return result.rows[0];
};

export const deleteUserByEmail = async (email) => {
  return query(
    `DELETE FROM users WHERE LOWER(email) = LOWER($1) RETURNING email`,
    [email]
  );
};
