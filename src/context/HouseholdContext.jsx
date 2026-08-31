import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

// Once a user is logged in, this figures out which household(s) they
// belong to (via household_members, which RLS restricts to their own
// rows) and holds the "currently active" one. Every Family feature
// (Shopping, Calendar, Homework, ...) reads activeHouseholdId from
// here instead of a hardcoded value.
const HouseholdContext = createContext(null);

// Matches DEMO_USER in AuthContext — a made-up household so demo mode
// has something for the Shopping List etc. to filter on, with no
// Supabase involved. created_by matches DEMO_USER's id so demo mode's
// "You" always sees itself as the household's creator (Add Family
// Members' Delete Family option is reachable to try in demo mode too).
export const DEMO_HOUSEHOLD_ID = 'demo-household';
const DEMO_MEMBERSHIP = {
  household_id: DEMO_HOUSEHOLD_ID,
  display_name: 'You',
  role: 'parent',
  households: { id: DEMO_HOUSEHOLD_ID, name: 'Demo Household', created_by: 'demo-user' },
};

export function HouseholdProvider({ children }) {
  const { user, demoMode, signOut } = useAuth();
  const [memberships, setMemberships] = useState([]); // [{ household_id, households: { name }, ... }]
  const [activeHouseholdId, setActiveHouseholdId] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (demoMode) {
      setMemberships([DEMO_MEMBERSHIP]);
      setActiveHouseholdId((current) => current ?? DEMO_HOUSEHOLD_ID);
      setLoading(false);
      return;
    }
    if (!user || !isSupabaseConfigured) {
      setMemberships([]);
      setActiveHouseholdId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id, display_name, role, households ( id, name, created_by )')
      .eq('user_id', user.id);

    if (error) {
      console.error('Could not load households:', error);
      setMemberships([]);
    } else {
      setMemberships(data ?? []);
      setActiveHouseholdId((current) => current ?? data?.[0]?.household_id ?? null);
    }
    setLoading(false);
  }, [user, demoMode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeHousehold = memberships.find((m) => m.household_id === activeHouseholdId);
  const isCreator = !!user && activeHousehold?.households?.created_by === user.id;

  // Anyone in the household can rename it — low-stakes enough that
  // there's no need to gate this to whoever created it, unlike delete
  // below. Goes through the rename_household() RPC (0004_household_
  // rename_delete.sql) rather than a raw table UPDATE — there's no
  // client-facing UPDATE policy on `households` at all.
  async function renameHousehold(name) {
    const trimmed = name.trim();
    if (!trimmed) return 'Please enter a household name.';
    if (demoMode) {
      setMemberships((current) =>
        current.map((m) =>
          m.household_id === activeHouseholdId ? { ...m, households: { ...m.households, name: trimmed } } : m
        )
      );
      return null;
    }
    const { error } = await supabase.rpc('rename_household', {
      p_household_id: activeHouseholdId,
      p_name: trimmed,
    });
    if (error) return error.message;
    setMemberships((current) =>
      current.map((m) =>
        m.household_id === activeHouseholdId ? { ...m, households: { ...m.households, name: trimmed } } : m
      )
    );
    return null;
  }

  // Only the household's creator can do this — enforced for real
  // server-side in delete_household() (a client calling the RPC as
  // anyone else gets an error back, this isn't just a UI-level gate).
  // On success every household-scoped table cascades away and this
  // household disappears from `memberships` on the next refresh, which
  // drops hasHousehold to false — App.jsx's AppShell then renders
  // HouseholdOnboarding on its own, no explicit navigation needed here.
  async function deleteHousehold() {
    if (demoMode) {
      // Nothing real to delete — closest equivalent is leaving demo
      // mode entirely, same framing ProfileSettings.jsx uses for
      // "delete account" in demo mode.
      await signOut();
      return null;
    }
    const { error } = await supabase.rpc('delete_household', {
      p_household_id: activeHouseholdId,
    });
    if (error) return error.message;
    await refresh();
    return null;
  }

  const value = {
    memberships,
    activeHouseholdId,
    setActiveHouseholdId,
    loading,
    hasHousehold: memberships.length > 0,
    isCreator,
    renameHousehold,
    deleteHousehold,
    refresh,
  };

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used inside <HouseholdProvider>');
  return ctx;
}
