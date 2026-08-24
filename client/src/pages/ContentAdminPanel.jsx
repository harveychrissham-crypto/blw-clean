import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiFilm, FiImage, FiMapPin, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import { Card, Eyebrow } from '../components/ui/Card';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from '../utils/events';
import { fetchOutreachStories, createOutreachStory, updateOutreachStory, deleteOutreachStory } from '../utils/outreachStories';
import { fetchSermons, createSermon, updateSermon, deleteSermon, setFeaturedSermon } from '../utils/sermons';
import { fetchVenues, saveVenue, deleteVenue } from '../utils/venues';

const EMPTY = {
  events: { title: '', category: 'General', date: '', time: '', location: '', description: '' },
  outreach: { tag: '', title: '', subtitle: '', body: '', imageUrl: '' },
  sermons: { title: '', speaker: '', description: '', youtubeUrl: '' },
  venues: { chapter: '', venue: '', serviceTime: '' },
};

const TABS = [
  ['events', 'Events', FiCalendar],
  ['outreach', 'Outreach', FiImage],
  ['sermons', 'Sermons', FiFilm],
  ['venues', 'Service Venues', FiMapPin],
];

function Field({ label, value, onChange, multiline = false, type = 'text', placeholder = '' }) {
  const common = { value: value ?? '', onChange: (e) => onChange(e.target.value), placeholder, className: 'w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF]' };
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/45">{label}</span>{multiline ? <textarea {...common} className={`${common.className} min-h-[110px]`} /> : <input {...common} type={type} />}</label>;
}

function EditRow({ title, meta, onEdit, onDelete, extra }) {
  return <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{title || 'Untitled'}</p>{meta && <p className="mt-1 text-xs text-white/40">{meta}</p>}</div>{extra}<div className="flex shrink-0 gap-2">{onEdit && <button type="button" onClick={onEdit} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10">Edit</button>}<button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-xl border border-red-400/15 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"><FiTrash2/> Delete</button></div></div>;
}

export default function ContentAdminPanel() {
  const [tab, setTab] = useState('events');
  const [data, setData] = useState({ events: [], outreach: [], sermons: [], venues: [] });
  const [form, setForm] = useState(EMPTY.events);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async (section = tab) => {
    setLoading(true); setError('');
    try {
      const value = section === 'events' ? await fetchEvents() : section === 'outreach' ? await fetchOutreachStories() : section === 'sermons' ? await fetchSermons() : await fetchVenues();
      setData((current) => ({ ...current, [section]: value }));
    } catch (e) { setError(e.message || `Unable to load ${section}.`); }
    finally { setLoading(false); }
  };

  useEffect(() => { setForm(EMPTY[tab]); setEditingId(null); setNotice(''); setError(''); void load(tab); }, [tab]);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const reset = () => { setForm(EMPTY[tab]); setEditingId(null); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      if (tab === 'events') editingId ? await updateEvent(editingId, form) : await createEvent(form);
      else if (tab === 'outreach') editingId ? await updateOutreachStory(editingId, form) : await createOutreachStory(form);
      else if (tab === 'sermons') editingId ? await updateSermon(editingId, form) : await createSermon(form);
      else await saveVenue(form.chapter, { venue: form.venue, serviceTime: form.serviceTime });
      await load(tab); reset(); setNotice(editingId ? 'Changes saved.' : 'Created successfully.');
    } catch (e) { setError(e.message || 'Unable to save changes.'); }
    finally { setSaving(false); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete ${tab === 'venues' ? item.chapter : item.title || 'this item'}?`)) return;
    setError(''); setNotice('');
    try {
      if (tab === 'events') await deleteEvent(item.id);
      else if (tab === 'outreach') await deleteOutreachStory(item.id);
      else if (tab === 'sermons') await deleteSermon(item.id);
      else await deleteVenue(item.chapter);
      await load(tab); if (editingId === item.id || (tab === 'venues' && editingId === item.chapter)) reset(); setNotice('Deleted successfully.');
    } catch (e) { setError(e.message || 'Unable to delete item.'); }
  };

  const edit = (item) => {
    setEditingId(tab === 'venues' ? item.chapter : item.id);
    setForm(tab === 'events' ? { title: item.title || '', category: item.category || 'General', date: item.date || '', time: item.time || '', location: item.location || '', description: item.description || '' } : tab === 'outreach' ? { tag: item.tag || '', title: item.title || '', subtitle: item.subtitle || '', body: item.body || '', imageUrl: item.imageUrl || '' } : tab === 'sermons' ? { title: item.title || '', speaker: item.speaker || '', description: item.description || '', youtubeUrl: item.youtubeUrl || '' } : { chapter: item.chapter || '', venue: item.venue || '', serviceTime: item.serviceTime || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const items = data[tab];
  const tabTitle = TABS.find(([key]) => key === tab)?.[1] || 'Content';

  return <section className="mx-auto max-w-6xl px-1 py-2">
    <div className="mb-6"><Eyebrow>Content administration</Eyebrow><h2 className="mt-2 text-3xl font-extrabold text-white">Manage {tabTitle}</h2><p className="mt-2 text-sm text-white/45">Create, edit, and remove the content shown to members. All writes use the existing administrator-protected APIs.</p></div>
    <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">{TABS.map(([key, label, Icon]) => <button type="button" key={key} onClick={() => setTab(key)} className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${tab === key ? 'border-[#F2A31C]/40 bg-[#F2A31C]/10 text-[#F2A31C]' : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white'}`}><Icon/> {label}</button>)}</div>
    {(error || notice) && <p className={`mb-5 rounded-2xl px-4 py-3 text-sm ${error ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{error || notice}</p>}
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card variant="raised" className="p-5">
        <div className="flex items-center justify-between"><div><Eyebrow>{editingId ? 'Edit' : 'Create'}</Eyebrow><h3 className="mt-1 text-xl font-bold text-white">{editingId ? `Edit ${tabTitle}` : `New ${tabTitle}`}</h3></div>{editingId && <button type="button" onClick={reset} className="rounded-full border border-white/10 p-2 text-white/50 hover:text-white"><FiX/></button>}</div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          {tab === 'events' && <><Field label="Title" value={form.title} onChange={(v) => setField('title', v)} /><Field label="Category" value={form.category} onChange={(v) => setField('category', v)} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Date" type="date" value={form.date} onChange={(v) => setField('date', v)} /><Field label="Time" type="time" value={form.time} onChange={(v) => setField('time', v)} /></div><Field label="Location" value={form.location} onChange={(v) => setField('location', v)} /><Field label="Description" multiline value={form.description} onChange={(v) => setField('description', v)} /></>}
          {tab === 'outreach' && <><Field label="Tag" value={form.tag} onChange={(v) => setField('tag', v)} /><Field label="Title" value={form.title} onChange={(v) => setField('title', v)} /><Field label="Subtitle" value={form.subtitle} onChange={(v) => setField('subtitle', v)} /><Field label="Story" multiline value={form.body} onChange={(v) => setField('body', v)} /><Field label="Image URL" value={form.imageUrl} onChange={(v) => setField('imageUrl', v)} /></>}
          {tab === 'sermons' && <><Field label="Title" value={form.title} onChange={(v) => setField('title', v)} /><Field label="Speaker" value={form.speaker} onChange={(v) => setField('speaker', v)} /><Field label="YouTube URL" value={form.youtubeUrl} onChange={(v) => setField('youtubeUrl', v)} placeholder="https://youtube.com/watch?v=..." /><Field label="Description" multiline value={form.description} onChange={(v) => setField('description', v)} /></>}
          {tab === 'venues' && <><Field label="Chapter" value={form.chapter} onChange={(v) => setField('chapter', v)} /><Field label="Venue" value={form.venue} onChange={(v) => setField('venue', v)} /><Field label="Service time" value={form.serviceTime} onChange={(v) => setField('serviceTime', v)} /></>}
          <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><FiSave/> {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create'}</button>
        </form>
      </Card>
      <Card variant="raised" className="p-5"><div className="flex items-center justify-between"><div><Eyebrow>Existing</Eyebrow><h3 className="mt-1 text-xl font-bold text-white">{tabTitle}</h3></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/45">{items.length}</span></div><div className="mt-5 space-y-3">{loading ? <p className="py-8 text-center text-sm text-white/40">Loading...</p> : !items.length ? <p className="py-8 text-center text-sm text-white/40">No {tabTitle.toLowerCase()} yet.</p> : items.map((item) => <EditRow key={item.id || item.chapter} title={tab === 'venues' ? item.chapter : item.title} meta={tab === 'events' ? `${item.date || 'No date'} · ${item.location || 'No location'}` : tab === 'sermons' ? item.speaker : tab === 'outreach' ? item.tag : `${item.venue} · ${item.serviceTime || 'No service time'}`} onEdit={() => edit(item)} onDelete={() => void remove(item)} extra={tab === 'sermons' && <button type="button" onClick={async () => { try { await setFeaturedSermon(item.id); await load('sermons'); setNotice('Featured sermon updated.'); } catch (e) { setError(e.message || 'Unable to feature sermon.'); } }} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${item.isFeatured ? 'border-[#F2A31C]/40 text-[#F2A31C]' : 'border-white/10 text-white/45 hover:text-white'}`}>{item.isFeatured ? 'Featured' : 'Feature'}</button>} />)}</div></Card>
    </div>
  </section>;
}
