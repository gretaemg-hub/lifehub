import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { todayKey } from '../calendar/calendarUtils';

// School & Homeworks — shared per household, same shape as the
// friends-demo's homeworkItems (subject/description/dueDate/dueTime/
// completed), just backed by homework_items instead of localStorage.
let demoIdCounter = 0;
function seedDemoItems() {
  const today = todayKey();
  return [
    { id: `demo-${demoIdCounter++}`, subject: 'Maths', description: 'Worksheet 4, questions 1-10', due_date: today, due_time: '', completed: false },
    { id: `demo-${demoIdCounter++}`, subject: 'Reading', description: 'Chapter 3 of the class book', due_date: today, due_time: '', completed: true },
  ];
}

export function useHomeworkItems() {
  const { activeHouseholdId } = useHousehold();
  const { demoMode } = useAuth();
  const isDemo = demoMode || !isSupabaseConfigured;

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
      .from('homework_items')
      .select('id, subject, description, due_date, due_time, completed')
      .eq('household_id', activeHouseholdId)
      .order('due_date', { ascending: true });
    if (error) console.error('Could not load homework items:', error);
    setItems(data ?? []);
    setLoading(false);
  }, [isDemo, activeHouseholdId]);

  useEffect(() => {
    load();
    if (isDemo || !activeHouseholdId) return;
    const channel = supabase
      .channel(`homework_items:${activeHouseholdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_items', filter: `household_id=eq.${activeHouseholdId}` }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isDemo, activeHouseholdId, load]);

  // Same silent-no-op-without-subject-or-due-date rule as the demo's
  // addHomeworkItem() — deliberately not adding inline validation UI
  // the demo doesn't have, to stay a faithful port.
  async function addItem(subject, description, dueDate, dueTime) {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject || !dueDate) return;
    if (isDemo) {
      demoItemsRef.current = [
        ...demoItemsRef.current,
        { id: `demo-${demoIdCounter++}`, subject: trimmedSubject, description: description.trim(), due_date: dueDate, due_time: dueTime || '', completed: false },
      ];
      load();
      return;
    }
    if (!activeHouseholdId) return;
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('homework_items').insert({
      household_id: activeHouseholdId,
      subject: trimmedSubject,
      description: description.trim(),
      due_date: dueDate,
      due_time: dueTime || null,
      created_by: userData.user?.id,
    });
    load();
  }

  async function setCompleted(id, completed) {
    if (isDemo) {
      demoItemsRef.current = demoItemsRef.current.map((h) => (h.id === id ? { ...h, completed } : h));
      load();
      return;
    }
    await supabase.from('homework_items').update({ completed }).eq('id', id);
    load();
  }

  async function deleteItem(id) {
    if (isDemo) {
      demoItemsRef.current = demoItemsRef.current.filter((h) => h.id !== id);
      load();
      return;
    }
    await supabase.from('homework_items').delete().eq('id', id);
    load();
  }

  return { items, loading, addItem, setCompleted, deleteItem };
}
