import { useEffect, useState } from 'react';
import { apiFetch } from '../config/api';

// Admin-gated pages should use this instead of trusting AuthContext's
// cached `user.isAdmin` — that value is only as fresh as the last /me
// call (session restore or login), so it can go stale if someone's admin
// flag is revoked or granted mid-session. This re-checks the server every
// time the hook mounts, matching how the actual admin API endpoints
// enforce access — so the UI can't drift out of step with what the
// backend will actually allow.
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiFetch('/api/auth/admin-status');
        const body = await response.json().catch(() => ({}));
        if (!cancelled) setIsAdmin(response.ok && body.isAdmin === true);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { isAdmin, checking };
}
