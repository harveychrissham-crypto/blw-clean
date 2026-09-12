import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiCamera, FiCheck, FiFilm, FiImage, FiLoader, FiMapPin, FiSend, FiSmile, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { createFeedPost, uploadFeedMedia } from '../utils/feed';
import { createStreamDirectUpload, uploadToStream, getStreamVideoStatus } from '../utils/stream';
import { hapticError, hapticSuccess, hapticTap } from '../utils/haptics';

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 200 * 1024 * 1024;

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [error, setError] = useState('');
  const [published, setPublished] = useState(false);

  const isDirty = Boolean(file || caption.trim() || location.trim());
  const confirmLeave = () => !isDirty || window.confirm('You have unsaved content. Leave Create and discard it?');

  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const guardState = { ...(window.history.state || {}), __createGuard: true };
    window.history.pushState(guardState, '', window.location.href);
    let acceptingLeave = false;
    const onPopState = () => {
      if (acceptingLeave) return;
      if (window.confirm('You have unsaved content. Leave Create and discard it?')) {
        acceptingLeave = true;
        navigate(-1);
      } else {
        window.history.pushState(guardState, '', window.location.href);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isDirty, navigate]);

  const choose = (mode = type) => {
    hapticTap();
    setType(mode);
    setError('');
    if (inputRef.current) {
      inputRef.current.accept = mode === 'reel'
        ? 'video/mp4,video/webm,video/quicktime,video/x-matroska,video/avi,video/x-flv,video/mpeg'
        : 'image/*,video/mp4,video/webm,video/quicktime,video/x-matroska,video/avi,video/x-flv,video/mpeg';
      inputRef.current.click();
    }
  };

  const selectType = (mode) => {
    hapticTap();
    setType(mode);
    setFile(null);
    setError('');
    setUploadProgress(0);
    setUploadStage('');
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
    setUploadProgress(0);
    setUploadStage('');
  };

  const publish = async () => {
    if (!user) return;
    if (!file) return setError(type === 'reel' ? 'Choose a video for your Reel.' : 'Choose a photo or video first.');
    if (type === 'reel' && !file.type.startsWith('video/')) return setError('A Reel must be a video.');
    if (uploading || published) return;
    if (!window.confirm(`Ready to share this ${type === 'reel' ? 'Reel' : 'post'}?`)) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadStage(file.type.startsWith('video/') ? 'Preparing Bunny Stream upload…' : 'Uploading image…');
    setError('');
    try {
      let uploaded;
      if (file.type.startsWith('video/')) {
        const direct = await createStreamDirectUpload(1200);
        setUploadStage('Uploading video…');
        await uploadToStream(direct, file, setUploadProgress);
        setUploadStage('Processing video…');
        // Bunny needs a short window to finish transcoding after the upload
        // completes — publishing before it's ready would point the post at
        // a manifest that isn't actually playable yet.
        const deadline = Date.now() + 120_000;
        let ready = false;
        while (Date.now() < deadline) {
          const status = await getStreamVideoStatus(direct.uid).catch(() => null);
          if (status?.readyToStream) { ready = true; break; }
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
        if (!ready) throw new Error('Video is still processing — please try publishing again in a minute.');
        uploaded = { url: direct.manifestUrl, mediaType: 'video', streamUid: direct.uid };
        setUploadStage('Video ready. Publishing…');
      } else {
        uploaded = await uploadFeedMedia(file);
        setUploadProgress(100);
        setUploadStage('Publishing…');
      }
      const cleanCaption = caption.trim();
      const cleanLocation = location.trim();
      const title = cleanCaption.slice(0, 160) || (type === 'reel' ? 'New Reel' : 'New post');
      const body = cleanLocation ? `${cleanCaption}${cleanCaption ? '\n\n' : ''}📍 ${cleanLocation}` : cleanCaption;
      const created = await createFeedPost({ type, title, body, mediaUrl: uploaded.url, mediaType: uploaded.mediaType, thumbnailUrl: uploaded.thumbnailUrl || '' });
      hapticSuccess();
      setPublished(true);
      setTimeout(() => {
        navigate(`/feed${type === 'reel' ? '?tab=reels' : ''}`, { replace: true, state: { createdPost: created } });
      }, 900);
    } catch (err) {
      setError(err?.message || 'Unable to publish right now. Your caption and media selection have been kept so you can retry.');
      hapticError();
    } finally {
      setUploading(false);
      setUploadStage('');
    }
  };

  const back = () => {
    if (confirmLeave()) navigate(-1);
  };

  if (!user) return <div className="min-h-[70vh] grid place-items-center px-6 text-center"><div><p className="text-lg font-bold text-white">Sign in to create</p><p className="mt-2 text-sm text-white/50">Create posts and Reels for the community.</p><Link to="/auth" className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink-950">Sign in</Link></div></div>;

  const isVideo = Boolean(file?.type?.startsWith('video/'));

  return (
    <div className="min-h-screen bg-[#090812] text-white sm:py-8">
      <div className="mx-auto min-h-screen max-w-2xl overflow-hidden border-x border-white/[0.07] bg-[#0d0c18] sm:min-h-0 sm:rounded-[28px] sm:border sm:shadow-2xl">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.07] bg-[#0d0c18]/90 px-3 backdrop-blur-2xl">
          <button type="button" onClick={back} className="grid h-10 w-10 place-items-center rounded-full text-white/75 transition hover:bg-white/[0.07]" aria-label="Back"><FiArrowLeft className="h-5 w-5" /></button>
          <div className="text-center"><h1 className="text-[15px] font-bold tracking-tight">Create</h1><p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Share with the community</p></div>
          <button type="button" onClick={publish} disabled={uploading || !file || published} className="flex min-w-[62px] items-center justify-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35">{uploading ? <FiLoader className="animate-spin" /> : <><FiCheck /> Share</>}</button>
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
                {isVideo ? <video src={preview} className="h-full w-full object-cover" controls playsInline /> : <img src={preview} alt="Preview" className="h-full w-full object-cover" />}
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
            {uploading && isVideo && <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5"><div className="flex items-center justify-between gap-3 text-xs"><span className="text-white/60">{uploadStage || 'Uploading video…'}</span><span className="font-semibold text-white">{uploadProgress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-white transition-[width] duration-200" style={{ width: `${uploadProgress}%` }} /></div><p className="mt-2 text-[10px] leading-4 text-white/30">Bunny Stream will process this video and deliver adaptive bitrate playback after upload.</p></div>}
          </section>

          <section className="border-t border-white/[0.07] p-4 sm:p-6 md:border-t-0">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.07] text-xs font-bold">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}</div>
              <div className="min-w-0"><p className="truncate text-sm font-bold">{user?.name || 'Your profile'}</p><p className="text-[11px] text-white/35">Public community post</p></div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 focus-within:border-white/20">
              <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={5000} rows={7} placeholder={type === 'reel' ? 'Add a caption to your Reel...' : 'Share something with the community...'} className="w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/25" />
              <div className="flex items-center justify-between border-t border-white/[0.07] pt-2.5"><button type="button" className="grid h-8 w-8 place-items-center rounded-full text-white/35 transition hover:bg-white/[0.06] hover:text-white/70" aria-label="Emoji"><FiSmile /></button><span className="text-[10px] text-white/25">{caption.length}/5000</span></div>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-3.5 py-2.5"><FiMapPin className="shrink-0 text-white/35" /><input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={100} placeholder="Add location (optional)" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/25" /></div>

            <div className="mt-4 rounded-2xl border border-white/[.07] bg-white/[.02] p-3.5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">Sharing to Feed</p><p className="mt-1.5 text-xs leading-5 text-white/45">Your {type === 'reel' ? 'Reel' : 'post'} will appear in the community Feed where people can like, comment and save it.</p>{isVideo&&<p className="mt-2 text-[10px] leading-4 text-white/25">Video delivery: Bunny Stream adaptive bitrate via HLS.</p>}</div>

            {error && <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs leading-5 text-red-200">{error}</p>}
            <button type="button" onClick={publish} disabled={uploading || !file || published} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-ink-950 shadow-xl transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35">{uploading ? <><FiLoader className="animate-spin" /> {uploadStage || (isVideo ? 'Uploading & sharing…' : 'Uploading & sharing...')}</> : <><FiSend /> Share {type === 'reel' ? 'Reel' : 'Post'}</>}</button>
          </section>
        </div>
      </div>
      <AnimatePresence>
        {published && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-[#090812]/95 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 340, damping: 18 }} className="flex flex-col items-center gap-3">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-[#A62574] to-[#3C1464] shadow-2xl shadow-purple-400/30"><FiCheck className="h-10 w-10 text-white" /></div>
              <p className="text-sm font-bold text-white">{type === 'reel' ? 'Reel shared!' : 'Posted!'}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
