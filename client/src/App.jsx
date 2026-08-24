import { useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from './layouts/Layout';
import Home from './pages/Home';
import Outreaches from './pages/Outreaches';
import Events from './pages/Events';
import Checkin from './pages/Checkin';
import Give from './pages/Give';
import Connect from './pages/Connect';
import Live from './pages/Live';
import Sermons from './pages/Sermons';
import Auth from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import RecordSouls from './pages/RecordSouls';
import LeadersForumWithFellowship from './pages/LeadersForumWithFellowship';
import FellowshipLocationsAdminSecure from './pages/FellowshipLocationsAdminSecure';
import NotificationCenter from './pages/NotificationCenter';
import Notifications from './pages/Notifications';
import { useAuth } from './context/AuthContext';
import OfflineBanner from './components/OfflineBanner';
import { startOfflineSyncListeners } from './offlineSync';

const FellowshipLocationsPage = () => {
  const navigate = useNavigate();
  return <div className="relative"><div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8"><button type="button" onClick={() => navigate('/leaders-forum')} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">← Back to Leaders Forum</button></div><FellowshipLocationsAdminSecure /></div>;
};

const LegacyAdminRoute = () => {
  const navigate = useNavigate();
  return <section className="mx-auto max-w-xl px-5 py-20 text-center"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8"><h1 className="text-2xl font-bold text-white">Content administration</h1><p className="mt-3 text-sm leading-relaxed text-white/45">The old Admin Dashboard route has been retired. Content administration is now handled through Leadership Tools.</p><button type="button" onClick={() => navigate('/leaders-forum')} className="mt-6 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15">Open Leadership Tools</button></div></section>;
};

const BOTTOM_TAB_PATHS = ['/', '/events', '/checkin', '/live'];

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { user } = useAuth();
  const route = (element) => <Layout>{element}</Layout>;
  const prevPathRef = useRef(location.pathname);

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [location.pathname]);
  const isTabSwitch = BOTTOM_TAB_PATHS.includes(location.pathname) && BOTTOM_TAB_PATHS.includes(prevPathRef.current) && location.pathname !== prevPathRef.current;
  const transition = isTabSwitch
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, duration: 0.15 }
    : navigationType === 'POP'
      ? { initial: { opacity: 0, x: -24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 24 }, duration: 0.28 }
      : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, duration: 0.28 };
  useEffect(() => { prevPathRef.current = location.pathname; });

  return <AnimatePresence mode="wait"><motion.div key={location.pathname} initial={transition.initial} animate={transition.animate} exit={transition.exit} transition={{ duration: transition.duration }}><Routes location={location}>
    <Route path="/" element={route(<Home />)} />
    <Route path="/outreaches" element={route(<Outreaches />)} />
    <Route path="/events" element={route(<Events />)} />
    <Route path="/live" element={route(<Live />)} />
    <Route path="/sermons" element={route(<Sermons />)} />
    <Route path="/checkin" element={route(<Checkin />)} />
    <Route path="/give" element={route(<Give />)} />
    <Route path="/connect" element={route(<Connect />)} />
    <Route path="/auth" element={route(<Auth />)} />
    <Route path="/forgot-password" element={route(<ForgotPassword />)} />
    <Route path="/reset-password" element={route(<ResetPassword />)} />
    <Route path="/dashboard" element={route(user ? <Dashboard /> : <Auth />)} />
    <Route path="/record-souls" element={route(user ? <RecordSouls /> : <Auth />)} />
    <Route path="/admin" element={route(<LegacyAdminRoute />)} />
    <Route path="/leaders-forum" element={route(<LeadersForumWithFellowship />)} />
    <Route path="/fellowship-locations" element={route(<FellowshipLocationsPage />)} />
    <Route path="/leaders-forum/notifications" element={route(<NotificationCenter />)} />
    <Route path="/notifications" element={route(<Notifications />)} />
    <Route path="*" element={route(<Home />)} />
  </Routes></motion.div></AnimatePresence>;
};

function App() {
  useEffect(() => startOfflineSyncListeners(), []);
  useEffect(() => {
    const body = document.body, html = document.documentElement;
    const previousBodyOverflow = body.style.overflow, previousBodyTouchAction = body.style.touchAction;
    const previousHtmlOverflow = html.style.overflow, previousHtmlTouchAction = html.style.touchAction;
    const isFullScreenOverlay = (el) => {
      if (!(el instanceof HTMLElement) || !el.classList.contains('fixed')) return false;
      const className = String(el.className);
      const fillsViewport = el.classList.contains('inset-0') || (el.classList.contains('top-0') && el.classList.contains('bottom-0'));
      if (!fillsViewport) return false;
      const text = el.textContent || '';
      return className.includes('z-[') || /(?:^|:)z-(?:40|50|\[\d+\])/.test(className) || /backdrop|modal|overlay|dialog|Leaders tool|Leadership Tools|Member Check-In|Check Attendance|Manage (?:Events|Outreach Stories|Sermons|Service Venues|Live Stream)/i.test(text) || el.hasAttribute('data-live-welcome-overlay') || el.getAttribute('role') === 'dialog' || el.hasAttribute('data-leadership-tools-overlay');
    };
    const syncBodyScrollLock = () => { const locked = Array.from(document.querySelectorAll('.fixed')).some(isFullScreenOverlay); body.style.overflow = locked ? 'hidden' : previousBodyOverflow; body.style.touchAction = locked ? 'none' : previousBodyTouchAction; html.style.overflow = locked ? 'hidden' : previousHtmlOverflow; html.style.touchAction = locked ? 'none' : previousHtmlTouchAction; };
    syncBodyScrollLock();
    const observer = new MutationObserver(syncBodyScrollLock);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'role', 'data-leadership-tools-overlay', 'data-live-welcome-overlay'] });
    return () => { observer.disconnect(); body.style.overflow = previousBodyOverflow; body.style.touchAction = previousBodyTouchAction; html.style.overflow = previousHtmlOverflow; html.style.touchAction = previousHtmlTouchAction; };
  }, []);
  return <><OfflineBanner /><AnimatedRoutes /></>;
}
export default App;
