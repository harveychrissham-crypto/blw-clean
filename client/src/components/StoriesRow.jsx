import { useEffect, useRef, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import StoryViewer from './StoryViewer';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
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
  const [viewerGroup, setViewerGroup] = useState(null); // { stories, startIndex } | null
  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      const res = await apiFetch('/api/stories');
      const body = await res.json().catch(() => ({}));
      if (res.ok) setStories(Array.isArray(body.stories) ? body.stories : []);
    } catch {
      // Stories are non-critical to the home screen; fail quietly.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); else setLoading(false); }, [user]);

  if (!user) return null;

  const groups = groupByAuthor(stories);
  const myEmail = user.email?.toLowerCase();
  const myGroup = groups.find((g) => g[0].authorEmail?.toLowerCase() === myEmail);
  const otherGroups = groups
    .filter((g) => g[0].authorEmail?.toLowerCase() !== myEmail)
    // Unseen authors first, matching the convention every app in this
    // category uses -- the whole point of the ring is to draw the eye to
    // what's new first.
    .sort((a, b) => {
      const aUnseen = a.some((s) => !s.viewed);
      const bUnseen = b.some((s) => !s.viewed);
      if (aUnseen === bUnseen) return 0;
      return aUnseen ? -1 : 1;
    });

  const openGroup = (group, startIndex = 0) => {
    hapticTap();
    setViewerGroup({ stories: group, startIndex });
  };

  const markViewedLocally = (storyId) => {
    setStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, viewed: true } : s)));
  };

  const removeLocally = (storyId) => {
    setStories((prev) => prev.filter((s) => s.id !== storyId));
  };

  const handleFileChosen = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      hapticError();
      setUploadError(`${isVideo ? 'Videos' : 'Images'} must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller.`);
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('media', file);
      const uploadRes = await apiFetch('/api/stories/upload', { method: 'POST', body: form });
      const uploadBody = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploadBody.error || 'Upload failed.');

      const createRes = await apiFetch('/api/stories', {
        method: 'POST',
        body: JSON.stringify({ mediaUrl: uploadBody.url, mediaType: isVideo ? 'video' : 'image' }),
      });
      if (!createRes.ok) { const b = await createRes.json().catch(() => ({})); throw new Error(b.error || 'Unable to post that story.'); }
      hapticSuccess();
      await load();
    } catch (err) {
      hapticError();
      setUploadError(err?.message || 'Something went wrong posting that.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return null; // avoid a layout flash while the first fetch resolves
  if (!myGroup && otherGroups.length === 0) return null; // nothing to show, no empty row taking up space

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8">
      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <div className="relative h-16 w-16 shrink-0">
            <button
              type="button"
              onClick={() => (myGroup ? openGroup(myGroup, 0) : fileInputRef.current?.click())}
              className="h-full w-full rounded-full"
              aria-label={myGroup ? 'View your story' : 'Add a story'}
            >
              {myGroup ? (
                <div className="h-full w-full rounded-full p-[2px]" style={{ background: myGroup.some((s) => !s.viewed) ? 'linear-gradient(135deg,#EC2FA8,#8A2BE2,#F2A31C)' : 'rgba(255,255,255,0.15)' }}>
                  <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#0d0c18] bg-white/5">
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-sm font-bold text-white/70">{(user.name || '?').charAt(0).toUpperCase()}</div>}
                  </div>
                </div>
              ) : (
                <div className="grid h-full w-full place-items-center overflow-hidden rounded-full border-2 border-dashed border-white/20 bg-white/[0.04]">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover opacity-60" /> : <span className="text-sm font-bold text-white/50">{(user.name || '?').charAt(0).toUpperCase()}</span>}
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add a story"
              className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-[#0d0c18] bg-[#EC2FA8] text-white"
            >
              {uploading ? <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> : <FiPlus className="h-3 w-3" />}
            </button>
          </div>
          <span className="max-w-[4.5rem] truncate text-[11px] text-white/50">Your Story</span>
        </div>

        {otherGroups.map((group) => {
          const first = group[0];
          const unseen = group.some((s) => !s.viewed);
          return (
            <div key={first.authorEmail} className="flex shrink-0 flex-col items-center gap-1.5">
              <button type="button" onClick={() => openGroup(group, group.findIndex((s) => !s.viewed) === -1 ? 0 : group.findIndex((s) => !s.viewed))} className="h-16 w-16 shrink-0 rounded-full" aria-label={`View ${first.authorName}'s story`}>
                <div className="h-full w-full rounded-full p-[2px]" style={{ background: unseen ? 'linear-gradient(135deg,#EC2FA8,#8A2BE2,#F2A31C)' : 'rgba(255,255,255,0.15)' }}>
                  <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#0d0c18] bg-white/5">
                    {first.authorAvatarUrl ? <img src={first.authorAvatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-sm font-bold text-white/70">{(first.authorName || '?').charAt(0).toUpperCase()}</div>}
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
        />
      )}
    </div>
  );
}
