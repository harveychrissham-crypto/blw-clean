import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiClock, FiSearch, FiX, FiUsers } from 'react-icons/fi';
import { fetchAllMembers, getCachedMembers } from '../utils/members';
import { getOfflineCheckinQueue } from '../utils/offlineCheckin';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0c18]/95 px-4 py-8">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#12111d] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#F2A31C]">Leaders tool</p>
            <h2 className="mt-1 text-xl font-bold text-white">Check Attendance</h2>
            <p className="mt-1 text-xs text-white/40">Works offline. Pending records sync automatically when connection returns.</p>
          </div>
          <div className="flex items-center gap-2">
            {onBackToTools && (
              <button
                onClick={onBackToTools}
                className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Back to Leadership Tools
              </button>
            )}
            <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/10">
              <FiX />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Members</p>
              <p className="mt-2 text-2xl font-bold text-white">{rows.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-400">Signed in</p>
              <p className="mt-2 text-2xl font-bold text-emerald-300">{checkedIn}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-300">Pending sync</p>
              <p className="mt-2 text-2xl font-bold text-amber-200">{pending}</p>
            </div>
          </div>

          <div className="relative mb-4">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search member name, ID, or PCF…"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none focus:border-[#F2A31C]/50"
            />
          </div>

          <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-white/10">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <FiUsers className="h-8 w-8 text-white/20" />
                <p className="text-sm text-white/40">No attendance records to show.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((member) => {
                  const isPending = pendingIds.has(member.membershipId);
                  const isChecked = !!member.checkedIn;
                  return (
                    <div key={member.membershipId} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] text-sm font-black text-white">
                        {String(member.name || '?').charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{member.name || 'Unknown member'}</p>
                        <p className="truncate text-xs text-white/40">{member.membershipId}{member.chapter ? ` · ${member.chapter}` : ''}</p>
                      </div>
                      {isPending ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
                          <FiClock className="h-3 w-3" /> Pending sync
                        </span>
                      ) : isChecked ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                          <FiCheckCircle className="h-3 w-3" /> Signed in
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold text-white/35">
                          Not signed in
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
