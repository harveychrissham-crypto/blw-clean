import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiBell,
  FiBookmark,
  FiCamera,
  FiChevronRight,
  FiHeart,
  FiImage,
  FiMessageCircle,
  FiMoreHorizontal,
  FiPlus,
  FiRepeat,
  FiSearch,
  FiSend,
  FiUsers,
  FiVideo,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { fetchFeed, toggleFollow, toggleLike, toggleSave } from '../utils/feed';
import { fetchCommunities, toggleCommunityMembership } from '../utils/communities';
import { shareContent } from '../utils/share';
import StoriesRow from '../components/StoriesRow';
import { Skeleton } from '../components/ui/Skeleton';
import { getUnreadCount, onNotificationsUpdated } from '../utils/notificationStorage';
import { apiFetch } from '../config/api';

const PAGE_SIZE = 20;

function Avatar({ src, size = 'h-10 w-10' }) {
  return (
    <div className={`shrink-0 overflow-hidden ${src ? 'rounded-full bg-white/[.08]' : ''} ${size}`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : <img src="/emet-mark.svg" alt="" className="h-full w-full object-cover" />}
    </div>
  );
}

function CommunityIcon({ index = 0 }) {
  const tones = ['from-fuchsia-500 to-indigo-600', 'from-cyan-400 to-blue-600', 'from-violet-500 to-purple-700', 'from-sky-400 to-indigo-600', 'from-blue-500 to-violet-600'];
  const icons = [FiHeart, FiUsers, FiImage, FiArrowRight, FiMessageCircle];
  const Icon = icons[index % icons.length];
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tones[index % tones.length]} text-white shadow-[0_0_16px_rgba(62,104,255,.32)]`}><Icon className="h-4 w-4" /></span>;
}

function PostCard({ post, user, onUpdate }) {
  const [busy, setBusy] = useState('');
  const author = post.author || 'Emet Community';
  const isFollowing = Boolean(post.following);

  const update = (patch) => onUpdate(post.id, patch);

  const action = async (type) => {
    if (!user) return;
    setBusy(type);
    const previous = {
      liked: post.liked,
      saved: post.saved,
      following: post.following,
      likeCount: post.likeCount,
      saveCount: post.saveCount,
    };
    if (type === 'like') update({ liked: !post.liked, likeCount: Math.max(0, (post.likeCount || 0) + (post.liked ? -1 : 1)) });
    if (type === 'save') update({ saved: !post.saved, saveCount: Math.max(0, (post.saveCount || 0) + (post.saved ? -1 : 1)) });
    if (type === 'follow') update({ following: !post.following });
    try {
      const result = type === 'like'
        ? await toggleLike(post.id)
        : type === 'save'
          ? await toggleSave(post.id)
          : await toggleFollow(post.id);
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
    <article className="mx-2 my-2 overflow-hidden rounded-xl border border-[#17366f]/60 bg-[#04132b]/70 px-4 py-4 transition hover:border-[#2852a0]/70 hover:bg-[#061a39] sm:px-5">
      <div className="flex gap-3.5">
        <Avatar src={post.avatarUrl} name={author} size="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="truncate font-bold text-white">{author}</span>
                {post.isOfficial && <span className="grid h-4 w-4 place-items-center rounded-full bg-[#20B7FF] text-[9px] font-black text-white">✓</span>}
                <span className="text-white/25">·</span>
                <span className="text-white/45">{post.time || 'now'}</span>
              </div>
              {post.communityName && <p className="mt-0.5 text-[11px] text-white/35">in {post.communityName}</p>}
            </div>
            <div className="flex items-center gap-1">
              {user && !post.isOwner && (
                <button type="button" onClick={() => action('follow')} disabled={busy === 'follow'} className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:inline-flex ${isFollowing ? 'border border-white/10 text-white/55' : 'border border-white/20 text-white hover:bg-white hover:text-black'}`}>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
              <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-white/35 hover:bg-white/[.06] hover:text-white" aria-label="More options"><FiMoreHorizontal /></button>
            </div>
          </div>

          {post.title && post.title !== post.body && <p className="mt-2 text-sm font-semibold text-white">{post.title}</p>}
          {post.body && <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-white/85">{post.body}</p>}

          {post.mediaUrl && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <img src={post.mediaUrl} alt="" className="max-h-[520px] w-full object-cover" loading="lazy" />
            </div>
          )}

          <div className="mt-2 flex max-w-xl items-center justify-between text-white/40">
            <button type="button" onClick={() => action('like')} disabled={busy === 'like'} className={`group flex items-center gap-2 rounded-full px-2 py-2 text-xs hover:text-white ${post.liked ? 'text-pink-400' : ''}`}><FiHeart className="h-[18px] w-[18px] group-hover:text-pink-400" fill={post.liked ? 'currentColor' : 'none'} />{post.likeCount || 0}</button>
            <Link to={`/post/${post.id}`} className="group flex items-center gap-2 rounded-full px-2 py-2 text-xs hover:text-white"><FiMessageCircle className="h-[18px] w-[18px] group-hover:text-[#20B7FF]" />{post.commentCount || 0}</Link>
            <button type="button" className="group flex items-center gap-2 rounded-full px-2 py-2 text-xs hover:text-white"><FiRepeat className="h-[18px] w-[18px] group-hover:text-[#20B7FF]" />{post.repostCount || 0}</button>
            <button type="button" onClick={() => action('save')} disabled={busy === 'save'} className={`grid h-8 w-8 place-items-center rounded-full hover:bg-white/[.06] hover:text-white ${post.saved ? 'text-white' : ''}`} aria-label="Bookmark"><FiBookmark className="h-[17px] w-[17px]" fill={post.saved ? 'currentColor' : 'none'} /></button>
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
    <div className="rounded-xl border border-[#17305e]/65 bg-[#041126] p-3">
      <div className="flex items-center gap-3">
        <Avatar src={user?.avatarUrl || user?.avatar_url} name={name} size="h-10 w-10" />
        <Link to={user ? '/create' : '/auth'} title={user ? undefined : 'Sign in to share'} className="min-w-0 flex-1 rounded-xl px-1 py-2 text-[14px] text-white/55 hover:text-white/75">
          What's on your mind?
        </Link>
        <div className="hidden items-center gap-1 sm:flex">
          <Link to="/create" aria-label="Add image" className="grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/[.06] hover:text-white"><FiImage /></Link>
          <Link to="/create" aria-label="Add video" className="grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/[.06] hover:text-white"><FiVideo /></Link>
          <Link to="/create" aria-label="Create post" className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white hover:border-white/40"><FiPlus /></Link>
        </div>
      </div>
    </div>
  );
}

function CommunityRail({ communities, onJoin, busyId }) {
  const list = communities.slice(0, 5);
  return (
    <section className="overflow-hidden rounded-xl border border-[#17305e]/55 bg-[#041126]">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="whitespace-nowrap text-sm font-extrabold">Trending Communities</h2>
        <Link to="/communities" className="shrink-0 whitespace-nowrap text-xs font-semibold text-[#4E91FF]">See all</Link>
      </div>
      <div>
        {list.map((community, index) => (
          <div key={community.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[.025]">
            <span className="w-3 text-center text-xs font-bold text-white/80">{index + 1}</span>
            <CommunityIcon index={index} />
            <Link to={`/communities/${community.id}`} className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{community.name}</p>
              <p className="mt-0.5 text-[10px] text-white/35">{Number(community.member_count || 0).toLocaleString()} members</p>
            </Link>
            <button type="button" onClick={() => onJoin(community)} disabled={busyId === String(community.id)} className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${community.joined ? 'border border-white/10 text-white/55' : 'bg-[#0B2D75] text-white hover:bg-[#12419D]'}`}>
              {busyId === String(community.id) ? '…' : community.joined ? 'Joined' : 'Join'}
            </button>
          </div>
        ))}
        {!list.length && <div className="mx-3 mb-3 rounded-lg border border-[#17305e]/45 bg-[#06152b]/65 px-3 py-3">
          <p className="text-xs text-white/50">Find a community to share what matters to you.</p>
          <Link to="/communities" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#77aaff] hover:text-white">Explore communities <FiArrowRight className="h-3 w-3" /></Link>
        </div>}
      </div>
    </section>
  );
}

function SuggestedPeople({ posts }) {
  const people = useMemo(() => {
    const seen = new Set();
    return posts.filter((post) => post.author && !seen.has(post.author) && seen.add(post.author)).slice(0, 4);
  }, [posts]);

  return (
    <section className="overflow-hidden rounded-xl border border-[#17305e]/55 bg-[#041126]">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="whitespace-nowrap text-sm font-extrabold">Suggested People</h2>
        <Link to="/connect" className="shrink-0 whitespace-nowrap text-xs font-semibold text-[#4E91FF]">See all</Link>
      </div>
      {people.map((person, index) => (
        <div key={person.author} className="flex items-center gap-3 px-4 py-3">
          <Avatar src={person.avatarUrl} name={person.author} size="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{person.author}</p>
            <p className="text-[10px] text-white/35">{index + 1} mutual {index === 0 ? 'friend' : 'friends'}</p>
          </div>
          <Link to="/connect" className="rounded-full bg-[#0B2D75] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#12419D]">Follow</Link>
        </div>
      ))}
    </section>
  );
}

function PromoCard() {
  return (
    <Link to="/communities" className="relative block min-h-[150px] overflow-hidden rounded-2xl border border-[#2557D9]/50 bg-gradient-to-br from-[#071D47] via-[#152F83] to-[#4D0C8A] p-5">
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="relative">
        <img src="/emet-mark.svg" alt="" className="h-11 w-11" />
        <p className="mt-4 max-w-none whitespace-nowrap text-sm font-extrabold leading-tight xl:text-base">More than a platform.<br /><span className="text-[#A989FF]">A movement.</span></p>
        <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white"><FiArrowRight /></span>
      </div>
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [tab, setTab] = useState('For You');
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [busyCommunity, setBusyCommunity] = useState('');

  useEffect(() => {
    const refresh = () => setUnreadCount(getUnreadCount());
    refresh();
    return onNotificationsUpdated(refresh);
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      return undefined;
    }
    let active = true;
    apiFetch('/api/messages/conversations')
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (active && response.ok) {
          setUnreadMessages((body.conversations || []).reduce((total, conversation) => total + Number(conversation.unreadCount || 0), 0));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [user]);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchFeed({
        limit: PAGE_SIZE,
        offset: reset ? 0 : offset,
        followingOnly: tab === 'Following',
      });
      setPosts((current) => reset ? result.posts : [...current, ...result.posts]);
      setHasMore(result.hasMore);
      setOffset(reset ? result.posts.length : offset + result.posts.length);
    } catch (e) {
      setError(e?.message || 'Unable to load your timeline.');
    } finally {
      setLoading(false);
    }
  }, [tab, offset]);

  useEffect(() => {
    setOffset(0);
    load(true);
  }, [tab]);

  useEffect(() => {
    let active = true;
    fetchCommunities()
      .then((items) => { if (active) setCommunities(items); })
      .catch(() => {})
      .finally(() => { if (active) setCommunityLoading(false); });
    return () => { active = false; };
  }, []);

  const update = (id, patch) => setPosts((current) => current.map((post) => post.id === id ? { ...post, ...patch } : post));

  const joinCommunity = async (community) => {
    if (!user) return;
    const id = String(community.id);
    setBusyCommunity(id);
    try {
      const result = await toggleCommunityMembership(id);
      setCommunities((current) => current.map((item) => String(item.id) === id ? { ...item, joined: Boolean(result.joined), member_count: result.memberCount ?? item.member_count } : item));
    } catch {
      // Keep the rail usable if a membership request fails.
    } finally {
      setBusyCommunity('');
    }
  };

  const visiblePosts = tab === 'Communities'
    ? posts.filter((post) => post.communityId || post.communityName)
    : posts;

  const tabs = ['For You', 'Following', 'Communities'];

  return (
    <main className="min-h-screen w-full min-w-0 bg-transparent pb-24 text-white">
      <div className="mx-auto w-full min-w-0 max-w-[1320px] px-3 py-3 sm:px-5 sm:py-5">
        <div className="mb-2 hidden h-[60px] items-center gap-3 border-b border-[#17305e]/50 px-4 lg:flex">
          <div className="flex h-[34px] w-[54%] max-w-[440px] min-w-0 shrink-0 items-center gap-3 rounded-lg bg-[#0a1c3b] px-3">
            <FiSearch className="h-4 w-4 shrink-0 text-white/55" />
            <Link to="/explore" className="min-w-0 flex-1 truncate text-xs text-white/35">Search Emet...</Link>
          </div>
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <Link to="/notifications" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} className="relative rounded-lg p-2 text-white/65 hover:bg-white/[.05]"><FiBell />{unreadCount > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full border border-[#07132d] bg-[#d72dd9] px-1 text-[9px] font-bold leading-none text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}</Link>
            <Link to="/messages" aria-label={unreadMessages ? `Messages, ${unreadMessages} unread` : 'Messages'} className="relative rounded-lg p-2 text-white/65 hover:bg-white/[.05]"><FiMessageCircle />{unreadMessages > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full border border-[#07132d] bg-[#d72dd9] px-1 text-[9px] font-bold leading-none text-white">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}</Link>
            <Link to="/profile" className={user?.avatarUrl ? 'rounded-full' : ''}><Avatar src={user?.avatarUrl} name={user?.name} size="h-8 w-8" /></Link>
          </div>
        </div>
        <div className="grid min-w-0 justify-center gap-3 lg:grid-cols-[minmax(0,420px)_210px] xl:grid-cols-[minmax(0,520px)_260px]">
          <section className="min-w-0 space-y-2.5">
            <div className="flex items-center justify-between gap-3 px-1 pb-1 sm:px-2 lg:hidden">
              <Link to="/" aria-label="Emet home" className="flex items-center gap-2.5">
                <img src="/emet-mark.svg" alt="" className="h-8 w-8" />
              </Link>
              <div className="flex items-center gap-1">
                <Link to="/explore" aria-label="Search Emet" className="grid h-10 w-10 place-items-center rounded-full text-white/75 hover:bg-white/[.06]"><FiSearch className="h-[19px] w-[19px]" /></Link>
                <Link to="/notifications" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} className="relative grid h-10 w-10 place-items-center rounded-full text-white/75 hover:bg-white/[.06]"><FiBell className="h-[19px] w-[19px]" />{unreadCount > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full border border-[#07132d] bg-[#d72dd9] px-1 text-[9px] font-bold leading-none text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}</Link>
                <Link to="/messages" aria-label={unreadMessages ? `Messages, ${unreadMessages} unread` : 'Messages'} className="relative grid h-10 w-10 place-items-center rounded-full text-white/75 hover:bg-white/[.06]"><FiMessageCircle className="h-[19px] w-[19px]" />{unreadMessages > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full border border-[#07132d] bg-[#d72dd9] px-1 text-[9px] font-bold leading-none text-white">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}</Link>
                <Link to={user ? '/profile' : '/auth'} aria-label={user ? 'Profile' : 'Sign in'} className={user?.avatarUrl ? 'rounded-full ring-1 ring-white/15' : ''}><Avatar src={user?.avatarUrl} name={user?.name} size="h-8 w-8" /></Link>
              </div>
            </div>

            <div className="lg:hidden"><StoriesRow /></div>
            <Compose user={user} />
            <div className="hidden lg:block"><StoriesRow /></div>
            <div className="hidden overflow-hidden rounded-xl border border-[#17305e]/55 bg-[#041126] lg:block">
              <div className="grid grid-cols-3">
                {tabs.map((item) => (
                  <button key={item} type="button" onClick={() => setTab(item)} className={`relative py-3.5 text-xs font-bold ${tab === item ? 'text-white' : 'text-white/35 hover:text-white/70'}`}>
                    {item}
                    {tab === item && <span className="absolute inset-x-1/3 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#17305e]/55 bg-[#041126]">
              {error && <div className="m-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
              {loading && !posts.length ? (
                <div className="space-y-2 p-2">{[1, 2, 3].map((n) => <Skeleton key={n} className="h-40 w-full rounded-2xl" />)}</div>
              ) : visiblePosts.length ? (
                visiblePosts.map((post) => <PostCard key={post.id} post={post} user={user} onUpdate={update} />)
              ) : (
                <div className="px-6 py-16 text-center">
                  <p className="text-lg font-bold">Your timeline is quiet.</p>
                  <p className="mt-2 text-sm text-white/40">{tab === 'Communities' ? 'Join a community and start the conversation.' : tab === 'Following' ? 'Follow people and communities to build your timeline.' : 'Be the first to start a conversation.'}</p>
                  <Link to={tab === 'Communities' ? '/communities' : '/create'} className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black">{tab === 'Communities' ? 'Explore communities' : 'Create a post'}</Link>
                </div>
              )}
              {hasMore && !loading && <button type="button" onClick={() => load(false)} className="w-full border-t border-white/[.07] py-5 text-sm font-bold text-white/55 hover:bg-white/[.03] hover:text-white">Load more</button>}
              {loading && posts.length > 0 && <div className="border-t border-white/[.07] py-5 text-center text-xs text-white/30">Loading…</div>}
            </div>
          </section>

          <aside className="hidden lg:block">
            <div className="sticky top-5 space-y-3">
              <CommunityRail communities={communities} onJoin={joinCommunity} busyId={busyCommunity} />
              <SuggestedPeople posts={posts} />
              <PromoCard />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
