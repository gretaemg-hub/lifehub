import { useEffect, useState } from 'react';
import { theme } from '../theme';

// Ported from the friends-demo's sidebar (lifehub.html: <nav class="sidebar">) —
// same grouping (a top-level Home link, then a "Personal" section, then a
// "Family" section with Family Calendar/Birthdays nested under one
// collapsible dropdown), same disabled placeholders for features that
// aren't built yet (Bills, Tasks, Trips & Holidays), so the real app's
// navigation looks and behaves exactly like the demo. The one addition
// the demo doesn't have is "Household" — invite codes and member
// management are real-account concepts with nothing to mirror in a
// no-login demo, so it's tacked onto the end of the Family section
// instead of invented a matching demo feature to imitate.
function NavButton({ icon, label, active, onClick, disabled, sub, style }) {
  return (
    <button
      type="button"
      className="lh-nav-btn"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: sub ? '9px 14px 9px 30px' : '10px 14px',
        borderRadius: 8,
        fontSize: sub ? 14 : 14.5,
        fontWeight: 500,
        fontFamily: 'inherit',
        color: active ? 'white' : disabled ? theme.inkFaint : theme.inkSoft,
        background: active ? theme.pine : 'transparent',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
        width: '100%',
        ...style,
      }}
    >
      <span style={{ fontSize: sub ? 15 : 17 }}>{icon}</span>
      {label}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        color: theme.inkSoft,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        padding: '14px 14px 4px',
      }}
    >
      {children}
    </div>
  );
}

export default function Sidebar({ tab, onSelect }) {
  const [calendarOpen, setCalendarOpen] = useState(tab === 'family-calendar' || tab === 'birthdays');

  // Matches the demo: navigating to Family Calendar or Birthdays always
  // forces the dropdown open, even if you'd previously collapsed it —
  // the chevron only ever controls it independently of that.
  useEffect(() => {
    if (tab === 'family-calendar' || tab === 'birthdays') setCalendarOpen(true);
  }, [tab]);

  return (
    <nav className="lh-sidebar">
      <NavButton icon="🏠" label="Home" active={tab === 'home'} onClick={() => onSelect('home')} />

      <SectionLabel>Personal</SectionLabel>
      <NavButton icon="🏋️" label="Fitness Tracker" active={tab === 'fitness'} onClick={() => onSelect('fitness')} />
      <NavButton icon="📝" label="Notes" active={tab === 'notes'} onClick={() => onSelect('notes')} />
      <NavButton icon="🗓️" label="My Calendar" active={tab === 'my-calendar'} onClick={() => onSelect('my-calendar')} />

      <SectionLabel>Family</SectionLabel>

      <div className="lh-nav-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <NavButton
            icon="📅"
            label="Family Calendar"
            active={tab === 'family-calendar'}
            onClick={() => onSelect('family-calendar')}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="lh-nav-chevron-btn"
            onClick={() => setCalendarOpen((open) => !open)}
            aria-label="Toggle birthdays and trips dropdown"
            style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              background: theme.surfaceMuted,
              color: theme.pine,
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1,
              transform: calendarOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          >
            ▾
          </button>
        </div>
        {calendarOpen && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <NavButton icon="🎂" label="Birthdays" active={tab === 'birthdays'} onClick={() => onSelect('birthdays')} sub />
            <NavButton icon="✈️" label="Trips & Holidays" disabled sub />
          </div>
        )}
      </div>

      <NavButton icon="🛒" label="Shopping" active={tab === 'shopping'} onClick={() => onSelect('shopping')} />
      <NavButton icon="📚" label="School & Homeworks" active={tab === 'homework'} onClick={() => onSelect('homework')} />
      <NavButton icon="💸" label="Bills" disabled />
      <NavButton icon="🧹" label="Tasks" disabled />
      <NavButton icon="🍽️" label="Meal Plans" active={tab === 'meal-plan'} onClick={() => onSelect('meal-plan')} />
      <NavButton icon="🏡" label="Household" active={tab === 'household'} onClick={() => onSelect('household')} />
    </nav>
  );
}
