import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Warm, homey palette — matches the demo build so the real app doesn't
// feel like a different, more clinical product once people switch over.
const theme = {
  bg: '#EEF1E7',
  surface: '#FFFFFF',
  ink: '#26312B',
  inkSoft: '#5B6960',
  pine: '#3E6259',
  pineDark: '#2A453D',
  mustard: '#D9A441',
  line: '#DDE3D6',
};

export default function Login() {
  const { signIn, signUp, configured, enterDemoMode } = useAuth();
  const [mode, setMode] = useState('sign-in'); // 'sign-in' | 'sign-up'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("This is a preview build — sign-in isn't connected to a real backend yet. Try the demo below instead.");
      return;
    }
    setBusy(true);
    const action = mode === 'sign-in' ? signIn : signUp;
    const { error: authError } = await action(email, password);
    setBusy(false);
    if (authError) setError(authError.message);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.bg,
        fontFamily: "'Inter', sans-serif",
        color: theme.ink,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        .lh-login-input::placeholder { color: #9AA79E; }
        .lh-login-input:focus {
          outline: none;
          border-color: ${theme.pine} !important;
          box-shadow: 0 0 0 3px rgba(62, 98, 89, 0.15);
        }
        .lh-login-submit:not(:disabled):hover { background: ${theme.pineDark} !important; }
        .lh-login-toggle:hover { text-decoration: underline; }
        .lh-login-demo:not(:disabled):hover { background: #C4933A !important; }
      `}</style>

      {/* Green top bar, matching the demo's header */}
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
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 22, letterSpacing: 0.3 }}>
            LifeHub
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            Everything the family needs to remember, in one place
          </div>
        </div>
      </header>

      {/* Centered, larger sign-in card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 20px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            background: theme.surface,
            borderRadius: 20,
            boxShadow: '0 10px 30px rgba(38, 49, 43, 0.12)',
            padding: '44px 40px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>{mode === 'sign-in' ? '👋' : '🌱'}</div>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 600,
                fontSize: 26,
                color: theme.pineDark,
                marginBottom: 6,
              }}
            >
              {mode === 'sign-in' ? 'Welcome home' : 'Join your household'}
            </h1>
            <p style={{ color: theme.inkSoft, fontSize: 15 }}>
              {mode === 'sign-in' ? 'Sign in to your household.' : 'Create your account to get started.'}
            </p>
          </div>

          {!configured && (
            <div
              style={{
                background: '#FFF6E0',
                border: '1px solid #E8D8A6',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 22,
                fontSize: 13,
                color: '#6B5A1E',
              }}
            >
              🔧 <strong>Preview build</strong> — no backend is connected yet, so real sign-in won't work. Click
              "Try the demo" below to look around with sample data instead.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.inkSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Email
              </span>
              <input
                className="lh-login-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  fontFamily: 'inherit',
                  fontSize: 16,
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: `1.5px solid ${theme.line}`,
                  background: theme.bg,
                  color: theme.ink,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.inkSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Password
              </span>
              <input
                className="lh-login-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 16,
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: `1.5px solid ${theme.line}`,
                  background: theme.bg,
                  color: theme.ink,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
            </label>

            {error && (
              <p style={{ color: '#C0392B', fontSize: 13, background: '#FBEAEA', borderRadius: 8, padding: '8px 12px' }}>
                {error}
              </p>
            )}

            <button
              className="lh-login-submit"
              type="submit"
              disabled={busy}
              style={{
                fontFamily: 'inherit',
                marginTop: 6,
                padding: '15px 0',
                background: theme.pine,
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: busy ? 'default' : 'pointer',
                fontSize: 16,
                fontWeight: 600,
                opacity: busy ? 0.7 : 1,
                transition: 'background 0.15s',
              }}
            >
              {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
            </button>
          </form>

          <button
            type="button"
            className="lh-login-toggle"
            onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            style={{
              display: 'block',
              margin: '18px auto 0',
              fontFamily: 'inherit',
              fontSize: 13,
              background: 'none',
              border: 'none',
              color: theme.pine,
              cursor: 'pointer',
            }}
          >
            {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>

          {!configured && (
            <button
              type="button"
              className="lh-login-demo"
              onClick={enterDemoMode}
              style={{
                marginTop: 24,
                width: '100%',
                padding: '13px 0',
                background: theme.mustard,
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
            >
              👀 Try the demo (no sign-in required)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
