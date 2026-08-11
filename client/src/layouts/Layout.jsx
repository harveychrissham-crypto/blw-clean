import { MdQrCodeScanner } from 'react-icons/md';
import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';

import {
  FiMenu,
  FiX,
  FiHome,
  FiMic,
  FiCalendar,
  FiTarget,
  FiRadio,
  FiHeart,
  FiGift,
  FiPhone,
  FiSearch,
  FiUser,
  FiLogIn,
  FiShield,
} from 'react-icons/fi';

import AIChatWidget from '../components/AIChatWidget';
import SearchPanel from '../components/SearchPanel';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { name: 'Home', path: '/', icon: FiHome },
  { name: 'Sermons', path: '/sermons', icon: FiMic },
  { name: 'Events', path: '/events', icon: FiCalendar },
  { name: 'Outreaches', path: '/outreaches', icon: FiTarget },
  { name: 'Live', path: '/live', icon: FiRadio },
  { name: 'Give', path: '/give', icon: FiGift },
  { name: 'Salvation', path: '/salvation', icon: FiHeart },
  { name: 'Check-In', path: '/checkin', icon: MdQrCodeScanner },
  { name: 'Leaders', path: '/leaders-forum', icon: FiShield },
];

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          'radial-gradient(ellipse at top left, rgba(120,20,60,0.45) 0%, transparent 45%), radial-gradient(ellipse at bottom right, rgba(60,20,100,0.35) 0%, transparent 45%), #0d0c18',
      }}
    >
      {/* NAVBAR */}
      <header
        className="sticky top-0 z-50 border-b border-white/[0.07]"
        style={{
          background: 'rgba(13,12,24,0.92)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5">

          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <img
              src="/logo.png"
              alt="BLW Logo"
              className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10"
            />

            <span className="hidden sm:block">
              <span
                className="header-brand block text-white leading-tight whitespace-nowrap"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                }}
              >
                Believers' LoveWorld CM Kenya Zone
              </span>

              <span
                className="block whitespace-nowrap"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.6rem',
                  textTransform: 'uppercase',
                  letterSpacing: '6px',
                  background:
                    'linear-gradient(90deg,#F2A31C,#F6C94E)',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Kenya Zone
              </span>
            </span>
          </Link>

          {/* Navigation */}
          <nav
            className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={`${item.path}-${item.name}`}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[0.8rem] font-medium whitespace-nowrap transition-all duration-150 ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/55 hover:text-white/90 hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-2">

            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-lg p-2 text-white/50 transition hover:text-white hover:bg-white/5"
              aria-label="Search"
            >
              <FiSearch className="h-4 w-4" />
            </button>

            {user ? (
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{
                  background:
                    'linear-gradient(135deg,#EC2FA8,#8A2BE2)',
                }}
              >
                <FiUser className="h-3.5 w-3.5" />
                My Account
              </Link>
            ) : (
              <Link
                to="/auth"
                className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{
                  background:
                    'linear-gradient(135deg,#EC2FA8,#8A2BE2)',
                }}
              >
                <FiLogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
            )}

            <button
              className="rounded-lg border border-white/10 p-2 sm:hidden text-white/60 hover:text-white"
              onClick={() => setMenuOpen((s) => !s)}
              aria-label="Menu"
            >
              {menuOpen ? (
                <FiX size={18} />
              ) : (
                <FiMenu size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="border-t border-white/[0.07] px-4 py-4 sm:hidden"
            style={{
              background: 'rgba(13,12,24,0.97)',
            }}
          >
            <div className="flex flex-col gap-1">

              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={`${item.path}-${item.name}`}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </NavLink>
                );
              })}

              <div className="mt-3 pt-3 border-t border-white/[0.07]">

                {user ? (
                  <Link
                    to="/dashboard"
                    className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white"
                    style={{
                      background:
                        'linear-gradient(135deg,#EC2FA8,#8A2BE2)',
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <FiUser className="h-4 w-4" />
                    My Account
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white"
                    style={{
                      background:
                        'linear-gradient(135deg,#EC2FA8,#8A2BE2)',
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <FiLogIn className="h-4 w-4" />
                    Sign In
                  </Link>
                )}

              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {children}
      </main>

      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      <AIChatWidget />

      {/* FOOTER */}
      <footer
        className="border-t border-white/[0.07] mt-8"
        style={{
          background: 'rgba(10,9,20,0.8)',
        }}
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">

          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <img
                src="/logo.png"
                alt="BLW Logo"
                className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
              />

              <span
                className="font-semibold text-white text-sm"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Believers' LoveWorld CM Kenya Zone
              </span>
            </div>

            <p className="text-xs text-white/40 leading-relaxed">
              Fellowship Without Borders for students and young
              professionals across Kenya Zone.
            </p>
          </div>

          <div>
            <h4
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#F2A31C' }}
            >
              Quick Links
            </h4>

            <div className="flex flex-col gap-2 text-sm text-white/50">

              <Link
                to="/sermons"
                className="hover:text-white transition"
              >
                Sermons
              </Link>

              <Link
                to="/outreaches"
                className="hover:text-white transition"
              >
                Outreaches
              </Link>

              <Link
                to="/events"
                className="hover:text-white transition"
              >
                Events
              </Link>

              <Link
                to="/give"
                className="hover:text-white transition"
              >
                Give
              </Link>

              <Link
                to="/salvation"
                className="hover:text-white transition"
              >
                Salvation
              </Link>

            </div>
          </div>

          <div>
            <h4
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#F2A31C' }}
            >
              Stay Connected
            </h4>

            <div className="flex items-center gap-3 text-white/50">

              <a
                href="https://wa.me/254700000000"
                className="rounded-xl border border-white/10 p-3 transition hover:border-white/25 hover:text-white"
                aria-label="WhatsApp"
              >
                <FiPhone className="h-4 w-4" />
              </a>

              <Link
                to="/connect"
                className="rounded-xl border border-white/10 p-3 transition hover:border-white/25 hover:text-white"
                aria-label="Connect"
              >
                <FiHeart className="h-4 w-4" />
              </Link>

            </div>
          </div>

        </div>

        <div className="border-t border-white/[0.05] py-4 text-center text-xs text-white/25">
          © {new Date().getFullYear()} Believers' LoveWorld CM Kenya Zone · Kenya Zone
        </div>
      </footer>

    </div>
  );
}