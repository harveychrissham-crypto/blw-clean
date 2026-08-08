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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sermons (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      speaker TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      youtube_url TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Lets an admin pick which sermon plays as the main/featured video,
  // instead of it always being whichever was added most recently.
  await pool.query(`
    ALTER TABLE sermons
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  // Admin-managed service venue/time per chapter, shown on the member
  // dashboard's Sunday self check-in card. Replaces the old hardcoded
  // "Believers' LoveWorld Campus Ministry (LAA & Avenor)" text, which
  // was the same for every member regardless of their chapter.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chapter_venues (
      id SERIAL PRIMARY KEY,
      chapter TEXT NOT NULL UNIQUE,
      venue TEXT NOT NULL,
      service_time TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Single-row settings for the public /live page. A leader pastes the
  // YouTube (or YouTube Live) URL and flips is_live on when the stream
  // starts; the frontend embeds it via youtube-nocookie.com, same as
  // the sermons feature.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS live_stream (
      id INTEGER PRIMARY KEY DEFAULT 1,
      title TEXT NOT NULL DEFAULT '',
      youtube_url TEXT NOT NULL DEFAULT '',
      is_live BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT live_stream_singleton CHECK (id = 1)
    );
  `);
  // Added alongside the Google Meet option — lets a leader set a Meet link
  // as a second way to join the live service, next to the YouTube embed.
  await pool.query(`
    ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS google_meet_url TEXT NOT NULL DEFAULT '';
  `);
  // Replaces the Google Meet link as the "join the call" option — a Daily.co
  // room URL that embeds inline via daily-js instead of opening a new tab.
  await pool.query(`
    ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS daily_room_url TEXT NOT NULL DEFAULT '';
  `);
  await pool.query(`
    INSERT INTO live_stream (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Lightweight, optional sign-in on the public /live page: visitors can type
  // their name + who invited them before watching. Not required to view the
  // stream — this just lets leaders see who tuned in.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS live_viewers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      invited_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
};

export default pool;
