const RESEND_URL = 'https://api.resend.com/emails';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseTemplate(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#0d0c18;color:#f7f7fb;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:32px 18px"><div style="background:#161426;border:1px solid rgba(255,255,255,.09);border-radius:24px;overflow:hidden"><div style="padding:28px;background:linear-gradient(135deg,#17152b,#11101e)"><p style="margin:0;color:#f2a31c;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">BLW Kenya Zone</p><h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;color:#fff">${esc(title)}</h1></div><div style="padding:28px;color:#ddd9e8;font-size:16px;line-height:1.7">${bodyHtml}</div><div style="padding:20px 28px;border-top:1px solid rgba(255,255,255,.08);font-size:12px;color:#8f899f">Believers' LoveWorld Campus Ministry Kenya Zone</div></div></div></body></html>`;
}

export async function sendEmail(env, { to, subject, html }) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY or EMAIL_FROM is not configured; email skipped.');
    return { sent: false, skipped: true };
  }

  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Email provider returned ${response.status}: ${detail}`);
  }

  return { sent: true };
}

export function welcomeEmail(user) {
  const name = esc(user.name);
  const membershipId = esc(user.membershipId);
  return {
    subject: 'Welcome to BLW Kenya Zone! 🎉',
    html: baseTemplate('Welcome to the family!', `<p>Dear <strong>${name}</strong>,</p><p>Thank you for registering with <strong>Believers' LoveWorld Campus Ministry Kenya Zone</strong>. We are delighted to welcome you into the fellowship family.</p><p>Your membership has been created successfully.</p><div style="margin:22px 0;padding:18px;border-radius:16px;background:#0f0e1a;border:1px solid rgba(242,163,28,.25)"><p style="margin:0 0 6px;color:#f2a31c;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Membership ID</p><p style="margin:0;font-size:22px;font-weight:700;color:#fff">${membershipId}</p></div><p>Stay connected for fellowship updates, service reminders, events, sermons, and other important ministry information.</p><p>We look forward to seeing you at fellowship and service.</p><p style="margin-bottom:0">With love,<br><strong>BLW Kenya Zone</strong></p>`),
  };
}

export function serviceReminderEmail(user, venue) {
  const name = esc(user.full_name);
  const chapter = esc(user.chapter);
  const venueName = esc(venue?.venue || 'Your chapter service venue');
  const serviceTime = esc(venue?.service_time || 'your regular service time');
  return {
    subject: `Service Reminder — ${chapter}`,
    html: baseTemplate('Service Reminder', `<p>Dear <strong>${name}</strong>,</p><p>This is a friendly reminder about your upcoming BLW service.</p><div style="margin:22px 0;padding:18px;border-radius:16px;background:#0f0e1a;border:1px solid rgba(138,43,226,.3)"><p style="margin:0 0 8px;color:#c8a8ff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Your service details</p><p style="margin:0 0 6px;color:#fff;font-weight:700">${chapter}</p><p style="margin:0;color:#cfc8da">${venueName}</p><p style="margin:6px 0 0;color:#cfc8da">${serviceTime}</p></div><p>Come prepared, expectant, and ready to fellowship with God's people.</p><p style="margin-bottom:0">See you at service,<br><strong>BLW Kenya Zone</strong></p>`),
  };
}
