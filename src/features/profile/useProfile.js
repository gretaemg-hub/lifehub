import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { AVATAR_COLORS } from '../../theme';

// The real-app backing for the friends-demo's Profile Settings screen.
// The demo's "profile" is a family member record kept in localStorage;
// here the closest equivalent is the signed-in user's own
// household_members row (0002_profile_and_account_deletion.sql added
// avatar_color/avatar_url to it), with email coming from Supabase Auth
// itself rather than being duplicated anywhere.
export function useProfile() {
  const { user, demoMode, signOut } = useAuth();
  const { activeHouseholdId } = useHousehold();
  const isDemo = demoMode || !isSupabaseConfigured;

  const [profile, setProfile] = useState(null); // { id, display_name, avatar_color, avatar_url }
  const [loading, setLoading] = useState(!isDemo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (isDemo) {
      setProfile((current) =>
        current ?? { id: 'demo-member', display_name: 'You', avatar_color: AVATAR_COLORS[0], avatar_url: null }
      );
      setLoading(false);
      return;
    }
    if (!activeHouseholdId || !user) return;
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('household_members')
      .select('id, display_name, avatar_color, avatar_url')
      .eq('household_id', activeHouseholdId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (loadError) console.error('Could not load profile:', loadError);
    setProfile(data ?? null);
    setLoading(false);
  }, [isDemo, activeHouseholdId, user]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateDisplayName(name) {
    const trimmed = name.trim();
    if (!trimmed) return 'Please enter a name.';
    setError(null);
    if (isDemo) {
      setProfile((current) => ({ ...current, display_name: trimmed }));
      return null;
    }
    setBusy(true);
    const { error: updateError } = await supabase
      .from('household_members')
      .update({ display_name: trimmed })
      .eq('id', profile.id);
    setBusy(false);
    if (updateError) return updateError.message;
    setProfile((current) => ({ ...current, display_name: trimmed }));
    return null;
  }

  async function updateAvatarColor(color) {
    setError(null);
    if (isDemo) {
      setProfile((current) => ({ ...current, avatar_color: color }));
      return null;
    }
    setBusy(true);
    const { error: updateError } = await supabase
      .from('household_members')
      .update({ avatar_color: color })
      .eq('id', profile.id);
    setBusy(false);
    if (updateError) return updateError.message;
    setProfile((current) => ({ ...current, avatar_color: color }));
    return null;
  }

  async function uploadAvatar(file) {
    setError(null);
    if (isDemo) {
      // No Storage in demo mode — just show the picture, like the
      // friends-demo does with its own localStorage data URL.
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          setProfile((current) => ({ ...current, avatar_url: reader.result }));
          resolve(null);
        };
        reader.onerror = () => resolve('Could not read that image.');
        reader.readAsDataURL(file);
      });
    }
    setBusy(true);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (uploadError) {
      setBusy(false);
      return uploadError.message;
    }
    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: updateError } = await supabase
      .from('household_members')
      .update({ avatar_url: publicUrlData.publicUrl })
      .eq('id', profile.id);
    setBusy(false);
    if (updateError) return updateError.message;
    setProfile((current) => ({ ...current, avatar_url: publicUrlData.publicUrl }));
    return null;
  }

  async function changePassword(currentPassword, newPassword) {
    if (isDemo) return "Password can't be changed in demo mode.";
    if (newPassword.length < 6) return 'New password must be at least 6 characters.';
    setBusy(true);
    // Supabase's client SDK can't verify a "current password" on its
    // own — updateUser() will happily set a new one for whoever's
    // session is active. Re-authenticating with the current password
    // first is what actually checks it, matching the demo's behaviour
    // of rejecting a wrong current password.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      setBusy(false);
      return 'Current password is incorrect.';
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) return updateError.message;
    return null;
  }

  async function deleteAccount() {
    if (isDemo) {
      // Nothing real to delete — this is the same as leaving the demo.
      await signOut();
      return null;
    }
    setBusy(true);
    const { error: deleteError } = await supabase.rpc('delete_own_account');
    if (deleteError) {
      setBusy(false);
      return deleteError.message;
    }
    // The account (and its session) is gone server-side now — clear it
    // client-side too so the app drops straight back to the login screen.
    await supabase.auth.signOut();
    setBusy(false);
    return null;
  }

  return {
    profile,
    email: user?.email || '',
    loading,
    busy,
    error,
    isDemo,
    updateDisplayName,
    updateAvatarColor,
    uploadAvatar,
    changePassword,
    deleteAccount,
    refresh: load,
  };
}
