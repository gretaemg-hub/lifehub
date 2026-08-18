import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useHousehold } from '../../context/HouseholdContext';

// This hook is the direct replacement for the prototype's
// loadShoppingItems() / saveShoppingItems() pair. Compare the two:
// the shape of the data and the actions (add/toggle/delete/clear)
// are identical — only the storage mechanism changed, exactly as
// the roadmap predicted ("the rendering and interaction logic you
// already built mostly doesn't need to change at all").
//
// One thing the prototype couldn't do: realtime. Because this is now
// a real shared table, we also subscribe to Postgres changes so that
// if someone else in the household adds or ticks off an item, this
// list updates live without a refresh.
export function useShoppingItems() {
  const { activeHouseholdId } = useHousehold();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeHouseholdId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('household_id', activeHouseholdId)
      .order('created_at', { ascending: true });
    if (error) console.error('Could not load shopping items:', error);
    setItems(data ?? []);
    setLoading(false);
  }, [activeHouseholdId]);

  useEffect(() => {
    load();
    if (!activeHouseholdId) return;

    const channel = supabase
      .channel(`shopping_items:${activeHouseholdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `household_id=eq.${activeHouseholdId}` },
        () => load()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeHouseholdId, load]);

  async function addItem(text, repeating) {
    const trimmed = text.trim();
    if (!trimmed || !activeHouseholdId) return;
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('shopping_items').insert({
      household_id: activeHouseholdId,
      text: trimmed,
      repeating,
      added_by: userData.user?.id,
    });
    load();
  }

  async function toggleItem(id, checked) {
    await supabase.from('shopping_items').update({ checked: !checked }).eq('id', id);
    load();
  }

  async function deleteItem(id) {
    await supabase.from('shopping_items').delete().eq('id', id);
    load();
  }

  async function clearChecked() {
    // Repeating items survive a clear, same rule as the prototype.
    await supabase
      .from('shopping_items')
      .delete()
      .eq('household_id', activeHouseholdId)
      .eq('checked', true)
      .eq('repeating', false);
    load();
  }

  return { items, loading, addItem, toggleItem, deleteItem, clearChecked };
}
