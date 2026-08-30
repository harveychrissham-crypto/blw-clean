import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiCamera, FiMic, FiMonitor, FiUsers, FiLogOut, FiCopy, FiPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/apiFetch';

export default function Meetings() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [room, setRoom] = useState(params.get('room') || '');
  const [joined, setJoined] = useState(false);
  const [token, setToken] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  async function createRoom() {
    setCreating(true); setError('');
    try {
      const res = await apiFetch('/api/video/rooms', { method: 'POST', body: JSON.stringify({ name: `Bible-study-${Date.now().toString(36)}` }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to create room.');
      setRoom(data.room);
      window.history.replaceState({}, '', `/meetings?room=${encodeURIComponent(data.room)}`);
    } catch (e) { setError(e.message); } finally { setCreating(false); }
  }

  async function joinRoom() {
    if (!room.trim()) return setError('Enter a room code.');
    setError('');
    try {
      const res = await apiFetch('/api/video/token', { method: 'POST', body: JSON.stringify({ room: room.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to join room.');
      setToken(data.token); setUrl(data.url); setJoined(true);
    } catch (e) { setError(e.message); }
  }

  if (!user) return <section className="mx-auto max-w-3xl px-5 py-20 text-center"><h1 className="text-3xl font-bold">Meetings</h1><p className="mt-3 text-white/60">Sign in to create or join a fellowship meeting.</p><Link to="/auth" className="mt-7 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-black">Sign In</Link></section>;

  if (joined) return <CallRoom token={token} url={url} room={room} onLeave={() => setJoined(false)} />;

  return <section className="mx-auto max-w-4xl px-5 py-12 sm:py-16"><div className="mb-10"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#F2A31C]">Fellowship</p><h1 className="mt-2 text-4xl font-bold">Meetings</h1><p className="mt-3 max-w-2xl text-white/60">Gather for Bible studies, fellowship meetings and leadership calls.</p></div><div className="grid gap-5 sm:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><FiPlus className="h-6 w-6 text-[#F2A31C]"/><h2 className="mt-4 text-xl font-semibold">Create room</h2><p className="mt-2 text-sm text-white/55">Start an instant room and share its code with your group.</p><button disabled={creating} onClick={createRoom} className="mt-6 w-full rounded-2xl bg-white py-3 font-semibold text-black disabled:opacity-50">{creating ? 'Creating…' : 'Create meeting'}</button></div><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><FiUsers className="h-6 w-6 text-[#F2A31C]"/><h2 className="mt-4 text-xl font-semibold">Join room</h2><p className="mt-2 text-sm text-white/55">Enter a room code from your leader or fellowship group.</p><input value={room} onChange={e => setRoom(e.target.value)} placeholder="Room code" className="mt-5 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"/><button onClick={joinRoom} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#EC2FA8] to-[#8A2BE2] py-3 font-semibold">Join meeting</button></div></div>{room && <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"><span className="text-white/60">Room: <b className="text-white">{room}</b></span><button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/meetings?room=${encodeURIComponent(room)}`)} className="inline-flex items-center gap-2 text-white/70 hover:text-white"><FiCopy/>Copy link</button></div>}{error && <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">{error}</p>}</section>;
}

function CallRoom({ token, url, room, onLeave }) {
  const [local, setLocal] = useState(null);
  useEffect(() => { let disposed = false; (async () => { try { const { Room, RoomEvent } = await import('livekit-client'); const r = new Room(); await r.connect(url, token); if (!disposed) { setLocal(r); r.on(RoomEvent.Disconnected, onLeave); } } catch (e) { console.error(e); } })(); return () => { disposed = true; local?.disconnect(); }; }, []);
  return <section className="mx-auto max-w-6xl px-4 py-6 sm:px-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-[#F2A31C]">Live room</p><h1 className="text-2xl font-bold">{room}</h1></div><button onClick={() => { local?.disconnect(); onLeave(); }} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm"><FiLogOut/>Leave</button></div><div className="grid min-h-[55vh] place-items-center rounded-3xl border border-white/10 bg-black/30"><div className="text-center"><FiCamera className="mx-auto h-10 w-10 text-white/30"/><p className="mt-3 text-white/60">LiveKit room connected.</p><p className="mt-1 text-xs text-white/35">Participant media controls will appear here once LiveKit UI components are installed.</p></div></div></section>;
}
