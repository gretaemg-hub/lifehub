import { useState } from 'react';
import { useHouseholdMembers } from './useHouseholdMembers';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../profile/ProfileSettings';
import { theme, headingFont, inputStyle, primaryButtonStyle, secondaryButtonStyle, AVATAR_COLORS } from '../../theme';

// Renamed from a plain "Household" page: the dashboard tile that gets
// you here is "Add Family Members" now, pinned at the top of Home,
// since bringing someone else in is the whole reason to visit. Two
// ways to do that, picked from a dropdown:
//   - Generate an invite code they type in by hand.
//   - Share a family link (the same code, wrapped into this app's own
//     URL as `?invite=CODE`) they can just tap from WhatsApp, Messages,
//     email, wherever. See AuthContext.jsx's pendingInviteCode/
//     redirectUrl for how that code survives sign-up + email
//     confirmation, and HouseholdOnboarding.jsx's simplified "just tell
//     us your name" panel for what greets them on the other end.
// Both methods read from the same household_invites codes — "Generate
// a new link" and "+ Generate invite code" are the same underlying
// action, just surfaced two different ways.
// The member list that used to headline this page (back when it was
// "Household") still lives here, just below the invite section now.
export default function HouseholdSettings() {
  const { members, invites, loading, busy, error, currentUserId, generateInvite } = useHouseholdMembers();
  const { memberships, activeHouseholdId, isCreator, renameHousehold, deleteHousehold } = useHousehold();
  const { demoMode } = useAuth();
  const [inviteMethod, setInviteMethod] = useState('code'); // 'code' | 'link'
  const [copiedCode, setCopiedCode] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const activeHousehold = memberships.find((m) => m.household_id === activeHouseholdId);
  const householdLabel = activeHousehold?.households?.name || 'your household';

  function startEditName() {
    setNameDraft(activeHousehold?.households?.name || '');
    setNameError('');
    setEditingName(true);
  }

  async function saveName() {
    setRenameBusy(true);
    const result = await renameHousehold(nameDraft);
    setRenameBusy(false);
    if (result) {
      setNameError(result);
      return;
    }
    setEditingName(false);
    setNameError('');
  }

  async function handleConfirmDelete() {
    setDeleteBusy(true);
    const result = await deleteHousehold();
    setDeleteBusy(false);
    if (result) {
      setDeleteError(result);
      return;
    }
    // On success there's nothing left to do here — App.jsx notices
    // hasHousehold is now false and renders HouseholdOnboarding on its
    // own, same as right after signing up.
  }

  const activeInvites = invites.filter(
    (i) => i.use_count < i.max_uses && (!i.expires_at || new Date(i.expires_at) > new Date())
  );
  // The family link always points at whichever active code was
  // generated most recently (invites are loaded newest-first).
  const linkInvite = activeInvites[0] || null;
  const familyLink = linkInvite
    ? `${window.location.origin}${import.meta.env.BASE_URL}?invite=${linkInvite.code}`
    : null;

  async function handleCopyCode(code) {
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

  async function handleCopyLink() {
    if (!familyLink) return;
    try {
      await navigator.clipboard.writeText(familyLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch {
      // same fallback as handleCopyCode above
    }
  }

  function handleShareWhatsApp() {
    if (!familyLink) return;
    const message = `Join our family on LifeHub! Tap this link to get set up: ${familyLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  async function handleShareGeneric() {
    if (!familyLink || !navigator.share) return;
    try {
      await navigator.share({ title: 'Join our family on LifeHub', text: 'Tap this link to get set up:', url: familyLink });
    } catch {
      // Cancelled by the user — nothing to do.
    }
  }

  return (
    <section>
      <style>{`
        .lh-hh-generate:not(:disabled):hover { background: ${theme.pineDark} !important; }
        .lh-hh-copy:hover { border-color: ${theme.pine} !important; color: ${theme.pineDark} !important; }
        .lh-hh-select:focus {
          outline: none;
          border-color: ${theme.pine} !important;
          box-shadow: 0 0 0 3px rgba(62, 98, 89, 0.15);
        }
        .lh-hh-whatsapp:hover { background: #1DA851 !important; }
        .lh-hh-manual-link:hover { text-decoration: underline; }
        .lh-hh-rename-btn:hover { color: ${theme.pineDark} !important; }
        .lh-hh-delete-btn:hover { text-decoration: underline; }
      `}</style>

      <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, color: theme.pineDark, margin: '0 0 4px' }}>
        👪 Add Family Members
      </h2>
      <p style={{ color: theme.inkSoft, marginTop: 0, fontSize: 14 }}>Bring someone else into {householdLabel}.</p>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 22, maxWidth: 320 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: theme.inkSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          How do you want to invite them?
        </span>
        <select
          className="lh-hh-select"
          value={inviteMethod}
          onChange={(e) => setInviteMethod(e.target.value)}
          style={{
            fontFamily: 'inherit',
            fontSize: 15,
            padding: '12px 14px',
            borderRadius: 10,
            border: `1.5px solid ${theme.line}`,
            background: theme.surface,
            color: theme.ink,
            cursor: 'pointer',
          }}
        >
          <option value="code">Generate an invite code</option>
          <option value="link">Share a family link</option>
        </select>
      </label>

      {inviteMethod === 'code' ? (
        <div style={{ marginTop: 18 }}>
          <p style={{ color: theme.inkSoft, fontSize: 13, marginTop: 0 }}>
            Generate a code and share it with a family member — they enter it under "Join with invite code" the
            first time they sign in.
          </p>
          <button className="lh-hh-generate" onClick={generateInvite} disabled={busy} style={{ ...primaryButtonStyle, opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Generating…' : '+ Generate invite code'}
          </button>
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
                    onClick={() => handleCopyCode(invite.code)}
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
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <p style={{ color: theme.inkSoft, fontSize: 13, marginTop: 0 }}>
            Share a link instead of a code — whoever taps it goes straight to creating an account, and lands
            directly in {householdLabel} once they're set up. Works great over WhatsApp, Messages, or email.
          </p>
          {!familyLink ? (
            <button className="lh-hh-generate" onClick={generateInvite} disabled={busy} style={{ ...primaryButtonStyle, opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Creating link…' : '+ Create family link'}
            </button>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: theme.surfaceMuted,
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 12,
                }}
              >
                <code style={{ flex: 1, fontSize: 13, color: theme.pineDark, wordBreak: 'break-all' }}>{familyLink}</code>
                <button
                  className="lh-hh-copy"
                  onClick={handleCopyLink}
                  style={{
                    flexShrink: 0,
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
                  {copiedLink ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="lh-hh-whatsapp"
                  type="button"
                  onClick={handleShareWhatsApp}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: 'inherit',
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '11px 18px',
                    background: '#25D366',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  💬 Share via WhatsApp
                </button>
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    type="button"
                    onClick={handleShareGeneric}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 14,
                      fontWeight: 600,
                      padding: '11px 18px',
                      background: 'transparent',
                      color: theme.pine,
                      border: `1.5px solid ${theme.line}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    Share another way…
                  </button>
                )}
              </div>
              <button
                type="button"
                className="lh-hh-manual-link"
                onClick={generateInvite}
                disabled={busy}
                style={{
                  display: 'block',
                  marginTop: 12,
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  background: 'none',
                  border: 'none',
                  color: theme.inkSoft,
                  cursor: busy ? 'default' : 'pointer',
                  padding: 0,
                }}
              >
                {busy ? 'Generating…' : 'Generate a new link'}
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <p style={{ color: theme.danger, fontSize: 13, background: theme.dangerBg, borderRadius: 8, padding: '8px 12px', marginTop: 14 }}>
          {error}
        </p>
      )}

      {demoMode && (
        <p style={{ marginTop: 18, fontSize: 12, color: theme.inkSoft }}>
          🔧 Demo mode — invite codes and links shown here are just for show; nothing is saved or joinable.
        </p>
      )}

      <h3 style={{ fontFamily: headingFont, marginTop: 34, fontSize: 15, fontWeight: 600, color: theme.ink }}>
        Household Settings
      </h3>

      {/* Anyone in the household can rename it — no need to gate
          something this low-stakes to whoever created it. */}
      {editingName ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={nameDraft}
            maxLength={60}
            autoFocus
            onChange={(e) => setNameDraft(e.target.value)}
            style={{ ...inputStyle, padding: '8px 10px', fontSize: 15, width: 220 }}
          />
          <button type="button" onClick={saveName} disabled={renameBusy} style={{ ...primaryButtonStyle, padding: '8px 14px', fontSize: 13 }}>
            {renameBusy ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setEditingName(false)}
            style={{ ...secondaryButtonStyle, padding: '8px 14px', fontSize: 13 }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 15, color: theme.ink, fontWeight: 600 }}>{householdLabel}</span>
          <button
            type="button"
            className="lh-hh-rename-btn"
            onClick={startEditName}
            title="Rename household"
            style={{ background: 'none', border: 'none', color: theme.inkSoft, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
          >
            ✎
          </button>
        </div>
      )}
      {nameError && <p style={{ color: theme.danger, fontSize: 12, marginTop: 6 }}>{nameError}</p>}

      {/* Deleting the household is the one action gated to whoever
          created it — see delete_household() in
          0004_household_rename_delete.sql, which enforces this
          server-side too, not just by hiding the button here. */}
      {isCreator && (
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="lh-hh-delete-btn"
            onClick={() => {
              setConfirmingDelete((v) => !v);
              setDeleteError('');
            }}
            style={{ background: 'none', border: 'none', color: theme.danger, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            🗑️ Delete family
          </button>
          {confirmingDelete && (
            <div style={{ marginTop: 10, padding: '14px 16px', background: theme.surfaceMuted, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ color: theme.danger, fontSize: 13, background: theme.dangerBg, borderRadius: 8, padding: '10px 12px', margin: 0 }}>
                {demoMode
                  ? "This exits demo mode — there's no real household here to delete."
                  : `This permanently deletes ${householdLabel} and everything shared in it — the shopping list, family calendar, birthdays, wishlist, homework, and meal plan — for every member. Personal data (notes, fitness log, your own calendar) isn't affected. Everyone, including you, will need to create or join a new household afterward. This can't be undone.`}
              </p>
              {deleteError && <p style={{ color: theme.danger, fontSize: 12, margin: 0 }}>{deleteError}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  style={{ ...secondaryButtonStyle, padding: '9px 16px', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteBusy}
                  style={{ ...primaryButtonStyle, padding: '9px 16px', fontSize: 13, background: theme.danger }}
                >
                  {deleteBusy ? 'Deleting…' : demoMode ? 'Yes, exit demo' : 'Yes, delete family'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <h3 style={{ fontFamily: headingFont, marginTop: 34, fontSize: 15, fontWeight: 600, color: theme.ink }}>Members</h3>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
