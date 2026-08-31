import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';

// One row per student sharing this household's homework list — see
// 0005_homework_profiles.sql. Just a name, not a login: a parent adds
// one for each kid so "Emma's homeworks" and "Jack's homeworks" don't
// get mixed together in a single flat list.
export function useHomeworkProfiles() {
  const { activeHouseholdId } = useHousehold();
  const { demoMode } = useAuth();
  const isDemo = demoMode || !isSupabaseConfigured;

  const demoProfilesRef = useRef(null);
  if (isDemo && demoProfilesRef.current === null) demoProfilesRef.current = [];

  const [profiles, setProfiles] = useState(isDemo ? demoProfilesRef.current : []);
  const [loading, setLoading] = useState(!isDemo);

  const load = useCallback(async () => {
    if (isDemo) {
      setProfiles([...demoProfilesRef.current]);
      setLoading(false);
      return;
    }
    if (!activeHouseholdId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('homework_profiles')
      .select('id, name')
      .eq('household_id', activeHouseholdId)
      .order('created_at', { ascending: true });
    if (error) console.error('Could not load homework profiles:', error);
    setProfiles(data ?? []);
    setLoading(false);
  }, [isDemo, activeHouseholdId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addProfile(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (isDemo) {
      const profile = { id: `demo-profile-${demoProfilesRef.current.length}`, name: trimmed };
      demoProfilesRef.current = [...demoProfilesRef.current, profile];
      load();
      return profile;
    }
    if (!activeHouseholdId) return null;
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('homework_profiles')
      .insert({ household_id: activeHouseholdId, name: trimmed, created_by: userData.user?.id })
      .select('id, name')
      .single();
    if (error) {
      console.error('Could not add homework profile:', error);
      return null;
    }
    load();
    return data;
  }

  return { profiles, loading, addProfile };
}
