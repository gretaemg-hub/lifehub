import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

// Replaces the prototype's "Who are you?" dropdown entirely. Once
// this is in place, "who's using the app" is never a guess — it's
// whoever Supabase says is logged in, always.
const AuthContext = createContext(null);

// A fake-but-consistent "user" for the no-backend preview deploy, so
// friends can click "Try the demo" and see the real app shell instead
// of stopping dead at the login screen. Never touches Supabase.
const DEMO_USER = { id: 'demo-user', email: 'demo@lifehub.app' };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = "still loading"
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // No backend to ask — stop "loading" immediately and show Login,
      // which offers the demo-mode button.
      setSession(null);
      return;
    }

    supabase.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => setSession(null));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = {
    session,
    user: demoMode ? DEMO_USER : session?.user ?? null,
    loading: session === undefined,
    configured: isSupabaseConfigured,
    demoMode,
    enterDemoMode: () => setDemoMode(true),
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: async () => {
      if (demoMode) {
        setDemoMode(false);
        return { error: null };
      }
      return supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
