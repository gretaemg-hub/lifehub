import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { todayKey } from '../calendar/calendarUtils';

// Birthdays are a thin, denormalized read-model of "family calendar
// events with is_birthday=true" — mirrors the friends-demo's
// birthdays array (name/date copied at save time, linked back to the
// source event by id) rather than a live join, so the list is simple
// to render and survives the event later being edited or deleted
// (0001_init.sql: birthdays.linked_event_id references
// calendar_events(id) on delete set null — the row itself isn't
// dropped by the database; syncBirthdayForEvent/deleteForEvent below
// are what actually keep it in lockstep with the calendar, same as
// the demo's syncBirthdayForEvent()/deleteEvent()).
function seedDemoBirthdays() {
  const today = new Date();
  const soon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9);
  const y = soon.getMonth() < today.getMonth() ? today.getFullYear() - 30 : today.getFullYear() - 8;
  const m = String(soon.getMonth() + 1).padStart(2, '0');
  const d = String(soon.getDate()).padStart(2, '0');
  return [{ id: 'demo-birthday-1', linked_event_id: 'demo-birthday-event-1', name: 'Sam', date: `${y}-${m}-${d}` }];
}

// `enabled` lets My Calendar (scope="personal") skip birthdays
// entirely — birthdays only ever exist on the family calendar.
export function useBirthdays(enabled = true) {
  const { activeHouseholdId } = useHousehold();
  const { demoMode } = useAuth();
  const isDemo = demoMode || !isSupabaseConfigured;

  const demoBirthdaysRef = useRef(null);
  if (isDemo && demoBirthdaysRef.current === null) demoBirthdaysRef.current = seedDemoBirthdays();

  const [birthdays, setBirthdays] = useState(isDemo ? demoBirthdaysRef.current : []);
  const [loading, setLoading] = useState(enabled && !isDemo);

  const load = useCallback(async () => {
    if (!enabled) return;
    if (isDemo) {
      setBirthdays([...demoBirthdaysRef.current]);
      setLoading(false);
      return;
    }
    if (!activeHouseholdId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('birthdays')
      .select('id, linked_event_id, name, date')
      .eq('household_id', activeHouseholdId);
    if (error) console.error('Could not load birthdays:', error);
    setBirthdays(data ?? []);
    setLoading(false);
  }, [enabled, isDemo, activeHouseholdId]);

  useEffect(() => {
    load();
  }, [load]);

  // Called from CalendarView after an add/edit save on the family
  // calendar — upserts (by linked_event_id) when the checkbox is
  // ticked, deletes the linked row when it's unticked. Matches the
  // demo's syncBirthdayForEvent() exactly.
  async function syncBirthdayForEvent(event, isBirthday) {
    if (!enabled || !event) return;
    if (isDemo) {
      const current = demoBirthdaysRef.current;
      const idx = current.findIndex((b) => b.linked_event_id === event.id);
      if (isBirthday) {
        if (idx >= 0) {
          demoBirthdaysRef.current = current.map((b, i) => (i === idx ? { ...b, name: event.title, date: event.start_date } : b));
        } else {
          demoBirthdaysRef.current = [...current, { id: `demo-birthday-${current.length}`, linked_event_id: event.id, name: event.title, date: event.start_date }];
        }
      } else if (idx >= 0) {
        demoBirthdaysRef.current = current.filter((b) => b.linked_event_id !== event.id);
      }
      load();
      return;
    }
    if (!activeHouseholdId) return;
    if (isBirthday) {
      const { data: existing } = await supabase.from('birthdays').select('id').eq('linked_event_id', event.id).maybeSingle();
      if (existing) {
        await supabase.from('birthdays').update({ name: event.title, date: event.start_date }).eq('id', existing.id);
      } else {
        await supabase
          .from('birthdays')
          .insert({ household_id: activeHouseholdId, name: event.title, date: event.start_date, linked_event_id: event.id });
      }
    } else {
      await supabase.from('birthdays').delete().eq('linked_event_id', event.id);
    }
    load();
  }

  // Called from CalendarView after deleting a family event — removes
  // any birthday that was linked to it, same as the demo's deleteEvent().
  async function deleteForEvent(eventId) {
    if (!enabled) return;
    if (isDemo) {
      demoBirthdaysRef.current = demoBirthdaysRef.current.filter((b) => b.linked_event_id !== eventId);
      load();
      return;
    }
    await supabase.from('birthdays').delete().eq('linked_event_id', eventId);
    load();
  }

  return { birthdays, loading, syncBirthdayForEvent, deleteForEvent, refresh: load, today: todayKey() };
}
