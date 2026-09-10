import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FiHome, FiGrid, FiUser, FiPlusSquare, FiMessageCircle, FiX, FiLoader, FiImage, FiFilm } from 'react-icons/fi';
import { createFeedPost } from '../utils/feed';
import { hapticError, hapticSuccess } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { name: 'Home', path: '/', icon: FiHome, end: true },
  { name: 'Feed', path: '/feed', icon: FiGrid },
  { name: 'Messages', path: '/messages', icon: FiMessageCircle },
];

export default function BottomNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('post');
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const publish = async (event) => {
    event.preventDefault();
    if (!user) return navigate('/auth');
    const text = caption.trim();
    if (!text && !mediaUrl.trim()) return setError('Add a caption or media first.');
    setPublishing(true);
    setError('');
    try {
      const title = text ? text.slice(0, 100) : (type === 'reel' ? 'New Reel' : 'New post');
      await createFeedPost({
        type,
        title,
        body: text,
        imageUrl: type === 'post' ? mediaUrl.trim() : '',
        youtubeUrl: type === 'reel' ? mediaUrl.trim() : '',
      });
      hapticSuccess();
      setOpen(false);
      setCaption('');
      setMediaUrl('');
      navigate('/feed');
    } catch (err) {
      hapticError();
      setError(err?.message || 'Unable to publish right now.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] sm:hidden" style={{ background: 'rgba(13,12,24,0.97)', backdropFilter: 'blur(22px)', paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Primary">
        <div className="grid grid-cols-5 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return <NavLink key={`${tab.path}-${tab.name}`} to={tab.path} end={tab.end} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${isActive ? 'text-white' : 'text-white/45'}`}>
              {({ isActive }) => <><Icon className={`${isActive ? 'h-[21px] w-[21px]' : 'h-[20px] w-[20px]'} transition`} />{tab.name}</>}
            </NavLink>;
          })}
          <button type="button" onClick={() => { setError(''); setOpen(true); }} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-white/55 transition hover:text-white" aria-label="Create a post">
            <FiPlusSquare className="h-[21px] w-[21px]" />Create
          </button>
          <Link to="/dashboard" className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-white/45 transition hover:text-white">
            <span className="flex h-[21px] w-[21px] items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5"><FiUser className="h-[15px] w-[15px]" /></span>
            Profile
          </Link>
        </div>
      </nav>

      {open && <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Create post">
        <div className="w-full max-w-lg rounded-t-[2rem] border border-white/10 bg-[#0d0c18] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem]">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Create</p><h2 className="mt-1 text-xl font-bold text-white">Share something</h2></div><button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-white/55 hover:bg-white/5" aria-label="Close"><FiX /></button></div>
          {!user ? <div className="rounded-2xl border border-white/10 p-4 text-sm text-white/60">Sign in to create posts and Reels.</div> : <form onSubmit={publish} className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.04] p-1"><button type="button" onClick={() => setType('post')} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ${type === 'post' ? 'bg-white text-[#0d0c18]' : 'text-white/45'}`}><FiImage /> Post</button><button type="button" onClick={() => setType('reel')} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ${type === 'reel' ? 'bg-white text-[#0d0c18]' : 'text-white/45'}`}><FiFilm /> Reel</button></div>
            <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={5000} rows={5} placeholder={type === 'reel' ? 'Write a caption for your Reel...' : 'What’s on your mind? Share with the community...'} className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/30 focus:border-white/20" />
            <div><label className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/45">{type === 'reel' ? 'YouTube / Shorts link' : 'Image URL (optional)'}</label><input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} required={type === 'reel'} placeholder={type === 'reel' ? 'Paste a YouTube Shorts or video link' : 'Paste an image URL'} className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20" /></div>
            {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200">{error}</p>}
            <button type="submit" disabled={publishing} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-[#0d0c18] disabled:opacity-50">{publishing ? <FiLoader className="animate-spin" /> : <FiPlus />}{publishing ? 'Publishing...' : `Share ${type === 'reel' ? 'Reel' : 'post'}`}</button>
          </form>}
        </div>
      </div>}
    </>
  );
}
