import { useEffect, useMemo, useState } from 'react';
import { FiBell, FiSend, FiAlertCircle, FiCheckCircle, FiEye, FiRefreshCw, FiUserCheck, FiClock } from 'react-icons/fi';
import { apiFetch } from '../config/api';
import { fetchEvents } from '../utils/events';
import { fetchSermons } from '../utils/sermons';
import { fetchOutreachStories } from '../utils/outreachStories';
import { fetchVenues } from '../utils/venues';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const TARGETS = [
  ['announcement', 'General announcement'],
  ['event', 'Event'],
  ['outreach', 'Outreach story'],
  ['sermon', 'Sermon'],
  ['venue', 'Service venue'],
];
const LOG_KEY = 'blw_notification_delivery_log';

const getItemId = (item, type) => type === 'venue' ? String(item?.chapter || '') : String(item?.id || '');
const getItemTitle = (item, type) => {
  if (type === 'venue') return item?.chapter || 'Unnamed chapter';
  if (type === 'event') return item?.title || 'Untitled event';
  if (type === 'sermon') return item?.title || 'Untitled sermon';
  return item?.title || 'Untitled outreach story';
};

function readLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export default function NotificationCenter() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('announcement');
  const [targetId, setTargetId] = useState('');
  const [broadcast, setBroadcast] = useState(true);
  const [emails, setEmails] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetData, setTargetData] = useState({ event: [], outreach: [], sermon: [], venue: [] });
  const [deliveryLog, setDeliveryLog] = useState(readLog);

  const loadTargets = async () => {
    setLoadingTargets(true);
    setError('');
    try {
      const [events, outreach, sermons, venues] = await Promise.all([
        fetchEvents(), fetchOutreachStories(), fetchSermons(), fetchVenues(),
      ]);
      setTargetData({
        event: Array.isArray(events) ? events : [],
        outreach: Array.isArray(outreach) ? outreach : [],
        sermon: Array.isArray(sermons) ? sermons : [],
        venue: Array.isArray(venues) ? venues : [],
      });
    } catch (err) {
      setError(err?.message || 'Unable to load notification targets.');
    } finally {
      setLoadingTargets(false);
    }
  };

  useEffect(() => { loadTargets(); }, []);

  const selectedTarget = useMemo(() => {
    if (targetType === 'announcement' || !targetId) return null;
    return (targetData[targetType] || []).find((item) => getItemId(item, targetType) === targetId) || null;
  }, [targetData, targetType, targetId]);

  const targetLabel = TARGETS.find(([value]) => value === targetType)?.[1] || 'Announcement';
  const previewTarget = selectedTarget ? getItemTitle(selectedTarget, targetType) : targetType === 'announcement' ? 'Notifications' : 'Select content';

  const addLog = (entry) => {
    const next = [{ ...entry, timestamp: new Date().toISOString() }, ...deliveryLog].slice(0, 20);
    setDeliveryLog(next);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(next)); } catch {}
  };

  const buildPayload = () => ({
    title: title.trim(),
    body: body.trim(),
    data: {
      type: targetType,
      id: targetType === 'announcement' ? '' : targetId,
      source: 'leader_notification_center',
    },
  });

  const validate = () => {
    if (!title.trim() || !body.trim()) throw new Error('Notification title and message are required.');
    if (targetType !== 'announcement' && !selectedTarget) throw new Error('Select an existing content item before sending.');
  };

  const sendRequest = async ({ test = false } = {}) => {
    validate();
    const payload = buildPayload();

    if (test) {
      const response = await apiFetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `Notification test failed (${response.status}).`);
      return { data, test, target: previewTarget, title: payload.title, body: payload.body };
    }

    const recipients = emails.split(/[\n,]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (!broadcast && !recipients.length) throw new Error('Enter at least one member email or enable broadcast.');

    const response = await apiFetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        broadcast,
        userEmails: broadcast ? [] : recipients,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Notification send failed (${response.status}).`);
    return { data, test, target: previewTarget, title: payload.title, body: payload.body };
  };

  const handleSend = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setStatus('');
    try {
      const result = await sendRequest();
      const data = result.data;
      addLog({ mode: 'broadcast', target: result.target, sent: data.sent || 0, failed: data.failed || 0, total: data.totalTokens || 0, status: data.sent ? 'sent' : 'no_devices' });
      setStatus(`Notification sent. ${data.sent || 0} device(s) reached.`);
      setTitle(''); setBody(''); setTargetId('');
    } catch (err) { setError(err.message || 'Unable to send notification.'); }
    finally { setBusy(false); }
  };

  const handleSelfTest = async () => {
    setBusy(true); setError(''); setStatus('');
    try {
      const result = await sendRequest({ test: true });
      const data = result.data;
      addLog({ mode: 'test', target: result.target, sent: data.sent || 0, failed: data.failed || 0, total: data.totalTokens || 0, status: data.sent ? 'sent' : 'no_devices' });
      if (!data.totalTokens) {
        setStatus('Test request completed, but no registered device token was found for your account.');
      } else {
        setStatus(`Test notification sent to your device. ${data.sent || 0} device(s) reached.`);
      }
    } catch (err) { setError(err.message || 'Unable to send test notification.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.08] text-gold-500"><FiBell className="h-7 w-7" /></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">Leaders tool</p><h1 className="text-3xl font-extrabold text-white">Push Notifications</h1><p className="mt-1 text-sm text-white/50">Send an announcement to registered BLW Android devices.</p></div>
      </div>

      <Card as="form" onSubmit={handleSend} variant="custom" className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Sunday Service Reminder" className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-gold-500" /></div>
        <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Message</label><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={5} placeholder="Write the message members should receive…" className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-gold-500" /></div>

        <Card variant="custom" className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><label className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Open when tapped</label><Button variant="custom" size="none" type="button" onClick={loadTargets} disabled={loadingTargets || busy} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/50 hover:bg-white/5 disabled:opacity-50"><FiRefreshCw className={loadingTargets ? 'animate-spin' : ''} />Refresh</Button></div>
          <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setTargetId(''); setError(''); }} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-gold-500">{TARGETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          {targetType !== 'announcement' && <div className="mt-3"><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Select content</label><select value={targetId} onChange={(e) => setTargetId(e.target.value)} disabled={loadingTargets || busy} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-gold-500 disabled:opacity-60"><option value="">{loadingTargets ? 'Loading content…' : `Choose ${targetLabel.toLowerCase()}`}</option>{(targetData[targetType] || []).map((item) => { const id = getItemId(item, targetType); return <option key={id} value={id}>{getItemTitle(item, targetType)}</option>; })}</select><p className="mt-1.5 text-xs text-white/30">Choose an existing item so the notification always points to a valid destination.</p></div>}
        </Card>

        <Card variant="custom" className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/40"><FiEye /> Preview</div><div className="rounded-2xl border border-white/10 bg-ink-900 p-4"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gold-500"><FiBell className="h-4 w-4" /></div><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">BLW Campus Ministry</p><h3 className="mt-1 truncate text-sm font-bold text-white">{title.trim() || 'Notification title'}</h3><p className="mt-1 text-sm leading-5 text-white/55">{body.trim() || 'Your notification message will appear here.'}</p><p className="mt-2 text-[11px] font-semibold text-gold-500">Tap to open: {previewTarget}</p></div></div></div></Card>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"><input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} className="h-4 w-4" />Send to all registered devices</label>
        {!broadcast && <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Member emails</label><textarea value={emails} onChange={(e) => setEmails(e.target.value)} rows={4} placeholder="member@example.com, another@example.com" className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-gold-500" /></div>}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="custom" size="none" type="button" onClick={handleSelfTest} disabled={busy || loadingTargets || (targetType !== 'announcement' && !selectedTarget) || !title.trim() || !body.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold-500/30 bg-gold-500/10 py-3 font-bold text-gold-500 disabled:opacity-50"><FiUserCheck /> {busy ? 'Sending…' : 'Send Test to Me'}</Button>
          <Button variant="custom" size="none" type="submit" disabled={busy || loadingTargets || (targetType !== 'announcement' && !selectedTarget)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-500 to-indigo-500 py-3 font-bold text-white disabled:opacity-50"><FiSend /> {busy ? 'Sending…' : 'Send Notification'}</Button>
        </div>

        {error && <div className="flex items-start gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300"><FiAlertCircle className="mt-0.5" />{error}</div>}
        {status && <div className="flex items-start gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"><FiCheckCircle className="mt-0.5" />{status}</div>}
      </Card>

      <Card variant="custom" className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Recent activity</p><h2 className="mt-1 text-xl font-bold text-white">Delivery Log</h2></div><FiClock className="text-white/30" /></div>
        {!deliveryLog.length ? <Card as="p" variant="custom" className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-5 text-sm text-white/35">No notifications have been sent from this device yet.</Card> : <div className="space-y-2">{deliveryLog.map((entry, index) => <Card key={`${entry.timestamp}-${index}`} variant="custom" className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${entry.mode === 'test' ? 'bg-gold-500/10 text-gold-500' : 'bg-white/10 text-white/50'}`}>{entry.mode === 'test' ? 'Test' : 'Broadcast'}</span><span className="truncate text-sm font-semibold text-white">{entry.target}</span></div><p className="mt-1 text-xs text-white/35">{new Date(entry.timestamp).toLocaleString()}</p></div><span className={`shrink-0 text-xs font-bold ${entry.status === 'sent' ? 'text-emerald-300' : 'text-gold-500'}`}>{entry.status === 'sent' ? `✓ ${entry.sent}/${entry.total}` : '⚠ No devices'}</span></div></Card>)}</div>}
      </Card>
    </section>
  );
}
