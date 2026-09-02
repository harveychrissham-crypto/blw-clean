import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiCamera, FiCameraOff, FiMic, FiMicOff, FiMonitor, FiUsers, FiLogOut, FiCopy, FiPlus, FiPhoneOff, FiMessageSquare, FiLock, FiUnlock, FiUserX, FiSend, FiWifi, FiWifiOff, FiX, FiMaximize2, FiMinimize2, FiChevronLeft, FiChevronRight, FiDroplet, FiMoreHorizontal, FiCheck, FiUserPlus, FiUserCheck, FiVideo, FiClock } from 'react-icons/fi';
import { Room, RoomEvent, ParticipantEvent, Track, VideoPresets, AudioPresets, DeviceUnsupportedError, DisconnectReason, ConnectionQuality } from 'livekit-client';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🙏', '👏'];
const DEVICE_PREFS_KEY = 'blw-meet-device-prefs';

function loadDevicePrefs() {
  try { return JSON.parse(localStorage.getItem(DEVICE_PREFS_KEY) || '{}') || {}; } catch { return {}; }
}
function saveDevicePrefs(prefs) {
  try { localStorage.setItem(DEVICE_PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage may be unavailable (private browsing) — not critical */ }
}
function isPendingParticipant(p) {
  try { return JSON.parse(p?.metadata || '{}')?.pending === true; } catch { return false; }
}

export default function Meetings() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [room, setRoom] = useState(params.get('room') || '');
  const [stage, setStage] = useState('form'); // 'form' | 'lobby' | 'room'
  const [credentials, setCredentials] = useState(null);
  const [choices, setChoices] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [leaveNotice, setLeaveNotice] = useState('');

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

  async function goToLobby() {
    const value = room.trim();
    if (!value) return setError('Enter a room code.');
    setError(''); setLeaveNotice('');
    try {
      const res = await apiFetch('/api/video/token', { method: 'POST', body: JSON.stringify({ room_name: value, participant_name: user?.name || user?.email || 'BLW Member' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (res.status === 423 ? 'This meeting is locked by the host.' : 'Unable to join room.'));
      setCredentials(data);
      setStage('lobby');
    } catch (e) { setError(e.message); }
  }

  function handleLeave(reason) {
    setStage('form'); setCredentials(null); setChoices(null);
    if (reason === 'removed') setLeaveNotice('You were removed from the meeting by the host.');
    else if (reason === 'ended') setLeaveNotice('The host ended this meeting.');
    else if (reason === 'lost') setLeaveNotice('You got disconnected unexpectedly. Check your connection and try rejoining.');
    else setLeaveNotice('');
  }

  if (!user) return <section className="mx-auto max-w-3xl px-5 py-20 text-center"><h1 className="text-3xl font-bold">Meetings</h1><p className="mt-3 text-white/60">Sign in to create or join a fellowship meeting.</p><Link to="/auth" className="mt-7 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-black">Sign In</Link></section>;

  if (stage === 'lobby' && credentials) {
    return <Lobby
      participantName={user?.name || user?.email || 'BLW Member'}
      onCancel={() => { setStage('form'); setCredentials(null); }}
      onJoin={(values) => { setChoices(values); setStage('room'); }}
    />;
  }

  if (stage === 'room' && credentials && choices) {
    return <CallRoom credentials={credentials} choices={choices} room={room} onLeave={handleLeave} />;
  }

  return <section className="mx-auto max-w-4xl px-5 py-12 sm:py-16"><div className="mb-10"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#F2A31C]">Fellowship</p><h1 className="mt-2 text-4xl font-bold">Meetings</h1><p className="mt-3 max-w-2xl text-white/60">Gather for Bible studies, fellowship meetings and leadership calls.</p></div>{leaveNotice && <p className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">{leaveNotice}</p>}<div className="grid gap-5 sm:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><FiPlus className="h-6 w-6 text-[#F2A31C]"/><h2 className="mt-4 text-xl font-semibold">Create room</h2><p className="mt-2 text-sm text-white/55">Start an instant room and share its code with your group.</p><button disabled={creating} onClick={createRoom} className="mt-6 w-full rounded-2xl bg-white py-3 font-semibold text-black disabled:opacity-50">{creating ? 'Creating…' : 'Create meeting'}</button></div><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><FiUsers className="h-6 w-6 text-[#F2A31C]"/><h2 className="mt-4 text-xl font-semibold">Join room</h2><p className="mt-2 text-sm text-white/55">Enter a room code from your leader or fellowship group.</p><input value={room} onChange={e => setRoom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') goToLobby(); }} placeholder="Room code" className="mt-5 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30"/><button onClick={goToLobby} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#EC2FA8] to-[#8A2BE2] py-3 font-semibold">Join meeting</button></div></div>{room && <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"><span className="min-w-0 truncate text-white/60">Room: <b className="text-white">{room}</b></span><button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/meetings?room=${encodeURIComponent(room)}`)} className="inline-flex shrink-0 items-center gap-2 text-white/70 hover:text-white"><FiCopy/>Copy link</button></div>}{error && <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">{error}</p>}</section>;
}

function Lobby({ participantName, onCancel, onJoin }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const savedPrefs = useRef(loadDevicePrefs()).current;
  const [devices, setDevices] = useState({ cams: [], mics: [], speakers: [] });
  const [camId, setCamId] = useState(savedPrefs.camId || '');
  const [micId, setMicId] = useState(savedPrefs.micId || '');
  const [speakerId, setSpeakerId] = useState(savedPrefs.speakerId || '');
  const [camOn, setCamOn] = useState(savedPrefs.camOn ?? true);
  const [micOn, setMicOn] = useState(savedPrefs.micOn ?? true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const stopStream = useCallback(() => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; }, []);

  const startPreview = useCallback(async (constraints) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stopStream();
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      stream.getVideoTracks().forEach((t) => { t.enabled = camOn; });
      stream.getAudioTracks().forEach((t) => { t.enabled = micOn; });
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        cams: list.filter((d) => d.kind === 'videoinput'),
        mics: list.filter((d) => d.kind === 'audioinput'),
        speakers: list.filter((d) => d.kind === 'audiooutput'),
      });
      const vTrack = stream.getVideoTracks()[0];
      const aTrack = stream.getAudioTracks()[0];
      if (vTrack) setCamId(vTrack.getSettings().deviceId || '');
      if (aTrack) setMicId(aTrack.getSettings().deviceId || '');
      setReady(true);
    } catch (e) {
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') setError('Camera or microphone permission was denied. Allow both to preview your devices, then try again.');
      else setError(e?.message || 'Unable to access your camera or microphone.');
      setReady(true);
    }
  }, [camOn, micOn, stopStream]);

  useEffect(() => {
    // Use the remembered device as a soft preference (ideal, not exact) so a
    // no-longer-connected device from a previous session falls back to the
    // default instead of throwing OverconstrainedError.
    startPreview({
      video: savedPrefs.camId ? { deviceId: { ideal: savedPrefs.camId } } : true,
      audio: savedPrefs.micId ? { deviceId: { ideal: savedPrefs.micId } } : true,
    });
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCam = () => {
    const next = !camOn; setCamOn(next);
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
  };
  const toggleMic = () => {
    const next = !micOn; setMicOn(next);
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
  };
  const changeCam = (id) => { setCamId(id); startPreview({ video: { deviceId: { exact: id } }, audio: micId ? { deviceId: { exact: micId } } : true }); };
  const changeMic = (id) => { setMicId(id); startPreview({ video: camId ? { deviceId: { exact: camId } } : true, audio: { deviceId: { exact: id } } }); };

  const join = () => {
    stopStream();
    const values = { videoEnabled: camOn, audioEnabled: micOn, videoDeviceId: camId, audioDeviceId: micId, audioOutputDeviceId: speakerId };
    saveDevicePrefs({ camId, micId, speakerId, camOn, micOn });
    onJoin(values);
  };

  return (
    <section className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      <h1 className="mb-5 text-2xl font-bold text-white">Check your camera and mic</h1>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d0c18]">
        <div className="relative aspect-video bg-[#3c4043]">
          <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full scale-x-[-1] object-cover ${camOn ? '' : 'hidden'}`} />
          {!camOn && <div className="grid h-full place-items-center text-white/40"><FiCameraOff className="h-10 w-10" /></div>}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
            <button type="button" onClick={toggleMic} className={`grid h-11 w-11 place-items-center rounded-full ${micOn ? 'bg-white/15 text-white' : 'bg-red-500 text-white'}`}>{micOn ? <FiMic /> : <FiMicOff />}</button>
            <button type="button" onClick={toggleCam} className={`grid h-11 w-11 place-items-center rounded-full ${camOn ? 'bg-white/15 text-white' : 'bg-red-500 text-white'}`}>{camOn ? <FiCamera /> : <FiCameraOff />}</button>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <label className="text-xs text-white/50">Camera
            <select value={camId} onChange={(e) => changeCam(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-xs text-white outline-none">
              {devices.cams.length === 0 && <option value="">Default camera</option>}
              {devices.cams.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/50">Microphone
            <select value={micId} onChange={(e) => changeMic(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-xs text-white outline-none">
              {devices.mics.length === 0 && <option value="">Default microphone</option>}
              {devices.mics.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/50">Speaker
            <select value={speakerId} onChange={(e) => setSpeakerId(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-xs text-white outline-none">
              <option value="">Default speaker</option>
              {devices.speakers.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Speaker'}</option>)}
            </select>
          </label>
        </div>
      </div>
      {error && <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <div className="mt-5 flex items-center justify-between">
        <button type="button" onClick={() => { stopStream(); onCancel(); }} className="text-sm text-white/50 hover:text-white">← Back</button>
        <button type="button" disabled={!ready} onClick={join} className="rounded-2xl bg-gradient-to-r from-[#EC2FA8] to-[#8A2BE2] px-6 py-3 font-semibold text-white disabled:opacity-50">Join meeting</button>
      </div>
    </section>
  );
}

function CallRoom({ credentials, choices, room: roomName, onLeave }) {
  const roomRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connState, setConnState] = useState('connecting'); // connecting | connected | reconnecting
  const [participants, setParticipants] = useState([]);
  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [activeSpeakers, setActiveSpeakers] = useState(new Set());
  const [showChat, setShowChat] = useState(false);
  const [showHost, setShowHost] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [locked, setLocked] = useState(false);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(Boolean(credentials?.pending));
  const [pinnedId, setPinnedId] = useState(null);
  const [page, setPage] = useState(0);
  const [blurOn, setBlurOn] = useState(false);
  const [blurBusy, setBlurBusy] = useState(false);
  const blurProcessorRef = useRef(null);
  const [, rerender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/video/rooms/${encodeURIComponent(roomName)}/status`);
        const body = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) { setIsHost(body.isHost === true); setLocked(body.locked === true); setWaitingRoomEnabled(body.waitingRoom === true); setRecording(body.recording === true); }
      } catch { /* leave defaults — host controls just stay hidden */ }
    })();
    return () => { cancelled = true; };
  }, [roomName]);

  const openChat = () => setShowChat((v) => { const next = !v; if (next) { setShowHost(false); setShowMore(false); } return next; });
  const openHost = () => setShowHost((v) => { const next = !v; if (next) { setShowChat(false); setShowMore(false); } return next; });
  const openMore = () => setShowMore((v) => { const next = !v; if (next) { setShowChat(false); setShowHost(false); } return next; });

  useEffect(() => {
    if (!showChat && !showHost && !showMore) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setShowChat(false); setShowHost(false); setShowMore(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showChat, showHost, showMore]);

  useEffect(() => {
    if (!pinnedId) return;
    const localId = roomRef.current?.localParticipant?.identity;
    const stillHere = pinnedId === localId || participants.some((p) => p.identity === pinnedId);
    if (!stillHere) setPinnedId(null);
  }, [participants, pinnedId]);

  useEffect(() => {
    let disposed = false;
    let isPending = false; // internal flag mirroring `pending` state, kept outside React state to avoid stale closures in the event handlers below
    const liveRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h720.resolution, facingMode: 'user' },
      publishDefaults: {
        videoEncoding: { maxBitrate: 1_700_000, maxFramerate: 30 },
        audioPreset: AudioPresets.music,
        audioEncoding: { maxBitrate: 128_000 },
      },
    });
    roomRef.current = liveRoom;
    const sync = () => { if (!disposed) { setParticipants(Array.from(liveRoom.remoteParticipants.values())); rerender(v => v + 1); } };
    liveRoom.on(RoomEvent.ParticipantConnected, sync).on(RoomEvent.ParticipantDisconnected, sync).on(RoomEvent.TrackSubscribed, sync).on(RoomEvent.TrackUnsubscribed, sync).on(RoomEvent.LocalTrackPublished, sync).on(RoomEvent.LocalTrackUnpublished, sync).on(RoomEvent.ParticipantMetadataChanged, sync);
    liveRoom.on(RoomEvent.Disconnected, (reason) => {
      if (disposed) return;
      let mapped = '';
      if (reason === DisconnectReason.PARTICIPANT_REMOVED) mapped = 'removed';
      else if (reason === DisconnectReason.ROOM_DELETED) mapped = 'ended';
      else if (reason !== DisconnectReason.CLIENT_INITIATED) mapped = 'lost';
      onLeave(mapped);
    });
    liveRoom.on(RoomEvent.Reconnecting, () => !disposed && setConnState('reconnecting'));
    liveRoom.on(RoomEvent.SignalReconnecting, () => !disposed && setConnState('reconnecting'));
    liveRoom.on(RoomEvent.Reconnected, () => !disposed && setConnState('connected'));
    liveRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => { if (!disposed) setActiveSpeakers(new Set(speakers.map((p) => p.identity))); });
    liveRoom.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
      if (disposed || topic !== 'recording') return;
      try { const data = JSON.parse(new TextDecoder().decode(payload)); setRecording(Boolean(data.recording)); } catch { /* ignore malformed payload */ }
    });
    const applyChoices = async () => {
      if (choices?.videoEnabled) await liveRoom.localParticipant.setCameraEnabled(true, choices.videoDeviceId ? { deviceId: choices.videoDeviceId } : undefined).catch(() => {});
      if (choices?.audioEnabled) await liveRoom.localParticipant.setMicrophoneEnabled(true, choices.audioDeviceId ? { deviceId: choices.audioDeviceId } : undefined).catch(() => {});
      if (choices?.audioOutputDeviceId) await liveRoom.switchActiveDevice('audiooutput', choices.audioOutputDeviceId).catch(() => {});
      setCamera(!!choices?.videoEnabled);
      setMic(!!choices?.audioEnabled);
    };
    const admissionCheck = async (participant) => {
      if (disposed || !isPending || participant !== liveRoom.localParticipant) return;
      let stillPending = true;
      try { stillPending = JSON.parse(liveRoom.localParticipant.metadata || '{}')?.pending === true; } catch { /* treat unparsable metadata as no longer pending */ stillPending = false; }
      if (stillPending) return;
      isPending = false;
      setPending(false);
      try { await applyChoices(); } catch (e) { setError(e?.message || 'Admitted, but unable to start your camera/mic automatically — use the controls below.'); }
    };
    liveRoom.on(RoomEvent.ParticipantPermissionsChanged, (_prev, participant) => admissionCheck(participant));
    liveRoom.on(RoomEvent.ParticipantMetadataChanged, (_metadata, participant) => admissionCheck(participant));
    (async () => {
      try {
        await liveRoom.connect(credentials.server_url, credentials.participant_token);
        if (disposed) return;
        try { isPending = JSON.parse(liveRoom.localParticipant.metadata || '{}')?.pending === true; } catch { isPending = false; }
        setPending(isPending);
        if (!isPending) await applyChoices();
        if (disposed) return;
        setConnected(true);
        setConnState('connected');
        sync();
      } catch (e) {
        if (!disposed) {
          if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') setError('Camera or microphone permission was denied. Allow both permissions and try again.');
          else setError(e.message || 'Unable to connect to meeting.');
        }
      }
    })();
    return () => { disposed = true; liveRoom.disconnect(); roomRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials]);

  const screenShareSupported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia);

  async function toggleCamera() { try { const next = !camera; await roomRef.current?.localParticipant.setCameraEnabled(next); setCamera(next); if (!next) setBlurOn(false); } catch (e) { setError(e.message); } }
  async function toggleMic() { try { const next = !mic; await roomRef.current?.localParticipant.setMicrophoneEnabled(next); setMic(next); } catch (e) { setError(e.message); } }
  async function toggleShare() {
    if (!screenShareSupported) { setError('Screen sharing is not supported on this device. Try from a desktop browser instead.'); return; }
    try {
      const next = !sharing;
      await roomRef.current?.localParticipant.setScreenShareEnabled(next);
      setSharing(next);
    } catch (e) {
      if (e instanceof DeviceUnsupportedError) setError('Screen sharing is not supported on this device. Try from a desktop browser instead.');
      else if (e?.name === 'NotAllowedError') setError('Screen share permission was dismissed.');
      else setError(e.message || 'Unable to start screen share.');
    }
  }
  function leaveVoluntarily() { onLeave(''); }

  const changeRecording = (next) => {
    setRecording(next);
    try { roomRef.current?.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ recording: next })), { reliable: true, topic: 'recording' }); } catch { /* best-effort broadcast */ }
  };

  async function toggleBlur() {
    const track = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (!track) { setError('Turn your camera on first, then enable background blur.'); return; }
    setBlurBusy(true); setError('');
    try {
      if (blurOn) {
        await track.stopProcessor();
        setBlurOn(false);
      } else {
        const { BackgroundProcessor, supportsBackgroundProcessors } = await import('@livekit/track-processors');
        if (!supportsBackgroundProcessors()) { setError("Background blur isn't supported on this browser or device."); return; }
        if (!blurProcessorRef.current) blurProcessorRef.current = BackgroundProcessor({ mode: 'background-blur', blurRadius: 10 });
        await track.setProcessor(blurProcessorRef.current);
        setBlurOn(true);
      }
    } catch (e) {
      setError(e?.message || 'Unable to change background blur. Your device may not support it.');
    } finally {
      setBlurBusy(false);
    }
  }

  const local = roomRef.current?.localParticipant;
  const activeParticipants = participants.filter((p) => !isPendingParticipant(p));
  const all = local ? [local, ...activeParticipants] : activeParticipants;
  const screenSharer = all.find((p) => p.getTrackPublication?.(Track.Source.ScreenShare)?.track);
  const pinnedParticipant = pinnedId ? all.find((p) => p.identity === pinnedId) : null;
  const focus = screenSharer || pinnedParticipant;

  const PAGE_SIZE = 9;
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageStart = clampedPage * PAGE_SIZE;
  const pageParticipants = all.slice(pageStart, pageStart + PAGE_SIZE);

  const gridArea = focus
    ? <div className="space-y-3">
        <ParticipantTile participant={focus} local={focus === local} speaking={activeSpeakers.has(focus.identity)} pinned={focus === pinnedParticipant} onTogglePin={() => setPinnedId((id) => (id === focus.identity ? null : focus.identity))} big />
        {all.length > 1 && <div className="flex gap-3 overflow-x-auto pb-1">{all.filter((p) => p !== focus).map((participant) => <div key={participant.identity} className="w-40 shrink-0 sm:w-48"><ParticipantTile participant={participant} local={participant === local} speaking={activeSpeakers.has(participant.identity)} pinned={false} onTogglePin={() => setPinnedId(participant.identity)} /></div>)}</div>}
      </div>
    : <div>
        <div className="grid min-h-[55vh] gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pageParticipants.map((participant) => <ParticipantTile key={participant.identity} participant={participant} local={participant === local} speaking={activeSpeakers.has(participant.identity)} pinned={false} onTogglePin={() => setPinnedId(participant.identity)} />)}
          {all.length === 1 && <div className="col-span-full grid place-items-center rounded-3xl border border-white/10 bg-black/30 px-6 py-10 text-center text-white/45"><FiUsers className="mx-auto mb-2 h-6 w-6" /><p className="font-medium text-white/60">You're the only one here</p><p className="mt-1 text-xs">Share the room code and others will show up as soon as they join.</p></div>}
        </div>
        {pageCount > 1 && (
          <div className="mt-3 flex items-center justify-center gap-3 text-sm text-white/60">
            <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={clampedPage === 0} aria-label="Previous page" className="grid h-8 w-8 place-items-center rounded-full bg-white/5 disabled:opacity-30"><FiChevronLeft/></button>
            <span>Page {clampedPage + 1} of {pageCount}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={clampedPage === pageCount - 1} aria-label="Next page" className="grid h-8 w-8 place-items-center rounded-full bg-white/5 disabled:opacity-30"><FiChevronRight/></button>
          </div>
        )}
      </div>;

  if (pending) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center" role="status" aria-live="polite">
        <div className="mb-5 h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-white/70" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-white">Waiting for the host to let you in…</h1>
        <p className="mt-2 text-sm text-white/50">This meeting has a waiting room. You'll join automatically as soon as a host admits you.</p>
        <button type="button" onClick={leaveVoluntarily} className="mt-6 rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/70 hover:text-white">Cancel</button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-3 py-4 sm:px-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#F2A31C]">Live room{recording && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-red-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" aria-hidden="true" />Recording</span>}</p>
          <h1 className="truncate text-2xl font-bold">{roomName}</h1>
          <p className="text-xs text-white/40">{connState === 'reconnecting' ? 'Reconnecting…' : connected ? `${all.length} participant${all.length === 1 ? '' : 's'}` : 'Connecting…'}</p>
        </div>
        <button onClick={leaveVoluntarily} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm"><FiLogOut/>Leave</button>
      </div>
      {connState === 'reconnecting' && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-sm text-amber-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" /> Reconnecting — hang on, trying to get you back into the meeting…
        </div>
      )}
      {gridArea}
      <ReactionsBar liveRoom={roomRef.current} localParticipant={local} participants={participants} />
      <div className="sticky bottom-4 mx-auto mt-4 flex w-fit flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-[#11101d]/95 p-2 shadow-2xl backdrop-blur">
        <ControlButton active={camera} onClick={toggleCamera} onIcon={FiCamera} offIcon={FiCameraOff} label="Camera"/>
        <ControlButton active={mic} onClick={toggleMic} onIcon={FiMic} offIcon={FiMicOff} label="Microphone"/>
        <div className="relative">
          <ControlButton active={showMore || sharing || blurOn} onClick={openMore} onIcon={FiMoreHorizontal} offIcon={FiMoreHorizontal} label="More options"/>
          {showMore && (
            <>
              <button type="button" aria-label="Close menu" onClick={() => setShowMore(false)} className="fixed inset-0 z-30 cursor-default" />
              <div className="absolute bottom-full left-1/2 z-40 mb-3 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1926] shadow-2xl">
                <button type="button" onClick={() => { toggleShare(); setShowMore(false); }} disabled={!screenShareSupported} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white/85 hover:bg-white/5 disabled:cursor-not-allowed disabled:text-white/30">
                  <FiMonitor className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{screenShareSupported ? 'Share screen' : 'Screen sharing not supported'}</span>
                  {sharing && <FiCheck className="h-4 w-4 shrink-0 text-amber-300" />}
                </button>
                <button type="button" onClick={() => { toggleBlur(); setShowMore(false); }} disabled={blurBusy || !camera} className="flex w-full items-center gap-3 border-t border-white/5 px-4 py-3 text-left text-sm text-white/85 hover:bg-white/5 disabled:cursor-not-allowed disabled:text-white/30">
                  <FiDroplet className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{blurBusy ? 'Loading blur…' : camera ? 'Blur my background' : 'Turn camera on to blur'}</span>
                  {blurOn && <FiCheck className="h-4 w-4 shrink-0 text-amber-300" />}
                </button>
              </div>
            </>
          )}
        </div>
        <ControlButton active={showChat} onClick={openChat} onIcon={FiMessageSquare} offIcon={FiMessageSquare} label="Chat"/>
        {isHost && <ControlButton active={showHost} onClick={openHost} onIcon={FiUsers} offIcon={FiUsers} label="Host controls"/>}
        <button onClick={leaveVoluntarily} aria-label="Leave meeting" className="grid h-11 w-11 place-items-center rounded-full bg-red-500 text-white"><FiPhoneOff/></button>
      </div>
      {error && <p className="mx-auto mt-4 max-w-xl rounded-2xl border border-red-400/20 bg-red-400/5 p-3 text-center text-sm text-red-200">{error}</p>}
      <ChatPanel liveRoom={roomRef.current} open={showChat} onClose={() => setShowChat(false)} />
      {isHost && <HostPanel roomName={roomName} open={showHost} onClose={() => setShowHost(false)} participants={participants} locked={locked} setLocked={setLocked} waitingRoomEnabled={waitingRoomEnabled} setWaitingRoomEnabled={setWaitingRoomEnabled} recording={recording} onRecordingChange={changeRecording} onEnded={() => onLeave('ended')} />}
    </section>
  );
}

function ControlButton({ active, onClick, onIcon: OnIcon, offIcon: OffIcon, label, disabled }) { const Icon = active ? OnIcon : OffIcon; return <button onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`grid h-11 w-11 place-items-center rounded-full transition ${disabled ? 'cursor-not-allowed bg-white/5 text-white/25' : active ? 'bg-white/15 text-white' : 'bg-white/5 text-white/60 hover:text-white'}`}><Icon/></button>; }

function ConnectionQualityIcon({ quality }) {
  if (quality === ConnectionQuality.Poor) return <FiWifi className="h-3 w-3 text-amber-400" />;
  if (quality === ConnectionQuality.Lost) return <FiWifiOff className="h-3 w-3 text-red-400" />;
  return null;
}

function ParticipantTile({ participant, local, speaking, pinned, onTogglePin, big }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [, rerender] = useState(0);
  useEffect(() => {
    const sync = () => rerender(v => v + 1);
    participant.on?.(RoomEvent.TrackPublished, sync).on?.(RoomEvent.TrackUnpublished, sync).on?.(RoomEvent.TrackSubscribed, sync).on?.(RoomEvent.TrackUnsubscribed, sync).on?.(RoomEvent.TrackMuted, sync).on?.(RoomEvent.TrackUnmuted, sync).on?.(ParticipantEvent.ConnectionQualityChanged, sync);
    return () => { participant.off?.(RoomEvent.TrackPublished, sync).off?.(RoomEvent.TrackUnpublished, sync).off?.(RoomEvent.TrackSubscribed, sync).off?.(RoomEvent.TrackUnsubscribed, sync).off?.(RoomEvent.TrackMuted, sync).off?.(RoomEvent.TrackUnmuted, sync).off?.(ParticipantEvent.ConnectionQualityChanged, sync); };
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
  const hasScreenShare = Boolean(participant.getTrackPublication?.(Track.Source.ScreenShare)?.track);
  const hasVideo = hasScreenShare || Boolean(participant.getTrackPublication?.(Track.Source.Camera)?.track);
  const micOn = Boolean(participant.isMicrophoneEnabled);
  const avatarPalette = ['#8A2BE2', '#EC2FA8', '#1a73e8', '#F2A31C', '#34D399', '#E85D75'];
  const avatarColor = avatarPalette[String(display).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % avatarPalette.length];
  return (
    <div className={`group relative overflow-hidden rounded-xl bg-[#3c4043] transition-all duration-150 ${big ? 'aspect-video sm:aspect-[16/8]' : 'aspect-video'} ${speaking ? 'ring-[3px] ring-[#8AB4F8]' : 'ring-1 ring-black/20'}`}>
      <video ref={videoRef} autoPlay playsInline muted={local} className={`h-full w-full object-cover ${hasVideo ? '' : 'hidden'} ${local && !hasScreenShare ? 'scale-x-[-1]' : ''}`} />
      <audio ref={audioRef} autoPlay muted={local} />
      {!hasVideo && (
        <div className="grid h-full place-items-center">
          <div
            className={`grid place-items-center rounded-full font-semibold text-white shadow-lg transition-all duration-150 ${big ? 'h-28 w-28 text-4xl sm:h-36 sm:w-36' : 'h-20 w-20 text-2xl sm:h-24 sm:w-24'} ${speaking ? 'ring-[3px] ring-[#8AB4F8] ring-offset-2 ring-offset-[#3c4043]' : ''}`}
            style={{ backgroundColor: avatarColor }}
          >
            {display.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}
      {hasScreenShare && <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur">Presenting</div>}
      {onTogglePin && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          aria-label={pinned ? 'Unpin from spotlight' : 'Pin to spotlight'}
          title={pinned ? 'Unpin from spotlight' : 'Pin to spotlight'}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white/80 opacity-70 backdrop-blur-sm transition-opacity hover:opacity-100"
        >
          {pinned ? <FiMinimize2 className="h-3.5 w-3.5" /> : <FiMaximize2 className="h-3.5 w-3.5" />}
        </button>
      )}
      <div className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 backdrop-blur-sm">
        <ConnectionQualityIcon quality={participant.connectionQuality} />
        <span className="truncate text-xs font-medium text-white">{display}{local ? ' (You)' : ''}</span>
      </div>
      {!micOn && (
        <div className="absolute bottom-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-black/55 backdrop-blur-sm">
          <FiMicOff className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </div>
  );
}

function ChatPanel({ liveRoom, open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (!liveRoom) return undefined;
    const handler = (message, participant) => {
      setMessages((prev) => [...prev, { id: message.id, text: message.message, name: participant?.isLocal ? 'You' : (participant?.name || 'BLW Member'), isLocal: !!participant?.isLocal }]);
    };
    liveRoom.on(RoomEvent.ChatMessage, handler);
    return () => liveRoom.off(RoomEvent.ChatMessage, handler);
  }, [liveRoom]);

  useEffect(() => { if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages, open]);

  const send = async () => {
    const value = text.trim();
    if (!value || !liveRoom) return;
    setText('');
    try { await liveRoom.localParticipant.sendChatMessage(value); } catch { /* best effort delivery */ }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 top-24 z-30 flex flex-col rounded-3xl border border-white/10 bg-[#11101d]/98 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:top-28 sm:h-[28rem] sm:w-80">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-white">In-call chat</p>
        <button onClick={onClose} className="text-white/50 hover:text-white"><FiX/></button>
      </div>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && <p className="text-xs text-white/40">No messages yet. Say hello!</p>}
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.isLocal ? 'ml-auto bg-[#8A2BE2]/40 text-white' : 'bg-white/[0.06] text-white/85'}`}>
            {!m.isLocal && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">{m.name}</p>}
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="Message everyone" className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <button onClick={send} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#8A2BE2] text-white"><FiSend className="h-4 w-4"/></button>
      </div>
    </div>
  );
}

function ReactionsBar({ liveRoom, localParticipant, participants }) {
  const [bubbles, setBubbles] = useState([]);
  const [raisedHands, setRaisedHands] = useState({});
  const [handRaised, setHandRaised] = useState(false);
  const bubbleId = useRef(0);
  const decoder = useRef(typeof TextDecoder !== 'undefined' ? new TextDecoder() : null);

  const popBubble = useCallback((emoji, name) => {
    const id = bubbleId.current++;
    setBubbles((prev) => [...prev, { id, emoji, name, left: 10 + Math.random() * 70 }]);
    setTimeout(() => setBubbles((prev) => prev.filter((b) => b.id !== id)), 2600);
  }, []);

  useEffect(() => {
    if (!liveRoom) return undefined;
    const handler = (payload, participant, _kind, topic) => {
      try {
        const data = JSON.parse(decoder.current.decode(payload));
        if (topic === 'reactions') popBubble(data.emoji, data.name);
        else if (topic === 'raise-hand') {
          setRaisedHands((prev) => {
            const next = { ...prev };
            const id = participant?.identity || data.identity;
            if (data.raised) next[id] = data.name; else delete next[id];
            return next;
          });
        }
      } catch { /* ignore malformed payload */ }
    };
    liveRoom.on(RoomEvent.DataReceived, handler);
    return () => liveRoom.off(RoomEvent.DataReceived, handler);
  }, [liveRoom, popBubble]);

  useEffect(() => {
    const stillHere = new Set(participants.map((p) => p.identity));
    setRaisedHands((prev) => {
      const next = {}; let changed = false;
      for (const [id, name] of Object.entries(prev)) { if (stillHere.has(id)) next[id] = name; else changed = true; }
      return changed ? next : prev;
    });
  }, [participants]);

  useEffect(() => {
    if (!liveRoom) return undefined;
    // If I already have my hand up, let anyone who joins after me know,
    // so latecomers (including a host opening the panel late) see it.
    const handler = (participant) => {
      if (!handRaised) return;
      const name = localParticipant?.name || 'BLW Member';
      localParticipant?.publishData(new TextEncoder().encode(JSON.stringify({ raised: true, name, identity: localParticipant?.identity })), { reliable: true, topic: 'raise-hand', destinationIdentities: [participant.identity] });
    };
    liveRoom.on(RoomEvent.ParticipantConnected, handler);
    return () => liveRoom.off(RoomEvent.ParticipantConnected, handler);
  }, [liveRoom, handRaised, localParticipant]);

  const react = (emoji) => {
    const name = localParticipant?.name || 'BLW Member';
    popBubble(emoji, name);
    localParticipant?.publishData(new TextEncoder().encode(JSON.stringify({ emoji, name })), { reliable: true, topic: 'reactions' });
  };

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    const name = localParticipant?.name || 'BLW Member';
    localParticipant?.publishData(new TextEncoder().encode(JSON.stringify({ raised: next, name, identity: localParticipant?.identity })), { reliable: true, topic: 'raise-hand' });
  };

  const raisedList = Object.values(raisedHands);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 h-40 overflow-hidden">
        {bubbles.map((b) => (
          <div key={b.id} className="reaction-bubble absolute bottom-0 text-2xl" style={{ left: `${b.left}%` }}>
            <span>{b.emoji}</span> <span className="ml-1 rounded-full bg-black/50 px-2 py-0.5 align-middle text-[10px] text-white/80">{b.name}</span>
          </div>
        ))}
      </div>
      {raisedList.length > 0 && (
        <div className="mx-auto mt-3 w-fit rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs text-amber-200">✋ {raisedList.join(', ')} raised {raisedList.length === 1 ? 'a hand' : 'hands'}</div>
      )}
      <div className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2 py-1.5">
        {REACTION_EMOJIS.map((emoji) => (
          <button key={emoji} type="button" onClick={() => react(emoji)} className="rounded-full px-2 py-1 text-lg hover:bg-white/10">{emoji}</button>
        ))}
        <button type="button" onClick={toggleHand} className={`ml-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${handRaised ? 'border-amber-400/50 bg-amber-400/15 text-amber-200' : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'}`}>✋ {handRaised ? 'Lower hand' : 'Raise hand'}</button>
      </div>
      <style>{`
        @keyframes reaction-float { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-140px); opacity: 0; } }
        .reaction-bubble { animation: reaction-float 2.5s ease-out forwards; }
      `}</style>
    </>
  );
}

function HostPanel({ roomName, open, onClose, participants, locked, setLocked, waitingRoomEnabled, setWaitingRoomEnabled, recording, onRecordingChange, onEnded }) {
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [log, setLog] = useState([]);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    (async () => {
      try {
        const res = await apiFetch(`/api/video/rooms/${encodeURIComponent(roomName)}/status`);
        const body = await res.json().catch(() => ({}));
        if (res.ok) setLog(Array.isArray(body.log) ? body.log : []);
      } catch { /* the activity log is a nice-to-have; ignore failures */ }
    })();
  }, [open, roomName]);

  if (!open) return null;

  const waitingParticipants = participants.filter(isPendingParticipant);
  const activeParticipants = participants.filter((p) => !isPendingParticipant(p));

  const call = async (path, options) => {
    const response = await apiFetch(path, { method: 'POST', ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || 'That action failed.');
    return body;
  };

  const muteAll = async () => {
    setBusy('mute-all'); setNotice('');
    try { await call(`/api/video/rooms/${encodeURIComponent(roomName)}/mute-all`); setNotice('Muted all participants.'); }
    catch (err) { setNotice(err?.message || 'Unable to mute everyone.'); }
    finally { setBusy(''); }
  };

  const muteOne = async (identity) => {
    setBusy(identity); setNotice('');
    try { await call(`/api/video/rooms/${encodeURIComponent(roomName)}/participants/${encodeURIComponent(identity)}/mute`); }
    catch (err) { setNotice(err?.message || 'Unable to mute that participant.'); }
    finally { setBusy(''); }
  };

  const removeOne = async (identity) => {
    setBusy(identity); setNotice('');
    try { await apiFetch(`/api/video/rooms/${encodeURIComponent(roomName)}/participants/${encodeURIComponent(identity)}`, { method: 'DELETE' }); }
    catch { setNotice('Unable to remove that participant.'); }
    finally { setBusy(''); }
  };

  const admit = async (identity) => {
    setBusy(identity); setNotice('');
    try { await call(`/api/video/rooms/${encodeURIComponent(roomName)}/participants/${encodeURIComponent(identity)}/admit`); }
    catch (err) { setNotice(err?.message || 'Unable to admit that participant.'); }
    finally { setBusy(''); }
  };

  const deny = async (identity) => {
    setBusy(identity); setNotice('');
    try { await call(`/api/video/rooms/${encodeURIComponent(roomName)}/participants/${encodeURIComponent(identity)}/deny`); }
    catch { setNotice('Unable to deny that participant.'); }
    finally { setBusy(''); }
  };

  const toggleLock = async () => {
    setBusy('lock'); setNotice('');
    try { const next = !locked; await call(`/api/video/rooms/${encodeURIComponent(roomName)}/lock`, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locked: next }) }); setLocked(next); setNotice(next ? 'Room locked — no new participants can join.' : 'Room unlocked.'); }
    catch (err) { setNotice(err?.message || 'Unable to change the lock.'); }
    finally { setBusy(''); }
  };

  const toggleWaitingRoom = async () => {
    setBusy('waiting-room'); setNotice('');
    try { const next = !waitingRoomEnabled; await call(`/api/video/rooms/${encodeURIComponent(roomName)}/waiting-room`, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: next }) }); setWaitingRoomEnabled(next); setNotice(next ? 'Waiting room on — new joiners need your approval.' : 'Waiting room off.'); }
    catch (err) { setNotice(err?.message || 'Unable to change the waiting room.'); }
    finally { setBusy(''); }
  };

  const toggleRecording = async () => {
    setBusy('recording'); setNotice('');
    try {
      if (recording) { await call(`/api/video/rooms/${encodeURIComponent(roomName)}/recording/stop`); onRecordingChange(false); setNotice('Recording stopped.'); }
      else { await call(`/api/video/rooms/${encodeURIComponent(roomName)}/recording/start`); onRecordingChange(true); setNotice('Recording started — everyone in the call now sees a recording badge.'); }
    } catch (err) { setNotice(err?.message || 'Unable to change recording.'); }
    finally { setBusy(''); }
  };

  const endForEveryone = async () => {
    if (!window.confirm('End this meeting for everyone? All participants will be disconnected.')) return;
    setBusy('end'); setNotice('');
    try { await apiFetch(`/api/video/rooms/${encodeURIComponent(roomName)}`, { method: 'DELETE' }); onEnded(); }
    catch { setNotice('Unable to end the meeting.'); setBusy(''); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Host controls" className="fixed inset-x-3 bottom-24 top-24 z-30 flex flex-col rounded-3xl border border-white/10 bg-[#11101d]/98 shadow-2xl backdrop-blur sm:inset-x-auto sm:left-4 sm:top-28 sm:h-[30rem] sm:w-80">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-white">Host controls</p>
        <button ref={closeButtonRef} onClick={onClose} aria-label="Close host controls" className="text-white/50 hover:text-white"><FiX/></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy === 'mute-all'} onClick={muteAll} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50">{busy === 'mute-all' ? 'Muting…' : 'Mute all'}</button>
          <button type="button" disabled={busy === 'lock'} onClick={toggleLock} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${locked ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}>{locked ? <FiLock className="h-3 w-3" /> : <FiUnlock className="h-3 w-3" />} {busy === 'lock' ? 'Updating…' : locked ? 'Locked' : 'Lock room'}</button>
          <button type="button" disabled={busy === 'waiting-room'} onClick={toggleWaitingRoom} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${waitingRoomEnabled ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}><FiUserPlus className="h-3 w-3" /> {busy === 'waiting-room' ? 'Updating…' : waitingRoomEnabled ? 'Waiting room on' : 'Waiting room off'}</button>
          <button type="button" disabled={busy === 'recording'} onClick={toggleRecording} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${recording ? 'border-red-400/40 bg-red-500/10 text-red-300' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}><FiVideo className="h-3 w-3" /> {busy === 'recording' ? 'Updating…' : recording ? 'Stop recording' : 'Record meeting'}</button>
        </div>
        {notice && <p aria-live="polite" className="mt-2 text-xs text-white/60">{notice}</p>}

        {waitingParticipants.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300/80">Waiting to join ({waitingParticipants.length})</p>
            <ul className="space-y-1.5">
              {waitingParticipants.map((p) => (
                <li key={p.identity} className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/15 bg-amber-400/5 px-3 py-2">
                  <span className="truncate text-xs text-white/80">{p.name || 'BLW Member'}</span>
                  <span className="flex shrink-0 gap-2">
                    <button type="button" disabled={busy === p.identity} onClick={() => admit(p.identity)} aria-label={`Admit ${p.name || 'participant'}`} className="rounded-full border border-emerald-400/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"><FiUserCheck className="h-3 w-3" /></button>
                    <button type="button" disabled={busy === p.identity} onClick={() => deny(p.identity)} aria-label={`Deny ${p.name || 'participant'}`} className="rounded-full border border-red-400/25 px-2.5 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-50"><FiX className="h-3 w-3" /></button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          {activeParticipants.length === 0 ? (
            <p className="text-xs text-white/40">No one else has joined yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {activeParticipants.map((p) => (
                <li key={p.identity} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                  <span className="truncate text-xs text-white/75">{p.name || 'BLW Member'}</span>
                  <span className="flex shrink-0 gap-2">
                    <button type="button" disabled={busy === p.identity} onClick={() => muteOne(p.identity)} aria-label={`Mute ${p.name || 'participant'}`} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 disabled:opacity-50"><FiMicOff className="h-3 w-3" /></button>
                    <button type="button" disabled={busy === p.identity} onClick={() => removeOne(p.identity)} aria-label={`Remove ${p.name || 'participant'}`} className="rounded-full border border-red-400/25 px-2.5 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-50"><FiUserX className="h-3 w-3" /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {log.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-white/40">Recent activity</summary>
            <ul className="mt-2 space-y-1 text-[11px] text-white/45">
              {log.map((entry, i) => <li key={i} className="flex items-start gap-1.5"><FiClock className="mt-0.5 h-3 w-3 shrink-0" /><span>{entry.by || 'A host'} · {entry.type}{entry.target ? ` · ${entry.target.slice(0, 14)}…` : ''}</span></li>)}
            </ul>
          </details>
        )}
      </div>
      <div className="border-t border-white/10 p-3">
        <button type="button" disabled={busy === 'end'} onClick={endForEveryone} className="w-full rounded-2xl border border-red-400/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50">{busy === 'end' ? 'Ending…' : 'End for everyone'}</button>
      </div>
    </div>
  );
}
