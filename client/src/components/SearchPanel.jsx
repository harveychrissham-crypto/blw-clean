import { useMemo, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Card } from './ui/Card';
import { IconButton } from './ui/Button';

const content = [
  { title: 'Home', path: '/', description: 'Your Emet feed and latest updates.' },
  { title: 'Explore', path: '/explore', description: 'Discover posts, people, and new communities.' },
  { title: 'Communities', path: '/communities', description: 'Find and join communities that interest you.' },
  { title: 'Messages', path: '/messages', description: 'Continue conversations with people on Emet.' },
  { title: 'Notifications', path: '/notifications', description: 'See your latest Emet activity.' },
  { title: 'Bookmarks', path: '/bookmarks', description: 'Return to posts you saved.' },
  { title: 'Profile', path: '/profile', description: 'Manage your profile and connections.' },
  { title: 'Topics', path: '/topics', description: 'Browse conversations by topic.' },
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
      <Card variant="raised" className="max-h-[85vh] w-full animate-sheet-in overflow-y-auto overscroll-contain p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-soft sm:max-w-2xl sm:pb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-fuchsia-300"><FiSearch /><span className="text-sm font-semibold uppercase tracking-[0.2em]">Search</span></div>
          <IconButton onClick={onClose} aria-label="Close search"><FiX /></IconButton>
        </div>
        <Card variant="subtle" className="mt-4 flex items-center gap-2 px-4 py-3">
          <FiSearch className="text-slate-400" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className="flex-1 bg-transparent text-sm text-white outline-none" placeholder="Search Emet" />
        </Card>
        <div className="mt-5 space-y-3">
          {results.length === 0 ? (
            <Card variant="subtle" className="p-4 text-sm text-slate-400">No matching pages found yet.</Card>
          ) : (
            results.map((item) => (
              <Card key={item.path} as="a" href={item.path} onClick={onClose} variant="subtle" className="block p-4 transition hover:border-[#EC2FA8]/40 hover:bg-[#EC2FA8]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
                <div className="font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-sm text-slate-400">{item.description}</div>
              </Card>
            ))
          )}
        </div>
        <div className="mt-4 border-t border-white/[.06] pt-4 text-center">
          <Link to="/explore" onClick={onClose} className="text-xs font-semibold text-fuchsia-300 hover:text-white">Open visual Feed Explore →</Link>
        </div>
      </Card>
    </div>
  );
}
