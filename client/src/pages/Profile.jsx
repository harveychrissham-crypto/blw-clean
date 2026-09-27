import { useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiCamera, FiCalendar, FiCheck, FiEdit3, FiGrid, FiHeart, FiImage, FiLink, FiMapPin, FiMessageCircle, FiMoreHorizontal, FiPlus, FiUsers, FiVideo } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchFeed, fetchUserProfile, toggleFollow, updateUserProfile } from '../utils/feed';

const TABS = ['Posts', 'About', 'Communities', 'Photos', 'Videos', 'Reels'];

export default function Profile() {
  const { user, logout } = useAuth();
  const { email: profileEmail } = useParams();
  const navigate = useNavigate();
  const isPublic = Boolean(profileEmail);
  const targetEmail = String(profileEmail || user?.email || '').toLowerCase();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState('Posts');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!targetEmail) return;
    try {
      const [details, feed] = await Promise.all([
        fetchUserProfile(targetEmail),
        fetchFeed({ limit: 80, offset: 0 }),
      ]);
      setProfile(details);
      setFollowing(Boolean(details?.following));
      const mine = (feed?.posts || []).filter((p) => String(p.authorEmail || p.author_email || p.user_email || '').toLowerCase() === targetEmail);
      setPosts(mine);
      setDraft({
        name: details?.name || user?.name || '',
        username: details?.username || '',
        bio: details?.bio || '',
        location: details?.location || '',
        website: details?.website || '',
        pronouns: details?.pronouns || '',
        avatarUrl: details?.avatarUrl || user?.avatarUrl || '',
        coverUrl: details?.coverUrl || '',
      });
    } catch (e) {
      setError(e?.message || 'Unable to load this profile.');
    }
  };

  useEffect(() => { let alive = true; load().catch(() => {}); return () => { alive = false; }; }, [targetEmail]);

  if (!user && !isPublic) {
    return <main className="grid min-h-[70vh] place-items-center bg-[#0B0F14] px-6 text-center text-white"><div><h1 className="text-xl font-bold">Sign in to view your profile</h1><p className="mt-2 text-sm text-white/45">Your profile, posts and connections live here.</p><button onClick={() => navigate('/auth')} className="mt-5 rounded-xl bg-[#E7E9EA] text-[#0B0F14] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#D9DDE1]">Sign in</button></div></main>;
  }

  const name = profile?.name || user?.name || targetEmail.split('@')[0] || 'Emet member';
  const username = profile?.username || targetEmail.split('@')[0].replace(/[^A-Za-z0-9_]/g, '_').slice(0, 30);
  const mediaPosts = posts.filter((p) => p.mediaUrl || p.videoId);
  const likedPosts = posts.filter((p) => p.liked);
  const replyPosts = posts.filter((p) => Number(p.commentCount || 0) > 0);
  const visiblePosts = tab === 'Media' ? mediaPosts : tab === 'Likes' ? likedPosts : posts;

  const saveProfile = async () => {
    setSaving(true); setError('');
    try {
      const saved = await updateUserProfile(draft);
      setProfile(saved);
      setEditing(false);
      setDraft((d) => ({ ...d, ...saved }));
    } catch (e) { setError(e?.message || 'Unable to save your profile.'); } finally { setSaving(false); }
  };

  const doFollow = async () => {
    if (!user) return navigate('/auth');
    setFollowBusy(true);
    try {
      const result = await toggleFollow(targetEmail);
      setFollowing(Boolean(result?.following));
      setProfile((p) => p ? { ...p, following: Boolean(result?.following), followerCount: Math.max(0, Number(p.followerCount || 0) + (result?.following ? 1 : -1)) } : p);
    } catch (e) { setError(e?.message || 'Unable to update follow status.'); } finally { setFollowBusy(false); }
  };

  const initials = name.slice(0, 1).toUpperCase();
  const photos = posts.filter((post) => post.mediaUrl && !post.videoId && post.type !== 'reel');
  const videos = posts.filter((post) => post.videoId || post.type === 'video');
  const reels = posts.filter((post) => post.type === 'reel');
  const location = profile?.location || profile?.city || '';
  const joined = profile?.joinedAt || profile?.createdAt || profile?.created_at;
  const joinedLabel = joined ? new Date(joined).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
  const coverImage = profile?.coverUrl || photos[0]?.mediaUrl || '';
  const profileBio = profile?.bio || profile?.about || '';
  const openPost = (post) => navigate('/post/' + encodeURIComponent(post.id));

  return <main className="min-h-screen w-full pb-28 text-white">
    <div className="mx-auto max-w-[1320px] px-3 sm:px-5 xl:px-7">
      <section className="overflow-hidden rounded-b-2xl border-x border-b border-[#17386f]/70 bg-[#020b1d]/85 shadow-[0_20px_70px_rgba(0,0,0,.22)]">
        <div className="relative h-36 overflow-hidden sm:h-48 lg:h-56">
          {coverImage ? <img src={coverImage} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[radial-gradient(ellipse_at_78%_12%,rgba(252,142,160,.86),transparent_24%),linear-gradient(160deg,#253e82_0%,#602e9a_42%,#f09b7d_60%,#0d2859_100%)]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020b1d]/80 via-transparent to-black/10" />
          {!isPublic && <button onClick={() => setEditing(true)} className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#061126]/85 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur hover:bg-[#10244a]" aria-label="Edit cover"><FiCamera /> Edit Cover</button>}
        </div>
        <div className="relative px-4 pb-5 sm:px-7 lg:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:gap-5">
            <div className="relative h-24 w-24 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-fuchsia-500 p-[3px] sm:h-32 sm:w-32">
              <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-[#020b1d] bg-[#0b1730]">
                {profile?.avatarUrl || user?.avatarUrl ? <img src={profile?.avatarUrl || user?.avatarUrl} alt={name} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-3xl font-black text-white/75">{initials}</div>}
              </div>
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-[#020b1d] bg-emerald-400" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:pb-1">
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-xl font-extrabold sm:text-2xl">{name}<span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-sky-500 text-white"><FiCheck className="h-3 w-3" /></span></h1>
                <p className="mt-0.5 text-sm text-[#a9c3ec]">@{username}</p>
                {profileBio && <p className="mt-2 max-w-xl text-sm text-white/80">{profileBio}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isPublic ? <>
                  <button onClick={() => navigate('/messages')} className="rounded-full border border-[#5c83cf] px-4 py-2 text-xs font-semibold hover:bg-white/[.06]"><FiMessageCircle className="mr-1.5 inline" />Message</button>
                  <button onClick={doFollow} disabled={followBusy} className="rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-5 py-2 text-xs font-bold text-white shadow-lg disabled:opacity-50">{followBusy ? '…' : following ? 'Following' : 'Follow'}</button>
                </> : <>
                  <button onClick={() => setEditing(true)} className="rounded-full border border-[#6a8fd4] px-4 py-2 text-xs font-semibold hover:bg-white/[.06]"><FiEdit3 className="mr-1.5 inline" />Edit Profile</button>
                  <button onClick={() => navigate('/messages')} className="rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-xs font-bold">Message</button>
                  <button aria-label="More profile options" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/75 hover:bg-white/[.06]"><FiMoreHorizontal /></button>
                </>}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#bed0ef] sm:pl-1">
            {location && <span className="inline-flex items-center gap-1.5"><FiMapPin className="text-cyan-300" />{location}</span>}
            {joinedLabel && <span className="inline-flex items-center gap-1.5"><FiCalendar className="text-cyan-300" />Joined {joinedLabel}</span>}
            <span><b className="text-white">{Number(profile?.followerCount || 0).toLocaleString()}</b> Followers</span>
            <span><b className="text-white">{Number(profile?.followingCount || 0).toLocaleString()}</b> Following</span>
          </div>
        </div>
      </section>

      <nav className="sticky top-[52px] z-20 mt-4 overflow-x-auto border-b border-[#17386f]/70 bg-[#020b1d]/95 backdrop-blur-xl">
        <div className="flex min-w-max items-center gap-1 sm:gap-4">{TABS.map((item) => <button key={item} onClick={() => setTab(item)} className={`relative min-w-[72px] px-3 py-3 text-xs font-semibold transition ${tab === item ? 'text-fuchsia-300' : 'text-white/55 hover:text-white'}`}>{item}{tab === item && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />}</button>)}</div>
      </nav>

      {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0">
          {tab === 'Posts' && <>
            {!isPublic && <button onClick={() => navigate('/create')} className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-[#17386f]/75 bg-[#06152c]/90 p-3.5 text-left shadow-lg hover:border-cyan-500/50">
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#142950] text-sm font-bold">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}</span>
              <span className="min-w-0 flex-1 text-sm text-white/55">What’s on your mind?</span><FiImage className="h-5 w-5 text-white/70" /><FiVideo className="ml-1 h-5 w-5 text-white/70" /><span className="grid h-8 w-8 place-items-center rounded-full border border-white/20"><FiPlus /></span>
            </button>}
            {visiblePosts.length ? <div className="space-y-4">{visiblePosts.map((post) => <article key={post.id} className="overflow-hidden rounded-2xl border border-[#17386f]/75 bg-[#041126]/95 shadow-lg">
              <div className="flex items-center gap-3 px-4 pt-4">
                <div className="h-10 w-10 overflow-hidden rounded-full border border-cyan-400/60 bg-[#122348]">{profile?.avatarUrl || user?.avatarUrl ? <img src={profile?.avatarUrl || user?.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-sm font-bold">{initials}</span>}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{name} <span className="text-sky-400">✓</span></p><p className="text-[10px] text-white/45">{post.createdAt || post.created_at || 'On Emet'} · <FiUsers className="inline h-3 w-3" /></p></div>
                <button aria-label="Post options" className="text-white/55"><FiMoreHorizontal /></button>
              </div>
              {(post.body || post.title) && <p className="px-4 pb-3 pt-3 text-sm leading-6 text-white/90">{post.body || post.title}</p>}
              {post.mediaUrl && <button onClick={() => openPost(post)} className="block max-h-[420px] w-full overflow-hidden bg-black/20"><img src={post.mediaUrl} alt="" className="max-h-[420px] w-full object-cover" /></button>}
              <div className="flex items-center gap-5 border-t border-white/[.06] px-4 py-3 text-xs text-white/60"><span className="inline-flex items-center gap-1.5"><FiHeart className="text-fuchsia-400" />{Number(post.likeCount || 0)}</span><span className="inline-flex items-center gap-1.5"><FiMessageCircle />{Number(post.commentCount || 0)}</span><button onClick={() => openPost(post)} className="ml-auto text-white/50 hover:text-cyan-300">View conversation <FiArrowRight className="ml-1 inline" /></button></div>
            </article>)}</div> : <div className="rounded-2xl border border-[#17386f]/65 bg-[#041126]/80 px-5 py-14 text-center"><FiGrid className="mx-auto h-8 w-8 text-cyan-300/70" /><p className="mt-3 text-sm font-semibold text-white/75">No posts yet</p><p className="mt-1 text-xs text-white/40">{isPublic ? 'This member has not posted yet.' : 'Share your first conversation on Emet.'}</p></div>}
          </>}

          {tab === 'About' && <div className="rounded-2xl border border-[#17386f]/75 bg-[#041126]/95 p-5"><h2 className="text-base font-bold">About {isPublic ? name : 'Me'}</h2>{profileBio ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/75">{profileBio}</p> : <p className="mt-3 text-sm text-white/45">Add a short introduction so people can get to know you.</p>}<div className="mt-5 space-y-3 text-sm text-white/65">{location && <p><FiMapPin className="mr-2 inline text-cyan-300" />{location}</p>}{profile?.website && <a href={profile.website} target="_blank" rel="noreferrer" className="block text-cyan-300"><FiLink className="mr-2 inline" />{profile.website.replace(/^https?:\/\//, '')}</a>}{profile?.chapter && <p><FiUsers className="mr-2 inline text-cyan-300" />{profile.chapter}</p>}</div>{!isPublic && <button onClick={() => setEditing(true)} className="mt-5 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold hover:bg-white/[.05]">Edit details</button>}</div>}

          {tab === 'Communities' && <div className="rounded-2xl border border-[#17386f]/75 bg-[#041126]/95 p-5"><div className="flex items-center justify-between"><h2 className="text-base font-bold">Communities</h2><button onClick={() => navigate('/communities')} className="text-xs font-semibold text-cyan-300">Explore all <FiArrowRight className="ml-1 inline" /></button></div>{profile?.chapter || user?.chapter ? <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/[.035] p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600"><FiUsers /></span><span><span className="block text-sm font-semibold">{profile?.chapter || user?.chapter}</span><span className="text-[11px] text-white/45">Community</span></span></div> : <p className="mt-4 text-sm text-white/50">Explore communities and join conversations that matter to you.</p>}</div>}

          {(tab === 'Photos' || tab === 'Videos' || tab === 'Reels') && (() => { const items = tab === 'Photos' ? photos : tab === 'Videos' ? videos : reels; return items.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((post) => <button key={post.id} onClick={() => openPost(post)} className="group relative aspect-square overflow-hidden rounded-xl border border-[#17386f]/60 bg-[#06152c]">{post.mediaUrl ? <img src={post.mediaUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="grid h-full place-items-center"><FiVideo className="h-8 w-8 text-white/40" /></div>}{(tab === 'Videos' || tab === 'Reels') && <span className="absolute right-2 top-2 rounded-full bg-black/60 p-2"><FiVideo className="h-4 w-4" /></span>}</button>)}</div> : <div className="rounded-2xl border border-[#17386f]/65 bg-[#041126]/80 px-5 py-14 text-center text-sm text-white/45">No {tab.toLowerCase()} shared yet.</div>; })()}
        </section>

        <aside className="hidden space-y-3 lg:block">
          <section className="rounded-2xl border border-[#17386f]/75 bg-[#041126]/95 p-4">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold">About Me</h2>{!isPublic && <button onClick={() => setEditing(true)} aria-label="Edit about me" className="text-white/60 hover:text-cyan-300"><FiEdit3 /></button>}</div>
            <p className="mt-2 text-xs leading-[1.6] text-white/70">{profileBio || 'Share a little about your story, interests, and what matters to you.'}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{[profile?.chapter, profile?.title, location].filter(Boolean).slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#0b2c64] px-2.5 py-1 text-[9px] text-cyan-100">{tag}</span>)}</div>
          </section>
          <section className="rounded-2xl border border-[#17386f]/75 bg-[#041126]/95 p-4">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Photos</h2><button onClick={() => setTab('Photos')} className="text-[10px] font-semibold text-cyan-300">See all</button></div>
            {photos.length ? <div className="mt-3 grid grid-cols-3 gap-1.5">{photos.slice(0, 6).map((post) => <button key={post.id} onClick={() => openPost(post)} className="aspect-square overflow-hidden rounded-md bg-white/5"><img src={post.mediaUrl} alt="" className="h-full w-full object-cover" /></button>)}</div> : <p className="mt-3 text-xs text-white/40">Photos shared on Emet will appear here.</p>}
          </section>
          <section className="rounded-2xl border border-[#17386f]/75 bg-[#041126]/95 p-4">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Communities</h2><button onClick={() => navigate('/communities')} className="text-[10px] font-semibold text-cyan-300">See all</button></div>
            {profile?.chapter || user?.chapter ? <div className="mt-3 flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600"><FiUsers /></span><span className="text-xs font-semibold">{profile?.chapter || user?.chapter}</span></div> : <p className="mt-3 text-xs text-white/40">Join a community to see it here.</p>}
          </section>
          <section className="rounded-2xl border border-[#17386f]/75 bg-gradient-to-br from-[#0e2471] via-[#26127f] to-[#46108a] p-4">
            <FiUsers className="h-6 w-6 text-cyan-300" /><h2 className="mt-3 text-sm font-bold">More than a platform.<br /><span className="text-fuchsia-300">A movement.</span></h2><button onClick={() => navigate('/communities')} className="mt-3 grid h-8 w-8 place-items-center rounded-full bg-white/15"><FiArrowRight /></button>
          </section>
        </aside>
      </div>

      {!isPublic && <div className="mt-6"><button onClick={async () => { await logout(); navigate('/'); }} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/55 hover:bg-white/[.05]">Sign out</button></div>}
      <EditProfileModal open={editing} draft={draft} setDraft={setDraft} saving={saving} onClose={() => setEditing(false)} onSave={saveProfile} />
    </div>
  </main>;
}

function EditProfileModal({ open, draft, setDraft, saving, onClose, onSave }) {
  if (!open) return null;
  const field = (key, label, placeholder) => <label className="block"><span className="mb-1.5 block text-xs font-bold text-white/60">{label}</span><input value={draft[key] || ''} onChange={e => setDraft(v => ({ ...v, [key]: e.target.value }))} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-[#11161D] px-3 py-3 text-sm outline-none focus:border-[#1D9BF0]" /></label>;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" onClick={onClose}>
    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0B0F14] p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between"><h2 className="text-lg font-black">Edit profile</h2><button onClick={onClose} className="rounded-xl px-3 py-1 text-white/50 hover:bg-white/[.06]">✕</button></div>
      <div className="mt-5 space-y-4">{field('name','Name','Your name')}{field('username','Username','your_username')}{field('bio','Bio','Tell people about yourself')}{field('location','Location','City or region')}{field('website','Website','https://example.com')}{field('pronouns','Pronouns','Optional')}{field('avatarUrl','Profile photo URL','https://…')}{field('coverUrl','Cover photo URL','https://…')}</div>
      <div className="mt-6 flex justify-end gap-2"><button onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/[.05]">Cancel</button><button onClick={onSave} disabled={saving} className="rounded-xl bg-[#E7E9EA] text-[#0B0F14] px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-[#D9DDE1]">{saving ? 'Saving…' : 'Save'}</button></div>
    </div>
  </div>;
}
