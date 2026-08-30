import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import Login from './pages/Login';
import HouseholdOnboarding from './pages/HouseholdOnboarding';
import ShoppingList from './features/shopping/ShoppingList';
import CalendarView from './features/calendar/CalendarView';
import HouseholdSettings from './features/household/HouseholdSettings';
import BirthdaysWishlists from './features/birthdays/BirthdaysWishlists';
import Homework from './features/homework/Homework';
import MealPlan from './features/mealplan/MealPlan';
import Notes from './features/notes/Notes';
import FitnessTracker from './features/fitness/FitnessTracker';
import ProfileSettings, { Avatar } from './features/profile/ProfileSettings';
import { useProfile } from './features/profile/useProfile';
import ConfirmedBanner from './components/ConfirmedBanner';
import { theme, headingFont, bodyFont, cardStyle } from './theme';

// The three states every screen boils down to now, replacing the
// prototype's implicit "whoever has the tab open" model:
//   1. Not logged in            -> Login
//   2. Logged in, no household  -> HouseholdOnboarding
//   3. Logged in, has household -> the actual app
const TABS = [
  { key: 'shopping', label: '🛒 Shopping List' },
  { key: 'family-calendar', label: '👪 Family Calendar' },
  { key: 'my-calendar', label: '📅 My Calendar' },
  { key: 'birthdays', label: '🎂 Birthdays' },
  { key: 'homework', label: '📚 Homework' },
  { key: 'meal-plan', label: '🍽️ Meal Plan' },
  { key: 'notes', label: '📝 Notes' },
  { key: 'fitness', label: '🏋️ Fitness' },
  { key: 'household', label: '🏠 Household' },
];

// Full-page loading state, styled to match the rest of the app instead
// of a bare unstyled paragraph — this is what briefly shows on every
// load while we ask Supabase who's signed in.
function PageLoading({ label }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: bodyFont,
        color: theme.inkSoft,
        fontSize: 15,
      }}
    >
      {label}
    </div>
  );
}

function AppShell() {
  const { user, loading: authLoading, demoMode } = useAuth();
  const { hasHousehold, loading: householdLoading, memberships, activeHouseholdId } = useHousehold();
  const [tab, setTab] = useState('shopping');
  const [view, setView] = useState('tabs'); // 'tabs' | 'profile'
  const profileData = useProfile();
  const { profile } = profileData;

  if (authLoading) return <PageLoading label="Loading…" />;
  if (!user) return <Login />;
  if (householdLoading) return <PageLoading label="Loading your household…" />;
  if (!hasHousehold) return <HouseholdOnboarding />;

  const activeHousehold = memberships.find((m) => m.household_id === activeHouseholdId);

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, fontFamily: bodyFont, color: theme.ink }}>
      <style>{`
        .lh-tab:hover { color: ${theme.pineDark} !important; }
        .lh-profile-chip:hover { background: rgba(255,255,255,0.18) !important; }
      `}</style>

      {/* Green top bar, matching Login's header so the app never feels
          like a different, more clinical product once you're inside it. */}
      <header
        style={{
          background: theme.pine,
          color: 'white',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>🏡</span>
          <div>
            <div style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, letterSpacing: 0.3 }}>
              LifeHub
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
              {activeHousehold?.households?.name}
            </div>
          </div>
        </div>
        {/* Click your own avatar/name to reach Profile Settings — same
            gesture as the friends-demo. Log out lives inside that page
            now, alongside change-password and delete-account, instead
            of sitting out here as a standalone button. */}
        <button
          className="lh-profile-chip"
          onClick={() => setView('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontFamily: 'inherit',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 999,
            padding: '6px 16px 6px 6px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          <Avatar name={profile?.display_name} color={profile?.avatar_color} url={profile?.avatar_url} size={30} fontSize={13} />
          {profile?.display_name || 'Profile'}
        </button>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 60px' }}>
        <ConfirmedBanner />

        {demoMode && (
          <div
            style={{
              background: '#FFF6E0',
              border: '1px solid #E8D8A6',
              borderRadius: 12,
              padding: '10px 16px',
              marginBottom: 20,
              fontSize: 13,
              color: '#6B5A1E',
            }}
          >
            🔧 Demo mode — you're looking at sample data with no backend connected. Nothing here saves after you
            leave the page.
          </div>
        )}

        {view === 'profile' ? (
          <div style={cardStyle}>
            <ProfileSettings onBack={() => setView('tabs')} {...profileData} />
          </div>
        ) : (
          <>
            <nav
              style={{
                display: 'flex',
                gap: 4,
                marginBottom: 24,
                background: theme.surface,
                borderRadius: 14,
                padding: 6,
                boxShadow: '0 4px 14px rgba(38, 49, 43, 0.06)',
                flexWrap: 'wrap',
              }}
            >
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className="lh-tab"
                  onClick={() => setTab(t.key)}
                  style={{
                    fontFamily: 'inherit',
                    flex: '1 1 auto',
                    padding: '10px 14px',
                    background: tab === t.key ? theme.bg : 'transparent',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: tab === t.key ? 700 : 500,
                    fontSize: 13,
                    cursor: 'pointer',
                    color: tab === t.key ? theme.pineDark : theme.inkSoft,
                    transition: 'color 0.15s',
                    whiteSpace: 'nowrap',
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
              then add a tab for it above. Give it the same cardStyle wrapper
              used below so it inherits the theme automatically.
            */}
            <div style={cardStyle}>
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
              {tab === 'birthdays' && <BirthdaysWishlists />}
              {tab === 'homework' && <Homework />}
              {tab === 'meal-plan' && <MealPlan />}
              {tab === 'notes' && <Notes />}
              {tab === 'fitness' && <FitnessTracker />}
              {tab === 'household' && <HouseholdSettings />}
            </div>
          </>
        )}
      </div>
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
