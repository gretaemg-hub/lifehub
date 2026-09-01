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

// A family link (see HouseholdSettings.jsx's "Share a family link"
// option) is just this app's normal URL with `?invite=CODE` tacked on.
// Reading it here, once, at the very first render — same lazy-useState
// trick as `justConfirmed` below — is what lets Login.jsx default to
// sign-up mode and HouseholdOnboarding.jsx skip straight to "just tell
// us your name" instead of the usual create/join choice.
function readInviteCodeFromUrl() {
  if (typeof window === 'undefined') return null;
  const code = new URLSearchParams(window.location.search).get('invite');
  return code ? code.trim().toUpperCase() : null;
}

// The invite code has to survive a full sign-up -> email-confirmation
// round trip before HouseholdOnboarding.jsx ever gets to redeem it —
// and that round trip is not fully within this app's control: the
// confirmation link gets opened from whatever mail app/browser the
// person's device defaults to, and there's no guarantee the `?invite=`
// query param makes it back onto the URL exactly as sent (a mail
// client's link-preview fetcher, an auth provider's own redirect
// sanitizing, or simply the person bookmarking the bare site instead
// of tapping the actual link can all lose it). Stashing the code in
// localStorage the moment it's first seen, and falling back to that
// if the URL doesn't have one, means the invite still gets picked up
// on return as long as it's the same browser — which covers the
// ordinary case (tap link on phone, sign up, tap confirmation link
// that opens back in the same browser) even when the URL param itself
// doesn't survive the trip.
const PENDING_INVITE_KEY = 'lh-pending-invite';

function readPendingInviteCode() {
  const fromUrl = readInviteCodeFromUrl();
  if (fromUrl) {
    try {
      window.localStorage.setItem(PENDING_INVITE_KEY, fromUrl);
    } catch {
      // Private/locked-down browsing contexts can throw here — the
      // URL-sourced value below still works for this page load.
    }
    return fromUrl;
  }
  try {
    return window.localStorage.getItem(PENDING_INVITE_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = "still loading"
  const [demoMode, setDemoMode] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState(readPendingInviteCode);

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

  // Builds the URL Supabase redirects back to after a confirmation
  // link is clicked. Folding the pending invite code into it (as the
  // same `?invite=` query param it arrived with) is what lets that
  // code survive the round trip through the user's email client — the
  // confirmation link is what actually gets opened, quite possibly in
  // a different tab or even a different device than the one that
  // submitted the sign-up form, so anything not baked into this URL
  // itself would simply be lost.
  function redirectUrl(inviteCode) {
    const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
    return inviteCode ? `${base}?invite=${encodeURIComponent(inviteCode)}` : base;
  }

  const value = {
    session,
    user: demoMode ? DEMO_USER : session?.user ?? null,
    loading: session === undefined,
    configured: isSupabaseConfigured,
    demoMode,
    enterDemoMode: () => setDemoMode(true),
    justConfirmed,
    dismissJustConfirmed: () => setJustConfirmed(false),
    pendingInviteCode,
    clearPendingInvite: () => {
      setPendingInviteCode(null);
      try {
        window.localStorage.removeItem(PENDING_INVITE_KEY);
      } catch {
        // Same private-browsing caveat as readPendingInviteCode() above.
      }
    },
    // emailRedirectTo is set explicitly here rather than left to
    // Supabase's dashboard-configured default "Site URL" — without it,
    // the confirmation link in the email sends people wherever that
    // dashboard setting happens to point (often unset, or pointing at
    // something else entirely), which is what was landing people on an
    // error page instead of back in this app. This always points at
    // wherever THIS build is actually served from (respecting Vite's
    // `base` config, so it lands on /lifehub/app/ in production), plus
    // the pending invite code if there is one — see redirectUrl() above.
    //
    // NOTE: Supabase also refuses to redirect anywhere that isn't on
    // its own "Redirect URLs" allow-list (Authentication -> URL
    // Configuration in the Supabase dashboard) — if confirmation links
    // still land on an error page after this change, that allow-list
    // needs `https://gretaemg-hub.github.io/lifehub/app/**` added to
    // it (and Site URL set to the same base). That's a dashboard
    // setting only the project owner can change.
    signUp: (email, password) =>
      supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl(pendingInviteCode) } }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    resendConfirmation: (email) =>
      supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectUrl(pendingInviteCode) } }),
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
