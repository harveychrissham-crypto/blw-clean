import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined. Set it in server/.env or the environment.');
}

const pool = new Pool({ connectionString });

export const query = async (text, params = []) => {
  return pool.query(text, params);
};

export const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      campus_zone TEXT NOT NULL,
      chapter TEXT NOT NULL,
      country TEXT NOT NULL,
      residence TEXT NOT NULL,
      birthday DATE,
      invited_by TEXT NOT NULL,
      gender TEXT NOT NULL,
      membership_id TEXT NOT NULL UNIQUE,
      badge TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Check-in tracking — added after initial launch, so use ADD COLUMN IF NOT EXISTS
  // to upgrade existing tables without dropping data.
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      event_date DATE NOT NULL,
      event_time TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS outreach_stories (
      id SERIAL PRIMARY KEY,
      tag TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Full story body — added after initial launch, so existing tables get it via ADD COLUMN.
  await pool.query(`
    ALTER TABLE outreach_stories
      ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT '';
  `);
};

export default pool;
