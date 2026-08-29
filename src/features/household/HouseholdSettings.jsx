import { useState } from 'react';
import { useHouseholdMembers } from './useHouseholdMembers';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../profile/ProfileSettings';
import { theme, headingFont, primaryButtonStyle, AVATAR_COLORS } from '../../theme';

// Two things a household needs once it exists: see who's in it, and
// bring someone else in. Onboarding already covers "join with a
// code" for the person joining — this is the missing other end,
// generating that code in the first place. Renders inside the themed
// card App.jsx already wraps every tab in.
export default function HouseholdSettings() {
  const { members, invites, loading, busy, error, currentUserId, generateInvite } = useHouseholdMembers();
  const { memberships, activeHouseholdId } = useHousehold();
  const { demoMode } = useAuth();
  const [copiedCode, setCopiedCode] = useState(null);

  const activeHousehold = memberships.find((m) => m.household_id === activeHouseholdId);

  async function handleCopy(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 1500);
    } catch {
      // Clipboard permission can be denied or unavailable — the code is
      // already right there on screen to copy by hand, so this just
      // silently skips the "Copied ✓" confirmation.
    }
  }

  const activeInvites = invites.filter(
    (i) => i.use_count < i.max_uses && (!i.expires_at || new Date(i.expires_at) > new Date())
  );

  return (
    <section>
      <style>{`
        .lh-hh-generate:not(:disabled):hover { background: ${theme.pineDark} !important; }
        .lh-hh-copy:hover { border-color: ${theme.pine} !important; color: ${theme.pineDark} !important; }
      `}</style>

      <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, color: theme.pineDark, margin: '0 0 4px' }}>
        🏠 {activeHousehold?.households?.name || 'Household'}
      </h2>
      <p style={{ color: theme.inkSoft, marginTop: 0, fontSize: 14 }}>See who's here, and invite someone new to join.</p>

      <h3 style={{ fontFamily: headingFont, marginTop: 26, fontSize: 15, fontWeight: 600, color: theme.ink }}>Members</h3>
      {loading ? (
        <p style={{ color: theme.inkSoft }}>Loading…</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {members.map((m, i) => (
            <li
              key={m.id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${theme.line}` }}
            >
              <Avatar
                name={m.display_name}
                color={m.avatar_color || AVATAR_COLORS[i % AVATAR_COLORS.length]}
                url={m.avatar_url}
                size={30}
                fontSize={13}
              />
              <span style={{ flex: 1 }}>
                {m.display_name}
                {m.user_id === currentUserId && <span style={{ color: theme.inkSoft, fontSize: 12 }}> (you)</span>}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: theme.inkSoft,
                  textTransform: 'capitalize',
                  background: theme.surfaceMuted,
                  borderRadius: 6,
                  padding: '3px 9px',
                }}
              >
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ fontFamily: headingFont, marginTop: 26, fontSize: 15, fontWeight: 600, color: theme.ink }}>Invite someone</h3>
      <p style={{ color: theme.inkSoft, fontSize: 13, marginTop: 4 }}>
        Generate a code and share it with a family member — they enter it under "Join with invite code" the first
        time they sign in.
      </p>
      <button className="lh-hh-generate" onClick={generateInvite} disabled={busy} style={{ ...primaryButtonStyle, opacity: busy ? 0.7 : 1 }}>
        {busy ? 'Generating…' : '+ Generate invite code'}
      </button>
      {error && (
        <p style={{ color: theme.danger, fontSize: 13, background: theme.dangerBg, borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>
          {error}
        </p>
      )}

      {activeInvites.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
          {activeInvites.map((invite) => (
            <li
              key={invite.id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${theme.line}` }}
            >
              <code
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: theme.pineDark,
                  background: theme.surfaceMuted,
                  padding: '5px 12px',
                  borderRadius: 8,
                }}
              >
                {invite.code}
              </code>
              <button
                className="lh-hh-copy"
                onClick={() => handleCopy(invite.code)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '7px 12px',
                  background: 'transparent',
                  color: theme.pine,
                  border: `1.5px solid ${theme.line}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {copiedCode === invite.code ? 'Copied ✓' : 'Copy'}
              </button>
              <span style={{ fontSize: 12, color: theme.inkSoft, marginLeft: 'auto' }}>
                {invite.use_count}/{invite.max_uses} used
              </span>
            </li>
          ))}
        </ul>
      )}

      {demoMode && (
        <p style={{ marginTop: 18, fontSize: 12, color: theme.inkSoft }}>
          🔧 Demo mode — invite codes shown here are just for show; nothing is saved or joinable.
        </p>
      )}
    </section>
  );
}
