import { FiMessageCircle, FiSearch } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const name = user?.name || 'Member';
  const initial = name.charAt(0).toUpperCase();

  return (
    <section className="mx-auto min-h-[calc(100vh-5rem)] max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" aria-label="Open profile" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#c93690] to-[#4d1b82] text-sm font-bold text-white">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Messages</h1>
            <p className="text-xs text-white/40">Connect with your fellowship community</p>
          </div>
        </div>
        <button type="button" aria-label="Search messages" className="rounded-full p-2.5 text-white/60 hover:bg-white/5 hover:text-white"><FiSearch className="h-5 w-5" /></button>
      </div>

      <div className="grid min-h-[55vh] place-items-center py-12 text-center">
        <div className="max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70">
            <FiMessageCircle className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-white">Your messages</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/45">Private member messaging is ready for this space. Conversations will appear here when messaging is enabled for your community.</p>
          {!user && <Link to="/auth" className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0d0c18]">Sign in to message</Link>}
        </div>
      </div>
    </section>
  );
}
