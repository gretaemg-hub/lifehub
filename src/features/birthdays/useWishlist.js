import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';

// Family Wishlists — the "owner can't see their own reservations"
// privacy rule is enforced by the database itself (0001_init.sql:
// `wishlist_items_visible`, a security_invoker view that nulls
// reserved_by for the owner, plus a straight REVOKE SELECT on the
// raw table), so this hook can just select the view and trust
// whatever reserved_by comes back — there's no client-side hiding
// logic to get right or get wrong, unlike the friends-demo's
// isOwner-branches-never-read-reservedBy convention (renderWishlists()
// in demo/index.html), which this ports the *behavior* of but not the
// mechanism.
function seedDemoItems() {
  return [
    { id: 'demo-wish-1', owner_user_id: 'demo-user', text: 'A new board game', reserved_by: null },
    { id: 'demo-wish-2', owner_user_id: 'demo-member-2', text: 'Noise-cancelling headphones', reserved_by: null },
  ];
}

export function useWishlist() {
  const { activeHouseholdId } = useHousehold();
  const { user, demoMode } = useAuth();
  const isDemo = demoMode || !isSupabaseConfigured;
  const currentUserId = isDemo ? 'demo-user' : user?.id;

  const demoItemsRef = useRef(null);
  if (isDemo && demoItemsRef.current === null) demoItemsRef.current = seedDemoItems();

  const [items, setItems] = useState(isDemo ? demoItemsRef.current : []);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (isDemo) {
      setItems([...demoItemsRef.current]);
      setLoading(false);
      return;
    }
    if (!activeHouseholdId) return;
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('wishlist_items_visible')
      .select('id, owner_user_id, text, reserved_by, created_at')
      .eq('household_id', activeHouseholdId)
      .order('created_at', { ascending: true });
    if (loadError) console.error('Could not load wishlist items:', loadError);
    setItems(data ?? []);
    setLoading(false);
  }, [isDemo, activeHouseholdId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addItem(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    if (isDemo) {
      demoItemsRef.current = [...demoItemsRef.current, { id: `demo-wish-${demoItemsRef.current.length}`, owner_user_id: currentUserId, text: trimmed, reserved_by: null }];
      load();
      return;
    }
    if (!activeHouseholdId) return;
    const { error: insertError } = await supabase
      .from('wishlist_items')
      .insert({ household_id: activeHouseholdId, owner_user_id: currentUserId, text: trimmed });
    if (insertError) setError(insertError.message);
    load();
  }

  async function deleteItem(id) {
    if (isDemo) {
      demoItemsRef.current = demoItemsRef.current.filter((i) => i.id !== id);
      load();
      return;
    }
    await supabase.from('wishlist_items').delete().eq('id', id);
    load();
  }

  async function reserveItem(id) {
    setError(null);
    if (isDemo) {
      demoItemsRef.current = demoItemsRef.current.map((i) => (i.id === id && !i.reserved_by ? { ...i, reserved_by: currentUserId } : i));
      load();
      return;
    }
    const { error: rpcError } = await supabase.rpc('reserve_wishlist_item', { p_item_id: id });
    if (rpcError) setError(rpcError.message);
    load();
  }

  async function unreserveItem(id) {
    setError(null);
    if (isDemo) {
      demoItemsRef.current = demoItemsRef.current.map((i) => (i.id === id && i.reserved_by === currentUserId ? { ...i, reserved_by: null } : i));
      load();
      return;
    }
    const { error: rpcError } = await supabase.rpc('unreserve_wishlist_item', { p_item_id: id });
    if (rpcError) setError(rpcError.message);
    load();
  }

  return { items, loading, error, currentUserId, addItem, deleteItem, reserveItem, unreserveItem, refresh: load };
}
