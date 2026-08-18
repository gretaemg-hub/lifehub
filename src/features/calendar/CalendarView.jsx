import { useMemo, useState } from 'react';
import { useCalendarEvents } from './useCalendarEvents';
import {
  EVENT_COLORS,
  DEFAULT_EVENT_COLOR,
  getMonthCells,
  eventsOnDay,
  monthLabel,
  weekdayLabels,
  todayKey,
  formatDateChip,
  formatEventTimeLabel,
} from './calendarUtils';

const EMPTY_FORM = { title: '', start_date: '', end_date: '', all_day: true, start_time: '', end_time: '', color: DEFAULT_EVENT_COLOR };

// Shared month-grid UI for both Family Calendar (scope="family") and
// My Calendar (scope="personal") — same component, different backing
// table via useCalendarEvents(scope). This is a scoped-down take on
// the prototype's calendar: same colors, same date/time formatting,
// same "click a day to add, click an event to edit" flow, but events
// render as chips inside each day cell rather than the prototype's
// lane-packed multi-day bars, and there's no modal overlay — the
// add/edit form is an inline panel instead, consistent with how
// ShoppingList.jsx keeps things simple. Multi-day events still show
// up correctly, just as the same chip repeated on every day they span.
export default function CalendarView({ scope, heading, blurb }) {
  const { events, loading, addEvent, updateEvent, deleteEvent } = useCalendarEvents(scope);
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [editingId, setEditingId] = useState(null); // null = form closed, 'new' = adding, or an event id
  const [form, setForm] = useState(EMPTY_FORM);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const cells = useMemo(() => getMonthCells(year, month), [year, month]);
  const today = todayKey();

  const upcoming = useMemo(
    () => events.filter((ev) => ev.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 5),
    [events, today]
  );

  function goToMonth(offset) {
    setMonthDate(new Date(year, month + offset, 1));
  }

  function openAddForm(dateKey) {
    setForm({ ...EMPTY_FORM, start_date: dateKey, end_date: dateKey });
    setEditingId('new');
  }

  function openEditForm(ev) {
    setForm({
      title: ev.title,
      start_date: ev.start_date,
      end_date: ev.end_date,
      all_day: ev.all_day,
      start_time: ev.start_time || '',
      end_time: ev.end_time || '',
      color: ev.color || DEFAULT_EVENT_COLOR,
    });
    setEditingId(ev.id);
  }

  function closeForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editingId === 'new') await addEvent(form);
    else await updateEvent(editingId, form);
    closeForm();
  }

  async function handleDelete() {
    if (editingId && editingId !== 'new') await deleteEvent(editingId);
    closeForm();
  }

  return (
    <section>
      <h2 style={{ marginBottom: 2 }}>{heading}</h2>
      <p style={{ color: '#5B6960', marginTop: 0 }}>{blurb}</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0' }}>
        <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month">‹</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong>{monthLabel(year, month)}</strong>
          <button type="button" onClick={() => setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} style={{ fontSize: 12 }}>
            Today
          </button>
        </div>
        <button type="button" onClick={() => goToMonth(1)} aria-label="Next month">›</button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 11, color: '#5B6960', marginBottom: 4 }}>
            {weekdayLabels().map((d) => (
              <div key={d} style={{ textAlign: 'center' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((cell) => {
              const dayEvents = eventsOnDay(events, cell.dateKey);
              const isToday = cell.dateKey === today;
              return (
                <div
                  key={cell.dateKey}
                  onClick={() => openAddForm(cell.dateKey)}
                  style={{
                    minHeight: 64,
                    padding: 4,
                    borderRadius: 6,
                    border: isToday ? '2px solid #3E6259' : '1px solid #DDE3D6',
                    background: cell.inCurrentMonth ? 'white' : '#F4F6F1',
                    color: cell.inCurrentMonth ? 'inherit' : '#A9B2A4',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: isToday ? 700 : 400, marginBottom: 2 }}>{cell.dayNumber}</div>
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditForm(ev);
                      }}
                      title={`${ev.title} — ${formatEventTimeLabel(ev)}`}
                      style={{
                        background: ev.color || DEFAULT_EVENT_COLOR,
                        color: 'white',
                        borderRadius: 4,
                        padding: '1px 4px',
                        marginBottom: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={{ color: '#5B6960', fontSize: 10 }}>+{dayEvents.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>Upcoming</h3>
            {upcoming.length === 0 ? (
              <p style={{ color: '#5B6960', fontSize: 13 }}>Nothing coming up.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {upcoming.map((ev) => (
                  <li
                    key={ev.id}
                    onClick={() => openEditForm(ev)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #DDE3D6', cursor: 'pointer', fontSize: 13 }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: ev.color || DEFAULT_EVENT_COLOR, flexShrink: 0 }} />
                    <span style={{ color: '#5B6960', width: 60, flexShrink: 0 }}>{formatDateChip(ev.start_date)}</span>
                    <span style={{ flex: 1 }}>{ev.title}</span>
                    <span style={{ color: '#5B6960' }}>{formatEventTimeLabel(ev)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {editingId && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: 20,
            padding: 16,
            border: '1px solid #DDE3D6',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <strong>{editingId === 'new' ? 'Add event' : 'Edit event'}</strong>

          <input
            type="text"
            placeholder="Event title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
              Start date
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
              End date
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.all_day} onChange={(e) => setForm({ ...form, all_day: e.target.checked })} />
            All day
          </label>

          {!form.all_day && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                Start time
                <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                End time
                <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            {EVENT_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setForm({ ...form, color: c.hex })}
                title={c.name}
                aria-label={c.name}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: c.hex,
                  border: form.color === c.hex ? '2px solid #222' : '1px solid rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit">{editingId === 'new' ? 'Add event' : 'Save changes'}</button>
              <button type="button" onClick={closeForm}>Cancel</button>
            </div>
            {editingId !== 'new' && (
              <button type="button" onClick={handleDelete} style={{ color: '#C0392B' }}>
                Delete
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
