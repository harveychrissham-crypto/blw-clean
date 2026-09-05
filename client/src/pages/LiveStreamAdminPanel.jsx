import { useEffect, useState } from 'react';
import { FiRadio, FiSave, FiCheckCircle } from 'react-icons/fi';
import { fetchLiveStream, updateLiveStream } from '../utils/live';
import { Card, Eyebrow } from '../components/ui/Card';
import Button from '../components/ui/Button';

const emptyForm = {
  title: '',
  youtubeUrl: '',
  googleMeetUrl: '',
  dailyRoomUrl: '',
  isLive: false,
};

export default function LiveStreamAdminPanel() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const live = await fetchLiveStream();
        if (!cancelled) {
          setForm({
            title: live?.title || '',
            youtubeUrl: live?.youtubeUrl || '',
            googleMeetUrl: live?.googleMeetUrl || '',
            dailyRoomUrl: live?.dailyRoomUrl || '',
            isLive: live?.isLive === true,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load live stream settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const update = (field, value) => {
    setSaved(false);
    setError('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const live = await updateLiveStream({ ...form, isLive: form.isLive === true });
      setForm({
        title: live?.title || form.title,
        youtubeUrl: live?.youtubeUrl || form.youtubeUrl,
        googleMeetUrl: live?.googleMeetUrl || form.googleMeetUrl,
        dailyRoomUrl: live?.dailyRoomUrl || form.dailyRoomUrl,
        isLive: live?.isLive === true,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Unable to save live stream settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="raised" className="p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-500">
          <FiRadio className="h-6 w-6" />
        </div>
        <div>
          <Eyebrow>Live streaming</Eyebrow>
          <h2 className="mt-1 text-2xl font-bold text-white">Manage Live Stream</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/45">Update the live session details shown to members. Turn Live on when the stream is ready and turn it off when the session ends.</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-white/50">Loading live stream settings…</p>
      ) : (
        <form onSubmit={save} className="mt-7 space-y-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Stream title</span>
            <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Sunday Service" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold-500/50" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/50">YouTube URL</span>
            <input type="url" value={form.youtubeUrl} onChange={(e) => update('youtubeUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold-500/50" />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Google Meet URL</span>
              <input type="url" value={form.googleMeetUrl} onChange={(e) => update('googleMeetUrl', e.target.value)} placeholder="https://meet.google.com/…" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold-500/50" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Daily room URL</span>
              <input type="url" value={form.dailyRoomUrl} onChange={(e) => update('dailyRoomUrl', e.target.value)} placeholder="https://…daily.co/…" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold-500/50" />
            </label>
          </div>

          <Button variant="custom" size="none" onClick={() => update('isLive', !form.isLive)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${form.isLive ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-white/10 bg-white/[0.03]'}`} aria-pressed={form.isLive}>
            <span>
              <span className={`block text-sm font-bold ${form.isLive ? 'text-emerald-300' : 'text-white'}`}>{form.isLive ? 'Live now' : 'Stream is offline'}</span>
              <span className="mt-1 block text-xs text-white/50">{form.isLive ? 'Members will see this session as live.' : 'The public Live page will treat the session as offline.'}</span>
            </span>
            <span className={`relative h-7 w-12 rounded-full p-1 transition ${form.isLive ? 'bg-emerald-500' : 'bg-white/15'}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${form.isLive ? 'translate-x-5' : ''}`} /></span>
          </Button>

          {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          {saved && <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300"><FiCheckCircle /> Live stream settings saved.</p>}

          <Button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2">
            <FiSave /> {saving ? 'Saving…' : 'Save Live Stream'}
          </Button>
        </form>
      )}
    </Card>
  );
}
