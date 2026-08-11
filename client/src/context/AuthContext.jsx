import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email || '')
      .maybeSingle();

    if (error) {
      console.warn('Unable to load BLW member profile:', error.message);
      return {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || '',
      };
    }

    return data || {
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || '',
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialise = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(currentSession);
      setUser(await loadProfile(currentSession?.user || null));
      setLoading(false);
    };

    initialise();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(await loadProfile(nextSession?.user || null));
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await loadProfile(data.user);
    setSession(data.session);
    setUser(profile);
    return profile;
  }, [loadProfile]);

  const register = useCallback(async (form) => {
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          phone: form.phone,
        },
      },
    });

    if (error) throw error;

    if (data.user && data.session) {
      setSession(data.session);
      const profile = await loadProfile(data.user);
      setUser(profile);
      return { profile, requiresEmailConfirmation: false };
    }

    return { profile: null, requiresEmailConfirmation: true };
  }, [loadProfile]);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, session, loading, login, register, logout }),
    [user, session, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
