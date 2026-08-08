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
import Rhapsody from './pages/Rhapsody';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import RecordSouls from './pages/RecordSouls';
import AdminDashboard from './pages/AdminDashboard';
import LeadersForum from './pages/LeadersForum';
import { useAuth } from './context/AuthContext';

const AnimatedRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/outreaches" element={<Layout><Outreaches /></Layout>} />
          <Route path="/events" element={<Layout><Events /></Layout>} />
          <Route path="/live" element={<Layout><Live /></Layout>} />
          <Route path="/rhapsody" element={<Layout><Rhapsody /></Layout>} />
          <Route path="/checkin" element={<Layout><Checkin /></Layout>} />
          <Route path="/give" element={<Layout><Give /></Layout>} />
          <Route path="/salvation" element={<Layout><Salvation /></Layout>} />
          <Route path="/connect" element={<Layout><Connect /></Layout>} />
          <Route path="/auth" element={<Layout><Auth /></Layout>} />
          {/* Auth-guarded routes: render Auth page when user is not signed in */}
          <Route
            path="/dashboard"
            element={<Layout>{user ? <Dashboard /> : <Auth />}</Layout>}
          />
          <Route
            path="/record-souls"
            element={<Layout>{user ? <RecordSouls /> : <Auth />}</Layout>}
          />
          <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
          <Route path="/leaders-forum" element={<Layout><LeadersForum /></Layout>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

function App() {
  return <AnimatedRoutes />;
}

export default App;
