import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiCamera, FiCameraOff, FiMic, FiMicOff, FiMonitor, FiUsers, FiLogOut, FiCopy, FiPlus, FiPhoneOff, FiMessageSquare, FiLock, FiUnlock, FiUserX, FiSend, FiWifi, FiWifiOff, FiX } from 'react-icons/fi';
import { Room, RoomEvent, ParticipantEvent, Track, VideoPresets, AudioPresets, DeviceUnsupportedError, DisconnectReason, ConnectionQuality } from 'livekit-client';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🙏', '👏'];

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
  const [devices, setDevices] = useState({ cams: [], mics: [], speakers: [] });
  const [camId, setCamId] = useState('');
  const [micId, setMicId] = useState('');
  const [speakerId, setSpeakerId] = useState('');
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
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
    startPreview({ video: true, audio: true });
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
    onJoin({ videoEnabled: camOn, audioEnabled: micOn, videoDeviceId: camId, audioDeviceId: micId, audioOutputDeviceId: speakerId });
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
  const [isHost, setIsHost] = useState(false);
  const [locked, setLocked] = useState(false);
  const [, rerender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/video/rooms/${encodeURIComponent(roomName)}/status`);
        const body = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) { setIsHost(body.isHost === true); setLocked(body.locked === true); }
      } catch { /* leave defaults — host controls just stay hidden */ }
    })();
    return () => { cancelled = true; };
  }, [roomName]);

  const openChat = () => setShowChat((v) => { const next = !v; if (next) setShowHost(false); return next; });
  const openHost = () => setShowHost((v) => { const next = !v; if (next) setShowChat(false); return next; });

  useEffect(() => {
    let disposed = false;
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
    liveRoom.on(RoomEvent.ParticipantConnected, sync).on(RoomEvent.ParticipantDisconnected, sync).on(RoomEvent.TrackSubscribed, sync).on(RoomEvent.TrackUnsubscribed, sync).on(RoomEvent.LocalTrackPublished, sync).on(RoomEvent.LocalTrackUnpublished, sync);
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
    (async () => {
      try {
        await liveRoom.connect(credentials.server_url, credentials.participant_token);
        if (disposed) return;
        if (choices?.videoEnabled) await liveRoom.localParticipant.setCameraEnabled(true, choices.videoDeviceId ? { deviceId: choices.videoDeviceId } : undefined).catch(() => {});
        if (choices?.audioEnabled) await liveRoom.localParticipant.setMicrophoneEnabled(true, choices.audioDeviceId ? { deviceId: choices.audioDeviceId } : undefined).catch(() => {});
        if (choices?.audioOutputDeviceId) await liveRoom.switchActiveDevice('audiooutput', choices.audioOutputDeviceId).catch(() => {});
        if (disposed) return;
        setCamera(!!choices?.videoEnabled);
        setMic(!!choices?.audioEnabled);
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

  async function toggleCamera() { try { const next = !camera; await roomRef.current?.localParticipant.setCameraEnabled(next); setCamera(next); } catch (e) { setError(e.message); } }
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

  const local = roomRef.current?.localParticipant;
  const all = local ? [local, ...participants] : participants;
  const screenSharer = all.find((p) => p.getTrackPublication?.(Track.Source.ScreenShare)?.track);
  const gridArea = screenSharer
    ? <div className="space-y-3"><ParticipantTile participant={screenSharer} local={screenSharer === local} speaking={activeSpeakers.has(screenSharer.identity)} />{all.length > 1 && <div className="flex gap-3 overflow-x-auto pb-1">{all.filter((p) => p !== screenSharer).map((participant) => <div key={participant.identity} className="w-40 shrink-0 sm:w-48"><ParticipantTile participant={participant} local={participant === local} speaking={activeSpeakers.has(participant.identity)} /></div>)}</div>}</div>
    : <div className="grid min-h-[55vh] gap-3 sm:grid-cols-2 lg:grid-cols-3">{all.map((participant) => <ParticipantTile key={participant.identity} participant={participant} local={participant === local} speaking={activeSpeakers.has(participant.identity)} />)}{all.length === 1 && <div className="col-span-full grid place-items-center rounded-3xl border border-white/10 bg-black/30 px-6 py-10 text-center text-white/45"><FiUsers className="mx-auto mb-2 h-6 w-6" /><p className="font-medium text-white/60">You're the only one here</p><p className="mt-1 text-xs">Share the room code and others will show up as soon as they join.</p></div>}</div>;

  return (
    <section className="mx-auto max-w-7xl px-3 py-4 sm:px-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-[#F2A31C]">Live room</p>
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
        <ControlButton active={sharing} onClick={toggleShare} onIcon={FiMonitor} offIcon={FiMonitor} label={screenShareSupported ? 'Share screen' : 'Screen sharing is not supported on this device'} disabled={!screenShareSupported}/>
        <ControlButton active={showChat} onClick={openChat} onIcon={FiMessageSquare} offIcon={FiMessageSquare} label="Chat"/>
        {isHost && <ControlButton active={showHost} onClick={openHost} onIcon={FiUsers} offIcon={FiUsers} label="Host controls"/>}
        <button onClick={leaveVoluntarily} aria-label="Leave meeting" className="grid h-11 w-11 place-items-center rounded-full bg-red-500 text-white"><FiPhoneOff/></button>
      </div>
      {error && <p className="mx-auto mt-4 max-w-xl rounded-2xl border border-red-400/20 bg-red-400/5 p-3 text-center text-sm text-red-200">{error}</p>}
      <ChatPanel liveRoom={roomRef.current} open={showChat} onClose={() => setShowChat(false)} />
      {isHost && <HostPanel roomName={roomName} open={showHost} onClose={() => setShowHost(false)} participants={participants} locked={locked} setLocked={setLocked} onEnded={() => onLeave('ended')} />}
    </section>
  );
}

function ControlButton({ active, onClick, onIcon: OnIcon, offIcon: OffIcon, label, disabled }) { const Icon = active ? OnIcon : OffIcon; return <button onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`grid h-11 w-11 place-items-center rounded-full transition ${disabled ? 'cursor-not-allowed bg-white/5 text-white/25' : active ? 'bg-white/15 text-white' : 'bg-white/5 text-white/60 hover:text-white'}`}><Icon/></button>; }

function ConnectionQualityIcon({ quality }) {
  if (quality === ConnectionQuality.Poor) return <FiWifi className="h-3 w-3 text-amber-400" />;
  if (quality === ConnectionQuality.Lost) return <FiWifiOff className="h-3 w-3 text-red-400" />;
  return null;
}

function ParticipantTile({ participant, local, speaking }) {
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
    <div className={`group relative aspect-video overflow-hidden rounded-xl bg-[#3c4043] transition-all duration-150 ${speaking ? 'ring-[3px] ring-[#8AB4F8]' : 'ring-1 ring-black/20'}`}>
      <video ref={videoRef} autoPlay playsInline muted={local} className={`h-full w-full object-cover ${hasVideo ? '' : 'hidden'} ${local && !hasScreenShare ? 'scale-x-[-1]' : ''}`} />
      <audio ref={audioRef} autoPlay muted={local} />
      {!hasVideo && (
        <div className="grid h-full place-items-center">
          <div
            className={`grid h-20 w-20 place-items-center rounded-full text-2xl font-semibold text-white shadow-lg transition-all duration-150 sm:h-24 sm:w-24 ${speaking ? 'ring-[3px] ring-[#8AB4F8] ring-offset-2 ring-offset-[#3c4043]' : ''}`}
            style={{ backgroundColor: avatarColor }}
          >
            {display.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}
      {hasScreenShare && <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur">Presenting</div>}
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

function HostPanel({ roomName, open, onClose, participants, locked, setLocked, onEnded }) {
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  if (!open) return null;

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

  const toggleLock = async () => {
    setBusy('lock'); setNotice('');
    try { const next = !locked; await call(`/api/video/rooms/${encodeURIComponent(roomName)}/lock`, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locked: next }) }); setLocked(next); setNotice(next ? 'Room locked — no new participants can join.' : 'Room unlocked.'); }
    catch (err) { setNotice(err?.message || 'Unable to change the lock.'); }
    finally { setBusy(''); }
  };

  const endForEveryone = async () => {
    if (!window.confirm('End this meeting for everyone? All participants will be disconnected.')) return;
    setBusy('end'); setNotice('');
    try { await apiFetch(`/api/video/rooms/${encodeURIComponent(roomName)}`, { method: 'DELETE' }); onEnded(); }
    catch { setNotice('Unable to end the meeting.'); setBusy(''); }
  };

  return (
    <div className="fixed inset-x-3 bottom-24 top-24 z-30 flex flex-col rounded-3xl border border-white/10 bg-[#11101d]/98 shadow-2xl backdrop-blur sm:inset-x-auto sm:left-4 sm:top-28 sm:h-[28rem] sm:w-80">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-white">Host controls</p>
        <button onClick={onClose} className="text-white/50 hover:text-white"><FiX/></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy === 'mute-all'} onClick={muteAll} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50">{busy === 'mute-all' ? 'Muting…' : 'Mute all'}</button>
          <button type="button" disabled={busy === 'lock'} onClick={toggleLock} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${locked ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}>{locked ? <FiLock className="h-3 w-3" /> : <FiUnlock className="h-3 w-3" />} {busy === 'lock' ? 'Updating…' : locked ? 'Locked' : 'Lock room'}</button>
        </div>
        {notice && <p className="mt-2 text-xs text-white/60">{notice}</p>}
        <div className="mt-4">
          {participants.length === 0 ? (
            <p className="text-xs text-white/40">No one else has joined yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {participants.map((p) => (
                <li key={p.identity} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                  <span className="truncate text-xs text-white/75">{p.name || 'BLW Member'}</span>
                  <span className="flex shrink-0 gap-2">
                    <button type="button" disabled={busy === p.identity} onClick={() => muteOne(p.identity)} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 disabled:opacity-50"><FiMicOff className="h-3 w-3" /></button>
                    <button type="button" disabled={busy === p.identity} onClick={() => removeOne(p.identity)} className="rounded-full border border-red-400/25 px-2.5 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-50"><FiUserX className="h-3 w-3" /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-white/10 p-3">
        <button type="button" disabled={busy === 'end'} onClick={endForEveryone} className="w-full rounded-2xl border border-red-400/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50">{busy === 'end' ? 'Ending…' : 'End for everyone'}</button>
      </div>
    </div>
  );
}
