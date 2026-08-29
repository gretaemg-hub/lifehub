import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

// Supabase's rate-limit error reads like "For security purposes, you can
// only request this after 56 seconds." — pull the seconds out so we can
// run our own countdown instead of just repeating the raw error text.
function secondsFromRateLimitMessage(message) {
  const match = /(\d+)\s*seconds?/i.exec(message || '');
  return match ? parseInt(match[1], 10) : null;
}

export default function Login() {
  const { signIn, signUp, resendConfirmation, configured, enterDemoMode } = useAuth();
  const [mode, setMode] = useState('sign-in'); // 'sign-in' | 'sign-up'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Once sign-up succeeds, we stop showing the form entirely and show a
  // "check your email" screen instead — this is that screen's state.
  const [confirmationEmail, setConfirmationEmail] = useState(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState(null); // { type: 'success' | 'error', text }
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("This is a preview build — sign-in isn't connected to a real backend yet. Try the demo below instead.");
      return;
    }
    setBusy(true);
    if (mode === 'sign-up') {
      const { data, error: authError } = await signUp(email, password);
      setBusy(false);
      if (authError) {
        setError(authError.message);
        return;
      }
      // No session back yet means email confirmation is required (the
      // normal case) — show the "check your email" screen. If Supabase
      // ever returns a session directly, AuthContext picks it up and the
      // app navigates away from Login on its own.
      if (!data?.session) {
        setConfirmationEmail(email);
      }
      return;
    }
    const { error: authError } = await signIn(email, password);
    setBusy(false);
    if (authError) setError(authError.message);
  }

  async function handleResend() {
    if (!confirmationEmail || resendBusy || cooldown > 0) return;
    setResendBusy(true);
    setResendMessage(null);
    const { error: resendError } = await resendConfirmation(confirmationEmail);
    setResendBusy(false);
    if (resendError) {
      const waitSeconds = secondsFromRateLimitMessage(resendError.message);
      if (waitSeconds) setCooldown(waitSeconds);
      setResendMessage({ type: 'error', text: resendError.message });
      return;
    }
    setResendMessage({ type: 'success', text: 'Sent! Check your inbox (and spam folder) for the new link.' });
    setCooldown(60);
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
        .lh-login-resend:not(:disabled):hover { border-color: ${theme.pine} !important; color: ${theme.pineDark} !important; }
        .lh-login-back:hover { text-decoration: underline; }
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

      {/* Centered, larger card */}
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
          {confirmationEmail ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>📬</div>
                <h1
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 600,
                    fontSize: 26,
                    color: theme.pineDark,
                    marginBottom: 6,
                  }}
                >
                  Check your email
                </h1>
                <p style={{ color: theme.inkSoft, fontSize: 15, lineHeight: 1.5 }}>
                  We sent a confirmation link to<br />
                  <strong style={{ color: theme.ink }}>{confirmationEmail}</strong>.<br />
                  Click it to finish setting up your account.
                </p>
              </div>

              {resendMessage && (
                <p
                  style={{
                    fontSize: 13,
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginTop: 18,
                    color: resendMessage.type === 'success' ? '#2A453D' : '#C0392B',
                    background: resendMessage.type === 'success' ? '#EAF3EE' : '#FBEAEA',
                  }}
                >
                  {resendMessage.text}
                </p>
              )}

              <button
                type="button"
                className="lh-login-resend"
                onClick={handleResend}
                disabled={resendBusy || cooldown > 0}
                style={{
                  marginTop: 18,
                  width: '100%',
                  padding: '13px 0',
                  background: 'transparent',
                  color: theme.pine,
                  border: `1.5px solid ${theme.line}`,
                  borderRadius: 12,
                  cursor: resendBusy || cooldown > 0 ? 'default' : 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  opacity: resendBusy ? 0.7 : 1,
                  transition: 'border-color 0.15s, color 0.15s',
                }}
              >
                {resendBusy
                  ? 'Sending…'
                  : cooldown > 0
                  ? `Resend email (wait ${cooldown}s)`
                  : "Didn't get it? Resend email"}
              </button>

              <button
                type="button"
                className="lh-login-back"
                onClick={() => {
                  setConfirmationEmail(null);
                  setResendMessage(null);
                  setCooldown(0);
                  setMode('sign-in');
                }}
                style={{
                  display: 'block',
                  margin: '18px auto 0',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  background: 'none',
                  border: 'none',
                  color: theme.inkSoft,
                  cursor: 'pointer',
                }}
              >
                ← Back to sign in
              </button>
            </>
          ) : (
            <>
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
                onClick={() => {
                  setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                  setError(null);
                }}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
