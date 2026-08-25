import { useEffect, useMemo, useState } from 'react';
import { FiBell, FiSend, FiAlertCircle, FiCheckCircle, FiEye, FiRefreshCw } from 'react-icons/fi';
import { apiFetch } from '../config/api';
import { fetchEvents } from '../utils/events';
import { fetchSermons } from '../utils/sermons';
import { fetchOutreachStories } from '../utils/outreachStories';
import { fetchVenues } from '../utils/venues';

const TARGETS = [
  ['announcement', 'General announcement'],
  ['event', 'Event'],
  ['outreach', 'Outreach story'],
  ['sermon', 'Sermon'],
  ['venue', 'Service venue'],
];

const getItemId = (item, type) => type === 'venue' ? String(item?.chapter || '') : String(item?.id || '');
const getItemTitle = (item, type) => {
  if (type === 'venue') return item?.chapter || 'Unnamed chapter';
  if (type === 'event') return item?.title || 'Untitled event';
  if (type === 'sermon') return item?.title || 'Untitled sermon';
  return item?.title || 'Untitled outreach story';
};

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

  const loadTargets = async () => {
    setLoadingTargets(true);
    try {
      const [events, outreach, sermons, venues] = await Promise.all([
        fetchEvents(),
        fetchOutreachStories(),
        fetchSermons(),
        fetchVenues(),
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

  const handleTargetTypeChange = (value) => {
    setTargetType(value);
    setTargetId('');
    setError('');
  };

  const sendNotification = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setStatus('');
    try {
      if (!title.trim() || !body.trim()) throw new Error('Notification title and message are required.');
      const userEmails = emails.split(/[\n,]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);
      if (!broadcast && !userEmails.length) throw new Error('Enter at least one member email or enable broadcast.');
      if (targetType !== 'announcement' && !selectedTarget) throw new Error('Select an existing content item before sending.');

      const response = await apiFetch('/api/push/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(), body: body.trim(), broadcast, userEmails: broadcast ? [] : userEmails,
          data: { type: targetType, id: targetType === 'announcement' ? '' : targetId, source: 'leader_notification_center' },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Notification send failed (${response.status}).`);
      setStatus(`Notification sent. ${data.sent || 0} device(s) reached.`);
      setTitle(''); setBody(''); setTargetId('');
    } catch (err) { setError(err.message || 'Unable to send notification.'); }
    finally { setBusy(false); }
  };

  const targetLabel = TARGETS.find(([value]) => value === targetType)?.[1] || 'Announcement';
  const previewTarget = selectedTarget ? getItemTitle(selectedTarget, targetType) : targetType === 'announcement' ? 'Notifications' : 'Select content';

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-8 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.08] text-[#F2A31C]"><FiBell className="h-7 w-7" /></div><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">Leaders tool</p><h1 className="text-3xl font-extrabold text-white">Push Notifications</h1><p className="mt-1 text-sm text-white/50">Send an announcement to registered BLW Android devices.</p></div></div>

      <form onSubmit={sendNotification} className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Sunday Service Reminder" className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-[#F2A31C]" /></div>
        <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Message</label><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={5} placeholder="Write the message members should receive…" className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-[#F2A31C]" /></div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><label className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Open when tapped</label><button type="button" onClick={loadTargets} disabled={loadingTargets} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/50 hover:bg-white/5 disabled:opacity-50"><FiRefreshCw className={loadingTargets ? 'animate-spin' : ''} />Refresh</button></div>
          <select value={targetType} onChange={(e) => handleTargetTypeChange(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-[#F2A31C]">{TARGETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          {targetType !== 'announcement' && <div className="mt-3"><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Select content</label><select value={targetId} onChange={(e) => setTargetId(e.target.value)} disabled={loadingTargets} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-[#F2A31C] disabled:opacity-60"><option value="">{loadingTargets ? 'Loading content…' : `Choose ${targetLabel.toLowerCase()}`}</option>{(targetData[targetType] || []).map((item) => { const id = getItemId(item, targetType); return <option key={id} value={id}>{getItemTitle(item, targetType)}</option>; })}</select><p className="mt-1.5 text-xs text-white/30">Choose an existing item so the notification always points to a valid destination.</p></div>}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/40"><FiEye /> Preview</div><div className="rounded-2xl border border-white/10 bg-[#0d0c18] p-4"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#F2A31C]"><FiBell className="h-4 w-4" /></div><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">BLW Campus Ministry</p><h3 className="mt-1 truncate text-sm font-bold text-white">{title.trim() || 'Notification title'}</h3><p className="mt-1 text-sm leading-5 text-white/55">{body.trim() || 'Your notification message will appear here.'}</p><p className="mt-2 text-[11px] font-semibold text-[#F2A31C]">Tap to open: {previewTarget}</p></div></div></div></div>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"><input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} className="h-4 w-4" />Send to all registered devices</label>
        {!broadcast && <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Member emails</label><textarea value={emails} onChange={(e) => setEmails(e.target.value)} rows={4} placeholder="member@example.com, another@example.com" className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-[#F2A31C]" /></div>}
        {error && <div className="flex items-start gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300"><FiAlertCircle className="mt-0.5" />{error}</div>}
        {status && <div className="flex items-start gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"><FiCheckCircle className="mt-0.5" />{status}</div>}
        <button disabled={busy || loadingTargets || (targetType !== 'announcement' && !selectedTarget)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 font-bold text-white disabled:opacity-50"><FiSend /> {busy ? 'Sending…' : 'Send Notification'}</button>
      </form>
    </section>
  );
}
