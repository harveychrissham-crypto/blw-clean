import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBarChart2, FiBookmark, FiEdit3, FiHeart, FiImage, FiMessageCircle, FiMoreHorizontal, FiRepeat, FiSearch, FiSend, FiSmile } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { fetchFeed, toggleFollow, toggleLike, toggleSave } from '../utils/feed';
import { shareContent } from '../utils/share';
import { Skeleton } from '../components/ui/Skeleton';

const PAGE_SIZE = 20;

function Avatar({ src, name, size = 'h-10 w-10' }) {
  const initial = String(name || 'E').trim().charAt(0).toUpperCase() || 'E';
  return <div className={`shrink-0 overflow-hidden rounded-full bg-white/[.08] ${size}`}>{src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-sm font-bold text-white/70">{initial}</div>}</div>;
}

function PostCard({ post, user, onUpdate }) {
  const [busy, setBusy] = useState('');
  const author = post.author || 'Emet Community';
  const isFollowing = Boolean(post.following);
  const update = (patch) => onUpdate(post.id, patch);

  const action = async (type) => {
    if (!user) return;
    setBusy(type);
    const previous = { liked: post.liked, saved: post.saved, following: post.following, likeCount: post.likeCount, saveCount: post.saveCount };
    if (type === 'like') update({ liked: !post.liked, likeCount: Math.max(0, post.likeCount + (post.liked ? -1 : 1)) });
    if (type === 'save') update({ saved: !post.saved, saveCount: Math.max(0, post.saveCount + (post.saved ? -1 : 1)) });
    if (type === 'follow') update({ following: !post.following });
    try {
      const result = type === 'like' ? await toggleLike(post.id) : type === 'save' ? await toggleSave(post.id) : await toggleFollow(post.id);
      update(result || {});
    } catch {
      update(previous);
    } finally {
      setBusy('');
    }
  };

  const share = () => shareContent({
    title: author,
    text: post.body || post.title,
    url: `${window.location.origin}/feed?notificationId=${encodeURIComponent(post.id)}`,
  });

  return (
    <article className="border-b border-white/[.07] px-4 py-4 transition hover:bg-white/[.018]">
      <div className="flex gap-3">
        <Avatar src={post.avatarUrl} name={author} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="truncate font-bold text-white">{author}</span>
                {post.isOfficial && <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] font-black text-black">✓</span>}
                <span className="truncate text-white/35">@{String(author).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'emet'}</span>
                <span className="text-white/25">·</span>
                <span className="text-white/35">{post.time || 'now'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {user && !post.isOwner && <button type="button" onClick={() => action('follow')} disabled={busy === 'follow'} className={`hidden rounded-full border px-3 py-1 text-xs font-bold sm:inline-flex ${isFollowing ? 'border-white/10 text-white/55' : 'border-white/30 text-white hover:bg-white hover:text-black'}`}>{isFollowing ? 'Following' : 'Follow'}</button>}
              <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-white/35 hover:bg-white/[.06] hover:text-white" aria-label="More options"><FiMoreHorizontal /></button>
            </div>
          </div>

          {post.title && post.title !== post.body && <p className="mt-1 text-sm font-semibold text-white">{post.title}</p>}
          {post.body && <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-white/85">{post.body}</p>}

          {post.mediaUrl && <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/20"><img src={post.mediaUrl} alt="" className="max-h-[520px] w-full object-cover" loading="lazy" /></div>}

          <div className="mt-2 flex max-w-xl items-center justify-between text-white/40">
            <button type="button" onClick={() => {}} className="group flex items-center gap-2 rounded-full px-2 py-2 text-xs hover:text-white"><FiMessageCircle className="h-[18px] w-[18px] group-hover:text-[#1D9BF0]" />{post.commentCount || 0}</button>
            <button type="button" onClick={() => {}} className="group flex items-center gap-2 rounded-full px-2 py-2 text-xs hover:text-white"><FiRepeat className="h-[18px] w-[18px] group-hover:text-[#1D9BF0]" />{post.repostCount || 0}</button>
            <button type="button" onClick={() => action('like')} disabled={busy === 'like'} className={`group flex items-center gap-2 rounded-full px-2 py-2 text-xs hover:text-white ${post.liked ? 'text-[#1D9BF0]' : ''}`}><FiHeart className="h-[18px] w-[18px] group-hover:text-[#1D9BF0]" fill={post.liked ? 'currentColor' : 'none'} />{post.likeCount || 0}</button>
            <button type="button" onClick={() => action('save')} disabled={busy === 'save'} className={`group flex items-center gap-2 rounded-full px-2 py-2 text-xs hover:text-white ${post.saved ? 'text-white' : ''}`}><FiBookmark className="h-[18px] w-[18px]" /></button>
            <button type="button" onClick={share} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/[.06] hover:text-white" aria-label="Share"><FiSend className="h-[17px] w-[17px]" /></button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Compose({ user }) {
  const name = user?.name || 'Member';
  return (
    <div className="border-b border-white/[.07] px-4 py-4">
      <div className="flex gap-3">
        <Avatar src={user?.avatarUrl || user?.avatar_url} name={name} />
        <div className="min-w-0 flex-1">
          <Link to={user ? '/create' : '/auth'} className="block min-h-14 rounded-2xl border border-transparent bg-white/[.035] px-4 py-4 text-[15px] text-white/35 transition hover:border-white/10 hover:bg-white/[.05]">
            {user ? 'What’s happening in your community?' : 'Sign in to share with Emet'}
          </Link>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-white/45">
              <Link to="/create" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/[.06] hover:text-white" aria-label="Add image"><FiImage /></Link>
              <Link to="/create" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/[.06] hover:text-white" aria-label="Add poll"><FiBarChart2 /></Link>
              <Link to="/create" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/[.06] hover:text-white" aria-label="Add emoji"><FiSmile /></Link>
            </div>
            <Link to="/create" className="rounded-full bg-white px-5 py-2 text-xs font-extrabold text-black transition hover:bg-white/90">Post</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RightRail({ posts }) {
  const trends = useMemo(() => {
    const counts = new Map();
    posts.forEach((post) => {
      const text = `${post.body || ''} ${post.title || ''}`;
      for (const tag of text.match(/#[a-z0-9_]+/gi) || []) counts.set(tag.toLowerCase(), (counts.get(tag.toLowerCase()) || 0) + 1);
    });
    const generated = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ label: tag, count }));
    return generated.length ? generated : [
      { label: '#Faith', count: 0 },
      { label: '#Jesus', count: 0 },
      { label: '#Prayer', count: 0 },
      { label: '#Testimony', count: 0 },
      { label: '#Emet', count: 0 },
    ];
  }, [posts]);

  const people = useMemo(() => {
    const seen = new Set();
    return posts.filter((p) => p.author && !seen.has(p.author) && seen.add(p.author)).slice(0, 3);
  }, [posts]);

  return (
    <aside className="hidden w-[310px] shrink-0 lg:block">
      <div className="sticky top-20 space-y-4">
        <div className="flex items-center gap-3 rounded-full border border-white/[.08] bg-white/[.035] px-4 py-2.5 text-sm text-white/40"><FiSearch /> Search Emet</div>
        <section className="overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.025]">
          <h2 className="px-4 pt-4 text-xl font-extrabold text-white">What’s happening</h2>
          {trends.map((trend) => <div key={trend.label} className="px-4 py-3 transition hover:bg-white/[.04]"><p className="text-[11px] text-white/30">Trending in Emet</p><p className="mt-0.5 font-bold text-white">{trend.label}</p><p className="text-xs text-white/30">{trend.count ? `${trend.count} post${trend.count === 1 ? '' : 's'}` : 'Explore the conversation'}</p></div>)}
          <Link to="/explore" className="block px-4 py-3 text-sm text-white/55 hover:bg-white/[.04] hover:text-white">Show more</Link>
        </section>
        {people.length > 0 && <section className="overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.025]">
          <h2 className="px-4 pt-4 text-xl font-extrabold text-white">Who to follow</h2>
          {people.map((person) => {
            const handle = String(person.author || 'emet')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '')
              .slice(0, 18) || 'emet';
            return (
              <div key={person.author} className="flex items-center gap-3 px-4 py-3">
                <Avatar src={person.avatarUrl} name={person.author} size="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{person.author}</p>
                  <p className="truncate text-xs text-white/35">@{handle}</p>
                </div>
                <Link to="/connect" className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black">Follow</Link>
              </div>
            );
          })}
        </section>}
        <p className="px-2 text-[11px] leading-5 text-white/25">Emet is a social network for conversation, community and genuine connection.</p>
      </div>
    </aside>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [tab, setTab] = useState('For you');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchFeed({ limit: PAGE_SIZE, offset: reset ? 0 : offset, followingOnly: tab === 'Following' });
      setPosts((current) => reset ? result.posts : [...current, ...result.posts]);
      setHasMore(result.hasMore);
      setOffset(reset ? result.posts.length : offset + result.posts.length);
    } catch (e) {
      setError(e?.message || 'Unable to load your timeline.');
    } finally {
      setLoading(false);
    }
  }, [tab, offset]);

  useEffect(() => { setOffset(0); load(true); }, [tab]);

  const update = (id, patch) => setPosts((current) => current.map((post) => post.id === id ? { ...post, ...patch } : post));

  return (
    <main className="min-h-screen bg-[#0B0F14] pb-24 text-white">
      <div className="mx-auto flex max-w-6xl items-start justify-center gap-6">
        <section className="w-full max-w-2xl border-x border-white/[.06]">
          <div className="sticky top-0 z-30 border-b border-white/[.07] bg-[#0B0F14]/90 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3 sm:hidden"><span className="text-lg font-extrabold">Home</span><Link to="/create" className="grid h-9 w-9 place-items-center rounded-full bg-[#0B0F14] text-white border border-white/10"><FiEdit3 /></Link></div>
            <div className="hidden px-4 pt-4 sm:block"><h1 className="text-xl font-extrabold">Home</h1></div>
            <div className="grid grid-cols-2">
              {['For you', 'Following'].map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`relative py-4 text-sm font-bold ${tab === item ? 'text-white' : 'text-white/35 hover:text-white/65'}`}>{item}{tab === item && <span className="absolute inset-x-1/3 bottom-0 h-1 rounded-full bg-white" />}</button>)}
            </div>
          </div>
          <Compose user={user} />
          {error && <div className="m-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
          {loading && !posts.length ? <div className="space-y-2">{[1,2,3].map((n) => <Skeleton key={n} className="h-36 w-full" />)}</div> : posts.length ? posts.map((post) => <PostCard key={post.id} post={post} user={user} onUpdate={update} />) : <div className="px-6 py-16 text-center"><p className="text-lg font-bold">Your timeline is quiet.</p><p className="mt-2 text-sm text-white/40">{tab === 'Following' ? 'Follow people and communities to build your timeline.' : 'Be the first to start a conversation.'}</p><Link to="/create" className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black">Create a post</Link></div>}
          {hasMore && !loading && <button type="button" onClick={() => load(false)} className="w-full border-t border-white/[.07] py-5 text-sm font-bold text-white/55 hover:bg-white/[.03] hover:text-white">Load more</button>}
          {loading && posts.length > 0 && <div className="border-t border-white/[.07] py-5 text-center text-xs text-white/30">Loading…</div>}
        </section>
        <RightRail posts={posts} />
      </div>
    </main>
  );
}
