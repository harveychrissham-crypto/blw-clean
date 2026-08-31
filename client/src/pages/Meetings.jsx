import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiCamera, FiCameraOff, FiMic, FiMicOff, FiMonitor, FiUsers, FiLogOut, FiCopy, FiPlus, FiPhoneOff } from 'react-icons/fi';
import { Room, RoomEvent, Track, VideoPresets, AudioPresets } from 'livekit-client';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';

export default function Meetings() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [room, setRoom] = useState(params.get('room') || '');
  const [joined, setJoined] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  async function createRoom() {
    setCreating(true); setError('');
    try {
      const res = await apiFetch('/api/video/rooms', { method: 'POST', body: JSON.stringify({ name: `fellowship-${Date.now().toString(36)}` }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to create room.');
      setRoom(data.room);
      window.history.replaceState({}, '', `/meetings?room=${encodeURIComponent(data.room)}`);
    } catch (e) { setError(e.message); } finally { setCreating(false); }
  }

  async function joinRoom() {
    const value = room.trim();
    if (!value) return setError('Enter a room code.');
    setError('');
    try {
      const res = await apiFetch('/api/video/token', { method: 'POST', body: JSON.stringify({ room_name: value, participant_name: user?.name || user?.email || 'BLW Member' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to join room.');
      setCredentials(data); setJoined(true);
    } catch (e) { setError(e.message); }
  }

  if (!user) return <section className="mx-auto max-w-3xl px-5 py-20 text-center"><h1 className="text-3xl font-bold">Meetings</h1><p className="mt-3 text-white/60">Sign in to create or join a fellowship meeting.</p><Link to="/auth" className="mt-7 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-black">Sign In</Link></section>;
  if (joined && credentials) return <CallRoom credentials={credentials} room={room} onLeave={() => { setJoined(false); setCredentials(null); }} />;

  return <section className="mx-auto max-w-4xl px-5 py-12 sm:py-16"><div className="mb-10"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#F2A31C]">Fellowship</p><h1 className="mt-2 text-4xl font-bold">Meetings</h1><p className="mt-3 max-w-2xl text-white/60">Gather for Bible studies, fellowship meetings and leadership calls.</p></div><div className="grid gap-5 sm:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><FiPlus className="h-6 w-6 text-[#F2A31C]"/><h2 className="mt-4 text-xl font-semibold">Create room</h2><p className="mt-2 text-sm text-white/55">Start an instant room and share its code with your group.</p><button disabled={creating} onClick={createRoom} className="mt-6 w-full rounded-2xl bg-white py-3 font-semibold text-black disabled:opacity-50">{creating ? 'Creating…' : 'Create meeting'}</button></div><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><FiUsers className="h-6 w-6 text-[#F2A31C]"/><h2 className="mt-4 text-xl font-semibold">Join room</h2><p className="mt-2 text-sm text-white/55">Enter a room code from your leader or fellowship group.</p><input value={room} onChange={e => setRoom(e.target.value)} placeholder="Room code" className="mt-5 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"/><button onClick={joinRoom} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#EC2FA8] to-[#8A2BE2] py-3 font-semibold">Join meeting</button></div></div>{room && <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"><span className="min-w-0 truncate text-white/60">Room: <b className="text-white">{room}</b></span><button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/meetings?room=${encodeURIComponent(room)}`)} className="inline-flex shrink-0 items-center gap-2 text-white/70 hover:text-white"><FiCopy/>Copy link</button></div>}{error && <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">{error}</p>}</section>;
}

function CallRoom({ credentials, room: roomName, onLeave }) {
  const roomRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [activeSpeakers, setActiveSpeakers] = useState(new Set());
  const [, rerender] = useState(0);

  useEffect(() => {
    let disposed = false;
    const liveRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: VideoPresets.h1080,
      publishDefaults: {
        videoEncoding: { maxBitrate: 4_000_000, maxFramerate: 30 },
        audioPreset: AudioPresets.music,
        audioEncoding: { maxBitrate: 128_000 },
      },
    });
    roomRef.current = liveRoom;
    const sync = () => { if (!disposed) { setParticipants(Array.from(liveRoom.remoteParticipants.values())); rerender(v => v + 1); } };
    liveRoom.on(RoomEvent.ParticipantConnected, sync).on(RoomEvent.ParticipantDisconnected, sync).on(RoomEvent.TrackSubscribed, sync).on(RoomEvent.TrackUnsubscribed, sync).on(RoomEvent.LocalTrackPublished, sync).on(RoomEvent.LocalTrackUnpublished, sync).on(RoomEvent.Disconnected, () => !disposed && onLeave());
    liveRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => { if (!disposed) setActiveSpeakers(new Set(speakers.map((p) => p.identity))); });
    (async () => {
      try {
        await liveRoom.connect(credentials.server_url, credentials.participant_token);
        if (disposed) return;
        await liveRoom.localParticipant.enableCameraAndMicrophone();
        if (disposed) return;
        setCamera(true);
        setMic(true);
        setConnected(true);
        sync();
      } catch (e) {
        if (!disposed) {
          if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') setError('Camera or microphone permission was denied. Allow both permissions and try again.');
          else setError(e.message || 'Unable to connect to meeting.');
        }
      }
    })();
    return () => { disposed = true; liveRoom.disconnect(); roomRef.current = null; };
  }, [credentials, onLeave]);

  async function toggleCamera() { try { const next = !camera; await roomRef.current?.localParticipant.setCameraEnabled(next); setCamera(next); } catch (e) { setError(e.message); } }
  async function toggleMic() { try { const next = !mic; await roomRef.current?.localParticipant.setMicrophoneEnabled(next); setMic(next); } catch (e) { setError(e.message); } }
  async function toggleShare() { try { const next = !sharing; await roomRef.current?.localParticipant.setScreenShareEnabled(next); setSharing(next); } catch (e) { setError(e.message); } }

  const local = roomRef.current?.localParticipant;
  const all = local ? [local, ...participants] : participants;
  return <section className="mx-auto max-w-7xl px-3 py-4 sm:px-5"><div className="mb-4 flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-xs uppercase tracking-widest text-[#F2A31C]">Live room</p><h1 className="truncate text-2xl font-bold">{roomName}</h1><p className="text-xs text-white/40">{connected ? `${all.length} participant${all.length === 1 ? '' : 's'}` : 'Connecting…'}</p></div><button onClick={onLeave} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm"><FiLogOut/>Leave</button></div><div className="grid min-h-[55vh] gap-3 sm:grid-cols-2 lg:grid-cols-3">{all.map((participant) => <ParticipantTile key={participant.identity} participant={participant} local={participant === local} speaking={activeSpeakers.has(participant.identity)} />)}{all.length === 0 && <div className="col-span-full grid place-items-center rounded-3xl border border-white/10 bg-black/30 text-white/45">Waiting for participants…</div>}</div><div className="sticky bottom-4 mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-[#11101d]/95 p-2 shadow-2xl backdrop-blur"><ControlButton active={camera} onClick={toggleCamera} onIcon={FiCamera} offIcon={FiCameraOff} label="Camera"/><ControlButton active={mic} onClick={toggleMic} onIcon={FiMic} offIcon={FiMicOff} label="Microphone"/><ControlButton active={sharing} onClick={toggleShare} onIcon={FiMonitor} offIcon={FiMonitor} label="Share screen"/><button onClick={onLeave} aria-label="Leave meeting" className="grid h-11 w-11 place-items-center rounded-full bg-red-500 text-white"><FiPhoneOff/></button></div>{error && <p className="mx-auto mt-4 max-w-xl rounded-2xl border border-red-400/20 bg-red-400/5 p-3 text-center text-sm text-red-200">{error}</p>}</section>;
}

function ControlButton({ active, onClick, onIcon: OnIcon, offIcon: OffIcon, label }) { const Icon = active ? OnIcon : OffIcon; return <button onClick={onClick} aria-label={label} title={label} className={`grid h-11 w-11 place-items-center rounded-full transition ${active ? 'bg-white/15 text-white' : 'bg-white/5 text-white/60 hover:text-white'}`}><Icon/></button>; }

function ParticipantTile({ participant, local, speaking }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [, rerender] = useState(0);
  useEffect(() => {
    const sync = () => rerender(v => v + 1);
    participant.on?.(RoomEvent.TrackPublished, sync).on?.(RoomEvent.TrackUnpublished, sync).on?.(RoomEvent.TrackSubscribed, sync).on?.(RoomEvent.TrackUnsubscribed, sync);
    return () => { participant.off?.(RoomEvent.TrackPublished, sync).off?.(RoomEvent.TrackUnpublished, sync).off?.(RoomEvent.TrackSubscribed, sync).off?.(RoomEvent.TrackUnsubscribed, sync); };
  }, [participant]);
  useEffect(() => {
    const video = participant.getTrackPublication?.(Track.Source.Camera)?.track;
    const screen = participant.getTrackPublication?.(Track.Source.ScreenShare)?.track;
    const track = screen || video;
    if (track && videoRef.current) track.attach(videoRef.current);
    const audioTrack = participant.getTrackPublication?.(Track.Source.Microphone)?.track;
    if (audioTrack && audioRef.current) audioTrack.attach(audioRef.current);
    return () => { try { track?.detach(videoRef.current); } catch {} };
  });
  const display = participant.name || participant.identity || 'Participant';
  const hasVideo = Boolean(participant.getTrackPublication?.(Track.Source.Camera)?.track || participant.getTrackPublication?.(Track.Source.ScreenShare)?.track);
  return <div className={`relative min-h-[220px] overflow-hidden rounded-3xl border bg-[#171624] transition-all duration-150 ${speaking ? 'border-[#34D399] shadow-[0_0_0_3px_rgba(52,211,153,0.55)]' : 'border-white/10'}`}><video ref={videoRef} autoPlay playsInline muted={local} className={`h-full min-h-[220px] w-full object-cover ${hasVideo ? '' : 'hidden'}`} /><audio ref={audioRef} autoPlay muted={local}/>{!hasVideo && <div className="grid h-full min-h-[220px] place-items-center"><div className={`grid h-16 w-16 place-items-center rounded-full text-xl font-bold transition-colors duration-150 ${speaking ? 'bg-[#34D399]/25 ring-2 ring-[#34D399]' : 'bg-white/10'}`}>{display.slice(0, 1).toUpperCase()}</div></div>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-sm font-medium">{display}{local ? ' · You' : ''}{speaking && <FiMic className="ml-2 inline h-3.5 w-3.5 text-[#34D399]" />}</div></div>;
}
