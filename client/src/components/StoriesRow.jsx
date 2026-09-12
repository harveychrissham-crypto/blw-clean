import { useEffect, useRef, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { prepareImageForUpload } from '../utils/feed';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import StoryViewer from './StoryViewer';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

function groupByAuthor(stories) {
  const groups = new Map();
  for (const story of stories) {
    if (!groups.has(story.authorEmail)) groups.set(story.authorEmail, []);
    groups.get(story.authorEmail).push(story);
  }
  return [...groups.values()];
}

export default function StoriesRow() {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [viewerGroup, setViewerGroup] = useState(null);
  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      const res = await apiFetch('/api/stories');
      const body = await res.json().catch(() => ({}));
      if (res.ok) setStories(Array.isArray(body.stories) ? body.stories : []);
    } catch {
      // Stories are non-critical to the feed; fail quietly.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="w-full px-5 pt-2" aria-label="Loading stories" aria-busy="true">
        <div className="flex gap-4 overflow-hidden pb-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex shrink-0 flex-col items-center gap-1.5">
              <div className="h-16 w-16 animate-pulse rounded-full border-2 border-white/[.08] bg-white/[.06]" />
              <div className="h-2.5 w-12 animate-pulse rounded-full bg-white/[.06]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const groups = groupByAuthor(stories);
  const myEmail = user.email?.toLowerCase();
  const myGroup = groups.find((group) => group[0].authorEmail?.toLowerCase() === myEmail);
  const otherGroups = groups
    .filter((group) => group[0].authorEmail?.toLowerCase() !== myEmail)
    .sort((a, b) => {
      const aUnseen = a.some((story) => !story.viewed);
      const bUnseen = b.some((story) => !story.viewed);
      if (aUnseen === bUnseen) return 0;
      return aUnseen ? -1 : 1;
    });

  const openGroup = (group, startIndex = 0, groupIndex = 0) => {
    hapticTap();
    setViewerGroup({ stories: group, startIndex, groupIndex });
  };

  const orderedGroups = myGroup ? [myGroup, ...otherGroups] : otherGroups;

  const openGroupByIndex = (groupIndex) => {
    const nextGroup = orderedGroups[groupIndex];
    if (!nextGroup) return false;
    const firstUnseenIndex = nextGroup.findIndex((story) => !story.viewed);
    setViewerGroup({
      stories: nextGroup,
      startIndex: firstUnseenIndex === -1 ? 0 : firstUnseenIndex,
      groupIndex,
    });
    hapticTap();
    return true;
  };

  const markViewedLocally = (storyId) => {
    setStories((prev) => prev.map((story) => story.id === storyId ? { ...story, viewed: true } : story));
  };

  const removeLocally = (storyId) => {
    setStories((prev) => prev.filter((story) => story.id !== storyId));
  };

  const handleFileChosen = async (event) => {
    const originalFile = event.target.files?.[0];
    event.target.value = '';
    if (!originalFile) return;

    const isVideo = originalFile.type.startsWith('video/');
    if (isVideo && originalFile.size > MAX_VIDEO_BYTES) {
      hapticError();
      setUploadError('Videos must be 30 MB or smaller.');
      return;
    }
    if (!isVideo && originalFile.size > MAX_IMAGE_BYTES) {
      hapticError();
      setUploadError('That image is over 15 MB. Choose a smaller image.');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const file = isVideo ? originalFile : await prepareImageForUpload(originalFile, {
        maxBytes: 5 * 1024 * 1024,
        maxDimension: 2200,
      });
      if (!isVideo && file.size > 5 * 1024 * 1024) {
        throw new Error('This image could not be compressed enough. Please choose a slightly smaller image.');
      }

      const form = new FormData();
      form.append('media', file);
      const uploadRes = await apiFetch('/api/stories/upload', { method: 'POST', body: form });
      const uploadBody = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploadBody.error || 'Upload failed.');

      const createRes = await apiFetch('/api/stories', {
        method: 'POST',
        body: JSON.stringify({ mediaUrl: uploadBody.url, mediaType: isVideo ? 'video' : 'image' }),
      });
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to post that story.');
      }

      hapticSuccess();
      await load();
    } catch (error) {
      hapticError();
      setUploadError(error?.message || 'Something went wrong posting that.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full px-5 pt-2">
      <style>{`@keyframes blwStoryRingSpin{to{transform:rotate(360deg)}}.story-ring-spin{animation:blwStoryRingSpin 4.5s linear infinite;transform-origin:center}.story-ring-spin-reverse{animation:blwStoryRingSpin 7s linear infinite reverse;transform-origin:center}@keyframes blwStoryUploadSpin{to{transform:rotate(360deg)}}.story-upload-ring{background:conic-gradient(from 0deg,#EC2FA8,#8A2BE2,#F2A31C,#EC2FA8);animation:blwStoryUploadSpin 1.6s linear infinite;transform-origin:center}.story-upload-ring-inner{border:2px solid #0d0c18}@media (prefers-reduced-motion:reduce){.story-ring-spin,.story-ring-spin-reverse,.story-upload-ring{animation:none}}`}</style>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <div className="relative h-16 w-16 shrink-0">
            <button type="button" onClick={() => (myGroup ? openGroup(myGroup, 0, 0) : fileInputRef.current?.click())} className="h-full w-full rounded-full" aria-label={myGroup ? 'View your story' : 'Add a story'}>
              {myGroup ? (
                <div className={`h-full w-full rounded-full p-[2px] ${uploading ? 'story-upload-ring' : myGroup.some((story) => !story.viewed) ? 'story-ring-spin' : ''}`} style={!uploading ? { background: myGroup.some((story) => !story.viewed) ? 'linear-gradient(135deg,#EC2FA8,#8A2BE2,#F2A31C)' : 'rgba(255,255,255,0.15)' } : undefined}>
                  <div className="story-upload-ring-inner h-full w-full overflow-hidden rounded-full bg-white/5">
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async"/> : <div className="grid h-full w-full place-items-center text-sm font-bold text-white/70">{(user.name || '?').charAt(0).toUpperCase()}</div>}
                  </div>
                </div>
              ) : uploading ? (
                <div className="story-upload-ring h-full w-full rounded-full p-[2px]">
                  <div className="story-upload-ring-inner h-full w-full overflow-hidden rounded-full bg-white/5">
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover opacity-70" loading="lazy" decoding="async"/> : <span className="grid h-full w-full place-items-center text-sm font-bold text-white/50">{(user.name || '?').charAt(0).toUpperCase()}</span>}
                  </div>
                </div>
              ) : (
                <div className="grid h-full w-full place-items-center overflow-hidden rounded-full border-2 border-dashed border-white/20 bg-white/[0.04]">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover opacity-60" loading="lazy" decoding="async"/> : <span className="text-sm font-bold text-white/50">{(user.name || '?').charAt(0).toUpperCase()}</span>}
                </div>
              )}
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Add a story" className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-[#0d0c18] bg-[#EC2FA8] text-white">{uploading ? <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> : <FiPlus className="h-3 w-3" />}</button>
          </div>
          <span className="max-w-[4.5rem] truncate text-[11px] text-white/50">Your Story</span>
        </div>

        {otherGroups.map((group) => {
          const first = group[0];
          const unseen = group.some((story) => !story.viewed);
          const firstUnseenIndex = group.findIndex((story) => !story.viewed);
          const groupIndex = orderedGroups.indexOf(group);
          return (
            <div key={first.authorEmail} className="flex shrink-0 flex-col items-center gap-1.5">
              <button type="button" onClick={() => openGroup(group, firstUnseenIndex === -1 ? 0 : firstUnseenIndex, groupIndex)} className="h-16 w-16 shrink-0 rounded-full" aria-label={`View ${first.authorName}'s story`}>
                <div className={`h-full w-full rounded-full p-[2px] ${unseen ? 'story-ring-spin-reverse' : ''}`} style={{ background: unseen ? 'linear-gradient(135deg,#EC2FA8,#8A2BE2,#F2A31C)' : 'rgba(255,255,255,0.15)' }}>
                  <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#0d0c18] bg-white/5">
                    {first.authorAvatarUrl ? <img src={first.authorAvatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async"/> : <div className="grid h-full w-full place-items-center text-sm font-bold text-white/70">{(first.authorName || '?').charAt(0).toUpperCase()}</div>}
                  </div>
                </div>
              </button>
              <span className="max-w-[4.5rem] truncate text-[11px] text-white/50">{first.authorName}</span>
            </div>
          );
        })}
      </div>

      {uploadError && <p className="mt-1 text-xs text-red-300">{uploadError}</p>}

      <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChosen} className="hidden" />

      {viewerGroup && (
        <StoryViewer
          stories={viewerGroup.stories}
          initialIndex={viewerGroup.startIndex}
          viewerEmail={myEmail}
          onClose={() => setViewerGroup(null)}
          onViewed={markViewedLocally}
          onDeleted={removeLocally}
          onSwipeGroup={(direction) => {
            const nextIndex = viewerGroup.groupIndex + direction;
            return openGroupByIndex(nextIndex);
          }}
        />
      )}
    </div>
  );
}
