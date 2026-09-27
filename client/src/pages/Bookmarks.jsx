import { useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiBookmark, FiCheck, FiFolder, FiHeart, FiMessageCircle, FiPlus, FiUsers, FiVideo, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { createBookmarkCollection, fetchBookmarkCollections, fetchSavedFeed, setBookmarkCollectionItem, toggleSave } from '../utils/feed';
import { useAuth } from '../context/AuthContext';

const FILTERS = ['All', 'Posts', 'Articles', 'Videos', 'Communities'];
const STARTER_COLLECTIONS = [
  { id: 'inspiration', name: 'Inspiration', color: 'from-fuchsia-500 to-violet-600' },
  { id: 'faith', name: 'Faith', color: 'from-teal-400 to-cyan-600' },
  { id: 'leadership', name: 'Leadership', color: 'from-amber-300 to-orange-500' },
  { id: 'growth', name: 'Growth', color: 'from-sky-400 to-blue-600' },
  { id: 'community', name: 'Community', color: 'from-indigo-500 to-fuchsia-600' },
  { id: 'ideas', name: 'Ideas', color: 'from-violet-400 to-purple-700' },
];
const isVideo = (post) => Boolean(post.videoId || post.type === 'video' || post.type === 'reel' || post.mediaType === 'video');
const isArticle = (post) => Boolean(post.isArticle || post.type === 'article' || post.contentType === 'article' || post.category === 'article');
const isCommunity = (post) => Boolean(post.communityId || post.communityName || post.community || post.authorType === 'community');
const postKind = (post) => isVideo(post) ? 'Video' : isArticle(post) ? 'Article' : isCommunity(post) ? 'Community' : 'Post';

export default function Bookmarks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [activeCollection, setActiveCollection] = useState('');
  const [collectionData, setCollectionData] = useState({ collections: [], memberships: {} });
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [assigningPost, setAssigningPost] = useState('');
  const storageKey = `emet-bookmark-collections:${String(user?.email || 'guest').toLowerCase()}`;
  const migrationKey = `emet-bookmark-collections-migrated:${String(user?.email || 'guest').toLowerCase()}`;

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [result, initialCollections] = await Promise.all([
        fetchSavedFeed({ limit: 50 }),
        fetchBookmarkCollections(),
      ]);
      setPosts(result.posts || []);
      let synced = initialCollections;
      let migrationDone = false;
      try { migrationDone = localStorage.getItem(migrationKey) === '1'; } catch {}
      if (!migrationDone) {
        try {
          const legacy = JSON.parse(localStorage.getItem(storageKey) || '{}');
          const oldCollections = Array.isArray(legacy.collections) ? legacy.collections : [];
          if (oldCollections.length || Object.keys(legacy.memberships || {}).length) {
            const idMap = new Map();
            for (const oldCollection of oldCollections) {
              let match = synced.collections.find((item) => item.name.toLowerCase() === String(oldCollection.name || '').toLowerCase());
              if (!match && oldCollection.name) {
                try { match = await createBookmarkCollection(oldCollection.name); } catch {}
              }
              if (match) idMap.set(String(oldCollection.id), String(match.id));
            }
            const remoteByName = new Map(synced.collections.map((item) => [item.name.toLowerCase(), String(item.id)]));
            for (const [postId, oldIds] of Object.entries(legacy.memberships || {})) {
              for (const oldId of Array.isArray(oldIds) ? oldIds : []) {
                let collectionId = idMap.get(String(oldId));
                if (!collectionId) {
                  const oldCollection = oldCollections.find((item) => String(item.id) === String(oldId));
                  collectionId = oldCollection ? remoteByName.get(String(oldCollection.name).toLowerCase()) : '';
                }
                if (collectionId) await setBookmarkCollectionItem(collectionId, postId, true).catch(() => {});
              }
            }
            synced = await fetchBookmarkCollections();
          }
          try { localStorage.setItem(migrationKey, '1'); } catch {}
        } catch {}
      }
      setCollectionData(synced);
    } catch (err) { setError(err?.message || 'Unable to load your bookmarks.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (user) load(); else setLoading(false); }, [user, storageKey]);

  const categories = useMemo(() => ({
    All: posts.length,
    Posts: posts.filter((post) => !isArticle(post) && !isVideo(post) && !isCommunity(post)).length,
    Articles: posts.filter(isArticle).length,
    Videos: posts.filter(isVideo).length,
    Communities: posts.filter(isCommunity).length,
  }), [posts]);

  const visiblePosts = useMemo(() => {
    let result = posts;
    if (activeCollection) result = result.filter((post) => (collectionData.memberships[String(post.id)] || []).includes(activeCollection));
    else if (filter === 'Posts') result = result.filter((post) => !isArticle(post) && !isVideo(post) && !isCommunity(post));
    else if (filter === 'Articles') result = result.filter(isArticle);
    else if (filter === 'Videos') result = result.filter(isVideo);
    else if (filter === 'Communities') result = result.filter(isCommunity);
    return result;
  }, [posts, filter, activeCollection, collectionData.memberships]);

  const remove = async (id) => {
    try {
      await toggleSave(id);
      const memberships = collectionData.memberships[String(id)] || [];
      await Promise.all(memberships.map((collectionId) => setBookmarkCollectionItem(collectionId, id, false).catch(() => {})));
      setPosts((current) => current.filter((post) => post.id !== id));
      setCollectionData(await fetchBookmarkCollections());
    } catch (err) { setError(err?.message || 'Unable to remove bookmark.'); }
  };

  const createCollection = async (event) => {
    event.preventDefault();
    const name = collectionName.trim();
    if (!name) return;
    try {
      await createBookmarkCollection(name);
      setCollectionData(await fetchBookmarkCollections());
      setCollectionName('');
      setNewCollectionOpen(false);
    } catch (err) { setError(err?.message || 'Unable to create your collection.'); }
  };

  const toggleCollection = async (postId, collectionId) => {
    const ids = collectionData.memberships[String(postId)] || [];
    try {
      await setBookmarkCollectionItem(collectionId, postId, !ids.includes(collectionId));
      setCollectionData(await fetchBookmarkCollections());
    } catch (err) { setError(err?.message || 'Unable to update this collection.'); }
  };

  const savedCount = (collectionId) => posts.filter((post) => (collectionData.memberships[String(post.id)] || []).includes(collectionId)).length;

  if (!user) return <main className="grid min-h-[70vh] place-items-center px-6 text-center text-white"><div><FiBookmark className="mx-auto h-10 w-10 text-cyan-300" /><h1 className="mt-4 text-xl font-bold">Sign in to see your bookmarks</h1><p className="mt-2 text-sm text-white/45">Save posts and come back to them anytime.</p><button onClick={() => navigate('/auth')} className="mt-5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#061126]">Sign in</button></div></main>;

  return <main className="min-h-screen pb-28 text-white">
    <div className="mx-auto max-w-[1180px] px-3 py-4 sm:px-5 sm:py-6 xl:px-7">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_270px] xl:grid-cols-[minmax(0,1fr)_290px]">
        <section className="min-w-0">
          <header className="flex items-start gap-3 pb-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-fuchsia-500 shadow-lg"><FiBookmark className="h-6 w-6 fill-current" /></span>
            <div><h1 className="text-2xl font-extrabold tracking-tight">Bookmarks</h1><p className="mt-1 text-xs text-[#a9c3ec] sm:text-sm">Your saved posts, videos and conversations — all in one place.</p></div>
          </header>

          <nav className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((item) => <button key={item} onClick={() => { setFilter(item); setActiveCollection(''); }} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${filter === item && !activeCollection ? 'border-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-white shadow-[0_4px_16px_rgba(108,77,255,.25)]' : 'border-[#1d3d73] bg-[#04132b]/80 text-white/70 hover:border-cyan-400/60 hover:text-white'}`}>{item}{item === 'All' ? '' : <span className="ml-1.5 text-[10px] opacity-65">{categories[item]}</span>}</button>)}
          </nav>

          {error && <div className="mb-4 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
          {loading ? <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl border border-[#17386f]/60 bg-[#041126]/80" />)}</div> : visiblePosts.length ? <div className="space-y-3">
            {visiblePosts.map((post) => <article key={post.id} className="overflow-visible rounded-2xl border border-[#17386f]/70 bg-[#031126]/95 shadow-[0_10px_28px_rgba(0,0,0,.16)]">
              <div className="flex items-center gap-3 px-4 pt-4">
                <button onClick={() => navigate('/u/' + encodeURIComponent(post.authorEmail || post.author_email || ''))} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-cyan-400/40 bg-[#102650] text-sm font-bold">{post.avatarUrl ? <img src={post.avatarUrl} alt="" className="h-full w-full object-cover" /> : String(post.author || 'E').slice(0,1).toUpperCase()}</button>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{post.author || 'Emet member'} <span className="text-sky-400">✓</span></p><p className="text-[10px] text-white/45">{post.time || post.createdAt || 'Saved post'} · <span className="text-cyan-200/80">{postKind(post)}</span></p></div>
                <button onClick={() => remove(post.id)} aria-label="Remove bookmark" title="Remove bookmark" className="grid h-9 w-9 place-items-center rounded-full text-fuchsia-300 hover:bg-white/[.06]"><FiBookmark className="h-5 w-5 fill-current" /></button>
              </div>
              <button onClick={() => navigate('/post/' + encodeURIComponent(post.id))} className="block w-full text-left">
                {post.title && <h2 className="px-4 pt-3 text-sm font-bold text-white">{post.title}</h2>}
                <p className="whitespace-pre-wrap px-4 pt-2 text-sm leading-5 text-white/85">{post.body || (post.videoId ? 'Saved video' : 'Saved content')}</p>
                {post.videoId ? <div className="relative mx-3 mt-3 overflow-hidden rounded-xl bg-[#102650]"><div className="aspect-video bg-gradient-to-br from-[#12356b] to-[#20145c]" /><span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full border border-white/55 bg-black/35 text-white"><FiVideo /></span></span></div> : post.mediaUrl && <img src={post.mediaUrl} alt="" className="mx-3 mt-3 max-h-[420px] w-[calc(100%-1.5rem)] rounded-xl object-cover" />}
              </button>
              {assigningPost === String(post.id) && <div className="mx-3 mt-2 rounded-xl border border-[#23467f] bg-[#081a36] p-3">
                <div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-bold text-white/80">Add to collection</p><button onClick={() => setAssigningPost('')} aria-label="Close collection picker" className="text-white/50"><FiX /></button></div>
                {collectionData.collections.length ? collectionData.collections.map((collection) => {
                  const checked = (collectionData.memberships[String(post.id)] || []).includes(collection.id);
                  return <button key={collection.id} onClick={() => toggleCollection(post.id, collection.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-white/75 hover:bg-white/[.05]"><span className={`grid h-4 w-4 place-items-center rounded border ${checked ? 'border-cyan-300 bg-cyan-400 text-[#061126]' : 'border-white/30'}`}>{checked && <FiCheck className="h-3 w-3" />}</span>{collection.name}</button>;
                }) : <p className="text-xs text-white/45">Create a collection first.</p>}
              </div>}
              <div className="flex items-center gap-4 border-t border-white/[.06] px-4 py-3 text-xs text-white/60">
                <span className="inline-flex items-center gap-1.5"><FiHeart className="text-fuchsia-400" />{post.likeCount || 0}</span>
                <span className="inline-flex items-center gap-1.5"><FiMessageCircle />{post.commentCount || 0}</span>
                <button onClick={() => setAssigningPost((current) => current === String(post.id) ? '' : String(post.id))} className="inline-flex items-center gap-1.5 text-white/60 hover:text-cyan-300"><FiFolder />Collection</button>
                <button onClick={() => navigate('/post/' + encodeURIComponent(post.id))} className="ml-auto inline-flex items-center gap-1 font-semibold text-cyan-200 hover:text-white">Open <FiArrowRight /></button>
              </div>
            </article>)}
          </div> : <div className="rounded-2xl border border-dashed border-[#23467f] bg-[#041126]/80 px-6 py-16 text-center"><FiBookmark className="mx-auto h-8 w-8 text-cyan-300/60" /><p className="mt-4 font-semibold text-white/75">{activeCollection ? 'Nothing in this collection yet' : filter === 'All' ? 'Nothing saved yet' : `No saved ${filter.toLowerCase()} yet`}</p><p className="mt-1 text-sm text-white/40">Tap the bookmark on any Feed post to save it here.</p><button onClick={() => navigate('/feed')} className="mt-5 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-5 py-2.5 text-xs font-bold">Explore Feed</button></div>}
        </section>

        <aside className="hidden space-y-3 lg:block">
          <section className="rounded-2xl border border-[#17386f]/70 bg-[#031126]/95 p-4">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Collections</h2><button onClick={() => setNewCollectionOpen(true)} className="inline-flex items-center gap-1 rounded-full border border-[#31589b] px-2.5 py-1.5 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-400/10"><FiPlus />New</button></div>
            <div className="mt-3 space-y-1">
              {collectionData.collections.map((collection, index) => {
                const color = STARTER_COLLECTIONS[index % STARTER_COLLECTIONS.length].color;
                const selected = activeCollection === collection.id;
                return <button key={collection.id} onClick={() => { setActiveCollection(selected ? '' : collection.id); setFilter('All'); }} className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition ${selected ? 'bg-[#102956]' : 'hover:bg-white/[.04]'}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${color}`}><FiFolder className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{collection.name}</span><span className="block text-[10px] text-white/45">{savedCount(collection.id)} saved</span></span><FiArrowRight className="h-4 w-4 text-white/55" /></button>;
              })}
              {!collectionData.collections.length && <p className="py-4 text-center text-xs text-white/45">Create collections to organize saved posts.</p>}
            </div>
          </section>
          <section className="rounded-2xl border border-[#17386f]/70 bg-[#031126]/95 p-4">
            <h2 className="text-sm font-bold">Quick Links</h2>
            <div className="mt-3 space-y-1">
              {[['Videos', FiVideo], ['Articles', FiBookmark], ['Communities', FiUsers]].map(([label, Icon]) => <button key={label} onClick={() => { setFilter(label); setActiveCollection(''); }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs text-white/70 hover:bg-white/[.04] hover:text-white"><span className="grid h-8 w-8 place-items-center rounded-lg border border-fuchsia-400/50 text-fuchsia-200"><Icon /></span><span className="flex-1">Saved {label}</span><span className="text-[10px] text-white/45">{categories[label]}</span></button>)}
            </div>
          </section>
          <section className="overflow-hidden rounded-2xl border border-[#324ab5]/60 bg-gradient-to-br from-[#08276d] via-[#24117a] to-[#4a0f87] p-5">
            <FiBookmark className="h-7 w-7 text-cyan-300" /><h2 className="mt-3 text-lg font-bold leading-tight">Great minds<br />save great things.</h2><p className="mt-2 text-xs leading-5 text-white/75">Your bookmarks are a reflection of what matters to you.</p><div className="mt-4 h-1 rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400" />
          </section>
        </aside>
      </div>
    </div>

    {newCollectionOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" onClick={() => setNewCollectionOpen(false)}>
      <form onSubmit={createCollection} onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-[#244782] bg-[#061329] p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">New Collection</h2><button type="button" onClick={() => setNewCollectionOpen(false)} className="text-white/55"><FiX /></button></div>
        <label className="mt-4 block text-xs font-semibold text-white/70">Collection name<input autoFocus value={collectionName} onChange={(event) => setCollectionName(event.target.value)} maxLength={40} placeholder="e.g. Inspiration" className="mt-2 w-full rounded-xl border border-[#244782] bg-[#081a36] px-3 py-3 text-sm text-white outline-none focus:border-cyan-400" /></label>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setNewCollectionOpen(false)} className="rounded-full px-4 py-2 text-xs text-white/60 hover:bg-white/[.05]">Cancel</button><button type="submit" disabled={!collectionName.trim()} className="rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-xs font-bold disabled:opacity-40">Create collection</button></div>
      </form>
    </div>}
  </main>;
}
