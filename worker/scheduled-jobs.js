import { sendEmail, serviceReminderEmail } from './email.js';

async function db(env, fn) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try { return await fn(client); } finally { await client.end().catch(() => {}); }
}

export async function sendWeeklyServiceReminders(env) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    console.warn('[email] reminder job skipped: email provider not configured.');
    return;
  }
  const period = new Date().toISOString().slice(0, 10);
  await db(env, async (client) => {
    await client.query(`CREATE TABLE IF NOT EXISTS email_deliveries (id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL,message_type TEXT NOT NULL,period_key TEXT NOT NULL,sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),UNIQUE (user_id,message_type,period_key))`);
    const result = await client.query(`SELECT u.id,u.full_name,u.email,u.chapter,cv.venue,cv.service_time FROM users u LEFT JOIN chapter_venues cv ON LOWER(cv.chapter)=LOWER(u.chapter) WHERE COALESCE(u.email,'')<>'' AND LOWER(COALESCE(u.status,'')) NOT IN ('disabled','deleted') ORDER BY u.id ASC`);
    for (const user of result.rows) {
      const delivery = await client.query(`INSERT INTO email_deliveries (user_id,message_type,period_key) VALUES ($1,'service_reminder',$2) ON CONFLICT (user_id,message_type,period_key) DO NOTHING RETURNING id`, [user.id, period]);
      if (!delivery.rows.length) continue;
      try {
        await sendEmail(env, { to: user.email, ...serviceReminderEmail(user, user) });
      } catch (error) {
        await client.query('DELETE FROM email_deliveries WHERE id=$1', [delivery.rows[0].id]);
        console.error('[email] service reminder failed for user', user.id, error);
      }
    }
  });
}
