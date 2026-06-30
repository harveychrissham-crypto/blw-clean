import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

/**
 * Session strategy:
 *  - The HttpOnly cookie is the source of truth for authentication.
 *  - We keep a lightweight { user } object in React state (not localStorage)
 *    so the UI knows who is logged in without exposing the token to JS.
 *  - On every mount (including page refresh) we call /api/auth/me.
 *    The server validates the cookie and returns the user; if it fails we
 *    treat the session as gone.
 *  - /api/auth/me also issues a fresh cookie, so active users never get
 *    logged out due to token expiry.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until first /me check

  const restoreSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const body = await res.json();
      setUser(body.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run once on mount — restores session after page refresh
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback((userData) => {
    // userData comes straight from the login API response
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout request failed', err);
    }
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
