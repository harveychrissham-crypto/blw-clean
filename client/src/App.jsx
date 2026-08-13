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

    const syncBodyScrollLock = () => {
      const leadershipOverlay = document.querySelector('[data-leadership-tools-overlay]');
      const attendanceOverlay = Array.from(document.querySelectorAll('[class*="z-[120]"]')).find((el) =>
        (el.textContent || '').includes('Check Attendance')
      );
      const locked = !!leadershipOverlay || !!attendanceOverlay;
      body.style.overflow = locked ? 'hidden' : previousOverflow;
      body.style.touchAction = locked ? 'none' : previousTouchAction;
    };

    syncBodyScrollLock();
    const observer = new MutationObserver(syncBodyScrollLock);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
    };
  }, []);

  return <><OfflineBanner /><AnimatedRoutes /></>;
}
export default App;
