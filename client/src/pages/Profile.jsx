import { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiCamera, FiEdit3, FiGrid, FiHeart, FiLink, FiMapPin, FiMessageCircle, FiMoreHorizontal, FiShare2, FiUsers, FiVideo } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchFeed, fetchUserProfile, toggleFollow, updateUserProfile } from '../utils/feed';

const TABS = ['Posts', 'Replies', 'Media', 'Likes'];

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
    return <main className="grid min-h-[70vh] place-items-center bg-[#0B0F14] px-6 text-center text-white"><div><h1 className="text-xl font-bold">Sign in to view your profile</h1><p className="mt-2 text-sm text-white/45">Your profile, posts and connections live here.</p><button onClick={() => navigate('/auth')} className="mt-5 rounded-xl bg-[#1D9BF0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1A8CD8]">Sign in</button></div></main>;
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
  return <main className="min-h-screen bg-[#0B0F14] pb-28 text-white">
    <div className="mx-auto max-w-4xl">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#0B0F14]/90 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/[.06]" aria-label="Back"><FiArrowLeft /></button>
        <div className="text-center"><p className="text-sm font-bold">{name}</p><p className="text-[10px] text-white/40">{posts.length} posts</p></div>
        <button className="grid h-9 w-9 place-items-center rounded-xl text-white/60 hover:bg-white/[.06]" aria-label="More"><FiMoreHorizontal /></button>
      </header>

      <section className="border-b border-white/10">
        <div className="relative h-36 bg-[#11161D] sm:h-48">
          {profile?.coverUrl ? <img src={profile.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-r from-[#0B0F14] via-[#17243A] to-[#0B0F14]" />}
          {!isPublic && <button onClick={() => setEditing(true)} className="absolute right-4 top-4 rounded-xl bg-black/50 p-2.5 backdrop-blur" aria-label="Edit cover"><FiCamera /></button>}
          <div className="absolute -bottom-12 left-5 h-24 w-24 overflow-hidden rounded-full border-4 border-[#0B0F14] bg-[#11161D] sm:left-8 sm:h-28 sm:w-28">
            {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-3xl font-black text-white/70">{initials}</div>}
          </div>
        </div>
        <div className="px-5 pb-5 pt-16 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-black">{name}</h1>
              <p className="text-sm text-white/45">@{username}</p>
              {profile?.bio && <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-white/80">{profile.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/45">
                {profile?.location && <span className="inline-flex items-center gap-1"><FiMapPin />{profile.location}</span>}
                {profile?.website && <a href={profile.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1D9BF0]"><FiLink />{profile.website.replace(/^https?:\/\//, '')}</a>}
                {profile?.pronouns && <span>{profile.pronouns}</span>}
                {profile?.chapter && <span>{profile.chapter}</span>}
              </div>
            </div>
            <div className="shrink-0">
              {isPublic ? <button onClick={doFollow} disabled={followBusy} className={following ? 'rounded-xl border border-white/15 bg-white/[.05] px-5 py-2.5 text-sm font-semibold hover:border-[#1D9BF0]/40 hover:bg-white/[.08]' : 'rounded-xl bg-[#1D9BF0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1A8CD8]'}>{followBusy ? '…' : following ? 'Following' : 'Follow'}</button> : <button onClick={() => setEditing(true)} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold hover:border-[#1D9BF0]/40 hover:bg-white/[.05]"><FiEdit3 className="mr-2 inline" />Edit profile</button>}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-5 text-sm"><span><b>{profile?.followingCount || 0}</b> <span className="text-white/45">Following</span></span><span><b>{profile?.followerCount || 0}</b> <span className="text-white/45">Followers</span></span><span><b>{profile?.postCount || posts.length}</b> <span className="text-white/45">Posts</span></span></div>
        </div>
      </section>

      <nav className="sticky top-[57px] z-20 border-b border-white/10 bg-[#0B0F14]/95">
        <div className="grid grid-cols-4">{TABS.map(t => <button key={t} onClick={() => setTab(t)} className="relative py-4 text-sm font-bold text-white/45 hover:text-white">{t}{tab === t && <span className="absolute inset-x-1/3 bottom-0 h-1 rounded-full bg-[#1D9BF0]" />}</button>)}</div>
      </nav>

      {error && <div className="mx-5 mt-4 rounded-xl border border-[#1D9BF0]/30 bg-[#1D9BF0]/10 p-3 text-sm text-white">{error}</div>}
      <section className="p-4 sm:p-6">
        {tab === 'Replies' ? <div className="rounded-2xl border border-white/10 bg-white/[.02] p-8 text-center text-sm text-white/45"><FiMessageCircle className="mx-auto mb-3 h-7 w-7" />Replies are coming from your conversations.</div> : visiblePosts.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{visiblePosts.map(post => <button key={post.id} onClick={() => navigate('/post/' + encodeURIComponent(post.id))} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/[.03] text-left">{post.mediaUrl ? <img src={post.mediaUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full flex-col justify-end p-4"><p className="line-clamp-6 text-sm font-semibold text-white/80">{post.body || post.title || 'Post'}</p></div>}{post.videoId && <span className="absolute right-2 top-2 rounded-full bg-black/60 p-2"><FiVideo /></span>}</button>)}</div> : <div className="py-20 text-center text-sm text-white/40"><FiGrid className="mx-auto mb-3 h-8 w-8" />Nothing here yet.</div>}
      </section>

      {!isPublic && <button onClick={async () => { await logout(); navigate('/'); }} className="mx-5 mb-8 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/[.05]">Sign out</button>}
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
      <div className="mt-6 flex justify-end gap-2"><button onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/[.05]">Cancel</button><button onClick={onSave} disabled={saving} className="rounded-xl bg-[#1D9BF0] px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-[#1A8CD8]">{saving ? 'Saving…' : 'Save'}</button></div>
    </div>
  </div>;
}
