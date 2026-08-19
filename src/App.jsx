import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import Login from './pages/Login';
import HouseholdOnboarding from './pages/HouseholdOnboarding';
import ShoppingList from './features/shopping/ShoppingList';
import CalendarView from './features/calendar/CalendarView';
import HouseholdSettings from './features/household/HouseholdSettings';

// The three states every screen boils down to now, replacing the
// prototype's implicit "whoever has the tab open" model:
//   1. Not logged in            -> Login
//   2. Logged in, no household  -> HouseholdOnboarding
//   3. Logged in, has household -> the actual app
const TABS = [
  { key: 'shopping', label: '🛒 Shopping List' },
  { key: 'family-calendar', label: '👪 Family Calendar' },
  { key: 'my-calendar', label: '📅 My Calendar' },
  { key: 'household', label: '🏠 Household' },
];

function AppShell() {
  const { user, loading: authLoading, signOut, demoMode } = useAuth();
  const { hasHousehold, loading: householdLoading, memberships, activeHouseholdId } = useHousehold();
  const [tab, setTab] = useState('shopping');

  if (authLoading) return <p style={{ padding: 40 }}>Loading…</p>;
  if (!user) return <Login />;
  if (householdLoading) return <p style={{ padding: 40 }}>Loading your household…</p>;
  if (!hasHousehold) return <HouseholdOnboarding />;

  const activeHousehold = memberships.find((m) => m.household_id === activeHouseholdId);

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto', padding: 24 }}>
      {demoMode && (
        <div
          style={{
            background: '#FFF6E0',
            border: '1px solid #E8D8A6',
            borderRadius: 8,
            padding: '8px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: '#6B5A1E',
          }}
        >
          🔧 Demo mode — you're looking at sample data with no backend connected. Nothing here saves after you
          leave the page.
        </div>
      )}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>🏡 LifeHub</h1>
          <p style={{ margin: 0, color: '#5B6960', fontSize: 13 }}>{activeHousehold?.households?.name}</p>
        </div>
        <button onClick={signOut}>{demoMode ? 'Exit demo' : 'Sign out'}</button>
      </header>

      <nav style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #DDE3D6', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 12px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #3E6259' : '2px solid transparent',
              fontWeight: tab === t.key ? 700 : 400,
              cursor: 'pointer',
              color: tab === t.key ? '#3E6259' : '#5B6960',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/*
        Shopping List, Family Calendar, and My Calendar are migrated
        so far. Add the next feature (Homework, Birthdays+Wishlists,
        Meal Plan, Notes, Fitness Tracker) the same way: a
        supabase/migrations table (already in 0001_init.sql), a
        use*Feature.js hook, and a component, following
        features/shopping/ or features/calendar/ as the template —
        then add a tab for it above.
      */}
      {tab === 'shopping' && <ShoppingList />}
      {tab === 'family-calendar' && (
        <CalendarView
          scope="family"
          heading="👪 Family Calendar"
          blurb="Shared with everyone in the household."
        />
      )}
      {tab === 'my-calendar' && (
        <CalendarView
          scope="personal"
          heading="📅 My Calendar"
          blurb="Only visible to you — enforced by the database itself, not just the UI."
        />
      )}
      {tab === 'household' && <HouseholdSettings />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <AppShell />
      </HouseholdProvider>
    </AuthProvider>
  );
}
