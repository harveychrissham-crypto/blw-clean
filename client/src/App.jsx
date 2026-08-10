import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

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

import { syncOfflineContent } from './offlineSync';

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

          {/* HOME */}
          <Route
            path="/"
            element={
              <Layout>
                <Home />
              </Layout>
            }
          />

          {/* OUTREACHES */}
          <Route
            path="/outreaches"
            element={
              <Layout>
                <Outreaches />
              </Layout>
            }
          />

          {/* EVENTS */}
          <Route
            path="/events"
            element={
              <Layout>
                <Events />
              </Layout>
            }
          />

          {/* LIVE */}
          <Route
            path="/live"
            element={
              <Layout>
                <Live />
              </Layout>
            }
          />

          {/* SERMONS */}
          <Route
            path="/sermons"
            element={
              <Layout>
                <Sermons />
              </Layout>
            }
          />

          {/* CHECK-IN */}
          <Route
            path="/checkin"
            element={
              <Layout>
                <Checkin />
              </Layout>
            }
          />

          {/* GIVE */}
          <Route
            path="/give"
            element={
              <Layout>
                <Give />
              </Layout>
            }
          />

          {/* SALVATION */}
          <Route
            path="/salvation"
            element={
              <Layout>
                <Salvation />
              </Layout>
            }
          />

          {/* CONNECT */}
          <Route
            path="/connect"
            element={
              <Layout>
                <Connect />
              </Layout>
            }
          />

          {/* AUTH */}
          <Route
            path="/auth"
            element={
              <Layout>
                <Auth />
              </Layout>
            }
          />

          {/* DASHBOARD */}
          <Route
            path="/dashboard"
            element={
              <Layout>
                {user ? <Dashboard /> : <Auth />}
              </Layout>
            }
          />

          {/* RECORD SOULS */}
          <Route
            path="/record-souls"
            element={
              <Layout>
                {user ? <RecordSouls /> : <Auth />}
              </Layout>
            }
          />

          {/* ADMIN */}
          <Route
            path="/admin"
            element={
              <Layout>
                <AdminDashboard />
              </Layout>
            }
          />

          {/* LEADERS FORUM */}
          <Route
            path="/leaders-forum"
            element={
              <Layout>
                <LeadersForum />
              </Layout>
            }
          />

        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

function App() {
  useEffect(() => {
    // Sync public content when the app starts.
    syncOfflineContent();

    // Sync again whenever the device comes back online.
    const handleOnline = () => {
      console.log('Internet connection restored.');
      syncOfflineContent();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <>
      <OfflineBanner />
      <AnimatedRoutes />
    </>
  );
}

export default App;