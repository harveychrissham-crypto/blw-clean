import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../config/api';
import { setToken, clearToken, getToken } from '../utils/authToken';

const AuthContext = createContext(null);

/**
 * Session strategy:
 *  - A JWT is the source of truth for authentication, stored via
 *    Capacitor Preferences (utils/authToken.js) and sent as
 *    "Authorization: Bearer <token>" on every request (see apiFetch).
 *    Cross-origin cookies are NOT used for the native app: the UI is
 *    bundled locally while the API lives on a different origin, and the
 *    backend's cookie is sameSite=strict in production, which browsers/
 *    WebViews refuse to send cross-origin. Bearer tokens sidestep that.
 *  - We keep a lightweight { user } object in React state so the UI knows
 *    who is logged in.
 *  - On every mount (including app restart) we call /api/auth/me using
 *    whichever token is stored. If there's no token, or it's invalid or
 *    expired, we treat the session as gone.
 *  - /api/auth/me also issues a fresh token, so active users never get
 *    logged out due to token expiry.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until first /me check

  const restoreSession = useCallback(async () => {
    try {
      const existingToken = await getToken();
      if (!existingToken) {
        setUser(null);
        return;
      }

      const res = await apiFetch('/api/auth/me', { method: 'GET' });

      if (!res.ok) {
        await clearToken();
        setUser(null);
        return;
      }

      const body = await res.json();
      if (body.token) await setToken(body.token);
      setUser(body.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run once on mount — restores session after app restart / page refresh
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (userData, token) => {
    // userData/token come straight from the login/register API response
    if (token) await setToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed', err);
    }
    await clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
