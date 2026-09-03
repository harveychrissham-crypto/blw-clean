import { useMemo, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { Card } from './ui/Card';

const content = [
  { title: 'Home', path: '/', description: 'Welcome to Believers\' LoveWorld Campus Ministry Kenya Zone Region and our vision for fellowship.' },
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
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#121321]/85 px-2 pb-2 backdrop-blur sm:items-start sm:px-4 sm:py-8">
      <Card
        variant="raised"
        className="max-h-[85vh] w-full animate-sheet-in overflow-y-auto overscroll-contain p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-soft sm:max-w-2xl sm:pb-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-fuchsia-300">
            <FiSearch />
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">Search</span>
          </div>
          <button onClick={onClose} aria-label="Close search" className="rounded-full border border-white/10 p-2 text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
            <FiX />
          </button>
        </div>
        <Card variant="subtle" className="mt-4 flex items-center gap-2 px-4 py-3">
          <FiSearch className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="flex-1 bg-transparent text-sm text-white outline-none"
            placeholder="Search ministry pages, events, and resources"
          />
        </Card>
        <div className="mt-5 space-y-3">
          {results.length === 0 ? (
            <Card variant="subtle" className="p-4 text-sm text-slate-400">No matching pages found yet.</Card>
          ) : (
            results.map((item) => (
              <Card key={item.path} as="a" href={item.path} onClick={onClose} variant="subtle" className="block p-4 transition hover:border-purple-400/40 hover:bg-purple-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
                <div className="font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-sm text-slate-400">{item.description}</div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
