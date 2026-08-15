import { useState } from 'react';
import { FiBell, FiSend, FiLock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const API_BASE_URL = 'https://blw-kenya-zone.harveychrissham.workers.dev';

export default function NotificationCenter() {
  const [code, setCode] = useState('');
  const [leaderToken, setLeaderToken] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [broadcast, setBroadcast] = useState(true);
  const [emails, setEmails] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const authorize = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/fellowships/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) throw new Error(data.error || 'Leadership authorization failed.');
      setLeaderToken(data.token);
      setStatus('Leader access granted.');
    } catch (err) {
      setError(err.message || 'Unable to authorize leader access.');
    } finally {
      setBusy(false);
    }
  };

  const sendNotification = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (!title.trim() || !body.trim()) throw new Error('Notification title and message are required.');
      const userEmails = emails.split(/[\n,]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);
      if (!broadcast && !userEmails.length) throw new Error('Enter at least one member email or enable broadcast.');

      const response = await fetch(`${API_BASE_URL}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${leaderToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          broadcast,
          userEmails: broadcast ? [] : userEmails,
          data: { type: 'announcement', source: 'leader_notification_center' },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Notification send failed (${response.status}).`);
      setStatus(`Notification sent. ${data.sent || 0} device(s) reached.`);
      setTitle('');
      setBody('');
    } catch (err) {
      setError(err.message || 'Unable to send notification.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-5 py-12">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.08] text-[#F2A31C]">
          <FiBell className="h-7 w-7" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">Leaders tool</p>
          <h1 className="text-3xl font-extrabold text-white">Push Notifications</h1>
          <p className="mt-1 text-sm text-white/50">Send an announcement to registered BLW Android devices.</p>
        </div>
      </div>

      {!leaderToken ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-5 flex items-center gap-3">
            <FiLock className="text-white/50" />
            <div>
              <p className="font-semibold text-white">Leadership authorization</p>
              <p className="text-xs text-white/40">Use the existing leadership access code.</p>
            </div>
          </div>
          <form onSubmit={authorize} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Leadership access code"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-[#F2A31C]"
            />
            <button disabled={busy} className="w-full rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 font-bold text-white disabled:opacity-50">
              {busy ? 'Authorizing…' : 'Unlock Notification Tool'}
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={sendNotification} className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Sunday Service Reminder" className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-[#F2A31C]" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={5} placeholder="Write the message members should receive…" className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-[#F2A31C]" />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
            <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} className="h-4 w-4" />
            Send to all registered devices
          </label>
          {!broadcast && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Member emails</label>
              <textarea value={emails} onChange={(e) => setEmails(e.target.value)} rows={4} placeholder="member@example.com, another@example.com" className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-[#F2A31C]" />
            </div>
          )}
          {error && <div className="flex items-start gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300"><FiAlertCircle className="mt-0.5" />{error}</div>}
          {status && <div className="flex items-start gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"><FiCheckCircle className="mt-0.5" />{status}</div>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 font-bold text-white disabled:opacity-50">
            <FiSend /> {busy ? 'Sending…' : 'Send Notification'}
          </button>
        </form>
      )}
    </section>
  );
}
