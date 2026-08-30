import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';

// The other half of "+ Add family member": HouseholdOnboarding.jsx
// lets a brand-new user REDEEM a code, this hook is what an EXISTING
// member uses to GENERATE one. Both read/write household_invites,
// which already has full RLS in 0001_init.sql (any member may insert
// a code for their own household; codes are readable by members of
// that household only) — there was no backend gap here, just no UI
// yet to reach it.
export function useHouseholdMembers() {
  const { activeHouseholdId } = useHousehold();
  const { user, demoMode } = useAuth();
  const isDemo = demoMode || !isSupabaseConfigured;

  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(!isDemo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (isDemo) {
      setMembers([
        { id: 'demo-member', user_id: 'demo-user', display_name: 'You', role: 'parent', avatar_color: null, avatar_url: null },
        // A second member so demo mode has something to show for
        // reserving a wishlist item, viewing another person's
        // homework/meal-plan additions, etc. — not persisted anywhere.
        { id: 'demo-member-2', user_id: 'demo-member-2', display_name: 'Alex', role: 'parent', avatar_color: '#EA612B', avatar_url: null },
      ]);
      setInvites([]);
      setLoading(false);
      return;
    }
    if (!activeHouseholdId) return;
    setLoading(true);
    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from('household_members')
        .select('id, user_id, display_name, role, avatar_color, avatar_url')
        .eq('household_id', activeHouseholdId)
        .order('created_at', { ascending: true }),
      supabase
        .from('household_invites')
        .select('id, code, created_at, expires_at, max_uses, use_count')
        .eq('household_id', activeHouseholdId)
        .order('created_at', { ascending: false }),
    ]);
    if (membersRes.error) console.error('Could not load household members:', membersRes.error);
    if (invitesRes.error) console.error('Could not load invites:', invitesRes.error);
    setMembers(membersRes.data ?? []);
    setInvites(invitesRes.data ?? []);
    setLoading(false);
  }, [activeHouseholdId, isDemo]);

  useEffect(() => {
    load();
  }, [load]);

  async function generateInvite() {
    setError(null);
    if (isDemo) {
      const fakeCode = Math.random().toString(36).slice(2, 10).toUpperCase();
      setInvites((current) => [
        { id: `demo-invite-${current.length}`, code: fakeCode, created_at: null, expires_at: null, max_uses: 1, use_count: 0 },
        ...current,
      ]);
      return;
    }
    if (!activeHouseholdId) return;
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('household_invites').insert({
      household_id: activeHouseholdId,
      created_by: userData.user?.id,
    });
    setBusy(false);
    if (insertError) setError(insertError.message);
    else load();
  }

  return { members, invites, loading, busy, error, currentUserId: isDemo ? 'demo-user' : user?.id, generateInvite, refresh: load };
}
