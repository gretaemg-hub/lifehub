import { useEffect, useMemo, useState } from 'react';
import { useHomeworkItems } from './useHomeworkItems';
import { useHomeworkProfiles } from './useHomeworkProfiles';
import { useHousehold } from '../../context/HouseholdContext';
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
//
// One addition over the demo: a homework profile picker up top, so
// more than one kid's assignments can live in this same household
// without turning into one mixed-up list. First visit it just reads
// "Select profile" (the <select>'s placeholder, since there's nothing
// to pick yet); once a profile exists and is chosen, that same
// dropdown's displayed value becomes "<name>'s homeworks". "+ Add
// another homework profile" underneath is how you create the first
// one too, not just later ones — the wording works either way.
export default function Homework() {
  const { activeHouseholdId } = useHousehold();
  const { profiles, loading: profilesLoading, addProfile } = useHomeworkProfiles();
  const storageKey = `lh-homework-profile:${activeHouseholdId || 'none'}`;
  const [activeProfileId, setActiveProfileId] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || '';
    } catch {
      return '';
    }
  });
  const [addingProfile, setAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);

  // Once profiles have loaded, drop a remembered selection that no
  // longer exists (e.g. a different household), and auto-pick when
  // there's exactly one profile — no real choice to make there.
  useEffect(() => {
    if (profilesLoading) return;
    if (activeProfileId && !profiles.some((p) => p.id === activeProfileId)) {
      setActiveProfileId('');
    } else if (!activeProfileId && profiles.length === 1) {
      setActiveProfileId(profiles[0].id);
    }
  }, [profilesLoading, profiles, activeProfileId]);

  function selectProfile(id) {
    setActiveProfileId(id);
    try {
      if (id) localStorage.setItem(storageKey, id);
      else localStorage.removeItem(storageKey);
    } catch {
      // Storage can be unavailable (private browsing, quota) — the
      // dropdown still works for this visit, it just won't be
      // remembered next time.
    }
  }

  async function handleAddProfile(e) {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    setProfileBusy(true);
    const profile = await addProfile(newProfileName);
    setProfileBusy(false);
    if (profile) {
      setNewProfileName('');
      setAddingProfile(false);
      selectProfile(profile.id);
    }
  }

  const { items, loading, addItem, setCompleted, deleteItem } = useHomeworkItems(activeProfileId || null);
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
        .lh-hw-select:focus {
          outline: none;
          border-color: ${theme.pine} !important;
          box-shadow: 0 0 0 3px rgba(62, 98, 89, 0.15);
        }
        .lh-hw-add-profile:hover { text-decoration: underline; }
      `}</style>

      <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, color: theme.pineDark, margin: '0 0 4px' }}>
        📚 School &amp; Homeworks
      </h2>
      <p style={{ color: theme.inkSoft, marginTop: 0, fontSize: 14 }}>Shared with the family — anyone can add or check off an assignment.</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
        <select
          className="lh-hw-select"
          value={activeProfileId}
          onChange={(e) => selectProfile(e.target.value)}
          disabled={profilesLoading}
          style={{
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            padding: '9px 12px',
            borderRadius: 10,
            border: `1.5px solid ${theme.line}`,
            background: theme.surface,
            color: activeProfileId ? theme.ink : theme.inkSoft,
            cursor: 'pointer',
          }}
        >
          <option value="" disabled>
            Select profile
          </option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}'s homeworks
            </option>
          ))}
        </select>
      </div>

      {addingProfile ? (
        <form onSubmit={handleAddProfile} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <input
            className="lh-hw-input"
            type="text"
            autoFocus
            placeholder="Student's name…"
            value={newProfileName}
            maxLength={40}
            onChange={(e) => setNewProfileName(e.target.value)}
            style={{ ...inputStyle, padding: '8px 10px', fontSize: 14, width: 180 }}
          />
          <button type="submit" disabled={profileBusy} style={{ ...primaryButtonStyle, padding: '8px 14px', fontSize: 13 }}>
            {profileBusy ? 'Adding…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAddingProfile(false);
              setNewProfileName('');
            }}
            style={{ ...secondaryButtonStyle, padding: '8px 14px', fontSize: 13 }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="lh-hw-add-profile"
          onClick={() => setAddingProfile(true)}
          style={{ display: 'block', marginTop: 8, fontFamily: 'inherit', fontSize: 13, background: 'none', border: 'none', color: theme.pine, fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          + Add another homework profile
        </button>
      )}

      {!activeProfileId ? (
        <p style={{ color: theme.inkSoft, fontSize: 13, marginTop: 20 }}>
          {profiles.length === 0
            ? 'Add a homework profile above for each student sharing this app, then pick one to start adding assignments.'
            : 'Pick a profile above to see and add their assignments.'}
        </p>
      ) : (
        <>
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
        </>
      )}
    </section>
  );
}
