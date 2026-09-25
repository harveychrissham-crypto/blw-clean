import { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiCompass, FiSearch, FiUsers } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const COMMUNITIES = [
  { id: 'creators', name: 'Creators', description: 'Share ideas, projects, feedback and the work you are building.', members: 1842, category: 'Creativity', tone: 'bg-blue-500/10 text-blue-300' },
  { id: 'entrepreneurs', name: 'Entrepreneurs', description: 'Business ideas, lessons, opportunities and conversations for builders.', members: 1268, category: 'Business', tone: 'bg-emerald-500/10 text-emerald-300' },
  { id: 'university', name: 'University Students', description: 'Study life, careers, campus conversations and finding your people.', members: 2314, category: 'Education', tone: 'bg-violet-500/10 text-violet-300' },
  { id: 'music', name: 'Music & Culture', description: 'Artists, listeners and curious people talking about music and culture.', members: 978, category: 'Culture', tone: 'bg-pink-500/10 text-pink-300' },
  { id: 'faith', name: 'Faith & Life', description: 'Open conversations about faith, purpose, prayer and everyday life.', members: 1647, category: 'Faith', tone: 'bg-amber-500/10 text-amber-300' },
  { id: 'young-adults', name: 'Young Adults', description: 'Life, relationships, work, growth and everything in between.', members: 1986, category: 'Life', tone: 'bg-cyan-500/10 text-cyan-300' },
  { id: 'tech', name: 'Technology', description: 'AI, coding, products, startups and the future of technology.', members: 1107, category: 'Technology', tone: 'bg-sky-500/10 text-sky-300' },
  { id: 'books', name: 'Books & Ideas', description: 'Talk about books, learning, big ideas and what you are discovering.', members: 742, category: 'Learning', tone: 'bg-orange-500/10 text-orange-300' },
];

const STORAGE_KEY = 'emet:joined-communities';

function loadJoined() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function Communities() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [joined, setJoined] = useState(loadJoined);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(joined)); } catch {}
  }, [joined]);

  const categories = useMemo(() => ['All', ...new Set(COMMUNITIES.map((community) => community.category))], []);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return COMMUNITIES.filter((community) => {
      const matchesCategory = category === 'All' || community.category === category;
      const matchesQuery = !normalized || [community.name, community.description, community.category].some((value) => value.toLowerCase().includes(normalized));
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const toggleJoin = (id) => {
    setJoined((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <main className="min-h-screen bg-[#0B0F14] pb-28 text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[.03] text-white/65 hover:bg-white/[.07] hover:text-white" aria-label="Go back">
            <FiArrowLeft />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#3B82F6]">Discover</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Communities</h1>
          </div>
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
            {categories.map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${category === item ? 'bg-white text-[#0B0F14]' : 'border border-white/10 bg-white/[.03] text-white/55 hover:bg-white/[.07] hover:text-white'}`}>
                {item}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between">
          <div><h2 className="text-base font-bold">Explore communities</h2><p className="mt-1 text-xs text-white/35">{filtered.length} communities</p></div>
          <span className="hidden text-xs text-white/30 sm:block">{joined.length} joined</span>
        </div>

        {filtered.length ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            {filtered.map((community) => {
              const isJoined = joined.includes(community.id);
              return (
                <article key={community.id} className="rounded-3xl border border-white/[.07] bg-white/[.025] p-5 transition hover:border-white/15 hover:bg-white/[.04]">
                  <div className="flex items-start justify-between gap-4">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${community.tone}`}><FiUsers className="h-5 w-5" /></div>
                    <button onClick={() => toggleJoin(community.id)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${isJoined ? 'border border-white/10 bg-white/[.05] text-white/60' : 'bg-[#3B82F6] text-white hover:bg-blue-500'}`}>
                      {isJoined ? 'Joined' : 'Join'}
                    </button>
                  </div>
                  <h3 className="mt-5 text-base font-bold">{community.name}</h3>
                  <p className="mt-2 min-h-[3rem] text-sm leading-6 text-white/45">{community.description}</p>
                  <div className="mt-5 flex items-center justify-between text-xs text-white/30">
                    <span>{community.members.toLocaleString()} members</span>
                    <span>{community.category}</span>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
            <p className="font-semibold text-white/70">No communities found</p>
            <p className="mt-1 text-sm text-white/35">Try a different search or category.</p>
          </div>
        )}
      </div>
    </main>
  );
}
