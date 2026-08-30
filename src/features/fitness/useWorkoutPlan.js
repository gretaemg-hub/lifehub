import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

function emptyPlan() {
  return { duration_minutes: '', warmup: [], main: [], cooldown: [] };
}

function seedDemoPlan() {
  return {
    duration_minutes: '45',
    warmup: [{ id: 'demo-ex-1', name: 'Jumping jacks', sets: '2', reps: '20' }],
    main: [{ id: 'demo-ex-2', name: 'Push ups', sets: '3', reps: '12' }],
    cooldown: [{ id: 'demo-ex-3', name: 'Stretching', sets: '1', reps: '5' }],
  };
}

let demoExerciseIdCounter = 0;
function newExerciseId() {
  return `ex-${Date.now()}-${demoExerciseIdCounter++}`;
}

// One workout plan per user (see supabase/migrations 0001_init.sql's
// workout_plans, unique on user_id) — warmup/main/cooldown exercise
// lists, matching the friends-demo's per-member plan object. Ported
// from ensureMyWorkoutPlan()/addExercise()/deleteExercise()/
// clearWorkoutPlan() — ownership is enforced by RLS, not client code.
export function useWorkoutPlan() {
  const { user, demoMode } = useAuth();
  const isDemo = demoMode || !isSupabaseConfigured;

  const demoPlanRef = useRef(null);
  if (isDemo && demoPlanRef.current === null) demoPlanRef.current = seedDemoPlan();

  const [plan, setPlan] = useState(isDemo ? demoPlanRef.current : emptyPlan());
  const [loading, setLoading] = useState(!isDemo);

  const load = useCallback(async () => {
    if (isDemo) {
      setPlan({ ...demoPlanRef.current });
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('workout_plans')
      .select('duration_minutes, warmup, main, cooldown')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) console.error('Could not load workout plan:', error);
    setPlan(data ? { duration_minutes: data.duration_minutes ?? '', warmup: data.warmup ?? [], main: data.main ?? [], cooldown: data.cooldown ?? [] } : emptyPlan());
    setLoading(false);
  }, [isDemo, user]);

  useEffect(() => {
    load();
  }, [load]);

  async function persist(next) {
    if (isDemo) {
      demoPlanRef.current = next;
      load();
      return;
    }
    if (!user) return;
    await supabase
      .from('workout_plans')
      .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    load();
  }

  async function setDuration(value) {
    await persist({ ...plan, duration_minutes: value });
  }

  async function addExercise(sectionKey, name, sets, reps) {
    const trimmedName = (name || '').trim();
    if (!trimmedName || !sets || !reps) return;
    const next = { ...plan, [sectionKey]: [...plan[sectionKey], { id: newExerciseId(), name: trimmedName, sets, reps }] };
    await persist(next);
  }

  async function deleteExercise(sectionKey, exerciseId) {
    const next = { ...plan, [sectionKey]: plan[sectionKey].filter((ex) => ex.id !== exerciseId) };
    await persist(next);
  }

  async function clearPlan() {
    await persist(emptyPlan());
  }

  return { plan, loading, setDuration, addExercise, deleteExercise, clearPlan };
}
