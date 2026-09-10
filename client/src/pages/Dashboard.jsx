import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchVenueByChapter } from '../utils/venues';
import { apiFetch } from '../config/api';
import { hapticError } from '../utils/haptics';
import {
  FiEdit2,
  FiLogOut,
  FiUsers,
  FiHeart,
  FiMapPin,
  FiMail,
  FiPhone,
  FiStar,
  FiCheckCircle,
  FiShield,
  FiGlobe,
  FiCalendar,
  FiFileText,
  FiClock,
  FiCamera,
  FiX,
  FiLoader,
} from 'react-icons/fi';
import { Card, Eyebrow, StatGroup, ActionBanner, InfoTile } from '../components/ui/Card';
import { getAppVersion } from '../native';
import EmptyState from '../components/ui/EmptyState';
import { Toast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';
import Button from '../components/ui/Button';

export default function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const { user, logout, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [venue, setVenue] = useState(null);
  const [venueStatus, setVenueStatus] = useState('idle'); // idle | loading | loaded | none | error
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const avatarInputRef = useRef(null);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);

  const startAvatarPress = () => {
    longPressFired.current = false;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (user?.avatarUrl) setShowPhotoViewer(true);
    }, 500);
  };
  const cancelAvatarPress = () => clearTimeout(longPressTimer.current);
  const handleAvatarClick = () => {
    if (longPressFired.current) { longPressFired.current = false; return; } // the long-press already acted — don't also open the change sheet
    setShowPhotoSheet(true);
  };
  const [appVersion, setAppVersion] = useState(null);

  useEffect(() => {
    getAppVersion().then(setAppVersion);
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type?.startsWith('image/')) { setAvatarError('Only image files are allowed.'); return; }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Image must be 5 MB or smaller.'); return; }
    setAvatarBusy(true);
    setAvatarError('');
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await apiFetch('/api/auth/avatar', { method: 'POST', body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Unable to upload photo.');
      await login(body.user, body.token);
      setToast({ type: 'success', message: 'Profile photo updated.' });
    } catch (err) {
      setAvatarError(err?.message || 'Unable to upload photo.');
      setToast({ type: 'error', message: err?.message || 'Unable to upload photo.' });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarRemove = async () => {
    setShowPhotoSheet(false);
    setAvatarBusy(true);
    setAvatarError('');
    try {
      const res = await apiFetch('/api/auth/avatar', { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Unable to remove photo.');
      await login(body.user, body.token);
      setToast({ type: 'success', message: 'Profile photo removed.' });
    } catch (err) {
      setAvatarError(err?.message || 'Unable to remove photo.');
      setToast({ type: 'error', message: err?.message || 'Unable to remove photo.' });
    } finally {
      setAvatarBusy(false);
    }
  };

  useEffect(() => {
    if (!user?.chapter) {
      setVenueStatus('none');
      return;
    }
    let cancelled = false;
    setVenueStatus('loading');
    fetchVenueByChapter(user.chapter)
      .then((result) => {
        if (cancelled) return;
        setVenue(result);
        setVenueStatus(result ? 'loaded' : 'none');
      })
      .catch(() => {
        if (cancelled) return;
        setVenueStatus('error');
      });
    return () => { cancelled = true; };
  }, [user?.chapter]);
  const [editForm, setEditForm] = useState({
    title: '',
    fullName: '',
    phone: '',
    birthday: '',
    gender: '',
    maritalStatus: '',
    church: '',
    chapter: '',
    campusZone: '',
    residence: '',
    city: '',
    country: '',
    invitedBy: '',
    about: '',
  });
  const [editStatus, setEditStatus] = useState('idle');
  const [editError, setEditError] = useState('');
  const name = user?.name || 'Brother User';
  const email = user?.email || 'hello@yourdomain.com';
  const displayName = name.split(' ')[0];

  const notSet = 'Not set';
  const details = [
    { label: 'Title', value: user?.title || notSet, icon: FiUsers },
    { label: 'Display name', value: displayName, icon: FiShield },
    { label: 'Email', value: email, icon: FiMail },
    { label: 'Phone', value: user?.phone || notSet, icon: FiPhone },
    { label: 'Service church', value: user?.church || "Believers' LoveWorld CM Kenya Zone", icon: FiGlobe },
    { label: 'Fellowship / PCF', value: user?.chapter || notSet, icon: FiMapPin },
    { label: 'Campus zone', value: user?.campusZone || notSet, icon: FiMapPin },
    { label: 'Gender', value: user?.gender || notSet, icon: FiStar },
    { label: 'Country', value: user?.country || notSet, icon: FiGlobe },
    { label: 'Marital status', value: user?.maritalStatus || notSet, icon: FiHeart },
  ];

  const handleDelete = async () => {
    if (!window.confirm('Delete your account permanently? This action cannot be undone.')) return;
    hapticError();
    setStatus('submitting');
    setError('');

    try {
      const response = await apiFetch('/api/auth/account/delete', {
        method: 'POST',
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || body.message || 'Unable to delete your account.');
        setStatus('error');
        setToast({ type: 'error', message: body.error || body.message || 'Unable to delete your account.' });
        return;
      }

      logout();
      setStatus('success');
      navigate('/auth');
    } catch (err) {
      setError(err?.message || 'Unable to delete your account.');
      setStatus('error');
    }
  };

  const goToRecordSouls = () => {
    navigate('/record-souls');
  };

  const openEdit = () => {
    setEditForm({
      title: user?.title || 'Brother',
      fullName: user?.name || user?.fullName || '',
      phone: user?.phone || '',
      birthday: user?.birthday || '',
      gender: user?.gender || 'Male',
      maritalStatus: user?.maritalStatus || 'Single',
      church: user?.church || "Believers' LoveWorld CM Kenya Zone",
      chapter: user?.chapter || '',
      campusZone: user?.campusZone || '',
      residence: user?.residence || '',
      city: user?.city || '',
      country: user?.country || 'Kenya',
      invitedBy: user?.invitedBy || '',
      about: user?.about || '',
    });
    setEditError('');
    setEditStatus('idle');
    setIsEditing(true);
  };

  const handleEditChange = (field) => (e) => setEditForm((s) => ({ ...s, [field]: e.target.value }));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditStatus('submitting');
    setEditError('');

    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'POST',
        body: JSON.stringify({
          fullName: editForm.fullName,
          phone: editForm.phone,
          birthday: editForm.birthday,
          gender: editForm.gender,
          maritalStatus: editForm.maritalStatus,
          church: editForm.church,
          chapter: editForm.chapter,
          campusZone: editForm.campusZone,
          residence: editForm.residence,
          city: editForm.city,
          country: editForm.country,
          invitedBy: editForm.invitedBy,
          about: editForm.about,
          title: editForm.title,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Unable to update profile.');
      await login(body.user, body.token);
      setEditStatus('success');
      setToast({ type: 'success', message: 'Profile updated successfully.' });
      setTimeout(() => {
        setIsEditing(false);
        setEditStatus('idle');
      }, 600);
    } catch (err) {
      setEditError(err?.message || 'Unable to update profile.');
      setEditStatus('error');
      setToast({ type: 'error', message: err?.message || 'Unable to update profile.' });
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-4">
        {/* Identity + primary actions */}
        <Card variant="raised" className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  onPointerDown={startAvatarPress}
                  onPointerUp={cancelAvatarPress}
                  onPointerLeave={cancelAvatarPress}
                  onPointerCancel={cancelAvatarPress}
                  onContextMenu={(e) => e.preventDefault()}
                  disabled={avatarBusy}
                  aria-label="Profile photo — tap to change, hold to view"
                  style={{ position: 'relative', display: 'block', width: '64px', height: '64px', flexShrink: 0, padding: 0, border: 'none', background: 'transparent', cursor: avatarBusy ? 'wait' : 'pointer', WebkitTouchCallout: 'none', userSelect: 'none' }}
                >
                  <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: '9999px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.12)', background: 'linear-gradient(135deg,#C93690,#4D1B82)' }}>
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900, color: '#fff' }}>
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span style={{ position: 'absolute', right: '-2px', bottom: '-2px', width: '22px', height: '22px', borderRadius: '9999px', background: '#EC2FA8', border: '2px solid #0d0c1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {avatarBusy ? <FiLoader className="animate-spin" style={{ width: '11px', height: '11px', color: '#fff' }} /> : <FiCamera style={{ width: '11px', height: '11px', color: '#fff' }} />}
                  </span>
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={avatarBusy} />
              </div>
              {showPhotoSheet && (
                <div
                  role="presentation"
                  onClick={() => setShowPhotoSheet(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Change profile photo"
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%', maxWidth: '480px', background: '#151420', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px' }}>
                      <span style={{ width: '36px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.25)' }} />
                    </div>
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px', padding: '14px 16px 4px', margin: 0 }}>Change Profile Photo</p>
                    <button
                      type="button"
                      onClick={() => { setShowPhotoSheet(false); avatarInputRef.current?.click(); }}
                      style={{ display: 'block', width: '100%', padding: '16px', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: '#fff', background: 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Upload Photo
                    </button>
                    {user?.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleAvatarRemove}
                        style={{ display: 'block', width: '100%', padding: '16px', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: '#ff5c5c', background: 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        Remove Current Photo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPhotoSheet(false)}
                      style={{ display: 'block', width: '100%', padding: '16px', textAlign: 'center', fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', background: 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {showPhotoViewer && user?.avatarUrl && (
                <div
                  role="presentation"
                  onClick={() => setShowPhotoViewer(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', padding: '24px' }}
                >
                  <button
                    type="button"
                    onClick={() => setShowPhotoViewer(false)}
                    aria-label="Close photo"
                    style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', right: '16px', width: '36px', height: '36px', borderRadius: '9999px', background: 'rgba(255,255,255,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                  >
                    <FiX style={{ width: '18px', height: '18px' }} />
                  </button>
                  <img
                    src={user.avatarUrl}
                    alt="Profile"
                    draggable={false}
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
                  />
                </div>
              )}
              <div className="min-w-0">
                <Eyebrow>Member dashboard</Eyebrow>
                <h1 className="mt-1 text-2xl font-semibold text-white truncate">Brother {displayName}</h1>
                <p className="mt-1 text-[11px] text-slate-400 truncate">{email}</p>
                {avatarError && <p className="mt-1 text-[11px] text-red-300">{avatarError}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button variant="custom" size="none"
                type="button"
                onClick={openEdit}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#A62574] to-[#3C1464] px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(236,47,168,0.18)] transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <FiEdit2 /> Edit Profile
              </Button>
              <Button variant="custom" size="none"
                type="button"
                onClick={() => {
                  hapticError();
                  logout();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <FiLogOut /> Sign Out
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-slate-400">Profile completion</p>
              <span className="text-[11px] font-semibold text-pink-500">60%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950">
              <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-[#C93690] to-[#4D1B82] shadow-[0_0_20px_rgba(163,77,255,0.45)]" />
            </div>
          </div>
        </Card>

        {/* ONE primary call-to-action for this screen — everything else is quieter */}
        <ActionBanner
          eyebrow="Soul-winning"
          title="Record Souls Dashboard"
          subtitle="Tap to log a soul you invited to church."
          onClick={goToRecordSouls}
          icon={FiHeart}
        />

        {/* Quick stats, grouped in one card instead of three competing boxes */}
        <StatGroup
          items={[
            { label: 'Services', value: 0, icon: FiCalendar, accent: '#FF4F9A' },
            { label: 'Souls won', value: 0, icon: FiHeart, accent: '#FF8B5C' },
            { label: 'Follow-ups', value: 0, icon: FiCheckCircle, accent: '#8EE3FF' },
          ]}
        />

        {/* Sunday check-in */}
        <Card variant="raised" className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C93690] to-[#4D1B82] text-white">
              <FiClock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Eyebrow>Sunday self check-in</Eyebrow>
              {venueStatus === 'loading' ? (
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ) : (
                <>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {venueStatus === 'loaded' && venue?.serviceTime ? venue.serviceTime : 'Service time to be announced'}
                  </h3>
                  <p className="mt-1 text-[12px] text-slate-400">
                    {venueStatus === 'loaded' && venue?.venue}
                    {venueStatus === 'none' && (user?.chapter ? `No venue set yet for ${user.chapter}. Check with your leaders.` : 'Add your chapter in Edit Profile to see your service venue.')}
                    {venueStatus === 'error' && 'Unable to load your service venue right now.'}
                  </p>
                </>
              )}
              <div className="mt-3">
                <p className="text-sm font-semibold text-white">Ready to check in?</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Open the check-in page to see the current service status and your QR badge.</p>
              </div>
              <Button variant="custom" size="none"
                type="button"
                onClick={() => navigate('/checkin')}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#EC2FA8]/60 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#EC2FA8]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC2FA8]/60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Show my QR badge
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="raised" className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#56CCF2] via-[#2F80ED] to-[#6A5AFF] text-white">
                <FiFileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Eyebrow color="#8EE3FF">Service notes</Eyebrow>
                <h3 className="mt-1 text-base font-semibold text-white">Recent notes from your services</h3>
                <div className="mt-3">
                  <EmptyState
                    icon={FiFileText}
                    title="No notes yet"
                    hint="When leaders post service notes or highlights, they'll appear here."
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card variant="raised" className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF8B5C] via-pink-500 to-purple-400 text-white">
                <FiCalendar className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Eyebrow>Your attendance</Eyebrow>
                <h3 className="mt-1 text-base font-semibold text-white">Services you've attended</h3>
                <div className="mt-3">
                  <EmptyState
                    icon={FiCalendar}
                    title="No services attended yet"
                    hint="Check in this Sunday and your visits will appear here."
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Profile details */}
        <div>
          <Eyebrow className="mb-2 px-1">Profile details</Eyebrow>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {details.map(({ label, value, icon }) => (
              <InfoTile key={label} label={label} value={value} icon={icon} />
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <Card variant="subtle" className="border-red-500/20 bg-red-950/60 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Eyebrow color="#FCA5A5">Danger zone</Eyebrow>
              <h3 className="mt-2 text-lg font-semibold text-white">Delete account</h3>
            </div>
            <span className="w-fit rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-200">Permanent</span>
          </div>
          <p className="mt-3 text-sm text-red-200/90">Deleting your account removes your profile and all saved ministry records. This action cannot be undone.</p>
          {error && <p className="mt-3 text-sm text-red-100">{error}</p>}
          {status === 'success' && <p className="mt-3 text-sm text-emerald-200">Your account has been deleted successfully.</p>}
          <Button variant="custom" size="none"
            type="button"
            onClick={handleDelete}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-500 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Delete my account
          </Button>
        </Card>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/90 px-4 pt-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl">
            <Button variant="custom" size="none"
              type="button"
              onClick={() => setIsEditing(false)}
              className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              ✕
            </Button>
            <div className="max-h-[90vh] overflow-hidden">
              <div className="border-b border-white/10 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#F7C948]">Edit your profile</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Keep your info up to date so we can stay connected.</h2>
              </div>
              <form onSubmit={handleSaveProfile} className="space-y-5 overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Personal info</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Title</span>
                  <input
                    value={editForm.title}
                    onChange={handleEditChange('title')}
                    placeholder="Brother"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Full name</span>
                  <input
                    value={editForm.fullName}
                    onChange={handleEditChange('fullName')}
                    placeholder="Enter your full name"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </label>
              </div>

              <div className="border-t border-white/[0.06] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Contact</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Phone</span>
                  <input
                    value={editForm.phone}
                    onChange={handleEditChange('phone')}
                    placeholder="+254 700 000 000"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Campus zone</span>
                  <select
                    value={editForm.campusZone}
                    onChange={handleEditChange('campusZone')}
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  >
                    <option value="">Select your zone</option>
                    <option value="KENYA_ZONE_A">Kenya Zone A</option>
                    <option value="KENYA_ZONE_B">Kenya Zone B</option>
                  </select>
                </label>
              </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Gender</span>
                  <select
                    value={editForm.gender}
                    onChange={handleEditChange('gender')}
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  >
                    <option value="">Select your gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Marital status</span>
                  <select
                    value={editForm.maritalStatus}
                    onChange={handleEditChange('maritalStatus')}
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  >
                    <option value="">Marital status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Engaged">Engaged</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </label>
              </div>

              <div className="border-t border-white/[0.06] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Ministry</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Service church</span>
                  <input
                    value={editForm.church}
                    onChange={handleEditChange('church')}
                    placeholder="Believers' LoveWorld CM Kenya Zone"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Fellowship / PCF</span>
                  <input
                    value={editForm.chapter}
                    onChange={handleEditChange('chapter')}
                    placeholder="Pick your fellowship..."
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </label>
              </div>
              </div>

              <div className="border-t border-white/[0.06] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Address</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Residential address</span>
                  <input
                    value={editForm.residence}
                    onChange={handleEditChange('residence')}
                    placeholder="Street, area"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">City</span>
                  <input
                    value={editForm.city}
                    onChange={handleEditChange('city')}
                    placeholder="Accra"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Country</span>
                  <input
                    value={editForm.country}
                    onChange={handleEditChange('country')}
                    placeholder="Kenya"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Birthday</span>
                  <input
                    type="date"
                    value={editForm.birthday}
                    onChange={handleEditChange('birthday')}
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </label>
              </div>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-300">Invited by</span>
                <input
                  value={editForm.invitedBy}
                  onChange={handleEditChange('invitedBy')}
                  placeholder="Who invited you?"
                  className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-300">About me</span>
                <textarea
                  rows={4}
                  value={editForm.about}
                  onChange={handleEditChange('about')}
                  placeholder="Share a bit about your walk with God..."
                  className="w-full rounded-[1.75rem] border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                />
              </label>

              {editError && <p className="text-sm text-red-300">{editError}</p>}
              {editStatus === 'success' && <p className="text-sm text-emerald-300">Profile updated successfully.</p>}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="custom" size="none"
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  Cancel
                </Button>
                <Button variant="custom" size="none"
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#A62574] to-[#3C1464] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}
      {appVersion && <p className="mt-8 text-center text-[11px] text-white/50">App version {appVersion.version} (build {appVersion.build})</p>}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
