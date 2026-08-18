import { AuthProvider, useAuth } from './context/AuthContext';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import Login from './pages/Login';
import HouseholdOnboarding from './pages/HouseholdOnboarding';
import ShoppingList from './features/shopping/ShoppingList';

// The three states every screen boils down to now, replacing the
// prototype's implicit "whoever has the tab open" model:
//   1. Not logged in            -> Login
//   2. Logged in, no household  -> HouseholdOnboarding
//   3. Logged in, has household -> the actual app
function AppShell() {
  const { user, loading: authLoading, signOut, demoMode } = useAuth();
  const { hasHousehold, loading: householdLoading, memberships, activeHouseholdId } = useHousehold();

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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>🏡 LifeHub</h1>
          <p style={{ margin: 0, color: '#5B6960', fontSize: 13 }}>{activeHousehold?.households?.name}</p>
        </div>
        <button onClick={signOut}>{demoMode ? 'Exit demo' : 'Sign out'}</button>
      </header>

      {/*
        Only Shopping List is migrated so far — this is the Phase 3
        starting point from the roadmap. Add the next feature (Family
        Calendar) the same way: a supabase/migrations table (already
        in 0001_init.sql), a use*Feature.js hook, and a component,
        following features/shopping/ as the template.
      */}
      <ShoppingList />
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
