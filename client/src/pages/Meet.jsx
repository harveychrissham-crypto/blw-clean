import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { ControlBar, GridLayout, LiveKitRoom, ParticipantTile, RoomAudioRenderer, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

function RoomView({ onLeave }) {
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
      <RoomAudioRenderer />
    </div>
  );
}

export default function Meet() {
  const { user } = useAuth();
  const [roomName, setRoomName] = useState('blw-meeting');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const participantName = useMemo(() => String(user?.name || user?.full_name || user?.email?.split('@')[0] || 'BLW Member').slice(0, 80), [user]);

  const joinRoom = async () => {
    const normalized = roomName.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    if (!normalized) return setError('Enter a meeting name.');
    setLoading(true); setError('');
    try {
      const response = await apiFetch('/api/livekit/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_name: normalized, participant_name: participantName }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Unable to create a LiveKit session.');
      setSession({ token: body.participant_token, serverUrl: body.server_url });
    } catch (err) { setError(err?.message || 'Unable to join the meeting.'); }
    finally { setLoading(false); }
  };

  if (!user) return <div className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-3xl font-bold text-white">Meetings</h1><p className="mt-3 text-white/60">Sign in to join a BLW meeting.</p></div>;
  if (session) return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><LiveKitRoom token={session.token} serverUrl={session.serverUrl} connect audio={false} video={false} onDisconnected={() => setSession(null)}><RoomView onLeave={() => setSession(null)} /></LiveKitRoom></div>;

  return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl sm:p-8">
    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">BLW Kenya Zone</p><h1 className="mt-2 text-3xl font-bold text-white">Join a meeting</h1><p className="mt-2 text-white/55">Create or join a room for a live audio/video fellowship.</p>
    <label className="mt-8 block text-sm font-medium text-white/75" htmlFor="meeting-room">Meeting name</label>
    <input id="meeting-room" value={roomName} onChange={(event) => setRoomName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') joinRoom(); }} placeholder="e.g. campus-leaders" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-amber-300/50" />
    {error && <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    <button type="button" disabled={loading} onClick={joinRoom} className="mt-6 w-full rounded-2xl bg-amber-400 px-5 py-3 font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Connecting…' : 'Join meeting'}</button>
  </div></div>;
}
