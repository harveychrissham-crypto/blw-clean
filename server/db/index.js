import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Client, Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined. Set it in server/.env or the environment.');
}

const pool = process.env.CLOUDFLARE_WORKERS === 'true' ? null : new Pool({ connectionString });

export const query = async (text, params = []) => {
  if (process.env.CLOUDFLARE_WORKERS === 'true') {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      return await client.query(text, params);
    } finally {
      await client.end().catch(() => {});
    }
  }
  return pool.query(text, params);
};

export const initDb = async () => {
  await query(`
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

  await query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await query(`CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'General',
    event_date DATE NOT NULL, event_time TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '', created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );`);

  await query(`CREATE TABLE IF NOT EXISTS outreach_stories (
    id SERIAL PRIMARY KEY, tag TEXT NOT NULL DEFAULT '', title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );`);
  await query(`ALTER TABLE outreach_stories ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT '';`);

  await query(`CREATE TABLE IF NOT EXISTS sermons (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, speaker TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '', youtube_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );`);
  await query(`ALTER TABLE sermons ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;`);

  await query(`CREATE TABLE IF NOT EXISTS chapter_venues (
    id SERIAL PRIMARY KEY, chapter TEXT NOT NULL UNIQUE, venue TEXT NOT NULL,
    service_time TEXT NOT NULL DEFAULT '', updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );`);

  await query(`CREATE TABLE IF NOT EXISTS live_stream (
    id INTEGER PRIMARY KEY DEFAULT 1, title TEXT NOT NULL DEFAULT '', youtube_url TEXT NOT NULL DEFAULT '',
    is_live BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT live_stream_singleton CHECK (id = 1)
  );`);
  await query(`ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS google_meet_url TEXT NOT NULL DEFAULT '';`);
  await query(`ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS daily_room_url TEXT NOT NULL DEFAULT '';`);
  await query(`INSERT INTO live_stream (id) VALUES (1) ON CONFLICT (id) DO NOTHING;`);

  await query(`CREATE TABLE IF NOT EXISTS live_viewers (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, invited_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );`);
  await query(`ALTER TABLE live_viewers ADD COLUMN IF NOT EXISTS client_id TEXT;`);
  await query(`ALTER TABLE live_viewers ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();`);
  await query(`ALTER TABLE live_viewers ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 1;`);
  await query(`ALTER TABLE live_viewers ADD COLUMN IF NOT EXISTS watch_seconds INTEGER NOT NULL DEFAULT 0;`);

  // Remove redundant duplicate client IDs before enforcing uniqueness. This is
  // idempotent and avoids dropping/recreating the index on every boot.
  await query(`
    DELETE FROM live_viewers older
    USING live_viewers newer
    WHERE older.client_id IS NOT NULL
      AND older.client_id = newer.client_id
      AND (older.last_seen_at, older.id) < (newer.last_seen_at, newer.id);
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS live_viewers_client_id_idx ON live_viewers (client_id) WHERE client_id IS NOT NULL;`);

  await query(`CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY, user_email TEXT NOT NULL, token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL DEFAULT 'android', created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );`);
  await query(`CREATE INDEX IF NOT EXISTS push_tokens_user_email_idx ON push_tokens (LOWER(user_email));`);
};

export default pool;
