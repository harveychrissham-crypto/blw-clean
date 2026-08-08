import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchVenueByChapter } from '../utils/venues';
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
} from 'react-icons/fi';

export default function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const { user, logout, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [venue, setVenue] = useState(null);
  const [venueStatus, setVenueStatus] = useState('idle'); // idle | loading | loaded | none | error

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
    status: '',
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
    { label: 'Service church', value: user?.church || "Believers' LoveWorld Campus Ministry", icon: FiGlobe },
    { label: 'Fellowship / PCF', value: user?.chapter || notSet, icon: FiMapPin },
    { label: 'Campus zone', value: user?.campusZone || notSet, icon: FiMapPin },
    { label: 'Gender', value: user?.gender || notSet, icon: FiStar },
    { label: 'Country', value: user?.country || notSet, icon: FiGlobe },
    { label: 'Marital status', value: user?.status || notSet, icon: FiHeart },
  ];

  const handleDelete = async () => {
    if (!window.confirm('Delete your account permanently? This action cannot be undone.')) return;
    setStatus('submitting');
    setError('');

    try {
      const response = await fetch('/api/auth/account/delete', {
        method: 'POST',
        credentials: 'include',
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || body.message || 'Unable to delete your account.');
        setStatus('error');
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
      status: user?.status || 'Single',
      church: user?.church || "Believers' LoveWorld Campus Ministry",
      chapter: user?.chapter || '',
      campusZone: user?.campusZone || '',
      residence: user?.residence || '',
      city: user?.city || '',
      country: user?.country || 'Ghana',
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

    // Update local auth state immediately. If server API exists, we'd call it here.
    try {
      const updatedUser = { ...user, name: editForm.fullName, fullName: editForm.fullName, phone: editForm.phone, birthday: editForm.birthday, gender: editForm.gender, status: editForm.status, church: editForm.church, chapter: editForm.chapter, campusZone: editForm.campusZone, residence: editForm.residence, city: editForm.city, country: editForm.country, invitedBy: editForm.invitedBy, about: editForm.about };
      login(updatedUser);
      setEditStatus('success');
      setTimeout(() => {
        setIsEditing(false);
        setEditStatus('idle');
      }, 600);
    } catch (err) {
      setEditError(err?.message || 'Unable to update profile.');
      setEditStatus('error');
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-3">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/95 shadow-sm">
            <div className="p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FF4F9A] via-[#A53DFF] to-[#3D5AFE] text-2xl font-black text-white shadow-xl shadow-[#A53DFF]/20">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#F7C948]">Member dashboard</p>
                    <h1 className="mt-1 text-2xl font-semibold text-white">Brother {displayName}</h1>
                    <p className="mt-1 text-[11px] text-slate-400">{email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openEdit}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(236,47,168,0.18)] transition hover:opacity-95"
                  >
                    <FiEdit2 /> Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={goToRecordSouls}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-800/60 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
                  >
                    <FiHeart /> Record Souls
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
                  >
                    <FiLogOut /> Sign Out
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-2.5 shadow-inner shadow-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">Profile completion</p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#FF4F9A]">60%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-900">
                  <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-[#FF4F9A] via-[#A53DFF] to-[#3D5AFE] shadow-[0_0_20px_rgba(163,77,255,0.45)]" />
                </div>
              </div>
              
              {/* Record Souls banner - large, clickable */}
              <div
                onClick={goToRecordSouls}
                role="button"
                tabIndex={0}
                className="mt-6 w-full cursor-pointer overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-[#FF8B5C] via-[#FF4F9A] to-[#A53DFF] p-6 text-white shadow-[0_30px_60px_rgba(163,77,255,0.12)] transition-transform hover:-translate-y-1"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goToRecordSouls(); }}
              >
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/90">Soul-winning</p>
                    <h2 className="mt-2 text-2xl font-extrabold">Record Souls Dashboard <span className="text-white/90">▸</span></h2>
                    <p className="mt-2 text-sm text-white/90">Tap to log a soul you invited to church.</p>
                  </div>
                  <div className="ml-auto flex h-20 w-20 items-center justify-center rounded-xl bg-white/10">
                    <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2c1.657 0 3 1.343 3 3 0 1.657-1.343 3-3 3s-3-1.343-3-3c0-1.657 1.343-3 3-3zM6 10c3.866 0 7 3.134 7 7v5H6v-5c0-3.866 3.134-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/95 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#FF4F9A] via-[#A53DFF] to-[#3D5AFE] flex items-center justify-center text-white">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#F7C948]">Sunday self check-in</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">
                    {venueStatus === 'loaded' && venue?.serviceTime ? venue.serviceTime : 'Service time to be announced'}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-300">
                    {venueStatus === 'loading' && 'Loading your chapter\'s venue…'}
                    {venueStatus === 'loaded' && venue?.venue}
                    {venueStatus === 'none' && (user?.chapter ? `No venue set yet for ${user.chapter}. Check with your leaders.` : 'Add your chapter in Edit Profile to see your service venue.')}
                    {venueStatus === 'error' && 'Unable to load your service venue right now.'}
                  </p>
                  <div className="mt-3 rounded-2xl border border-white/10 p-4 text-sm text-slate-400">The 3rd service hasn't been opened yet by the team. Please try again in a moment.</div>
                  <div className="mt-4">
                    <button className="inline-flex items-center gap-2 rounded-full border border-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-600/10">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Show my QR badge
                    </button>
                  </div>
                </div>
              </div>
            </div>
          
          <div className="mt-4 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/95 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#56CCF2] via-[#2F80ED] to-[#6A5AFF] flex items-center justify-center text-white">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#8EE3FF]">Service Notes</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Recent notes from your services</h3>
                <div className="mt-3 rounded-2xl border border-white/10 p-4 text-sm text-slate-400">
                  <p className="font-medium text-white">No notes yet</p>
                  <p className="mt-1">When your leaders post service notes or highlights, they will appear here for quick review.</p>
                </div>
              </div>
            </div>
          </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/95 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#FF8B5C] via-[#FF4F9A] to-[#A53DFF] flex items-center justify-center text-white">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#F7C948]">Your attendance</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">Services you've attended</h3>
                  <div className="mt-3 rounded-2xl border border-white/10 p-6 text-center text-slate-400">
                    <svg className="mx-auto h-8 w-8 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <p className="mt-3 font-semibold text-white">No services attended yet</p>
                    <p className="mt-1 text-sm">Check in this Sunday and your visits will appear here.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {details.map(({ label, value, icon: Icon }) => (
          <div key={label} className="overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900/95 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950/80 border border-slate-800 text-[#FF4F9A]">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">{label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-[2rem] border border-red-500/20 bg-red-950/80 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-red-100">Danger zone</p>
            <h3 className="mt-3 text-xl font-semibold text-white">Delete account</h3>
          </div>
          <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm font-semibold text-red-200">Permanent</span>
        </div>
        <p className="mt-4 text-sm text-red-200">Deleting your account removes your profile and all saved ministry records. This action cannot be undone.</p>
        {error && <p className="mt-4 text-sm text-red-100">{error}</p>}
        {status === 'success' && <p className="mt-4 text-sm text-emerald-200">Your account has been deleted successfully.</p>}
        <button
          type="button"
          onClick={handleDelete}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-red-500 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
        >
          Delete my account
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/90 px-4 py-10">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-slate-200 transition hover:bg-white/10"
            >
              ✕
            </button>
            <div className="max-h-[90vh] overflow-hidden">
              <div className="border-b border-white/10 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#F7C948]">Edit your profile</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Keep your info up to date so we can stay connected.</h2>
              </div>
              <form onSubmit={handleSaveProfile} className="space-y-6 overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Title</span>
                  <input
                    value={editForm.title}
                    onChange={handleEditChange('title')}
                    placeholder="Brother"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Full name</span>
                  <input
                    value={editForm.fullName}
                    onChange={handleEditChange('fullName')}
                    placeholder="Enter your full name"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Phone</span>
                  <input
                    value={editForm.phone}
                    onChange={handleEditChange('phone')}
                    placeholder="+254 700 000 000"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Campus zone</span>
                  <select
                    value={editForm.campusZone}
                    onChange={handleEditChange('campusZone')}
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                  >
                    <option value="">Select your zone</option>
                    <option value="KENYA_ZONE_A">Kenya Zone A</option>
                    <option value="KENYA_ZONE_B">Kenya Zone B</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Gender</span>
                  <select
                    value={editForm.gender}
                    onChange={handleEditChange('gender')}
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
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
                    value={editForm.status}
                    onChange={handleEditChange('status')}
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                  >
                    <option value="">Marital status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Engaged">Engaged</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Service church</span>
                  <input
                    value={editForm.church}
                    onChange={handleEditChange('church')}
                    placeholder="Believers' LoveWorld Campus Ministry"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Fellowship / PCF</span>
                  <input
                    value={editForm.chapter}
                    onChange={handleEditChange('chapter')}
                    placeholder="Pick your fellowship..."
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Residential address</span>
                  <input
                    value={editForm.residence}
                    onChange={handleEditChange('residence')}
                    placeholder="Street, area"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">City</span>
                  <input
                    value={editForm.city}
                    onChange={handleEditChange('city')}
                    placeholder="Accra"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Country</span>
                  <input
                    value={editForm.country}
                    onChange={handleEditChange('country')}
                    placeholder="Ghana"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-300">Birthday</span>
                  <input
                    type="date"
                    value={editForm.birthday}
                    onChange={handleEditChange('birthday')}
                    className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-300">Invited by</span>
                <input
                  value={editForm.invitedBy}
                  onChange={handleEditChange('invitedBy')}
                  placeholder="Who invited you?"
                  className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-300">About me</span>
                <textarea
                  rows={4}
                  value={editForm.about}
                  onChange={handleEditChange('about')}
                  placeholder="Share a bit about your walk with God..."
                  className="w-full rounded-[1.75rem] border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF] focus:ring-2 focus:ring-[#A53DFF]/20"
                />
              </label>

              {editError && <p className="text-sm text-red-300">{editError}</p>}
              {editStatus === 'success' && <p className="text-sm text-emerald-300">Profile updated successfully.</p>}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}
    </section>
  );
}
