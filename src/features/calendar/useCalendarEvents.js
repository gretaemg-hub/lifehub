import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_EVENT_COLOR, todayKey } from './calendarUtils';

// One hook, two scopes — mirrors the prototype's CALENDAR_CONTEXTS
// ('family' vs 'personal') and the RLS split in
// supabase/migrations/0001_init.sql: `calendar_events` is shared
// across the household (is_household_member() policy), while
// `personal_calendar_events` is a hard owner-only table (nobody but
// the row's own user_id can ever select it, no client toggle
// involved — see the migration's comment on that policy).
//
// Same demo-mode pattern as useShoppingItems: when no Supabase
// project is configured, this never makes a network call — it runs
// the identical CRUD API against an in-memory array instead.
let demoIdCounter = 0;
function seedDemoEvents(scope) {
  const today = todayKey();
  if (scope === 'family') {
    return [
      { id: `demo-${demoIdCounter++}`, title: 'Parent-teacher evening', start_date: today, end_date: today, all_day: false, start_time: '18:00', end_time: '19:00', color: '#4C7A94' },
      { id: `demo-${demoIdCounter++}`, title: 'Weekend trip', start_date: today, end_date: today, all_day: true, start_time: null, end_time: null, color: '#D97B3D' },
    ];
  }
  return [
    { id: `demo-${demoIdCounter++}`, title: 'Gym', start_date: today, end_date: today, all_day: false, start_time: '07:00', end_time: '08:00', color: '#3E6259' },
  ];
}

export function useCalendarEvents(scope) {
  const { activeHouseholdId } = useHousehold();
  const { user } = useAuth();
  const isDemo = !isSupabaseConfigured;
  const table = scope === 'personal' ? 'personal_calendar_events' : 'calendar_events';

  const demoEventsRef = useRef(null);
  if (isDemo && demoEventsRef.current === null) demoEventsRef.current = seedDemoEvents(scope);

  const [events, setEvents] = useState(isDemo ? demoEventsRef.current : []);
  const [loading, setLoading] = useState(!isDemo);

  const ownerKey = scope === 'personal' ? user?.id : activeHouseholdId;

  const load = useCallback(async () => {
    if (isDemo) {
      setEvents([...demoEventsRef.current]);
      setLoading(false);
      return;
    }
    if (!ownerKey) return;
    setLoading(true);
    let query = supabase.from(table).select('*');
    query = scope === 'personal' ? query.eq('user_id', ownerKey) : query.eq('household_id', ownerKey);
    const { data, error } = await query.order('start_date', { ascending: true });
    if (error) console.error(`Could not load ${table}:`, error);
    setEvents(data ?? []);
    setLoading(false);
  }, [isDemo, ownerKey, scope, table]);

  useEffect(() => {
    load();
    if (isDemo || !ownerKey) return;

    const filter = scope === 'personal' ? `user_id=eq.${ownerKey}` : `household_id=eq.${ownerKey}`;
    const channel = supabase
      .channel(`${table}:${ownerKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => load())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isDemo, ownerKey, load, scope, table]);

  async function addEvent(fields) {
    const record = {
      title: fields.title.trim(),
      start_date: fields.start_date,
      end_date: fields.end_date || fields.start_date,
      all_day: fields.all_day,
      start_time: fields.all_day ? null : fields.start_time || null,
      end_time: fields.all_day ? null : fields.end_time || null,
      color: fields.color || DEFAULT_EVENT_COLOR,
    };
    if (!record.title || !record.start_date) return;
    if (record.end_date < record.start_date) record.end_date = record.start_date;

    if (isDemo) {
      demoEventsRef.current = [...demoEventsRef.current, { id: `demo-${demoIdCounter++}`, ...record }];
      load();
      return;
    }
    if (!ownerKey) return;
    if (scope === 'personal') {
      await supabase.from(table).insert({ ...record, user_id: ownerKey });
    } else {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from(table).insert({ ...record, household_id: ownerKey, created_by: userData.user?.id });
    }
    load();
  }

  async function updateEvent(id, fields) {
    const record = {
      title: fields.title.trim(),
      start_date: fields.start_date,
      end_date: fields.end_date < fields.start_date ? fields.start_date : fields.end_date || fields.start_date,
      all_day: fields.all_day,
      start_time: fields.all_day ? null : fields.start_time || null,
      end_time: fields.all_day ? null : fields.end_time || null,
      color: fields.color || DEFAULT_EVENT_COLOR,
    };
    if (!record.title || !record.start_date) return;

    if (isDemo) {
      demoEventsRef.current = demoEventsRef.current.map((ev) => (ev.id === id ? { ...ev, ...record } : ev));
      load();
      return;
    }
    await supabase.from(table).update(record).eq('id', id);
    load();
  }

  async function deleteEvent(id) {
    if (isDemo) {
      demoEventsRef.current = demoEventsRef.current.filter((ev) => ev.id !== id);
      load();
      return;
    }
    await supabase.from(table).delete().eq('id', id);
    load();
  }

  return { events, loading, addEvent, updateEvent, deleteEvent };
}
