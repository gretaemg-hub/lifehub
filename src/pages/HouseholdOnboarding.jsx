import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useHousehold } from '../context/HouseholdContext';

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
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>Welcome 👋</h1>
      <p style={{ color: '#5B6960', marginBottom: 24 }}>
        Start a new household, or join one you've been invited to.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('create')} disabled={tab === 'create'}>Create household</button>
        <button onClick={() => setTab('join')} disabled={tab === 'join'}>Join with invite code</button>
      </div>

      {tab === 'create' ? (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          <input placeholder="Household name (e.g. The Meiers)" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} required />
          {error && <p style={{ color: '#C0392B', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create household'}</button>
        </form>
      ) : (
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          <input placeholder="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
          {error && <p style={{ color: '#C0392B', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join household'}</button>
        </form>
      )}
    </div>
  );
}
