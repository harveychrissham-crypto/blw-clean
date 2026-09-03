import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiClock, FiSearch, FiX, FiUsers } from 'react-icons/fi';
import { fetchAllMembers, getCachedMembers } from '../utils/members';
import { getOfflineCheckinQueue } from '../utils/offlineCheckin';
import { Card, StatGroup } from './ui/Card';

function localDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function OfflineAttendanceSheet({ members = [], onClose, onBackToTools }) {
  const [query, setQuery] = useState('');
  const [queue, setQueue] = useState([]);
  const [directory, setDirectory] = useState(members);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const loadQueue = async () => {
    try {
      setQueue(await getOfflineCheckinQueue());
    } catch {
      setQueue([]);
    }
  };

  const loadDirectory = async () => {
    if (members.length) {
      setDirectory(members);
      return;
    }

    try {
      if (navigator.onLine) {
        const fresh = await fetchAllMembers();
        setDirectory(fresh);
        return;
      }
    } catch {
      // Fall back to the locally cached member directory.
    }

    setDirectory(await getCachedMembers());
  };

  useEffect(() => {
    loadQueue();
    loadDirectory();
    const timer = window.setInterval(() => {
      loadQueue();
      loadDirectory();
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const today = localDateKey();
  const pendingToday = queue.filter((item) => item.dateKey === today);
  const pendingIds = new Set(pendingToday.map((item) => item.membershipId));

  const rows = useMemo(() => {
    const byId = new Map(directory.map((member) => [member.membershipId, { ...member }]));

    for (const item of pendingToday) {
      if (!byId.has(item.membershipId)) {
        byId.set(item.membershipId, {
          membershipId: item.membershipId,
          name: item.name || item.membershipId,
          checkedIn: true,
        });
      } else {
        const member = byId.get(item.membershipId);
        byId.set(item.membershipId, { ...member, checkedIn: true });
      }
    }

    return [...byId.values()].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    );
  }, [directory, pendingToday]);

  const filtered = rows.filter((member) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [member.name, member.membershipId, member.chapter]
      .some((value) => String(value || '').toLowerCase().includes(q));
  });

  const checkedIn = rows.filter((member) => member.checkedIn).length;
  const pending = rows.filter((member) => pendingIds.has(member.membershipId)).length;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overscroll-contain bg-ink-900/95 px-3 py-6 sm:items-center">
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#12111d] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-gold-500">Leaders tool</p>
            <h2 className="mt-0.5 text-sm font-bold text-white">Check Attendance</h2>
            <p className="mt-0.5 text-[10px] leading-snug text-white/50">Works offline. Syncs automatically.</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onBackToTools && (
              <button
                onClick={onBackToTools}
                className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[10px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Back
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
              <FiX className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          <div className="mb-3">
            <StatGroup
              compact
              items={[
                { label: 'Members', value: rows.length, icon: FiUsers, accent: '#94a3b8' },
                { label: 'Signed in', value: checkedIn, icon: FiCheckCircle, accent: '#34d399' },
                { label: 'Pending', value: pending, icon: FiClock, accent: '#fbbf24' },
              ]}
            />
          </div>

          <div className="relative mb-3">
            <FiSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, ID, or PCF…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-2 pl-8 pr-3 text-xs text-white placeholder-white/20 outline-none focus:border-gold-500/50"
            />
          </div>

          <Card variant="raised" className="overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                <FiUsers className="h-6 w-6 text-white/20" />
                <p className="text-xs text-white/60">No attendance records to show.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((member) => {
                  const isPending = pendingIds.has(member.membershipId);
                  const isChecked = !!member.checkedIn;
                  return (
                    <div key={member.membershipId} className="flex items-center gap-2.5 px-3 py-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-600 via-purple-500 to-indigo-500 text-[11px] font-black text-white">
                        {String(member.name || '?').charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white">{member.name || 'Unknown member'}</p>
                        <p className="truncate text-[10px] text-white/50">{member.membershipId}{member.chapter ? ` · ${member.chapter}` : ''}</p>
                      </div>
                      {isPending ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold text-amber-300">
                          <FiClock className="h-2.5 w-2.5" /> Pending
                        </span>
                      ) : isChecked ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                          <FiCheckCircle className="h-2.5 w-2.5" /> Signed in
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-0.5 text-[9px] font-semibold text-white/35">
                          Not signed in
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
