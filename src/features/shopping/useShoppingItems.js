import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
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
//
// Demo mode: whenever no Supabase project is configured (the GitHub
// Pages preview build), this hook NEVER makes a live network call —
// it runs the exact same add/toggle/delete/clear API against a plain
// in-memory array instead, so the preview is fully interactive
// without a backend. This is gated purely on isSupabaseConfigured
// (not on which household is active) so there's no path here that
// can accidentally fire a request at a placeholder Supabase URL.
let demoIdCounter = 0;
const seedDemoItems = () => [
  { id: `demo-${demoIdCounter++}`, text: 'Milk', checked: false, repeating: true, added_by: 'demo-user' },
  { id: `demo-${demoIdCounter++}`, text: 'Bread', checked: false, repeating: false, added_by: 'demo-user' },
  { id: `demo-${demoIdCounter++}`, text: 'Eggs', checked: true, repeating: false, added_by: 'demo-user' },
];

export function useShoppingItems() {
  const { activeHouseholdId } = useHousehold();
  const isDemo = !isSupabaseConfigured;
  const demoItemsRef = useRef(null);
  if (isDemo && demoItemsRef.current === null) demoItemsRef.current = seedDemoItems();

  const [items, setItems] = useState(isDemo ? demoItemsRef.current : []);
  const [loading, setLoading] = useState(!isDemo);

  const load = useCallback(async () => {
    if (isDemo) {
      setItems([...demoItemsRef.current]);
      setLoading(false);
      return;
    }
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
  }, [activeHouseholdId, isDemo]);

  useEffect(() => {
    load();
    if (isDemo || !activeHouseholdId) return;

    const channel = supabase
      .channel(`shopping_items:${activeHouseholdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `household_id=eq.${activeHouseholdId}` },
        () => load()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeHouseholdId, load, isDemo]);

  async function addItem(text, repeating) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (isDemo) {
      demoItemsRef.current = [
        ...demoItemsRef.current,
        { id: `demo-${demoIdCounter++}`, text: trimmed, checked: false, repeating, added_by: 'demo-user' },
      ];
      load();
      return;
    }
    if (!activeHouseholdId) return;
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
    if (isDemo) {
      demoItemsRef.current = demoItemsRef.current.map((item) =>
        item.id === id ? { ...item, checked: !checked } : item
      );
      load();
      return;
    }
    await supabase.from('shopping_items').update({ checked: !checked }).eq('id', id);
    load();
  }

  async function deleteItem(id) {
    if (isDemo) {
      demoItemsRef.current = demoItemsRef.current.filter((item) => item.id !== id);
      load();
      return;
    }
    await supabase.from('shopping_items').delete().eq('id', id);
    load();
  }

  async function clearChecked() {
    if (isDemo) {
      // Repeating items survive a clear, same rule as the prototype.
      demoItemsRef.current = demoItemsRef.current.filter((item) => !(item.checked && !item.repeating));
      load();
      return;
    }
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
