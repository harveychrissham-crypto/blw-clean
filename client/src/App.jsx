import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
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

const AnimatedRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();
  const route = (element) => <Layout>{element}</Layout>;
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
    <Route path="/fellowship-locations" element={route(<FellowshipLocationsAdmin />)} />
    <Route path="*" element={route(<Home />)} />
  </Routes></motion.div></AnimatePresence>;
};

function App() { return <><OfflineBanner /><AnimatedRoutes /></>; }
export default App;
