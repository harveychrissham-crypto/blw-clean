import { useMemo, useState } from 'react';
import { FiArrowLeft, FiMessageCircle, FiSearch, FiUserPlus, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const name = user?.name || 'Member';
  const initial = name.charAt(0).toUpperCase();
  const normalizedQuery = query.trim().toLowerCase();

  const conversations = useMemo(() => [], []);
  const filtered = conversations.filter((conversation) =>
    `${conversation.name} ${conversation.preview}`.toLowerCase().includes(normalizedQuery)
  );

  return (
    <section className="mx-auto min-h-[calc(100vh-5rem)] max-w-2xl px-4 pb-24 pt-4 sm:px-6 sm:pt-8">
      <div className="sticky top-0 z-10 -mx-4 border-b border-white/[0.08] bg-[#08080d]/95 px-4 pb-3 pt-2 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/feed" aria-label="Back to feed" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:bg-white/[0.08] hover:text-white">
              <FiArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/dashboard" aria-label="Open profile" className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05] text-sm font-bold text-white">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-white">Messages</h1>
              <p className="truncate text-xs text-white/40">Your fellowship conversations</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => setSearchOpen((open) => !open)} aria-label={searchOpen ? 'Close search' : 'Search messages'} className="grid h-10 w-10 place-items-center rounded-full text-white/65 transition hover:bg-white/[0.06] hover:text-white">
              {searchOpen ? <FiX className="h-5 w-5" /> : <FiSearch className="h-5 w-5" />}
            </button>
            <Link to="/connect" aria-label="Find people to connect with" className="grid h-10 w-10 place-items-center rounded-full text-white/65 transition hover:bg-white/[0.06] hover:text-white">
              <FiUserPlus className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5">
            <FiSearch className="h-4 w-4 shrink-0 text-white/35" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-white/35 hover:text-white"><FiX className="h-4 w-4" /></button>}
          </div>
        )}
      </div>

      <div className="pt-4">
        {filtered.length > 0 ? (
          <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
            {filtered.map((conversation) => (
              <Link key={conversation.id} to={`/messages/${conversation.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.045]">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-sm font-bold text-white">{conversation.initial}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-white">{conversation.name}</p>
                    <span className="shrink-0 text-[10px] text-white/30">{conversation.time}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-white/40">{conversation.preview}</p>
                </div>
                {conversation.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 text-[10px] font-bold text-[#0d0c18]">{conversation.unread}</span>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[62vh] place-items-center py-12 text-center">
            <div className="max-w-sm">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/65 shadow-2xl shadow-black/20">
                <FiMessageCircle className="h-8 w-8" />
              </div>
              <h2 className="mt-6 text-xl font-bold text-white">{normalizedQuery ? 'No conversations found' : 'No messages yet'}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/40">
                {normalizedQuery ? 'Try a different name or search term.' : 'When member messaging is enabled, your conversations will appear here.'}
              </p>
              {!user && <Link to="/auth" className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0d0c18]">Sign in to message</Link>}
              {user && !normalizedQuery && <Link to="/connect" className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"><FiUserPlus className="h-4 w-4" /> Find people</Link>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
