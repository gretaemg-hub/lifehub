import { useMemo, useState } from 'react';
import { useCalendarEvents } from './useCalendarEvents';
import { useBirthdays } from '../birthdays/useBirthdays';
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
import { theme, headingFont, inputStyle, primaryButtonStyle, secondaryButtonStyle } from '../../theme';

const EMPTY_FORM = { title: '', start_date: '', end_date: '', all_day: true, start_time: '', end_time: '', color: DEFAULT_EVENT_COLOR, is_birthday: false };

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
// Renders inside the themed card App.jsx already wraps every tab in.
export default function CalendarView({ scope, heading, blurb }) {
  const { events, loading, addEvent, updateEvent, deleteEvent } = useCalendarEvents(scope);
  // Birthdays only ever exist on the family calendar — the checkbox
  // and the sync calls below are no-ops (and this hook does no
  // network work at all) when scope is "personal".
  const { syncBirthdayForEvent, deleteForEvent: deleteBirthdayForEvent } = useBirthdays(scope === 'family');
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
      is_birthday: !!ev.is_birthday,
    });
    setEditingId(ev.id);
  }

  function closeForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const saved = editingId === 'new' ? await addEvent(form) : await updateEvent(editingId, form);
    if (scope === 'family' && saved) await syncBirthdayForEvent(saved, form.is_birthday);
    closeForm();
  }

  async function handleDelete() {
    if (editingId && editingId !== 'new') {
      await deleteEvent(editingId);
      if (scope === 'family') await deleteBirthdayForEvent(editingId);
    }
    closeForm();
  }

  return (
    <section>
      <style>{`
        .lh-cal-nav:hover { background: ${theme.surfaceMuted} !important; }
        .lh-cal-today:hover { border-color: ${theme.pine} !important; color: ${theme.pineDark} !important; }
        .lh-cal-day:hover { border-color: ${theme.pine} !important; }
        .lh-cal-input:focus, .lh-cal-select:focus {
          outline: none;
          border-color: ${theme.pine} !important;
          box-shadow: 0 0 0 3px rgba(62, 98, 89, 0.15);
        }
        .lh-cal-save:not(:disabled):hover { background: ${theme.pineDark} !important; }
        .lh-cal-cancel:hover { border-color: ${theme.pine} !important; color: ${theme.pineDark} !important; }
        .lh-cal-delete:hover { background: ${theme.dangerBg} !important; }
      `}</style>

      <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, color: theme.pineDark, margin: '0 0 4px' }}>
        {heading}
      </h2>
      <p style={{ color: theme.inkSoft, marginTop: 0, marginBottom: 18, fontSize: 14 }}>{blurb}</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          type="button"
          className="lh-cal-nav"
          onClick={() => goToMonth(-1)}
          aria-label="Previous month"
          style={{ background: 'none', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, color: theme.pine, cursor: 'pointer' }}
        >
          ‹
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong style={{ fontFamily: headingFont, fontSize: 16, color: theme.ink }}>{monthLabel(year, month)}</strong>
          <button
            type="button"
            className="lh-cal-today"
            onClick={() => setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            style={{ ...secondaryButtonStyle, padding: '5px 12px', fontSize: 11 }}
          >
            Today
          </button>
        </div>
        <button
          type="button"
          className="lh-cal-nav"
          onClick={() => goToMonth(1)}
          aria-label="Next month"
          style={{ background: 'none', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, color: theme.pine, cursor: 'pointer' }}
        >
          ›
        </button>
      </div>

      {loading ? (
        <p style={{ color: theme.inkSoft }}>Loading…</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 11, color: theme.inkSoft, marginBottom: 4, fontWeight: 600 }}>
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
                  className="lh-cal-day"
                  onClick={() => openAddForm(cell.dateKey)}
                  style={{
                    minHeight: 64,
                    padding: 4,
                    borderRadius: 8,
                    border: isToday ? `2px solid ${theme.pine}` : `1px solid ${theme.line}`,
                    background: cell.inCurrentMonth ? theme.surface : theme.surfaceMuted,
                    color: cell.inCurrentMonth ? 'inherit' : theme.inkFaint,
                    cursor: 'pointer',
                    fontSize: 12,
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ fontWeight: isToday ? 700 : 400, color: isToday ? theme.pineDark : 'inherit', marginBottom: 2 }}>
                    {cell.dayNumber}
                  </div>
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
                        borderRadius: 5,
                        padding: '1px 5px',
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
                    <div style={{ color: theme.inkSoft, fontSize: 10 }}>+{dayEvents.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 22 }}>
            <h3 style={{ fontFamily: headingFont, fontSize: 15, fontWeight: 600, color: theme.ink, marginBottom: 6 }}>
              Upcoming
            </h3>
            {upcoming.length === 0 ? (
              <p style={{ color: theme.inkSoft, fontSize: 13 }}>Nothing coming up.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {upcoming.map((ev) => (
                  <li
                    key={ev.id}
                    onClick={() => openEditForm(ev)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${theme.line}`, cursor: 'pointer', fontSize: 13 }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: ev.color || DEFAULT_EVENT_COLOR, flexShrink: 0 }} />
                    <span style={{ color: theme.inkSoft, width: 60, flexShrink: 0 }}>{formatDateChip(ev.start_date)}</span>
                    <span style={{ flex: 1 }}>{ev.title}</span>
                    <span style={{ color: theme.inkSoft }}>{formatEventTimeLabel(ev)}</span>
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
            marginTop: 22,
            padding: 18,
            background: theme.surfaceMuted,
            border: `1px solid ${theme.line}`,
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <strong style={{ fontFamily: headingFont, fontSize: 15, color: theme.pineDark }}>
            {editingId === 'new' ? 'Add event' : 'Edit event'}
          </strong>

          <input
            className="lh-cal-input"
            type="text"
            placeholder="Event title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            style={inputStyle}
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4, color: theme.inkSoft, flex: '1 1 140px' }}>
              Start date
              <input
                className="lh-cal-input"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4, color: theme.inkSoft, flex: '1 1 140px' }}>
              End date
              <input
                className="lh-cal-input"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                style={inputStyle}
              />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.inkSoft }}>
            <input
              type="checkbox"
              checked={form.all_day}
              onChange={(e) => setForm({ ...form, all_day: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: theme.pine }}
            />
            All day
          </label>

          {!form.all_day && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4, color: theme.inkSoft, flex: '1 1 140px' }}>
                Start time
                <input
                  className="lh-cal-input"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 4, color: theme.inkSoft, flex: '1 1 140px' }}>
                End time
                <input
                  className="lh-cal-input"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  style={inputStyle}
                />
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {EVENT_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setForm({ ...form, color: c.hex })}
                title={c.name}
                aria-label={c.name}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: c.hex,
                  border: `2px solid ${form.color === c.hex ? theme.ink : 'transparent'}`,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          {scope === 'family' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.inkSoft }}>
              <input
                type="checkbox"
                checked={form.is_birthday}
                onChange={(e) => setForm({ ...form, is_birthday: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: theme.pine }}
              />
              🎂 This is a birthday
            </label>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="lh-cal-save" type="submit" style={primaryButtonStyle}>
                {editingId === 'new' ? 'Add event' : 'Save changes'}
              </button>
              <button className="lh-cal-cancel" type="button" onClick={closeForm} style={secondaryButtonStyle}>
                Cancel
              </button>
            </div>
            {editingId !== 'new' && (
              <button
                className="lh-cal-delete"
                type="button"
                onClick={handleDelete}
                style={{ background: 'none', border: 'none', color: theme.danger, fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 8, padding: '8px 10px' }}
              >
                Delete
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
