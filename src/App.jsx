import { useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import Login from './pages/Login';
import HouseholdOnboarding from './pages/HouseholdOnboarding';
import ShoppingList from './features/shopping/ShoppingList';
import CalendarView from './features/calendar/CalendarView';
import HouseholdSettings from './features/household/HouseholdSettings';
import { useHouseholdMembers } from './features/household/useHouseholdMembers';
import BirthdaysWishlists from './features/birthdays/BirthdaysWishlists';
import Homework from './features/homework/Homework';
import MealPlan from './features/mealplan/MealPlan';
import Notes from './features/notes/Notes';
import FitnessTracker from './features/fitness/FitnessTracker';
import Home from './features/home/Home';
import ProfileSettings, { Avatar } from './features/profile/ProfileSettings';
import { useProfile } from './features/profile/useProfile';
import ConfirmedBanner from './components/ConfirmedBanner';
import { theme, headingFont, bodyFont, cardStyle } from './theme';

// The three states every screen boils down to now, replacing the
// prototype's implicit "whoever has the tab open" model:
//   1. Not logged in            -> Login
//   2. Logged in, no household  -> HouseholdOnboarding
//   3. Logged in, has household -> the actual app
//
// 'home' renders full-width on the sage background (its own taped
// cards ARE the surface, like the friends-demo's #view-home) — every
// other tab keeps the white cardStyle wrapper it already had.
const CARD_TABS = new Set([
  'shopping', 'family-calendar', 'my-calendar', 'birthdays', 'homework', 'meal-plan', 'notes', 'fitness', 'household',
]);

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

// The topbar's "My Family" strip — built from real household members
// instead of the demo's localStorage roster, but the same idea: every
// member gets a small circle + name, and whichever one is you gets a
// white ring so it's obvious at a glance without reading every label.
function FamilyStrip({ members, currentUserId }) {
  if (members.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap' }}>
        My Family
      </span>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {members.map((m) => {
          const isYou = m.user_id === currentUserId;
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 48 }}>
              <div style={{ boxShadow: isYou ? '0 0 0 2px white' : 'none', borderRadius: '50%' }}>
                <Avatar name={m.display_name} color={m.avatar_color} url={m.avatar_url} size={30} fontSize={13} />
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  color: isYou ? 'white' : 'rgba(255,255,255,0.85)',
                  fontWeight: isYou ? 700 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 48,
                }}
              >
                {m.display_name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppShell() {
  const { user, loading: authLoading, demoMode, pendingInviteCode, clearPendingInvite } = useAuth();
  const { hasHousehold, loading: householdLoading, memberships, activeHouseholdId } = useHousehold();
  const [tab, setTab] = useState('home');
  const [view, setView] = useState('tabs'); // 'tabs' | 'profile'
  const profileData = useProfile();
  const { profile } = profileData;
  const { members, currentUserId } = useHouseholdMembers();
  const mainRef = useRef(null);

  // A `?invite=CODE` link is only meant for someone who doesn't have a
  // household yet — HouseholdOnboarding.jsx is what actually redeems
  // it. If it's still sitting in the URL once we get here (an existing
  // member re-opened an old family-link message, say), there's nothing
  // left to do with it — clear it so it doesn't linger in the address
  // bar or get mistaken for something still pending.
  useEffect(() => {
    if (!hasHousehold || !pendingInviteCode) return;
    clearPendingInvite();
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState(null, '', url);
  }, [hasHousehold, pendingInviteCode, clearPendingInvite]);

  if (authLoading) return <PageLoading label="Loading…" />;
  if (!user) return <Login />;
  if (householdLoading) return <PageLoading label="Loading your household…" />;
  if (!hasHousehold) return <HouseholdOnboarding />;

  const activeHousehold = memberships.find((m) => m.household_id === activeHouseholdId);

  // Clicking any home-screen tile always drops you back into the tab
  // content, even if Profile Settings was open — matches how the demo's
  // nav always shows you the view you just picked. Without this,
  // picking a new tab silently swaps the content while you're still
  // scrolled wherever you were — feels like nothing happened until you
  // scroll down and find it. Instead we smoothly bring the content area
  // to the top of the viewport, so switching tabs reads as "flicking"
  // to a new screen, the way a native app would, rather than a scroll
  // chore.
  function selectTab(key) {
    setTab(key);
    setView('tabs');
    requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, fontFamily: bodyFont, color: theme.ink }}>
      <style>{`
        .lh-profile-chip:hover { background: rgba(255,255,255,0.18) !important; }
        .lh-home-btn:hover { background: ${theme.pineDark} !important; }

        /* ============================================================
           HOME DASHBOARD CARDS — the "index card pinned to a
           noticeboard with washi tape" look from the demo's .card
           rules. Cards sit at a slight alternating rotation and lift
           on hover, with a small rotated tape strip via ::before.
           ============================================================ */
        .lh-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }
        .lh-card {
          position: relative;
          background: ${theme.surface};
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(38, 49, 43, 0.08);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .lh-card:nth-child(odd) { transform: rotate(-0.6deg); }
        .lh-card:nth-child(even) { transform: rotate(0.5deg); }
        .lh-card-clickable { cursor: pointer; }
        .lh-card-clickable:hover { transform: rotate(0deg) translateY(-2px); box-shadow: 0 6px 20px rgba(38, 49, 43, 0.12); }
        .lh-card::before {
          content: "";
          position: absolute;
          top: -8px;
          left: 24px;
          width: 44px;
          height: 16px;
          background: var(--tape-color, ${theme.mustard});
          opacity: 0.85;
          transform: rotate(-3deg);
          border-radius: 2px;
        }
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
          gap: 16,
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

        <FamilyStrip members={members} currentUserId={currentUserId} />

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

      <main ref={mainRef} style={{ padding: '24px', minWidth: 0, scrollMarginTop: 12 }}>
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

        {/* There is no sidebar any more — every page besides Home is
            reached by tapping its tile on the Home dashboard, and this
            circular house button (top-left of every non-Home page) is
            the one way back. Profile Settings gets its own "onBack"
            inside the page itself instead, since it's reached from the
            header avatar chip rather than a Home tile. */}
        {tab !== 'home' && view === 'tabs' && (
          <button
            type="button"
            className="lh-home-btn"
            onClick={() => selectTab('home')}
            aria-label="Back to Home"
            title="Back to Home"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              marginBottom: 16,
              borderRadius: '50%',
              background: theme.pine,
              color: 'white',
              border: 'none',
              fontSize: 20,
              lineHeight: 1,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(38, 49, 43, 0.25)',
              transition: 'background 0.15s',
            }}
          >
            🏠
          </button>
        )}

        {view === 'profile' ? (
          <div style={cardStyle}>
            <ProfileSettings onBack={() => setView('tabs')} {...profileData} />
          </div>
        ) : tab === 'home' ? (
          <Home onNavigate={selectTab} />
        ) : (
          <div style={CARD_TABS.has(tab) ? cardStyle : undefined}>
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
        )}
      </main>
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
