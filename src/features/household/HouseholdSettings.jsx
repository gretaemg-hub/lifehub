import { useState } from 'react';
import { useHouseholdMembers } from './useHouseholdMembers';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';

// Two things a household needs once it exists: see who's in it, and
// bring someone else in. Onboarding already covers "join with a
// code" for the person joining — this is the missing other end,
// generating that code in the first place.
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
      <h2>🏠 {activeHousehold?.households?.name || 'Household'}</h2>
      <p style={{ color: '#5B6960' }}>See who's here, and invite someone new to join.</p>

      <h3 style={{ marginTop: 24, fontSize: 15 }}>Members</h3>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {members.map((m) => (
            <li
              key={m.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #DDE3D6' }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#3E6259',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {(m.display_name || '?').charAt(0).toUpperCase()}
              </span>
              <span style={{ flex: 1 }}>
                {m.display_name}
                {m.user_id === currentUserId && <span style={{ color: '#5B6960', fontSize: 12 }}> (you)</span>}
              </span>
              <span style={{ fontSize: 12, color: '#5B6960', textTransform: 'capitalize' }}>{m.role}</span>
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ marginTop: 24, fontSize: 15 }}>Invite someone</h3>
      <p style={{ color: '#5B6960', fontSize: 13 }}>
        Generate a code and share it with a family member — they enter it under "Join with invite code" the first
        time they sign in.
      </p>
      <button onClick={generateInvite} disabled={busy}>
        {busy ? 'Generating…' : '+ Generate invite code'}
      </button>
      {error && <p style={{ color: '#C0392B', fontSize: 13 }}>{error}</p>}

      {activeInvites.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
          {activeInvites.map((invite) => (
            <li
              key={invite.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #DDE3D6' }}
            >
              <code
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 1,
                  background: '#F7F5EE',
                  padding: '4px 10px',
                  borderRadius: 4,
                }}
              >
                {invite.code}
              </code>
              <button onClick={() => handleCopy(invite.code)} style={{ fontSize: 12 }}>
                {copiedCode === invite.code ? 'Copied ✓' : 'Copy'}
              </button>
              <span style={{ fontSize: 12, color: '#5B6960', marginLeft: 'auto' }}>
                {invite.use_count}/{invite.max_uses} used
              </span>
            </li>
          ))}
        </ul>
      )}

      {demoMode && (
        <p style={{ marginTop: 16, fontSize: 12, color: '#5B6960' }}>
          🔧 Demo mode — invite codes shown here are just for show; nothing is saved or joinable.
        </p>
      )}
    </section>
  );
}
