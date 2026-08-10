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
import AdminDashboard from './pages/AdminDashboard';
import LeadersForum from './pages/LeadersForum';

import { useAuth } from './context/AuthContext';
import OfflineBanner from './components/OfflineBanner';

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

          {/* Home */}
          <Route
            path="/"
            element={
              <Layout>
                <Home />
              </Layout>
            }
          />

          {/* Outreaches */}
          <Route
            path="/outreaches"
            element={
              <Layout>
                <Outreaches />
              </Layout>
            }
          />

          {/* Events */}
          <Route
            path="/events"
            element={
              <Layout>
                <Events />
              </Layout>
            }
          />

          {/* Live */}
          <Route
            path="/live"
            element={
              <Layout>
                <Live />
              </Layout>
            }
          />

          {/* Sermons */}
          <Route
            path="/sermons"
            element={
              <Layout>
                <Sermons />
              </Layout>
            }
          />

          {/* Check-in */}
          <Route
            path="/checkin"
            element={
              <Layout>
                <Checkin />
              </Layout>
            }
          />

          {/* Give */}
          <Route
            path="/give"
            element={
              <Layout>
                <Give />
              </Layout>
            }
          />

          {/* Salvation */}
          <Route
            path="/salvation"
            element={
              <Layout>
                <Salvation />
              </Layout>
            }
          />

          {/* Connect */}
          <Route
            path="/connect"
            element={
              <Layout>
                <Connect />
              </Layout>
            }
          />

          {/* Authentication */}
          <Route
            path="/auth"
            element={
              <Layout>
                <Auth />
              </Layout>
            }
          />

          {/* User Dashboard */}
          <Route
            path="/dashboard"
            element={
              <Layout>
                {user ? <Dashboard /> : <Auth />}
              </Layout>
            }
          />

          {/* Record Souls */}
          <Route
            path="/record-souls"
            element={
              <Layout>
                {user ? <RecordSouls /> : <Auth />}
              </Layout>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <Layout>
                <AdminDashboard />
              </Layout>
            }
          />

          {/* Leaders Forum */}
          <Route
            path="/leaders-forum"
            element={
              <Layout>
                <LeadersForum />
              </Layout>
            }
          />

          {/* Unknown routes return home */}
          <Route
            path="*"
            element={
              <Layout>
                <Home />
              </Layout>
            }
          />

        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

function App() {
  return (
    <>
      <OfflineBanner />
      <AnimatedRoutes />
    </>
  );
}

export default App;