import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from './layouts/Layout';
import Home from './pages/Home';
import Outreaches from './pages/Outreaches';
import Events from './pages/Events';
import Checkin from './pages/Checkin';
import Give from './pages/Give';
import Salvation from './pages/Salvation';
import Connect from './pages/Connect';
import Live from './pages/Live';
import Sermons from './pages/Sermons';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import RecordSouls from './pages/RecordSouls';
import LeaderAdmin from './pages/LeaderAdmin';
import LeadersForumWithFellowship from './pages/LeadersForumWithFellowship';
import FellowshipLocationsAdmin from './pages/FellowshipLocationsAdmin';
import { useAuth } from './context/AuthContext';
import OfflineBanner from './components/OfflineBanner';
import { startOfflineSyncListeners } from './offlineSync';

const FellowshipLocationsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="relative">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('/leaders-forum')}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          ← Back to Leaders Forum
        </button>
      </div>
      <FellowshipLocationsAdmin />
    </div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();
  const route = (element) => <Layout>{element}</Layout>;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return <AnimatePresence mode="wait"><motion.div key={location.pathname} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}><Routes location={location}>
    <Route path="/" element={route(<Home />)} />
    <Route path="/outreaches" element={route(<Outreaches />)} />
    <Route path="/events" element={route(<Events />)} />
    <Route path="/live" element={route(<Live />)} />
    <Route path="/sermons" element={route(<Sermons />)} />
    <Route path="/checkin" element={route(<Checkin />)} />
    <Route path="/give" element={route(<Give />)} />
    <Route path="/salvation" element={route(<Salvation />)} />
    <Route path="/connect" element={route(<Connect />)} />
    <Route path="/auth" element={route(<Auth />)} />
    <Route path="/dashboard" element={route(user ? <Dashboard /> : <Auth />)} />
    <Route path="/record-souls" element={route(user ? <RecordSouls /> : <Auth />)} />
    <Route path="/admin" element={route(<LeaderAdmin />)} />
    <Route path="/leaders-forum" element={route(<LeadersForumWithFellowship />)} />
    <Route path="/fellowship-locations" element={route(<FellowshipLocationsPage />)} />
    <Route path="*" element={route(<Home />)} />
  </Routes></motion.div></AnimatePresence>;
};

function App() {
  useEffect(() => startOfflineSyncListeners(), []);

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousTouchAction = body.style.touchAction;

    const isFullScreenOverlay = (el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (!el.classList.contains('fixed')) return false;

      const fillsViewport =
        el.classList.contains('inset-0') ||
        (el.classList.contains('top-0') && el.classList.contains('bottom-0'));

      if (!fillsViewport) return false;

      // Ignore the normal fixed navigation/header elements.
      const text = el.textContent || '';
      const hasOverlaySignals =
        el.className.includes('z-[') ||
        /(?:^|:)z-(?:40|50|\[\d+\])/.test(el.className) ||
        /backdrop|modal|overlay|dialog/i.test(text) ||
        el.getAttribute('role') === 'dialog' ||
        el.hasAttribute('data-leadership-tools-overlay');

      return hasOverlaySignals;
    };

    const syncBodyScrollLock = () => {
      const locked = Array.from(document.querySelectorAll('.fixed')).some(isFullScreenOverlay);
      body.style.overflow = locked ? 'hidden' : previousOverflow;
      body.style.touchAction = locked ? 'none' : previousTouchAction;
    };

    syncBodyScrollLock();
    const observer = new MutationObserver(syncBodyScrollLock);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'role', 'data-leadership-tools-overlay'] });

    return () => {
      observer.disconnect();
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
    };
  }, []);

  return <><OfflineBanner /><AnimatedRoutes /></>;
}
export default App;
