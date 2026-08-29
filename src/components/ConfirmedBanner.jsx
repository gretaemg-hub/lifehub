import { useAuth } from '../context/AuthContext';
import { theme, headingFont } from '../theme';

// Shown once, right after someone clicks the link in their confirmation
// email — this is the "more obvious that it's gone through" screen
// requested after the earlier email-confirmation debugging. Landing
// straight in the app with no acknowledgment made a successful
// confirmation look identical to an ordinary sign-in, which is exactly
// what caused the confusion in the first place. Renders on whichever
// screen the person lands on next (HouseholdOnboarding for a brand-new
// signup, or the main app if they already belong to a household), and
// dismisses itself the first time it's closed or the underlying auth
// state changes away from "just confirmed."
export default function ConfirmedBanner() {
  const { justConfirmed, dismissJustConfirmed } = useAuth();
  if (!justConfirmed) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        background: theme.successBg,
        border: `1.5px solid ${theme.pine}`,
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 24,
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1 }}>✅</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 18, color: theme.pineDark, marginBottom: 2 }}>
          Email confirmed!
        </div>
        <p style={{ margin: 0, color: theme.ink, fontSize: 14, lineHeight: 1.5 }}>
          Your account is active and you're signed in — you're all set to get started below.
        </p>
      </div>
      <button
        type="button"
        onClick={dismissJustConfirmed}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          color: theme.inkSoft,
          fontSize: 18,
          cursor: 'pointer',
          padding: 4,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
