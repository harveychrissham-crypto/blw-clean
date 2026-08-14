import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiHeart,
  FiUsers,
  FiClock,
  FiZap,
} from 'react-icons/fi';
import { loadSoulEntries, saveSoulEntries } from '../utils/soulStorage';
import { Card, Eyebrow, StatGroup } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { Toast } from '../components/ui/Toast';

export default function RecordSouls() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    name: '',
    contact: '',
    service: '3rd Service (11 AM – 1 PM)',
    followUp: 'Call back in 3 days',
    notes: '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setEntries(loadSoulEntries());
  }, []);

  useEffect(() => {
    saveSoulEntries(entries);
  }, [entries]);

  const soulsCount = entries.length;
  const followUpsCount = entries.filter((entry) => entry.followUp && entry.followUp !== 'None').length;

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (status === 'error') {
      setStatus('idle');
      setError('');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) {
      setError('Provide both a name and a contact method before recording the soul.');
      setStatus('error');
      setToast({ type: 'error', message: 'Add a name and contact method to save this entry.' });
      return;
    }

    const nextEntry = {
      id: Date.now(),
      name: form.name.trim(),
      contact: form.contact.trim(),
      service: form.service,
      followUp: form.followUp,
      notes: form.notes.trim(),
      createdAt: new Date().toLocaleString(),
    };

    setEntries((current) => [nextEntry, ...current]);
    setForm({
      name: '',
      contact: '',
      service: '3rd Service (11 AM – 1 PM)',
      followUp: 'Call back in 3 days',
      notes: '',
    });
    setStatus('success');
    setError('');
    setToast({ type: 'success', message: `Saved ${nextEntry.name}'s entry.` });
    window.setTimeout(() => setStatus('idle'), 2500);
  };

  const handleDeleteEntry = (id) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Eyebrow color="#FF8B5C">Record souls</Eyebrow>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-5xl">Soul tracking workspace</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">Log invitations, capture follow-up plans, and monitor your outreach progress from one place.</p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          <FiArrowLeft /> Back to dashboard
        </Link>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <StatGroup
          items={[
            { label: 'Total souls', value: soulsCount, icon: FiHeart, accent: '#FF4F9A' },
            { label: 'Pending follow-ups', value: followUpsCount, icon: FiClock, accent: '#8EE3FF' },
          ]}
        />
        <Card variant="filled" className="p-5">
          <Eyebrow color="rgba(255,255,255,0.85)">Quick actions</Eyebrow>
          <div className="mt-3 flex gap-3">
            <a href="#log-entry" className="flex-1 rounded-full bg-white/15 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/25">
              Record a soul
            </a>
            <a href="#latest-logs" className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white/90 transition hover:bg-white/20">
              Review logs
            </a>
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card variant="raised" id="log-entry" className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Eyebrow>Log entry</Eyebrow>
              <h2 className="mt-2 text-xl font-semibold text-white">Record a soul</h2>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">{soulsCount} total</span>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-300">Name</span>
                <input
                  value={form.name}
                  onChange={handleChange('name')}
                  placeholder="Jane Doe"
                  className="w-full rounded-3xl border border-white/10 bg-slate-900/75 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-300">Contact</span>
                <input
                  value={form.contact}
                  onChange={handleChange('contact')}
                  placeholder="Phone or email"
                  className="w-full rounded-3xl border border-white/10 bg-slate-900/75 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-300">Service</span>
                <select
                  value={form.service}
                  onChange={handleChange('service')}
                  className="w-full rounded-3xl border border-white/10 bg-slate-900/75 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                >
                  <option>3rd Service (11 AM – 1 PM)</option>
                  <option>2nd Service (9 AM – 11 AM)</option>
                  <option>Evening Service (6 PM – 8 PM)</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-300">Follow-up</span>
                <select
                  value={form.followUp}
                  onChange={handleChange('followUp')}
                  className="w-full rounded-3xl border border-white/10 bg-slate-900/75 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                >
                  <option>Call back in 3 days</option>
                  <option>Send encouragement message</option>
                  <option>Invite to prayer meeting</option>
                  <option>None</option>
                </select>
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-300">Notes</span>
              <textarea
                value={form.notes}
                onChange={handleChange('notes')}
                rows={4}
                placeholder="Where they met you, needs, or prayer requests"
                className="w-full rounded-[1.75rem] border border-white/10 bg-slate-900/75 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
              />
            </label>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <button type="submit" className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95">
              Record soul
            </button>
          </form>
        </Card>

        <div className="grid gap-6">
          <Card variant="raised" id="latest-logs" className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Eyebrow>Outreach pulse</Eyebrow>
                <h2 className="mt-2 text-lg font-semibold text-white">Latest logs</h2>
              </div>
              <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">{entries.length}</span>
            </div>
            <div className="mt-5 space-y-3">
              {entries.length === 0 ? (
                <EmptyState
                  icon={FiHeart}
                  title="No souls logged yet"
                  hint="Start with one — every name matters."
                />
              ) : (
                entries.slice(0, 5).map((entry) => (
                  <Card key={entry.id} variant="subtle" className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{entry.name}</p>
                        <p className="mt-1 text-sm text-slate-400 truncate">{entry.contact}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="shrink-0 text-xs font-semibold text-slate-400 transition hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-950/50 p-2.5 text-xs text-slate-300">
                        <span className="font-semibold text-white">Service:</span> {entry.service}
                      </div>
                      <div className="rounded-2xl bg-slate-950/50 p-2.5 text-xs text-slate-300">
                        <span className="font-semibold text-white">Follow-up:</span> {entry.followUp}
                      </div>
                    </div>
                    {entry.notes && <p className="mt-3 text-xs text-slate-400">{entry.notes}</p>}
                    <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">Logged {entry.createdAt}</p>
                  </Card>
                ))
              )}
            </div>
          </Card>

          <Card variant="raised" className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Eyebrow>Action center</Eyebrow>
                <h2 className="mt-2 text-lg font-semibold text-white">Tools for outreach</h2>
              </div>
              <FiZap className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-5 grid gap-3">
              <Card variant="subtle" className="p-4 text-sm text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <FiUsers className="h-4 w-4 text-[#FF4F9A]" /> Record first-timers
                </div>
                <p className="mt-1">Keep a log of every invite, prayer request, and contact detail.</p>
              </Card>
              <Card variant="subtle" className="p-4 text-sm text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <FiClock className="h-4 w-4 text-[#8EE3FF]" /> Follow-up focus
                </div>
                <p className="mt-1">Track the next step for every soul and keep outreach momentum.</p>
              </Card>
            </div>
          </Card>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
