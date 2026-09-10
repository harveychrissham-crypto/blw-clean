import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCamera, FiCheck, FiFilm, FiImage, FiLoader, FiMapPin, FiSend, FiSmile, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { createFeedPost, uploadFeedMedia } from '../utils/feed';
import { hapticError, hapticSuccess, hapticTap } from '../utils/haptics';

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 30 * 1024 * 1024;

export default function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [type, setType] = useState('post');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (mode = type) => {
    hapticTap();
    setType(mode);
    setError('');
    if (inputRef.current) {
      inputRef.current.accept = mode === 'reel'
        ? 'video/mp4,video/webm,video/quicktime'
        : 'image/*,video/mp4,video/webm,video/quicktime';
      inputRef.current.click();
    }
  };

  const selectType = (mode) => {
    hapticTap();
    setType(mode);
    setFile(null);
    setError('');
  };

  const onFile = (event) => {
    const next = event.target.files?.[0];
    event.target.value = '';
    if (!next) return;
    const isVideo = next.type.startsWith('video/');
    const max = isVideo ? MAX_VIDEO : MAX_IMAGE;
    if (next.size > max) {
      setError(`${isVideo ? 'Video' : 'Image'} must be ${Math.round(max / (1024 * 1024))} MB or smaller.`);
      hapticError();
      return;
    }
    if (type === 'reel' && !isVideo) {
      setError('A Reel must be a video.');
      hapticError();
      return;
    }
    setFile(next);
    setError('');
  };

  const publish = async () => {
    if (!user) return;
    if (!file) return setError(type === 'reel' ? 'Choose a video for your Reel.' : 'Choose a photo or video first.');
    if (type === 'reel' && !file.type.startsWith('video/')) return setError('A Reel must be a video.');
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadFeedMedia(file);
      const cleanCaption = caption.trim();
      const cleanLocation = location.trim();
      const title = cleanCaption.slice(0, 160) || (type === 'reel' ? 'New Reel' : 'New post');
      const body = cleanLocation ? `${cleanCaption}${cleanCaption ? '\n\n' : ''}📍 ${cleanLocation}` : cleanCaption;
      const created = await createFeedPost({ type, title, body, mediaUrl: uploaded.url, mediaType: uploaded.mediaType });
      hapticSuccess();
      navigate(`/feed${type === 'reel' ? '?tab=reels' : ''}`, { replace: true, state: { createdPost: created } });
    } catch (err) {
      setError(err?.message || 'Unable to publish right now.');
      hapticError();
    } finally { setUploading(false); }
  };

  if (!user) return <div className="min-h-[70vh] grid place-items-center px-6 text-center"><div><p className="text-lg font-bold text-white">Sign in to create</p><p className="mt-2 text-sm text-white/50">Create posts and Reels for the community.</p><Link to="/auth" className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink-950">Sign in</Link></div></div>;

  return (
    <div className="min-h-screen bg-[#090812] text-white sm:py-8">
      <div className="mx-auto min-h-screen max-w-2xl overflow-hidden border-x border-white/[0.07] bg-[#0d0c18] sm:min-h-0 sm:rounded-[28px] sm:border sm:shadow-2xl">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.07] bg-[#0d0c18]/90 px-3 backdrop-blur-2xl">
          <button type="button" onClick={() => navigate(-1)} className="grid h-10 w-10 place-items-center rounded-full text-white/75 transition hover:bg-white/[0.07]" aria-label="Back"><FiArrowLeft className="h-5 w-5" /></button>
          <div className="text-center"><h1 className="text-[15px] font-bold tracking-tight">Create</h1><p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Share with the community</p></div>
          <button type="button" onClick={publish} disabled={uploading || !file} className="flex min-w-[62px] items-center justify-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35">{uploading ? <FiLoader className="animate-spin" /> : <><FiCheck /> Share</>}</button>
        </header>

        <div className="grid grid-cols-2 border-b border-white/[0.07] bg-white/[0.015] p-1.5">
          <button type="button" onClick={() => selectType('post')} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${type === 'post' ? 'bg-white text-ink-950 shadow-lg' : 'text-white/40 hover:bg-white/[0.05] hover:text-white/70'}`}><FiImage /> Post</button>
          <button type="button" onClick={() => selectType('reel')} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${type === 'reel' ? 'bg-white text-ink-950 shadow-lg' : 'text-white/40 hover:bg-white/[0.05] hover:text-white/70'}`}><FiFilm /> Reel</button>
        </div>

        <div className="grid gap-0 md:grid-cols-[1.08fr_.92fr]">
          <section className="p-4 sm:p-6 md:border-r md:border-white/[0.07]">
            <input ref={inputRef} type="file" className="hidden" onChange={onFile} />
            {preview ? (
              <div className={`group relative overflow-hidden rounded-[26px] bg-black ring-1 ring-white/10 ${type === 'reel' ? 'aspect-[9/15] max-h-[68vh]' : 'aspect-square'}`}>
                {file?.type.startsWith('video/') ? <video src={preview} className="h-full w-full object-cover" controls playsInline /> : <img src={preview} alt="Preview" className="h-full w-full object-cover" />}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent" />
                <button type="button" onClick={() => setFile(null)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur-xl transition hover:bg-black/80" aria-label="Remove media"><FiX /></button>
                <button type="button" onClick={() => choose(type)} className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3.5 py-2 text-xs font-semibold backdrop-blur-xl transition hover:bg-black/80">Change media</button>
              </div>
            ) : (
              <button type="button" onClick={() => choose(type)} className={`group grid w-full place-items-center rounded-[26px] border border-dashed border-white/15 bg-gradient-to-br from-white/[0.045] to-white/[0.015] text-center transition hover:border-white/25 hover:bg-white/[0.06] ${type === 'reel' ? 'aspect-[9/13]' : 'aspect-square'}`}>
                <span>
                  <span className="mx-auto grid h-20 w-20 place-items-center rounded-[24px] bg-white/[0.07] text-white/75 shadow-xl transition group-hover:scale-105"><FiCamera className="h-8 w-8" /></span>
                  <span className="mt-5 block text-sm font-bold">{type === 'reel' ? 'Create a Reel' : 'Create a post'}</span>
                  <span className="mt-1.5 block text-xs text-white/35">Tap to choose from your device</span>
                </span>
              </button>
            )}
            {!file && <div className="mt-3 flex gap-2"><button type="button" onClick={() => choose('post')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] py-3 text-xs font-semibold text-white/65 transition hover:bg-white/[0.07]"><FiImage /> Gallery</button><button type="button" onClick={() => choose('reel')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] py-3 text-xs font-semibold text-white/65 transition hover:bg-white/[0.07]"><FiFilm /> Video</button></div>}
          </section>

          <section className="border-t border-white/[0.07] p-4 sm:p-6 md:border-t-0">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.07] text-xs font-bold">{user?.email?.[0]?.toUpperCase() || 'U'}</div>
              <div className="min-w-0"><p className="truncate text-sm font-bold">{user?.user_metadata?.full_name || user?.user_metadata?.name || 'Your profile'}</p><p className="text-[11px] text-white/35">Public community post</p></div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 focus-within:border-white/20">
              <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={5000} rows={7} placeholder={type === 'reel' ? 'Add a caption to your Reel...' : 'Share something with the community...'} className="w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/25" />
              <div className="flex items-center justify-between border-t border-white/[0.07] pt-2.5"><button type="button" className="grid h-8 w-8 place-items-center rounded-full text-white/35 transition hover:bg-white/[0.06] hover:text-white/70" aria-label="Emoji"><FiSmile /></button><span className="text-[10px] text-white/25">{caption.length}/5000</span></div>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-3.5 py-2.5"><FiMapPin className="shrink-0 text-white/35" /><input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={100} placeholder="Add location (optional)" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/25" /></div>

            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">Sharing to Feed</p><p className="mt-1.5 text-xs leading-5 text-white/45">Your {type === 'reel' ? 'Reel' : 'post'} will appear in the community Feed where people can like, comment and save it.</p></div>

            {error && <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs leading-5 text-red-200">{error}</p>}
            <button type="button" onClick={publish} disabled={uploading || !file} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-ink-950 shadow-xl transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35">{uploading ? <><FiLoader className="animate-spin" /> Uploading & sharing...</> : <><FiSend /> Share {type === 'reel' ? 'Reel' : 'Post'}</>}</button>
          </section>
        </div>
      </div>
    </div>
  );
}
