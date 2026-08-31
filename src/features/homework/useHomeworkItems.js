import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { todayKey } from '../calendar/calendarUtils';

// School & Homeworks — shared per household, same shape as the
// friends-demo's homeworkItems (subject/description/dueDate/dueTime/
// completed), just backed by homework_items instead of localStorage.
// Scoped to a single profile_id (see useHomeworkProfiles) so more than
// one student's assignments can live in the same household without
// getting mixed together — Homework.jsx doesn't render the add-form
// or list at all until a profile is chosen, but this hook still
// tolerates a null profileId (returns nothing) for that instant.
let demoIdCounter = 0;
function seedDemoItems(profileId) {
  const today = todayKey();
  return [
    { id: `demo-${demoIdCounter++}`, profile_id: profileId, subject: 'Maths', description: 'Worksheet 4, questions 1-10', due_date: today, due_time: '', completed: false },
    { id: `demo-${demoIdCounter++}`, profile_id: profileId, subject: 'Reading', description: 'Chapter 3 of the class book', due_date: today, due_time: '', completed: true },
  ];
}

export function useHomeworkItems(profileId) {
  const { activeHouseholdId } = useHousehold();
  const { demoMode } = useAuth();
  const isDemo = demoMode || !isSupabaseConfigured;

  // Demo items are seeded once per demo profile the first time it's
  // selected, then remembered here for the rest of the session.
  const demoItemsByProfileRef = useRef({});

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!isDemo);

  const load = useCallback(async () => {
    if (isDemo) {
      if (!profileId) {
        setItems([]);
        setLoading(false);
        return;
      }
      if (!demoItemsByProfileRef.current[profileId]) {
        demoItemsByProfileRef.current[profileId] = seedDemoItems(profileId);
      }
      setItems([...demoItemsByProfileRef.current[profileId]]);
      setLoading(false);
      return;
    }
    if (!activeHouseholdId || !profileId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('homework_items')
      .select('id, subject, description, due_date, due_time, completed')
      .eq('household_id', activeHouseholdId)
      .eq('profile_id', profileId)
      .order('due_date', { ascending: true });
    if (error) console.error('Could not load homework items:', error);
    setItems(data ?? []);
    setLoading(false);
  }, [isDemo, activeHouseholdId, profileId]);

  useEffect(() => {
    load();
    if (isDemo || !activeHouseholdId || !profileId) return;
    const channel = supabase
      .channel(`homework_items:${activeHouseholdId}:${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_items', filter: `household_id=eq.${activeHouseholdId}` }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isDemo, activeHouseholdId, profileId, load]);

  // Same silent-no-op-without-subject-or-due-date rule as the demo's
  // addHomeworkItem() — deliberately not adding inline validation UI
  // the demo doesn't have, to stay a faithful port.
  async function addItem(subject, description, dueDate, dueTime) {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject || !dueDate || !profileId) return;
    if (isDemo) {
      const current = demoItemsByProfileRef.current[profileId] ?? [];
      demoItemsByProfileRef.current[profileId] = [
        ...current,
        { id: `demo-${demoIdCounter++}`, profile_id: profileId, subject: trimmedSubject, description: description.trim(), due_date: dueDate, due_time: dueTime || '', completed: false },
      ];
      load();
      return;
    }
    if (!activeHouseholdId) return;
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('homework_items').insert({
      household_id: activeHouseholdId,
      profile_id: profileId,
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
      const current = demoItemsByProfileRef.current[profileId] ?? [];
      demoItemsByProfileRef.current[profileId] = current.map((h) => (h.id === id ? { ...h, completed } : h));
      load();
      return;
    }
    await supabase.from('homework_items').update({ completed }).eq('id', id);
    load();
  }

  async function deleteItem(id) {
    if (isDemo) {
      const current = demoItemsByProfileRef.current[profileId] ?? [];
      demoItemsByProfileRef.current[profileId] = current.filter((h) => h.id !== id);
      load();
      return;
    }
    await supabase.from('homework_items').delete().eq('id', id);
    load();
  }

  return { items, loading, addItem, setCompleted, deleteItem };
}
