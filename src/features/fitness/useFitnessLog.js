import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { todayKey } from '../calendar/calendarUtils';
import { getStartOfWeekKey, getViewedWeekStartKey, getViewedWeekEndKey } from './fitnessUtils';

let demoIdCounter = 0;
function seedDemoLog() {
  const today = new Date();
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  return [
    { id: `demo-fit-${demoIdCounter++}`, activity: 'Running', duration: 30, date: daysAgo(1) },
    { id: `demo-fit-${demoIdCounter++}`, activity: 'Yoga', duration: 20, date: daysAgo(3) },
    { id: `demo-fit-${demoIdCounter++}`, activity: 'Cycling', duration: 45, date: daysAgo(9) },
  ];
}

// Fitness log entries are personal (owner-only, see supabase/migrations
// 0001_init.sql's fitness_log RLS) — one row per logged workout. The
// week-offset slider (see fitnessUtils.js) only changes which week the
// summary stats are scoped to; the log list itself always shows full
// history, matching the friends-demo's renderFitnessLog().
export function useFitnessLog() {
  const { user, demoMode } = useAuth();
  const isDemo = demoMode || !isSupabaseConfigured;

  const demoLogRef = useRef(null);
  if (isDemo && demoLogRef.current === null) demoLogRef.current = seedDemoLog();

  const [log, setLog] = useState(isDemo ? demoLogRef.current : []);
  const [loading, setLoading] = useState(!isDemo);
  const [weekOffset, setWeekOffsetState] = useState(0);

  const load = useCallback(async () => {
    if (isDemo) {
      setLog([...demoLogRef.current].sort((a, b) => b.date.localeCompare(a.date)));
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('fitness_log')
      .select('id, activity, duration, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (error) console.error('Could not load fitness log:', error);
    setLog(data ?? []);
    setLoading(false);
  }, [isDemo, user]);

  useEffect(() => {
    load();
  }, [load]);

  // Clamp to [WEEK_OFFSET_MIN, 0] — never future weeks, up to a year back.
  function setWeekOffset(next) {
    setWeekOffsetState(Math.max(-52, Math.min(0, next)));
  }

  async function addWorkout(activity, duration, date) {
    const trimmed = (activity || '').trim();
    const mins = Number(duration);
    const dateKey = date || todayKey();
    if (!trimmed || !mins || mins <= 0) return;
    if (dateKey > todayKey()) return;
    if (dateKey < getStartOfWeekKey()) return;

    if (isDemo) {
      const saved = { id: `demo-fit-${demoIdCounter++}`, activity: trimmed, duration: mins, date: dateKey };
      demoLogRef.current = [saved, ...demoLogRef.current];
      load();
      return;
    }
    if (!user) return;
    const { error } = await supabase.from('fitness_log').insert({ user_id: user.id, activity: trimmed, duration: mins, date: dateKey });
    if (error) console.error('Could not log workout:', error);
    load();
  }

  async function deleteWorkout(id) {
    if (isDemo) {
      demoLogRef.current = demoLogRef.current.filter((w) => w.id !== id);
      load();
      return;
    }
    await supabase.from('fitness_log').delete().eq('id', id);
    load();
  }

  const viewedStartKey = getViewedWeekStartKey(weekOffset);
  const viewedEndKey = getViewedWeekEndKey(weekOffset);
  const viewedWeekWorkouts = useMemo(
    () => log.filter((w) => w.date >= viewedStartKey && w.date <= viewedEndKey),
    [log, viewedStartKey, viewedEndKey]
  );
  const viewedWeekMinutes = useMemo(
    () => viewedWeekWorkouts.reduce((sum, w) => sum + Number(w.duration || 0), 0),
    [viewedWeekWorkouts]
  );

  return {
    log,
    loading,
    addWorkout,
    deleteWorkout,
    weekOffset,
    setWeekOffset,
    viewedWeekWorkouts,
    viewedWeekMinutes,
    minLogDate: getStartOfWeekKey(),
    maxLogDate: todayKey(),
  };
}
