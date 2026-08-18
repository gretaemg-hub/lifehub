import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('sign-in'); // 'sign-in' | 'sign-up'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const action = mode === 'sign-in' ? signIn : signUp;
    const { error: authError } = await action(email, password);
    setBusy(false);
    if (authError) setError(authError.message);
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>🏡 LifeHub</h1>
      <p style={{ color: '#5B6960', marginBottom: 24 }}>
        {mode === 'sign-in' ? 'Sign in to your household.' : 'Create your account.'}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {error && <p style={{ color: '#C0392B', fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        style={{ marginTop: 16, fontSize: 13, background: 'none', border: 'none', color: '#3E6259', cursor: 'pointer' }}
      >
        {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
