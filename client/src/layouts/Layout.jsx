import { MdQrCodeScanner } from 'react-icons/md';
import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { FiX, FiHome, FiMic, FiCalendar, FiTarget, FiRadio, FiHeart, FiGift, FiPhone, FiSearch, FiUser, FiLogIn, FiShield, FiBell, FiVideo } from 'react-icons/fi';
import AIChatWidget from '../components/AIChatWidget';
import SearchPanel from '../components/SearchPanel';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount, onNotificationsUpdated } from '../utils/notificationStorage';
import Button from '../components/ui/Button';

const navItems = [
  { name: 'Home', path: '/', icon: FiHome },
  { name: 'Sermons', path: '/sermons', icon: FiMic },
  { name: 'Events', path: '/events', icon: FiCalendar },
  { name: 'Outreaches', path: '/outreaches', icon: FiTarget },
  { name: 'Live', path: '/live', icon: FiRadio },
  { name: 'Meetings', path: '/meetings', icon: FiVideo },
  { name: 'Give', path: '/give', icon: FiGift },
  { name: 'Check-In', path: '/checkin', icon: MdQrCodeScanner },
  { name: 'Leaders', path: '/leaders-forum', icon: FiShield },
];

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const refresh = () => setUnreadCount(getUnreadCount());
    refresh();
    return onNotificationsUpdated(refresh);
  }, []);

  return (
    <div className="min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at top left, rgba(120,20,60,0.45) 0%, transparent 45%), radial-gradient(ellipse at bottom right, rgba(60,20,100,0.35) 0%, transparent 45%), #0d0c18' }}>
      <header className="sticky top-0 z-50 border-b border-white/[0.07]" style={{ background: 'rgba(13,12,24,0.92)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-2 px-4 py-2 sm:gap-3 sm:px-5 sm:py-2.5">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <img src="/logo.png" alt="BLW Logo" className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10 sm:h-9 sm:w-9" />
            <span className="hidden sm:block">
              <span className="header-brand block leading-tight whitespace-nowrap" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#FFFFFF' }}>Believers' LoveWorld CM</span>
              <span className="block whitespace-nowrap" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '6px', color: '#F2A31C' }}>Kenya Zone</span>
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:flex" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return <NavLink key={`${item.path}-${item.name}`} to={item.path} end={item.path === '/'} className={({ isActive }) => `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[0.8rem] font-medium whitespace-nowrap transition-all duration-150 ${isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white/90 hover:bg-white/5'}`}><Icon className="h-3.5 w-3.5 shrink-0" />{item.name}</NavLink>;
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="custom" size="none" onClick={() => setSearchOpen(true)} className="rounded-lg p-2 text-white/50 transition hover:text-white hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label="Search"><FiSearch className="h-4 w-4" /></Button>
            <Link to="/notifications" className="relative rounded-lg p-2 text-white/50 transition hover:text-white hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label="Notifications">
              <FiBell className="h-4 w-4" />
              {unreadCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold-500" aria-hidden="true" />}
            </Link>
            {user ? <Link to="/dashboard" className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#EC2FA8,#8A2BE2)' }}><FiUser className="h-3.5 w-3.5" />My Account</Link> : <Link to="/auth" className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#EC2FA8,#8A2BE2)' }}><FiLogIn className="h-3.5 w-3.5" />Sign In</Link>}
          </div>
        </div>
      </header>

      {menuOpen && <div className="fixed inset-0 z-[60] sm:hidden" role="dialog" aria-modal="true"><div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} aria-hidden="true" /><div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-[1.75rem] border-t border-white/10 px-4 pb-6 pt-3" style={{ background: '#0f0e1b', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}><div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" /><div className="flex items-center justify-between px-1 pb-3"><span className="text-xs font-semibold uppercase tracking-widest text-white/40">Menu</span><Button variant="custom" size="none" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"><FiX size={18} /></Button></div><div className="grid grid-cols-3 gap-2">{navItems.map((item) => { const Icon=item.icon; return <NavLink key={`${item.path}-${item.name}`} to={item.path} end={item.path==='/' } className={({isActive})=>`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-center text-[11px] font-medium transition ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`} onClick={()=>setMenuOpen(false)}><Icon className="h-5 w-5" />{item.name}</NavLink>; })}</div><div className="mt-4 pt-4 border-t border-white/[0.07]">{user ? <Link to="/dashboard" className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white" style={{background:'linear-gradient(135deg,#EC2FA8,#8A2BE2)'}} onClick={()=>setMenuOpen(false)}><FiUser className="h-4 w-4" />My Account</Link> : <Link to="/auth" className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white" style={{background:'linear-gradient(135deg,#EC2FA8,#8A2BE2)'}} onClick={()=>setMenuOpen(false)}><FiLogIn className="h-4 w-4" />Sign In</Link>}</div></div></div>}

      <main>{children}</main>
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AIChatWidget />

      <footer className="hidden border-t border-white/[0.07] mt-8 sm:block" style={{ background: 'rgba(10,9,20,0.8)' }}>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
          <div><div className="flex items-center gap-2.5 mb-3"><img src="/logo.png" alt="BLW Logo" className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" /><span className="font-semibold text-sm" style={{fontFamily:'Montserrat, sans-serif'}}><span style={{color:'#FFFFFF'}}>Believers' LoveWorld CM</span>{' '}<span style={{color:'#F2A31C'}}>Kenya Zone</span></span></div><p className="text-xs text-white/60 leading-relaxed">Fellowship Without Borders for students and young professionals across Kenya Zone.</p></div>
          <div><h4 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{color:'#F2A31C'}}>Quick Links</h4><div className="flex flex-col gap-2 text-sm text-white/50"><Link to="/sermons" className="hover:text-white transition">Sermons</Link><Link to="/outreaches" className="hover:text-white transition">Outreaches</Link><Link to="/events" className="hover:text-white transition">Events</Link><Link to="/meetings" className="hover:text-white transition">Meetings</Link><Link to="/give" className="hover:text-white transition">Give</Link></div></div>
          <div><h4 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{color:'#F2A31C'}}>Stay Connected</h4><div className="flex items-center gap-3 text-white/50"><a href="https://wa.me/254700000000" className="rounded-xl border border-white/10 p-3 transition hover:border-white/25 hover:text-white" aria-label="WhatsApp"><FiPhone className="h-4 w-4" /></a><Link to="/connect" className="rounded-xl border border-white/10 p-3 transition hover:border-white/25 hover:text-white" aria-label="Connect"><FiHeart className="h-4 w-4" /></Link></div></div>
        </div>
        <div className="border-t border-white/[0.05] py-4 text-center text-xs text-white/25">© {new Date().getFullYear()} Believers' LoveWorld CM Kenya Zone · Kenya Zone</div>
      </footer>
      <div className="pb-24 pt-2 text-center text-[10px] text-white/20 sm:hidden">© {new Date().getFullYear()} Believers' LoveWorld CM Kenya Zone</div>
      <BottomNav onMoreClick={() => setMenuOpen((s) => !s)} moreActive={menuOpen} />
    </div>
  );
}
