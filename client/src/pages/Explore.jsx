import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiHash, FiImage, FiSearch, FiUsers, FiX } from 'react-icons/fi';
import { fetchFeed, fetchTrendingTopics, searchAccounts, toggleFollow } from '../utils/feed';
import { Skeleton } from '../components/ui/Skeleton';

const TABS = ['For you', 'Posts', 'People', 'Media'];

function Avatar({ src, name, size = 'h-10 w-10' }) {
  return src ? (
    <img src={src} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <div className={`${size} shrink-0 grid place-items-center rounded-xl bg-white/[.08] text-sm font-semibold text-white/70`}>
      {String(name || 'E').trim().charAt(0).toUpperCase()}
    </div>
  );
}

function timeLabel(value) {
  if (!value) return '';
  return String(value);
}

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [tab, setTab] = useState(searchParams.get('tab') || 'For you');
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [followBusy, setFollowBusy] = useState('');
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      fetchFeed({ limit: 60, offset: 0, q: query.trim() })
        .then(({ posts: next }) => { if (active) setPosts(next); })
        .catch(() => { if (active) setPosts([]); })
        .finally(() => { if (active) setLoading(false); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    if (tab !== 'People') {
      setAccounts([]);
      return undefined;
    }
    let active = true;
    setAccountsLoading(true);
    const timer = setTimeout(() => {
      searchAccounts(query)
        .then((next) => { if (active) setAccounts(next); })
        .catch(() => { if (active) setAccounts([]); })
        .finally(() => { if (active) setAccountsLoading(false); });
    }, query.trim() ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [tab, query]);

  const updateQuery = (value) => {
    setQuery(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('q', value.trim()); else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const updateTab = (value) => {
    setTab(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'For you') next.delete('tab'); else next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  const follow = async (account) => {
    const email = account.email;
    if (!email) return;
    const nextFollowing = !account.following;
    setFollowBusy(email);
    setAccounts((items) => items.map((item) => item.email === email ? { ...item, following: nextFollowing } : item));
    try {
      await toggleFollow(email);
    } catch {
      setAccounts((items) => items.map((item) => item.email === email ? { ...item, following: !nextFollowing } : item));
    } finally {
      setFollowBusy('');
    }
  };

  useEffect(() => {
    let active = true;
    fetchTrendingTopics()
      .then((items) => { if (active) setTrending(items); })
      .catch(() => { if (active) setTrending([]); })
      .finally(() => { if (active) setTrendingLoading(false); });
    return () => { active = false; };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    return posts.filter((post) => {
      const isMedia = Boolean(post.mediaUrl || post.videoId || post.thumbnailUrl);
      const matchesQuery = !normalizedQuery || [post.title, post.body, post.author]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      if (!matchesQuery) return false;
      if (tab === 'Media') return isMedia;
      if (tab === 'Posts') return !isMedia;
      return true;
    });
  }, [posts, normalizedQuery, tab]);

  const trends = useMemo(() => {
    const counts = new Map();
    for (const post of posts) {
      const text = `${post.title || ''} ${post.body || ''}`;
      const tags = text.match(/#[a-z0-9_]+/gi) || [];
      for (const tag of tags) counts.set(tag.toLowerCase(), (counts.get(tag.toLowerCase()) || 0) + 1);
    }
    const derived = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    const fallback = ['#Community', '#Conversation', '#Creativity', '#Ideas', '#Emet'];
    return [...derived, ...fallback.filter((tag) => !derived.some((item) => item.name === tag.toLowerCase())).map((name) => ({ name, count: 0 }))].slice(0, 5);
  }, [posts]);

  const people = accounts.length ? accounts : posts.reduce((list, post) => {
    if (post.author && !list.some((item) => item.name === post.author)) {
      list.push({ name: post.author, avatarUrl: post.avatarUrl, email: post.authorEmail, following: post.following });
    }
    return list;
  }, []).slice(0, 6);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl pb-28 sm:border-x sm:border-white/[.06]">
      <header className="sticky top-0 z-20 border-b border-white/[.07] bg-[#0B0F14]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Back to Home" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/70 transition hover:bg-white/[.08] hover:text-white"><FiArrowLeft /></Link>
          <div>
            <h1 className="text-lg font-bold text-white">Explore</h1>
            <p className="text-[11px] text-white/35">Find conversations, people and topics</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
        <label className="flex h-12 items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.045] px-4 transition focus-within:border-[#1D9BF0]/40 focus-within:bg-white/[.06]">
          <FiSearch className="shrink-0 text-white/45" />
          <input
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search Emet"
            aria-label="Search Emet"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
          {query && <button type="button" onClick={() => updateQuery('')} aria-label="Clear search" className="grid h-7 w-7 place-items-center rounded-xl text-white/45 hover:bg-white/[.08]"><FiX /></button>}
        </label>

        <div className="mt-4 flex overflow-x-auto border-b border-white/[.07]" role="tablist" aria-label="Explore sections">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => updateTab(item)}
              className={`relative shrink-0 px-4 py-3 text-sm font-semibold transition ${tab === item ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              {item}
              {tab === item && <span className="absolute inset-x-4 bottom-0 h-1 rounded-full bg-white" />}
            </button>
          ))}
        </div>

        {tab === 'People' ? (
          <section className="mt-2">
            {!query.trim() && !accountsLoading && accounts.length > 0 && (
              <div className="border-b border-white/[.06] px-0 py-4">
                <h2 className="text-base font-bold text-white">Suggested for you</h2>
                <p className="mt-1 text-xs text-white/35">People you may know based on your connections and interests.</p>
              </div>
            )}
            {accountsLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 border-b border-white/[.06] py-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-32 rounded" /><Skeleton className="h-3 w-24 rounded" /></div>
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              ))
            ) : people.length ? (
              people.map((person, index) => (
                <div key={person.email || person.name || index} className="flex items-center gap-3 border-b border-white/[.06] py-4">
                  <Avatar src={person.avatarUrl} name={person.name} size="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <Link to={person.email ? `/u/${encodeURIComponent(person.email)}` : '/explore'} className="block truncate text-sm font-bold text-white hover:underline">{person.name}</Link>
                    <p className="truncate text-xs text-white/35">{person.title || 'Emet community member'}</p>
                  </div>
                  {person.email && (
                    <button type="button" onClick={() => follow(person)} disabled={followBusy === person.email} className={`rounded-xl px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${person.following ? 'border border-white/15 text-white/70 hover:bg-white/[.06]' : 'bg-[#E7E9EA] text-[#0B0F14] hover:bg-[#D9DDE1]'}`}>
                      {person.following ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <Empty title="No people found" text="Try searching for a name." icon={FiUsers} />
            )}
          </section>
        ) : (
          <div className="mt-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border-b border-white/[.06] py-5">
                  <div className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-40 rounded" /><Skeleton className="h-3 w-24 rounded" /></div></div>
                  <Skeleton className="mt-4 h-16 w-full rounded-xl" />
                </div>
              ))
            ) : results.length ? (
              results.slice(0, 30).map((post) => (
                <Link key={post.id} to={`/feed?notificationId=${encodeURIComponent(post.id)}`} className="block border-b border-white/[.06] py-4 transition hover:bg-white/[.025]">
                  <div className="flex gap-3">
                    <Avatar src={post.avatarUrl} name={post.author} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
                        <span className="font-bold text-white">{post.author || 'Emet member'}</span>
                        {post.isOfficial && <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] font-black text-black">✓</span>}
                        <span className="text-white/35">· {timeLabel(post.time)}</span>
                      </div>
                      {post.title && <h2 className="mt-1 text-[15px] font-bold leading-snug text-white">{post.title}</h2>}
                      {post.body && <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-white/75">{post.body}</p>}
                      {post.mediaUrl && <div className="mt-3 overflow-hidden rounded-2xl border border-white/[.08]"><img src={post.mediaUrl} alt="" loading="lazy" className="max-h-80 w-full object-cover" /></div>}
                      <div className="mt-3 flex items-center gap-5 text-xs text-white/35">
                        <span>{post.commentCount || 0} replies</span>
                        <span>{post.likeCount || 0} likes</span>
                        {post.mediaUrl && <span className="inline-flex items-center gap-1"><FiImage /> Media</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <Empty title={normalizedQuery ? 'No results' : 'Nothing to explore yet'} text={normalizedQuery ? 'Try another search term.' : 'Conversations from the community will appear here.'} icon={FiSearch} />
            )}
          </div>
        )}

        {tab !== 'People' && !query.trim() && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white"><FiHash /> Trending on Emet</div>
              <Link to="/topics" className="text-xs font-semibold text-[#1D9BF0] hover:text-white">See all</Link>
            </div>
            {trendingLoading ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl border border-white/[.07] bg-white/[.025]" />)}
              </div>
            ) : trending.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {trending.slice(0, 10).map((trend, index) => (
                  <Link key={trend.slug} to={`/topics/${encodeURIComponent(trend.slug)}`} className="rounded-2xl border border-white/[.07] bg-white/[.025] px-4 py-3 text-left transition hover:bg-white/[.05]">
                    <p className="text-[11px] text-white/35">#{index + 1} · Trending topic</p>
                    <p className="mt-1 text-sm font-bold text-white">{trend.name || `#${trend.slug}`}</p>
                    <p className="mt-1 text-[11px] text-white/35">{Number(trend.post_count || 0)} {Number(trend.post_count || 0) === 1 ? 'post' : 'posts'} · Last 7 days</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[.07] bg-white/[.025] px-4 py-5 text-sm text-white/40">Trending topics will appear as people add hashtags to conversations.</div>
            )}
          </section>
        )}      </div>
    </main>
  );
}

function Empty({ title, text, icon: Icon }) {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white/[.06] text-white/45"><Icon /></div>
      <h2 className="mt-4 text-base font-bold text-white">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-white/40">{text}</p>
    </div>
  );
}
