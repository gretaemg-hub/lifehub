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
// Supabase involved.
export const DEMO_HOUSEHOLD_ID = 'demo-household';
const DEMO_MEMBERSHIP = {
  household_id: DEMO_HOUSEHOLD_ID,
  display_name: 'You',
  role: 'parent',
  households: { id: DEMO_HOUSEHOLD_ID, name: 'Demo Household' },
};

export function HouseholdProvider({ children }) {
  const { user, demoMode } = useAuth();
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
      .select('household_id, display_name, role, households ( id, name )')
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

  const value = {
    memberships,
    activeHouseholdId,
    setActiveHouseholdId,
    loading,
    hasHousehold: memberships.length > 0,
    refresh,
  };

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used inside <HouseholdProvider>');
  return ctx;
}
