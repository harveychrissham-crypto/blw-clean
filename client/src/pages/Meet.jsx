import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { ControlBar, GridLayout, LiveKitRoom, ParticipantTile, PreJoin, RoomAudioRenderer, useRemoteParticipants, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

function HostPanel({ room, isHost, onEnded }) {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const participants = useRemoteParticipants();

  if (!isHost) return null;

  const call = async (path, options) => {
    const response = await apiFetch(path, { method: 'POST', ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || 'That action failed.');
    return body;
  };

  const muteAll = async () => {
    setBusy('mute-all'); setNotice('');
    try { await call(`/api/video/rooms/${encodeURIComponent(room)}/mute-all`); setNotice('Muted all participants.'); }
    catch (err) { setNotice(err?.message || 'Unable to mute everyone.'); }
    finally { setBusy(''); }
  };

  const muteOne = async (identity) => {
    setBusy(identity); setNotice('');
    try { await call(`/api/video/rooms/${encodeURIComponent(room)}/participants/${encodeURIComponent(identity)}/mute`); }
    catch (err) { setNotice(err?.message || 'Unable to mute that participant.'); }
    finally { setBusy(''); }
  };

  const removeOne = async (identity) => {
    setBusy(identity); setNotice('');
    try { await apiFetch(`/api/video/rooms/${encodeURIComponent(room)}/participants/${encodeURIComponent(identity)}`, { method: 'DELETE' }); }
    catch { setNotice('Unable to remove that participant.'); }
    finally { setBusy(''); }
  };

  const toggleLock = async () => {
    setBusy('lock'); setNotice('');
    try { const next = !locked; await call(`/api/video/rooms/${encodeURIComponent(room)}/lock`, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locked: next }) }); setLocked(next); setNotice(next ? 'Room locked — no new participants can join.' : 'Room unlocked.'); }
    catch (err) { setNotice(err?.message || 'Unable to change the lock.'); }
    finally { setBusy(''); }
  };

  const endForEveryone = async () => {
    if (!window.confirm('End this meeting for everyone? All participants will be disconnected.')) return;
    setBusy('end'); setNotice('');
    try { await apiFetch(`/api/video/rooms/${encodeURIComponent(room)}`, { method: 'DELETE' }); onEnded(); }
    catch { setNotice('Unable to end the meeting.'); setBusy(''); }
  };

  return (
    <div className="border-t border-white/10 bg-black/30 px-3 py-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-amber-300 hover:text-amber-200">{open ? 'Hide host controls ▲' : `Host controls ▼ (${participants.length} in call)`}</button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy === 'mute-all'} onClick={muteAll} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50">{busy === 'mute-all' ? 'Muting…' : 'Mute all'}</button>
            <button type="button" disabled={busy === 'lock'} onClick={toggleLock} className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${locked ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}>{busy === 'lock' ? 'Updating…' : locked ? 'Room locked 🔒' : 'Lock room'}</button>
            <button type="button" disabled={busy === 'end'} onClick={endForEveryone} className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50">{busy === 'end' ? 'Ending…' : 'End for everyone'}</button>
          </div>
          {notice && <p className="text-xs text-white/60">{notice}</p>}
          {participants.length === 0 ? (
            <p className="text-xs text-white/40">No one else has joined yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {participants.map((p) => (
                <li key={p.identity} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                  <span className="truncate text-xs text-white/75">{p.name || 'BLW Member'}</span>
                  <span className="flex shrink-0 gap-2">
                    <button type="button" disabled={busy === p.identity} onClick={() => muteOne(p.identity)} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 disabled:opacity-50">Mute</button>
                    <button type="button" disabled={busy === p.identity} onClick={() => removeOne(p.identity)} className="rounded-full border border-red-400/25 px-2.5 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-50">Remove</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RoomView({ room, isHost, onLeave, onEnded }) {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0d0c18] shadow-2xl" data-lk-theme="default">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div><p className="text-sm font-semibold text-white">BLW Meeting</p><p className="text-xs text-white/45">LiveKit room</p></div>
        <button type="button" onClick={onLeave} className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20">Leave</button>
      </div>
      <div className="min-h-0 flex-1 p-3"><GridLayout tracks={tracks} className="h-full min-h-[52vh] gap-3"><ParticipantTile /></GridLayout></div>
      <div className="border-t border-white/10 bg-black/20 p-2"><ControlBar variation="minimal" controls={{ microphone: true, camera: true, screenShare: true, chat: false }} /></div>
      <HostPanel room={room} isHost={isHost} onEnded={onEnded} />
      <RoomAudioRenderer />
    </div>
  );
}

export default function Meet() {
  const { user } = useAuth();
  const [roomName, setRoomName] = useState('blw-meeting');
  const [stage, setStage] = useState('form'); // 'form' | 'lobby' | 'room'
  const [session, setSession] = useState(null);
  const [choices, setChoices] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isHost, setIsHost] = useState(false);
  const participantName = useMemo(() => String(user?.name || user?.full_name || user?.email?.split('@')[0] || 'BLW Member').slice(0, 80), [user]);

  useEffect(() => {
    let cancelled = false;
    if (!user) return undefined;
    (async () => {
      try {
        const response = await apiFetch('/api/auth/admin-status');
        const body = await response.json().catch(() => ({}));
        if (!cancelled) setIsHost(response.ok && body.isAdmin === true);
      } catch { if (!cancelled) setIsHost(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const goToLobby = async () => {
    const normalized = roomName.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    if (!normalized) return setError('Enter a meeting name.');
    setLoading(true); setError('');
    try {
      const response = await apiFetch('/api/livekit/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_name: normalized, participant_name: participantName }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Unable to create a LiveKit session.');
      setSession({ token: body.participant_token, serverUrl: body.server_url, room: body.room });
      setStage('lobby');
    } catch (err) { setError(err?.message || 'Unable to join the meeting.'); }
    finally { setLoading(false); }
  };

  const enterRoom = (values) => {
    setChoices(values);
    setStage('room');
  };

  const leave = () => { setStage('form'); setSession(null); setChoices(null); };

  if (!user) return <div className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-3xl font-bold text-white">Meetings</h1><p className="mt-3 text-white/60">Sign in to join a BLW meeting.</p></div>;

  if (stage === 'lobby' && session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6" data-lk-theme="default">
        <h1 className="mb-4 text-2xl font-bold text-white">Check your camera and mic</h1>
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d0c18] p-4">
          <PreJoin
            defaults={{ username: participantName, videoEnabled: true, audioEnabled: true }}
            joinLabel="Join meeting"
            onSubmit={enterRoom}
            onError={(err) => setError(err?.message || 'Could not access your camera or microphone.')}
          />
        </div>
        {error && <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        <button type="button" onClick={() => { setSession(null); setStage('form'); }} className="mt-4 text-sm text-white/50 hover:text-white">← Back</button>
      </div>
    );
  }

  if (stage === 'room' && session && choices) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <LiveKitRoom
          token={session.token}
          serverUrl={session.serverUrl}
          connect
          audio={choices.audioEnabled ? { deviceId: choices.audioDeviceId } : false}
          video={choices.videoEnabled ? { deviceId: choices.videoDeviceId } : false}
          onDisconnected={leave}
        >
          <RoomView room={session.room} isHost={isHost} onLeave={leave} onEnded={leave} />
        </LiveKitRoom>
      </div>
    );
  }

  return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl sm:p-8">
    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">BLW Kenya Zone</p><h1 className="mt-2 text-3xl font-bold text-white">Join a meeting</h1><p className="mt-2 text-white/55">Create or join a room for a live audio/video fellowship.</p>
    <label className="mt-8 block text-sm font-medium text-white/75" htmlFor="meeting-room">Meeting name</label>
    <input id="meeting-room" value={roomName} onChange={(event) => setRoomName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') goToLobby(); }} placeholder="e.g. campus-leaders" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-amber-300/50" />
    {error && <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    <button type="button" disabled={loading} onClick={goToLobby} className="mt-6 w-full rounded-2xl bg-amber-400 px-5 py-3 font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Connecting…' : 'Continue'}</button>
  </div></div>;
}
