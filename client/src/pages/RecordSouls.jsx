import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiArrowRight,
  FiHeart,
  FiCheckCircle,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import { loadSoulEntries, saveSoulEntries } from '../utils/soulStorage';

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
    window.setTimeout(() => setStatus('idle'), 2500);
  };

  const handleDeleteEntry = (id) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#FF8B5C]">Record souls</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Soul tracking workspace</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">Log invitations, capture follow-up plans, and monitor your outreach progress from one place.</p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          <FiArrowLeft /> Back to dashboard
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Total souls</p>
          <p className="mt-4 text-4xl font-semibold text-white">{soulsCount}</p>
          <p className="mt-2 text-sm text-slate-400">Souls recorded so far</p>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Pending follow-ups</p>
          <p className="mt-4 text-4xl font-semibold text-white">{followUpsCount}</p>
          <p className="mt-2 text-sm text-slate-400">Planned next steps</p>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#FF4F9A]/10 via-[#A53DFF]/10 to-[#3D5AFE]/10 p-6 shadow-[0_30px_80px_rgba(163,77,255,0.18)] backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.25em] text-[#F7C948]">Quick actions</p>
          <div className="mt-5 space-y-3">
            <button type="button" className="w-full rounded-full bg-white/5 px-4 py-3 text-left text-sm text-white transition hover:bg-white/10">Record a new soul</button>
            <button type="button" className="w-full rounded-full bg-slate-900/80 px-4 py-3 text-left text-sm text-slate-300 transition hover:bg-slate-900/95">Review latest logs</button>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#F7C948]">Log entry</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Record a soul</h2>
            </div>
            <span className="rounded-full bg-slate-900/70 px-3 py-2 text-sm text-slate-300">{soulsCount} total</span>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
            {status === 'success' && <p className="text-sm text-emerald-300">Soul entry saved.</p>}

            <button type="submit" className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95">
              Record soul
            </button>
          </form>
        </div>

        <div className="grid gap-6">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#F7C948]">Outreach pulse</p>
                <h2 className="mt-3 text-xl font-semibold text-white">Latest logs</h2>
              </div>
              <span className="rounded-full bg-slate-900/70 px-3 py-2 text-sm text-slate-300">{entries.length}</span>
            </div>
            <div className="mt-6 space-y-4">
              {entries.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-slate-950/80 p-6 text-sm text-slate-400">
                  No soul entries yet. Record the first one to start your outreach log.
                </div>
              ) : (
                entries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="rounded-[1.75rem] border border-white/10 bg-slate-900/85 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{entry.name}</p>
                        <p className="mt-1 text-sm text-slate-400">{entry.contact}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-sm font-semibold text-slate-400 transition hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-950/70 p-3 text-sm text-slate-300">
                        <span className="font-semibold text-white">Service:</span> {entry.service}
                      </div>
                      <div className="rounded-2xl bg-slate-950/70 p-3 text-sm text-slate-300">
                        <span className="font-semibold text-white">Follow-up:</span> {entry.followUp}
                      </div>
                    </div>
                    {entry.notes && <p className="mt-3 text-sm text-slate-400">{entry.notes}</p>}
                    <p className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-500">Logged {entry.createdAt}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#F7C948]">Action center</p>
                <h2 className="mt-3 text-xl font-semibold text-white">Tools for outreach</h2>
              </div>
              <FiUsers className="h-5 w-5 text-slate-300" />
            </div>
            <div className="mt-6 grid gap-4">
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 text-sm text-slate-300">
                <div className="font-semibold text-white">Record first-timers</div>
                Keep a log of every invite, prayer request, and contact detail.
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 text-sm text-slate-300">
                <div className="font-semibold text-white">Follow-up focus</div>
                Track the next step for every soul and keep outreach momentum.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
