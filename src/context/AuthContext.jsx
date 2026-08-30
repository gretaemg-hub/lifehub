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

  // The confirmation link Supabase emails redirects back here with
  // "#access_token=...&type=signup&..." in the URL. supabase-js reads
  // that hash itself (to log you in) and then scrubs it from the
  // address bar — but it does that asynchronously, so a *lazy* useState
  // initializer, which runs synchronously during this component's very
  // first render, still sees the original hash before it's stripped.
  // That's what tells us "you just landed here from a confirmation
  // email," as opposed to an ordinary sign-in, so the UI can say so.
  const [justConfirmed, setJustConfirmed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return /type=signup/.test(window.location.hash);
  });

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
    justConfirmed,
    dismissJustConfirmed: () => setJustConfirmed(false),
    // emailRedirectTo is set explicitly here rather than left to
    // Supabase's dashboard-configured default "Site URL" — without it,
    // the confirmation link in the email sends people wherever that
    // dashboard setting happens to point (often unset, or pointing at
    // something else entirely), which is what was landing people on an
    // error page instead of back in this app. This always points at
    // wherever THIS build is actually served from (respecting Vite's
    // `base` config, so it lands on /lifehub/app/ in production).
    //
    // NOTE: Supabase also refuses to redirect anywhere that isn't on
    // its own "Redirect URLs" allow-list (Authentication -> URL
    // Configuration in the Supabase dashboard) — if confirmation links
    // still land on an error page after this change, that allow-list
    // needs `https://gretaemg-hub.github.io/lifehub/app/**` added to
    // it (and Site URL set to the same base). That's a dashboard
    // setting only the project owner can change.
    signUp: (email, password) =>
      supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` } }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    resendConfirmation: (email) =>
      supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` } }),
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
