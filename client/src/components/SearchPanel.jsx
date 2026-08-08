import { useMemo, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

const content = [
  { title: 'Home', path: '/', description: 'Welcome to Believers\' LoveWorld Campus Ministry East and Central Africa Region and our vision for fellowship.' },
  { title: 'Outreaches', path: '/outreaches', description: 'See upcoming opportunities to serve and participate.' },
  { title: 'Events', path: '/events', description: 'Explore the calendar of services, outreaches, and ministry events.' },
  { title: 'Live', path: '/live', description: 'Watch the current live service transmission, or see the upcoming stream schedule.' },
  { title: 'Check-In', path: '/checkin', description: 'Find your member profile and QR badge for quick attendance check-in.' },
  { title: 'Give', path: '/give', description: 'Support the ministry with secure giving options.' },
  { title: 'Salvation', path: '/salvation', description: 'Discover the gospel and connect with support.' },
  { title: 'Connect', path: '/connect', description: 'Contact the team, send prayer requests, or find a campus group.' },
  { title: 'Member Dashboard', path: '/dashboard', description: 'Access member tools, events, and prayer support.' }
];

export default function SearchPanel({ open, onClose }) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return content.slice(0, 6);
    const value = query.toLowerCase();
    return content.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(value));
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-[#121321]/85 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#140A30]/95 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-fuchsia-300">
            <FiSearch />
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">Search</span>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-slate-300 hover:text-white">
            <FiX />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#121321]/60 px-4 py-3">
          <FiSearch className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="flex-1 bg-transparent text-sm text-white outline-none"
            placeholder="Search ministry pages, events, and resources"
          />
        </div>
        <div className="mt-5 space-y-3">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#1F1334]/90 p-4 text-sm text-slate-400">No matching pages found yet.</div>
          ) : (
            results.map((item) => (
              <a key={item.path} href={item.path} onClick={onClose} className="block rounded-2xl border border-white/10 bg-[#1B122F]/80 p-4 transition hover:border-[#A53DFF]/40 hover:bg-[#8A2BE2]/10">
                <div className="font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-sm text-slate-400">{item.description}</div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
