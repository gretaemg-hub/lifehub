import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Whether a real backend is wired up. False on the GitHub Pages preview
// deploy (no env vars set there yet) — the app falls back to an
// in-memory Demo Mode instead of crashing, see AuthContext.jsx.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'Running in preview/demo mode — real sign-in and persistence are disabled. ' +
      'Copy .env.example to .env.local and fill in your Supabase project values to connect a real backend.'
  );
}

// createClient() itself never throws even with placeholder values — only
// an actual network call would fail, and we avoid making those when
// isSupabaseConfigured is false (see AuthContext / useShoppingItems).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
