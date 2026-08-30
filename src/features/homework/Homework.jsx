import { useMemo, useState } from 'react';
import { useHomeworkItems } from './useHomeworkItems';
import { formatDateChip, formatTime12h, todayKey } from '../calendar/calendarUtils';
import { theme, headingFont, inputStyle, primaryButtonStyle, secondaryButtonStyle } from '../../theme';

// Due-date badge: "Today"/"! Today" if due today or tomorrow (due-soon),
// red "overdue" if past, plain otherwise — same three states and same
// thresholds as the friends-demo's getHomeworkDueStatus().
function dueStatus(item, today) {
  const nowTimeStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const isOverdue = item.due_time
    ? item.due_date < today || (item.due_date === today && item.due_time < nowTimeStr)
    : item.due_date < today;
  if (isOverdue) return 'overdue';
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  if (item.due_date === today || item.due_date === tomorrow) return 'due-soon';
  return 'normal';
}

function dueLabel(item, today) {
  const dateLabel = item.due_date === today ? 'Today' : formatDateChip(item.due_date);
  return item.due_time ? `${dateLabel} · ${formatTime12h(item.due_time)}` : dateLabel;
}

// Matches the demo's School & Homeworks tab: an add-row, an active
// list (soonest due first), and a Completed section collapsed behind
// a "▸ Completed (N)" toggle. Renders inside App.jsx's themed card.
export default function Homework() {
  const { items, loading, addItem, setCompleted, deleteItem } = useHomeworkItems();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const today = todayKey();

  const active = useMemo(
    () => items.filter((h) => !h.completed).sort((a, b) => (a.due_date + (a.due_time || '')).localeCompare(b.due_date + (b.due_time || ''))),
    [items]
  );
  const completed = useMemo(() => items.filter((h) => h.completed).sort((a, b) => b.due_date.localeCompare(a.due_date)), [items]);

  async function handleAdd(e) {
    e.preventDefault();
    await addItem(subject, description, dueDate, dueTime);
    setSubject('');
    setDescription('');
    setDueDate('');
    setDueTime('');
  }

  const badgeColors = {
    overdue: { bg: theme.dangerBg, fg: theme.danger },
    'due-soon': { bg: '#FFF6E0', fg: '#8A6A1E' },
    normal: { bg: theme.surfaceMuted, fg: theme.inkSoft },
  };

  return (
    <section>
      <style>{`
        .lh-hw-input:focus { outline: none; border-color: ${theme.pine} !important; box-shadow: 0 0 0 3px rgba(62, 98, 89, 0.15); }
        .lh-hw-add:hover { background: ${theme.pineDark} !important; }
        .lh-hw-remove:hover { color: ${theme.danger} !important; }
        .lh-hw-toggle:hover { border-color: ${theme.pine} !important; color: ${theme.pineDark} !important; }
      `}</style>

      <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, color: theme.pineDark, margin: '0 0 4px' }}>
        📚 School &amp; Homeworks
      </h2>
      <p style={{ color: theme.inkSoft, marginTop: 0, fontSize: 14 }}>Shared with the family — anyone can add or check off an assignment.</p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, margin: '18px 0', flexWrap: 'wrap' }}>
        <input
          className="lh-hw-input"
          type="text"
          placeholder="Subject… (e.g. Maths)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 140px' }}
        />
        <input
          className="lh-hw-input"
          type="text"
          placeholder="Brief description…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 180px' }}
        />
        <input
          className="lh-hw-input"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 150px' }}
        />
        <input
          className="lh-hw-input"
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 120px' }}
        />
        <button className="lh-hw-add" type="submit" style={primaryButtonStyle}>
          Add
        </button>
      </form>

      {loading ? (
        <p style={{ color: theme.inkSoft }}>Loading…</p>
      ) : active.length === 0 ? (
        <p style={{ color: theme.inkSoft, fontSize: 13 }}>Nothing due — add an assignment above.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {active.map((h) => {
            const status = dueStatus(h, today);
            const colors = badgeColors[status];
            return (
              <li key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 4px', borderBottom: `1px solid ${theme.line}` }}>
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => setCompleted(h.id, true)}
                  style={{ marginTop: 3, width: 18, height: 18, accentColor: theme.pine, flexShrink: 0 }}
                />
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: theme.ink }}>{h.subject}</div>
                  {h.description && <div style={{ fontSize: 13, color: theme.inkSoft }}>{h.description}</div>}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: colors.fg,
                    background: colors.bg,
                    borderRadius: 6,
                    padding: '3px 9px',
                    whiteSpace: 'nowrap',
                    marginTop: 1,
                  }}
                >
                  {status === 'overdue' ? '! ' : ''}
                  {dueLabel(h, today)}
                </span>
                <button
                  className="lh-hw-remove"
                  onClick={() => deleteItem(h.id)}
                  title="Remove"
                  style={{ background: 'none', border: 'none', color: theme.inkFaint, cursor: 'pointer', fontSize: 15, padding: 4 }}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        className="lh-hw-toggle"
        type="button"
        onClick={() => setShowCompleted((v) => !v)}
        style={{ ...secondaryButtonStyle, marginTop: 16, padding: '8px 14px', fontSize: 12 }}
      >
        {showCompleted ? '▾' : '▸'} Completed ({completed.length})
      </button>

      {showCompleted && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
          {completed.length === 0 ? (
            <li style={{ color: theme.inkSoft, fontSize: 13, padding: '6px 4px' }}>No completed items yet.</li>
          ) : (
            completed.map((h) => (
              <li key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', borderBottom: `1px solid ${theme.line}` }}>
                <span style={{ flex: 1, textDecoration: 'line-through', color: theme.inkFaint }}>{h.subject}</span>
                <button onClick={() => setCompleted(h.id, false)} style={{ ...secondaryButtonStyle, padding: '5px 10px', fontSize: 11 }}>
                  Un-complete
                </button>
                <button
                  className="lh-hw-remove"
                  onClick={() => deleteItem(h.id)}
                  title="Remove"
                  style={{ background: 'none', border: 'none', color: theme.inkFaint, cursor: 'pointer', fontSize: 15, padding: 4 }}
                >
                  ✕
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
