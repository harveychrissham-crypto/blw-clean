import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiX } from 'react-icons/fi';
import { fetchFeed } from '../utils/feed';
import { Skeleton } from '../components/ui/Skeleton';

const FILTERS = ['All', 'Photos', 'Videos'];

function tileLabel(post) {
  if (post.type === 'reel') return 'Reel';
  if (post.videoId) return 'Video';
  return '';
}

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [filter, setFilter] = useState(searchParams.get('type') || 'All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchFeed({ limit: 60, offset: 0 })
      .then(({ posts: next }) => { if (active) setPosts(next); })
      .catch(() => { if (active) setPosts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return posts.filter((post) => {
      const isVideo = Boolean(post.videoId || post.type === 'reel' || String(post.mediaType).startsWith('video'));
      if (filter === 'Photos' && isVideo) return false;
      if (filter === 'Videos' && !isVideo) return false;
      if (!needle) return true;
      return [post.title, post.body, post.author, post.authorName, post.authorHandle]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [posts, query, filter]);

  const updateSearch = (value) => {
    setQuery(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('q', value.trim()); else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const updateFilter = (value) => {
    setFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'All') next.delete('type'); else next.set('type', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-3 pb-28 pt-5 sm:px-6 sm:pt-8">
      <div className="mb-5 flex items-center gap-3">
        <Link to="/feed" aria-label="Back to Feed" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.04] text-white/75 transition hover:bg-white/[.08]">
          <FiArrowLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-white">Explore</h1>
          <p className="text-xs text-white/45">Discover posts and videos from the community</p>
        </div>
      </div>

      <label className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.045] px-3 text-white/55 focus-within:border-white/20">
        <FiSearch className="shrink-0" />
        <input value={query} onChange={(event) => updateSearch(event.target.value)} placeholder="Search posts, people or topics" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" aria-label="Search Feed" />
        {query && <button type="button" onClick={() => updateSearch('')} className="grid h-7 w-7 place-items-center rounded-full text-white/50 hover:bg-white/[.08]" aria-label="Clear search"><FiX /></button>}
      </label>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Explore filters">
        {FILTERS.map((item) => (
          <button key={item} type="button" onClick={() => updateFilter(item)} role="tab" aria-selected={filter === item} className={`rounded-full px-4 py-2 text-xs font-medium transition ${filter === item ? 'bg-white text-black' : 'bg-white/[.06] text-white/55 hover:bg-white/[.1] hover:text-white'}`}>
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-5 grid grid-cols-3 gap-1 sm:gap-2">
          {Array.from({ length: 12 }).map((_, index) => <Skeleton key={index} className="aspect-square rounded-lg" />)}
        </div>
      ) : results.length ? (
        <div className="mt-5 grid grid-cols-3 gap-1 sm:gap-2">
          {results.map((post) => {
            const isVideo = Boolean(post.videoId || post.type === 'reel' || String(post.mediaType).startsWith('video'));
            const href = `/feed?${post.type === 'reel' ? 'tab=Reels&' : ''}notificationId=${encodeURIComponent(post.id)}`;
            return (
              <Link key={post.id} to={href} className="group relative aspect-square overflow-hidden rounded-lg border border-white/[.06] bg-white/[.035]">
                {post.mediaUrl ? (
                  <img src={post.mediaUrl} alt={post.title || 'Community post'} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                ) : isVideo && post.videoId ? (
                  <div className="grid h-full w-full place-items-center bg-black"><div className="grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-xl">▶</div></div>
                ) : (
                  <div className="flex h-full w-full flex-col justify-end bg-gradient-to-br from-[#251b38] via-[#161426] to-[#0d0c18] p-3"><span className="line-clamp-4 text-xs font-medium leading-relaxed text-white/85 sm:text-sm">{post.title || post.body || 'Community update'}</span></div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-6 opacity-0 transition group-hover:opacity-100">
                  <span className="max-w-[70%] truncate text-[10px] text-white/85">{post.author || 'BLW Kenya Zone'}</span>
                  {tileLabel(post) && <span className="text-[10px] text-white/65">{tileLabel(post)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[.035] px-6 py-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/[.06] text-white/55"><FiSearch /></div>
          <h2 className="mt-4 text-sm font-semibold text-white">Nothing found</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-white/45">Try a different name, topic, or search term.</p>
        </div>
      )}
    </main>
  );
}
