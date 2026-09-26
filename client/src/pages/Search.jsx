import { useEffect, useState } from 'react';
import { FiArrowLeft, FiHash, FiSearch, FiUser, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { searchAccounts, fetchTrendingTopics } from '../utils/feed';

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [topicLoading, setTopicLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchTrendingTopics().then((items) => { if (active) setTopics(items || []); }).catch(() => {}).finally(() => { if (active) setTopicLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setPeople([]); setLoading(false); setError(''); return undefined; }
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const results = await searchAccounts(q);
        if (active) setPeople(results || []);
      } catch (err) {
        if (active) setError(err?.message || 'Unable to search right now.');
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  const clear = () => setQuery('');

  return <main className="min-h-screen bg-[#0B0F14] pb-28 text-white">
    <div className="mx-auto w-full max-w-2xl">
      <header className="sticky top-0 z-20 border-b border-white/[.07] bg-[#0B0F14]/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/60 hover:bg-white/[.06]" aria-label="Back"><FiArrowLeft /></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-3 py-2.5 focus-within:border-white/20">
              <FiSearch className="h-4 w-4 shrink-0 text-white/35" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Emet" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" />
              {query && <button onClick={clear} className="text-white/35 hover:text-white" aria-label="Clear search"><FiX /></button>}
            </div>
          </div>
        </div>
      </header>

      <section className="px-4 py-5 sm:px-6">
        {error && <div className="mb-4 rounded-2xl border border-red-400/15 bg-red-400/[.06] p-3 text-sm text-red-200">{error}</div>}
        {query.trim().length >= 2 ? <div>
          <div className="mb-3 flex items-center justify-between"><h1 className="text-sm font-bold">People</h1>{loading && <span className="text-xs text-white/30">Searching…</span>}</div>
          {people.length ? <div className="space-y-1">{people.map((person) => <button key={person.email} onClick={() => navigate('/u/' + encodeURIComponent(person.email))} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-white/[.04]">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[.06] text-sm font-bold">{person.avatarUrl ? <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" /> : (person.name || 'E').slice(0,1).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{person.name || 'Emet member'}</p><p className="truncate text-xs text-white/35">{person.username ? '@' + person.username : person.title || person.chapter || person.email}</p></div>
            <FiUser className="text-white/25" />
          </button>)}</div> : !loading && <div className="py-16 text-center"><FiUser className="mx-auto h-8 w-8 text-white/20" /><p className="mt-3 text-sm font-semibold text-white/60">No people found</p><p className="mt-1 text-xs text-white/30">Try a different name or username.</p></div>}
        </div> : <div>
          <div className="mb-4"><h1 className="text-xl font-black">Search</h1><p className="mt-1 text-sm text-white/35">Find people and discover conversations across Emet.</p></div>
          <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Trending topics</h2><FiHash className="text-white/25" /></div>
          {topicLoading ? <div className="mt-3 space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/[.04]" />)}</div> : topics.length ? <div className="mt-3 space-y-1">{topics.slice(0,12).map((topic, index) => { const label = typeof topic === 'string' ? topic : topic.name || topic.slug || ''; return <button key={label || index} onClick={() => navigate('/topics/' + encodeURIComponent(String(label).replace(/^#/, '')))} className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left hover:bg-white/[.04]"><span><span className="block text-sm font-semibold">#{String(label).replace(/^#/, '')}</span>{typeof topic === 'object' && <span className="text-xs text-white/30">{topic.postCount || topic.count || 0} posts</span>}</span><FiHash className="text-white/20" /></button> })}</div> : <div className="py-12 text-center text-sm text-white/30">No trending topics yet.</div>}
        </div>}
      </section>
    </div>
  </main>;
}
