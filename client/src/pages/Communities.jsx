import { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiCompass, FiPlus, FiSearch, FiUsers, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { fetchCommunities, toggleCommunityMembership, createCommunity } from '../utils/communities';
import { useAuth } from '../context/AuthContext';

const FALLBACK_CATEGORIES = ['All', 'Creativity', 'Business', 'Education', 'Culture', 'Faith', 'Life', 'Technology', 'Learning'];
const TONES = [
  'bg-blue-500/10 text-blue-300',
  'bg-emerald-500/10 text-emerald-300',
  'bg-violet-500/10 text-violet-300',
  'bg-pink-500/10 text-pink-300',
  'bg-amber-500/10 text-amber-300',
  'bg-cyan-500/10 text-cyan-300',
  'bg-sky-500/10 text-sky-300',
  'bg-orange-500/10 text-orange-300',
];

function formatCommunity(row, index) {
  return {
    ...row,
    id: String(row.id),
    members: Number(row.member_count || 0),
    joined: Boolean(row.joined),
    tone: TONES[index % TONES.length],
  };
}

export default function Communities() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', category: 'General' });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchCommunities({ query, category })
      .then((items) => { if (active) setCommunities(items.map(formatCommunity)); })
      .catch((err) => { if (active) setError(err?.message || 'Unable to load communities.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, category]);

  const categories = useMemo(() => {
    const fromData = communities.map((community) => community.category).filter(Boolean);
    return [...new Set([...FALLBACK_CATEGORIES, ...fromData])];
  }, [communities]);

  const toggleJoin = async (community) => {
    setBusyId(community.id);
    setError('');
    try {
      const result = await toggleCommunityMembership(community.id);
      setCommunities((current) => current.map((item) => item.id === community.id
        ? { ...item, joined: Boolean(result.joined), members: Number(result.memberCount ?? item.members) }
        : item));
    } catch (err) {
      setError(err?.message || 'Unable to update membership.');
    } finally {
      setBusyId('');
    }
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const created = await createCommunity(form);
      setCommunities((current) => [formatCommunity(created, current.length), ...current]);
      setForm({ name: '', description: '', category: 'General' });
      setShowCreate(false);
    } catch (err) {
      setCreateError(err?.message || 'Unable to create community.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F14] pb-28 text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[.03] text-white/65 hover:bg-white/[.07] hover:text-white" aria-label="Go back"><FiArrowLeft /></button>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#3B82F6]">Discover</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Communities</h1>
            </div>
          </div>
          <button onClick={() => user ? setShowCreate(true) : navigate('/auth')} className="inline-flex items-center gap-2 rounded-full bg-[#3B82F6] px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500"><FiPlus /> Create</button>
        </header>

        <section className="mt-7 rounded-[1.75rem] border border-white/[.07] bg-white/[.025] p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#3B82F6]/10 text-[#3B82F6] sm:grid"><FiCompass className="h-6 w-6" /></div>
            <div>
              <h2 className="text-lg font-bold">Find people who share your interests</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">Join conversations around the things you care about. Communities on Emet are built around people, interests and conversation.</p>
            </div>
          </div>
          <label className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0F14] px-4 py-3.5">
            <FiSearch className="shrink-0 text-white/35" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search communities" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25" />
          </label>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${category === item ? 'bg-white text-[#0B0F14]' : 'border border-white/10 bg-white/[.03] text-white/55 hover:bg-white/[.07] hover:text-white'}`}>{item}</button>)}
          </div>
        </section>

        {error && <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

        <div className="mt-8 flex items-center justify-between">
          <div><h2 className="text-base font-bold">Explore communities</h2><p className="mt-1 text-xs text-white/35">{loading ? 'Loading…' : `${communities.length} communities`}</p></div>
          <span className="hidden text-xs text-white/30 sm:block">{communities.filter((item) => item.joined).length} joined</span>
        </div>

        {loading ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-2">{[1,2,3,4].map((item) => <div key={item} className="h-52 animate-pulse rounded-3xl border border-white/[.07] bg-white/[.025]" />)}</section>
        ) : communities.length ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            {communities.map((community) => (
              <article key={community.id} className="rounded-3xl border border-white/[.07] bg-white/[.025] p-5 transition hover:border-white/15 hover:bg-white/[.04]">
                <div className="flex items-start justify-between gap-4">
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${community.tone}`}><FiUsers className="h-5 w-5" /></div>
                  <button onClick={() => toggleJoin(community)} disabled={busyId === community.id} className={`rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${community.joined ? 'border border-white/10 bg-white/[.05] text-white/60' : 'bg-[#3B82F6] text-white hover:bg-blue-500'}`}>{busyId === community.id ? 'Updating…' : community.joined ? 'Joined' : 'Join'}</button>
                </div>
                <button onClick={() => navigate(`/communities/${community.id}`)} className="mt-5 text-left">
                  <h3 className="text-base font-bold hover:text-[#3B82F6]">{community.name}</h3>
                  <p className="mt-2 min-h-[3rem] text-sm leading-6 text-white/45">{community.description}</p>
                </button>
                <div className="mt-5 flex items-center justify-between text-xs text-white/30"><span>{community.members.toLocaleString()} members</span><span>{community.category}</span></div>
              </article>
            ))}
          </section>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center"><p className="font-semibold text-white/70">No communities found</p><p className="mt-1 text-sm text-white/35">Try a different search or category.</p></div>
        )}
      </div>

      {showCreate && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4" onClick={() => setShowCreate(false)}>
        <form onSubmit={submitCreate} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#11161D] p-6 shadow-2xl">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Create a community</h2><p className="mt-1 text-xs text-white/40">Start a space around an interest, idea or shared goal.</p></div><button type="button" onClick={() => setShowCreate(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/[.06]" aria-label="Close"><FiX /></button></div>
          <div className="mt-6 space-y-4">
            <input required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Community name" className="w-full rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none focus:border-[#3B82F6]" />
            <textarea required maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What is this community about?" rows={4} className="w-full resize-none rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none focus:border-[#3B82F6]" />
            <input maxLength={40} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Category" className="w-full rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none focus:border-[#3B82F6]" />
          </div>
          {createError && <p className="mt-3 text-sm text-red-300">{createError}</p>}
          <button disabled={creating} className="mt-5 w-full rounded-2xl bg-[#3B82F6] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{creating ? 'Creating…' : 'Create community'}</button>
        </form>
      </div>}
    </main>
  );
}
