import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCalendar, FiCheckCircle, FiFilm, FiImage, FiMapPin, FiRadio, FiUsers, FiShield, FiLock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { fetchAllMembers, checkInMember } from '../utils/members';
import NotificationCenter from './NotificationCenter';
import FellowshipLocationsAdminSecure from './FellowshipLocationsAdminSecure';
import { Card, Eyebrow } from '../components/ui/Card';

const tools = [
  { label: 'Check Attendance', description: 'Search members and record attendance.', icon: FiCheckCircle, path: 'attendance' },
  { label: 'Manage Events', description: 'Add, edit, and remove public events.', icon: FiCalendar, path: 'admin' },
  { label: 'Manage Outreach', description: 'Publish outreach stories and photos.', icon: FiImage, path: 'admin' },
  { label: 'Manage Sermons', description: 'Manage sermon videos and featured content.', icon: FiFilm, path: 'admin' },
  { label: 'Manage Fellowship Locations', description: 'Add and update fellowship locations.', icon: FiMapPin, path: 'fellowship' },
  { label: 'Manage Service Venues', description: 'Set chapter service venues and times.', icon: FiMapPin, path: 'admin' },
  { label: 'Manage Live Stream', description: 'Control the public live stream.', icon: FiRadio, path: 'admin' },
  { label: 'Push Notifications', description: 'Send announcements to registered devices.', icon: FiBell, path: 'notifications' },
];

function AccessDenied() {
  const navigate = useNavigate();
  return <section className="mx-auto max-w-xl px-5 py-20 text-center"><Card variant="raised" className="p-8"><FiShield className="mx-auto h-10 w-10 text-red-300"/><Eyebrow className="mt-5">Restricted access</Eyebrow><h1 className="mt-2 text-3xl font-extrabold text-white">Administrator access required</h1><p className="mt-3 text-sm leading-relaxed text-white/50">Leaders Forum management tools are available only to accounts marked as administrators.</p><button onClick={() => navigate('/auth')} className="mt-6 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15">Sign in with an authorized account</button></Card></section>;
}

function AttendancePanel() {
  const [members, setMembers] = useState([]), [query, setQuery] = useState(''), [loading, setLoading] = useState(true), [error, setError] = useState(''), [saving, setSaving] = useState('');
  useEffect(() => { fetchAllMembers().then(setMembers).catch((e) => setError(e.message || 'Unable to load members.')).finally(() => setLoading(false)); }, []);
  const filtered = members.filter((member) => { const q = query.trim().toLowerCase(); if (!q) return true; return [member.name, member.email, member.phone, member.membershipId, member.chapter].some((value) => String(value || '').toLowerCase().includes(q)); });
  const checkIn = async (membershipId) => { setSaving(membershipId); setError(''); try { const updated = await checkInMember(membershipId); setMembers((current) => current.map((m) => m.membershipId === membershipId ? { ...m, ...updated } : m)); } catch (e) { setError(e.message || 'Unable to check in this member.'); } finally { setSaving(''); } };
  return <Card variant="raised" className="p-5"><div className="flex items-center gap-3"><FiUsers className="text-emerald-300"/><div><Eyebrow>Attendance</Eyebrow><h2 className="text-xl font-bold text-white">Member check-in</h2></div></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, phone, or email" className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"/>{error && <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}{loading ? <p className="mt-5 text-sm text-white/50">Loading members…</p> : <div className="mt-5 divide-y divide-white/5">{filtered.map((member) => <div key={member.membershipId} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{member.name}</p><p className="truncate text-xs text-white/45">{member.membershipId} · {member.chapter}</p></div>{member.checkedIn ? <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">Checked in</span> : <button disabled={saving === member.membershipId} onClick={() => checkIn(member.membershipId)} className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 disabled:opacity-50">{saving === member.membershipId ? 'Saving…' : 'Check in'}</button>}</div>)}</div>}</Card>;
}

export default function LeadersForumWithFellowship() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('dashboard');
  if (loading) return <div className="mx-auto max-w-xl px-5 py-20 text-center text-sm text-white/50">Loading authorization…</div>;
  if (!user?.isAdmin) return <AccessDenied />;
  return <section className="mx-auto max-w-6xl px-5 py-12"><div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><Eyebrow>Leaders Forum</Eyebrow><h1 className="mt-2 text-3xl font-extrabold text-white">Leadership Tools</h1><p className="mt-2 max-w-3xl text-sm text-white/45">Administrator-only management for attendance, content, fellowship locations, live streaming, and notifications.</p></div><button onClick={() => setView('dashboard')} className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"><FiLock/> Admin session</button></div>{view === 'dashboard' && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tools.map((tool) => { const Icon = tool.icon; return <Card as="button" key={tool.label} onClick={() => setView(tool.path)} variant="raised" className="p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.06]"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-white">{tool.label}</h2><p className="mt-2 text-sm leading-relaxed text-white/45">{tool.description}</p></div><Icon className="h-6 w-6 shrink-0 text-[#D8B2FF]"/></div></Card>; })}</div>}{view === 'attendance' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><AttendancePanel/></>}{view === 'fellowship' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><FellowshipLocationsAdminSecure/></>}{view === 'notifications' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><NotificationCenter/></>}{view === 'admin' && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center"><FiShield className="mx-auto h-10 w-10 text-[#D8B2FF]"/><h2 className="mt-4 text-2xl font-bold text-white">Content administration</h2><p className="mt-2 text-sm text-white/45">Use the administrator dashboard for Events, Outreach, Sermons, Venues, and Live Stream tools.</p><button onClick={() => window.location.assign('/admin')} className="mt-5 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15">Open Admin Dashboard</button></div>}</section>;
}
