import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCamera, FiFilm, FiImage, FiLoader, FiSend, FiX } from 'react-icons/fi';
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
      inputRef.current.accept = mode === 'reel' ? 'video/mp4,video/webm,video/quicktime' : 'image/*,video/mp4,video/webm,video/quicktime';
      inputRef.current.click();
    }
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
      const title = cleanCaption.slice(0, 160) || (type === 'reel' ? 'New Reel' : 'New post');
      const created = await createFeedPost({ type, title, body: cleanCaption, mediaUrl: uploaded.url, mediaType: uploaded.mediaType });
      hapticSuccess();
      navigate(`/feed${type === 'reel' ? '?tab=reels' : ''}`, { replace: true, state: { createdPost: created } });
    } catch (err) {
      setError(err?.message || 'Unable to publish right now.');
      hapticError();
    } finally { setUploading(false); }
  };

  if (!user) return <div className="min-h-[70vh] grid place-items-center px-6 text-center"><div><p className="text-lg font-bold text-white">Sign in to create</p><p className="mt-2 text-sm text-white/50">Create posts and Reels for the community.</p><Link to="/auth" className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink-950">Sign in</Link></div></div>;

  return (
    <div className="min-h-screen bg-[#0d0c18] text-white sm:py-8">
      <div className="mx-auto min-h-screen max-w-xl border-x border-white/[0.07] bg-[#0d0c18] sm:min-h-0 sm:rounded-3xl sm:border sm:shadow-2xl">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-[#0d0c18]/95 px-4 py-3 backdrop-blur-xl">
          <button type="button" onClick={() => navigate(-1)} className="rounded-full p-2 text-white/70" aria-label="Back"><FiArrowLeft /></button>
          <h1 className="text-sm font-bold">Create</h1>
          <button type="button" onClick={publish} disabled={uploading || !file} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-ink-950 disabled:opacity-40">{uploading ? <FiLoader className="animate-spin" /> : 'Share'}</button>
        </header>

        <div className="grid grid-cols-2 border-b border-white/[0.07]">
          <button type="button" onClick={() => { setType('post'); setFile(null); setError(''); }} className={`py-3 text-xs font-bold ${type === 'post' ? 'border-b-2 border-white text-white' : 'text-white/40'}`}><FiImage className="mr-2 inline" />Post</button>
          <button type="button" onClick={() => { setType('reel'); setFile(null); setError(''); }} className={`py-3 text-xs font-bold ${type === 'reel' ? 'border-b-2 border-white text-white' : 'text-white/40'}`}><FiFilm className="mr-2 inline" />Reel</button>
        </div>

        <div className="p-4 sm:p-6">
          <input ref={inputRef} type="file" className="hidden" onChange={onFile} />
          {preview ? (
            <div className={`relative overflow-hidden rounded-3xl bg-black ${type === 'reel' ? 'aspect-[9/16] max-h-[68vh]' : 'aspect-square'}`}>
              {file?.type.startsWith('video/') ? <video src={preview} className="h-full w-full object-cover" controls playsInline /> : <img src={preview} alt="Preview" className="h-full w-full object-cover" />}
              <button type="button" onClick={() => setFile(null)} className="absolute right-3 top-3 rounded-full bg-black/65 p-2 text-white backdrop-blur" aria-label="Remove media"><FiX /></button>
            </div>
          ) : (
            <button type="button" onClick={() => choose(type)} className={`grid w-full place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] text-center transition hover:bg-white/[0.05] ${type === 'reel' ? 'aspect-[9/14]' : 'aspect-square'}`}>
              <span><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/[0.07] text-white/70"><FiCamera className="h-7 w-7" /></span><span className="mt-4 block text-sm font-semibold">{type === 'reel' ? 'Choose a video' : 'Choose a photo or video'}</span><span className="mt-1 block text-xs text-white/35">From your device</span></span>
            </button>
          )}

          <button type="button" onClick={() => choose(type)} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-white/75">{file ? 'Change media' : type === 'reel' ? 'Select video' : 'Select from gallery'}</button>
          <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={5000} rows={4} placeholder="Write a caption..." className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" />
          {error && <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs text-red-200">{error}</p>}
          <button type="button" onClick={publish} disabled={uploading || !file} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-ink-950 disabled:opacity-40">{uploading ? <><FiLoader className="animate-spin" /> Uploading & sharing...</> : <><FiSend /> Share {type === 'reel' ? 'Reel' : 'Post'}</>}</button>
        </div>
      </div>
    </div>
  );
}
