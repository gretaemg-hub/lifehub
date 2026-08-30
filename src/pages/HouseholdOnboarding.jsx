import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useHousehold } from '../context/HouseholdContext';
import ConfirmedBanner from '../components/ConfirmedBanner';
import { theme, headingFont, bodyFont, inputStyle, primaryButtonStyle } from '../theme';

// The real replacement for "+ Add family member": a brand-new user
// either starts a household (calls create_household()) or joins an
// existing one with a code a member shared with them (calls
// redeem_invite()). Both are Postgres functions defined in
// supabase/migrations/0001_init.sql — see that file for why this
// can't just be a plain INSERT from the client.
export default function HouseholdOnboarding() {
  const { refresh } = useHousehold();
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [displayName, setDisplayName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: rpcError } = await supabase.rpc('create_household', {
      p_name: householdName,
      p_display_name: displayName,
    });
    setBusy(false);
    if (rpcError) setError(rpcError.message);
    else refresh();
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: rpcError } = await supabase.rpc('redeem_invite', {
      p_code: inviteCode.trim(),
      p_display_name: displayName,
    });
    setBusy(false);
    if (rpcError) setError(rpcError.message);
    else refresh();
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.bg,
        fontFamily: bodyFont,
        color: theme.ink,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        .lh-onboard-input::placeholder { color: #9AA79E; }
        .lh-onboard-input:focus {
          outline: none;
          border-color: ${theme.pine} !important;
          box-shadow: 0 0 0 3px rgba(62, 98, 89, 0.15);
        }
        .lh-onboard-submit:not(:disabled):hover { background: ${theme.pineDark} !important; }
        .lh-onboard-switch:not(:disabled) { cursor: pointer; }
      `}</style>

      {/* Green top bar, matching Login and the main app header. */}
      <header
        style={{
          background: theme.pine,
          color: 'white',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 26 }}>🏡</span>
        <div>
          <div style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, letterSpacing: 0.3 }}>
            LifeHub
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            Everything the family needs to remember, in one place
          </div>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 20px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          <ConfirmedBanner />

          <div
            style={{
              background: theme.surface,
              borderRadius: 20,
              boxShadow: '0 10px 30px rgba(38, 49, 43, 0.12)',
              padding: '44px 40px',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>👋</div>
              <h1 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 26, color: theme.pineDark, marginBottom: 6 }}>
                Welcome
              </h1>
              <p style={{ color: theme.inkSoft, fontSize: 15 }}>
                Start a new household, or join one you've been invited to.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 4,
                background: theme.bg,
                borderRadius: 12,
                padding: 4,
                marginBottom: 24,
              }}
            >
              <button
                type="button"
                className="lh-onboard-switch"
                onClick={() => setTab('create')}
                style={{
                  flex: 1,
                  fontFamily: 'inherit',
                  padding: '9px 0',
                  background: tab === 'create' ? theme.surface : 'transparent',
                  color: tab === 'create' ? theme.pineDark : theme.inkSoft,
                  border: 'none',
                  borderRadius: 9,
                  fontWeight: 600,
                  fontSize: 13,
                  boxShadow: tab === 'create' ? '0 2px 6px rgba(38, 49, 43, 0.1)' : 'none',
                }}
              >
                Create household
              </button>
              <button
                type="button"
                className="lh-onboard-switch"
                onClick={() => setTab('join')}
                style={{
                  flex: 1,
                  fontFamily: 'inherit',
                  padding: '9px 0',
                  background: tab === 'join' ? theme.surface : 'transparent',
                  color: tab === 'join' ? theme.pineDark : theme.inkSoft,
                  border: 'none',
                  borderRadius: 9,
                  fontWeight: 600,
                  fontSize: 13,
                  boxShadow: tab === 'join' ? '0 2px 6px rgba(38, 49, 43, 0.1)' : 'none',
                }}
              >
                Join with invite code
              </button>
            </div>

            {tab === 'create' ? (
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.inkSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    Your name
                  </span>
                  <input
                    className="lh-onboard-input"
                    style={inputStyle}
                    placeholder="e.g. Greta"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.inkSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    Household name
                  </span>
                  <input
                    className="lh-onboard-input"
                    style={inputStyle}
                    placeholder="e.g. Greta's House, or The Meiers"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    required
                  />
                </label>
                {error && (
                  <p style={{ color: theme.danger, fontSize: 13, background: theme.dangerBg, borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                    {error}
                  </p>
                )}
                <button className="lh-onboard-submit" type="submit" disabled={busy} style={{ ...primaryButtonStyle, padding: '15px 0', fontSize: 16, opacity: busy ? 0.7 : 1 }}>
                  {busy ? 'Creating…' : 'Create household'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.inkSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    Your name
                  </span>
                  <input
                    className="lh-onboard-input"
                    style={inputStyle}
                    placeholder="e.g. Greta"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.inkSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    Invite code
                  </span>
                  <input
                    className="lh-onboard-input"
                    style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: 1 }}
                    placeholder="e.g. 923LGT"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                  />
                </label>
                {error && (
                  <p style={{ color: theme.danger, fontSize: 13, background: theme.dangerBg, borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                    {error}
                  </p>
                )}
                <button className="lh-onboard-submit" type="submit" disabled={busy} style={{ ...primaryButtonStyle, padding: '15px 0', fontSize: 16, opacity: busy ? 0.7 : 1 }}>
                  {busy ? 'Joining…' : 'Join household'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
