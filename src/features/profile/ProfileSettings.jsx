import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { theme, headingFont, inputStyle, primaryButtonStyle, secondaryButtonStyle, AVATAR_COLORS } from '../../theme';

// Small reusable circle: a photo if the member has one, otherwise their
// first initial on their chosen (or default) avatar color. Exported so
// App.jsx's header chip and HouseholdSettings.jsx's member list can
// render the exact same avatar a person set here, instead of each
// screen inventing its own fallback.
export function Avatar({ name, color, url, size = 40, fontSize }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color || AVATAR_COLORS[0],
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: fontSize || Math.round(size * 0.42),
        fontWeight: 700,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
    </span>
  );
}

// The real app's equivalent of the friends-demo's "Your Profile" screen
// — reached the same way (click your own avatar), with the same
// options: pick a color or a photo, rename yourself, change your
// password, log out, or delete your account for good.
//
// Takes its data/actions as props (a single useProfile() call, owned by
// App.jsx) rather than calling useProfile() itself — App.jsx's header
// chip needs the same profile to render your avatar/name next to it,
// and a second independent hook instance here would drift out of sync
// with it the moment something changes (e.g. renaming yourself would
// update this page but leave the header showing your old name).
export default function ProfileSettings({
  onBack,
  profile,
  email,
  loading,
  busy,
  isDemo,
  updateDisplayName,
  updateAvatarColor,
  uploadAvatar,
  changePassword,
  deleteAccount,
}) {
  const { signOut } = useAuth();

  const [editingIcon, setEditingIcon] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);

  if (loading || !profile) {
    return <p style={{ color: theme.inkSoft }}>Loading…</p>;
  }

  function startEditUsername() {
    setUsernameDraft(profile.display_name || '');
    setUsernameError('');
    setEditingUsername(true);
  }

  async function saveUsername() {
    const result = await updateDisplayName(usernameDraft);
    if (result) {
      setUsernameError(result);
      return;
    }
    setEditingUsername(false);
    setUsernameError('');
  }

  async function pickColor(color) {
    await updateAvatarColor(color);
  }

  async function handleFileChosen(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setPhotoSheetOpen(false);
    setAvatarError('');
    const result = await uploadAvatar(file);
    if (result) setAvatarError(result);
    else setEditingIcon(false);
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      setPasswordError("New passwords don't match.");
      return;
    }
    const result = await changePassword(currentPassword, newPassword);
    if (result) {
      setPasswordError(result);
      return;
    }
    setChangingPassword(false);
    setPasswordError('');
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
  }

  async function handleConfirmDelete() {
    setDeleteError('');
    const result = await deleteAccount();
    if (result) setDeleteError(result);
    // On success the session is gone and AuthContext/App.jsx will drop
    // straight back to the Login screen on their own — nothing else to
    // do here.
  }

  const settingsRowStyle = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '13px 16px',
    border: 'none',
    borderTop: `1px solid ${theme.line}`,
    background: theme.surface,
    fontFamily: 'inherit',
    fontSize: 14,
    color: theme.ink,
    cursor: 'pointer',
  };

  const confirmPanelStyle = {
    padding: '14px 16px',
    borderTop: `1px solid ${theme.line}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };

  return (
    <section>
      <style>{`
        .lh-profile-back:hover { color: ${theme.pineDark} !important; }
        .lh-profile-swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; flex-shrink: 0; padding: 0; }
        .lh-profile-swatch.selected { border-color: ${theme.ink}; box-shadow: 0 0 0 2px ${theme.surface}; }
        .lh-profile-camera-btn:hover { background: ${theme.surfaceMuted} !important; }
        .lh-profile-row:hover { background: ${theme.surfaceMuted} !important; }
        .lh-profile-input:focus { outline: none; border-color: ${theme.pine} !important; box-shadow: 0 0 0 3px rgba(62, 98, 89, 0.15); }
      `}</style>

      <button
        type="button"
        className="lh-profile-back"
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          fontFamily: 'inherit',
          color: theme.inkSoft,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 18,
        }}
      >
        ‹ Back to Home
      </button>

      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setEditingIcon((v) => !v)}
            style={{
              position: 'relative',
              width: 96,
              height: 96,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: 6,
            }}
          >
            <Avatar name={profile.display_name} color={profile.avatar_color} url={profile.avatar_url} size={96} fontSize={34} />
            <span
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: theme.surface,
                border: `1px solid ${theme.line}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                color: theme.inkSoft,
              }}
            >
              ✎
            </span>
          </button>

          {editingIcon && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: -4 }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 8,
                  background: theme.surfaceMuted,
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`lh-profile-swatch${profile.avatar_color === c ? ' selected' : ''}`}
                    style={{ background: c }}
                    title="Use this color"
                    disabled={busy}
                    onClick={() => pickColor(c)}
                  />
                ))}
                <button
                  type="button"
                  className="lh-profile-camera-btn"
                  title="Add a photo"
                  onClick={() => setPhotoSheetOpen(true)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: theme.surface,
                    border: `1px solid ${theme.line}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  📷
                </button>
              </div>
            </div>
          )}
          {avatarError && <p style={{ color: theme.danger, fontSize: 12, margin: 0 }}>{avatarError}</p>}

          {editingUsername ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <input
                className="lh-profile-input"
                type="text"
                value={usernameDraft}
                maxLength={30}
                autoFocus
                onChange={(e) => setUsernameDraft(e.target.value)}
                style={{ ...inputStyle, padding: '8px 10px', fontSize: 15, width: 160 }}
              />
              <button type="button" onClick={saveUsername} disabled={busy} style={{ ...primaryButtonStyle, padding: '8px 14px', fontSize: 13 }}>
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingUsername(false)}
                style={{ ...secondaryButtonStyle, padding: '8px 14px', fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <h2 style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 22, color: theme.ink, margin: 0 }}>
                {profile.display_name}
              </h2>
              <button
                type="button"
                onClick={startEditUsername}
                title="Edit username"
                style={{ background: 'none', border: 'none', color: theme.inkSoft, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
              >
                ✎
              </button>
            </div>
          )}
          {usernameError && <p style={{ color: theme.danger, fontSize: 12, margin: 0 }}>{usernameError}</p>}

          <div style={{ fontSize: 13, color: theme.inkSoft }}>{email}</div>
        </div>

        {/* Account settings */}
        <div style={{ background: theme.surface, border: `1px solid ${theme.line}`, borderRadius: 14, overflow: 'hidden' }}>
          <h3
            style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: theme.inkSoft,
              margin: 0,
              padding: '12px 16px 6px',
            }}
          >
            Account Settings
          </h3>

          <button
            type="button"
            className="lh-profile-row"
            onClick={() => {
              setChangingPassword((v) => !v);
              setPasswordError('');
            }}
            style={settingsRowStyle}
          >
            🔒 Change password
          </button>
          {changingPassword && (
            <div style={confirmPanelStyle}>
              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 13, color: theme.inkSoft, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Current password
                  <input
                    className="lh-profile-input"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </label>
                <label style={{ fontSize: 13, color: theme.inkSoft, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  New password
                  <input
                    className="lh-profile-input"
                    type="password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </label>
                <label style={{ fontSize: 13, color: theme.inkSoft, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Confirm new password
                  <input
                    className="lh-profile-input"
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </label>
                {passwordError && <p style={{ color: theme.danger, fontSize: 12, margin: 0 }}>{passwordError}</p>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setChangingPassword(false)}
                    style={{ ...secondaryButtonStyle, padding: '9px 16px', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={busy} style={{ ...primaryButtonStyle, padding: '9px 16px', fontSize: 13 }}>
                    Save password
                  </button>
                </div>
              </form>
            </div>
          )}

          <button type="button" className="lh-profile-row" onClick={signOut} style={settingsRowStyle}>
            🚪 Log out
          </button>

          <button
            type="button"
            className="lh-profile-row"
            onClick={() => {
              setConfirmingDelete((v) => !v);
              setDeleteError('');
            }}
            style={{ ...settingsRowStyle, color: theme.danger }}
          >
            🗑️ Delete account
          </button>
          {confirmingDelete && (
            <div style={confirmPanelStyle}>
              <p style={{ color: theme.danger, fontSize: 13, background: theme.dangerBg, borderRadius: 8, padding: '10px 12px', margin: 0 }}>
                {isDemo
                  ? 'This exits demo mode — there is no real account here to delete.'
                  : "This deletes your account and all of your personal data — profile, notes, fitness log, workout plan, personal calendar events, and wishlist items. Anything you added to shared household lists stays, but is no longer attributed to you. This can't be undone."}
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
                  disabled={busy}
                  style={{ ...primaryButtonStyle, padding: '9px 16px', fontSize: 13, background: theme.danger }}
                >
                  {isDemo ? 'Yes, exit demo' : 'Yes, delete my account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {photoSheetOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPhotoSheetOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(38, 49, 43, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
        >
          <div style={{ background: theme.surface, borderRadius: 16, padding: 22, width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontFamily: headingFont, margin: 0, fontSize: 17, color: theme.ink }}>Add a profile picture</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: `1.5px solid ${theme.line}`,
                  background: theme.surfaceMuted,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 20 }}>📷</span>
                <span>
                  <div style={{ fontWeight: 600, fontSize: 14, color: theme.ink }}>Take Photo</div>
                  <div style={{ fontSize: 12, color: theme.inkSoft }}>Use your camera</div>
                </span>
              </button>
              <button
                type="button"
                onClick={() => libraryInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: `1.5px solid ${theme.line}`,
                  background: theme.surfaceMuted,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 20 }}>🖼️</span>
                <span>
                  <div style={{ fontWeight: 600, fontSize: 14, color: theme.ink }}>Choose from Library</div>
                  <div style={{ fontSize: 12, color: theme.inkSoft }}>Pick an existing photo</div>
                </span>
              </button>
            </div>
            <button type="button" onClick={() => setPhotoSheetOpen(false)} style={{ ...secondaryButtonStyle, alignSelf: 'center' }}>
              Cancel
            </button>
            {/* Native file inputs: the browser itself prompts for camera/photo-
                library permission the first time each is used — no custom
                permission UI needed here. */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleFileChosen} />
            <input ref={libraryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChosen} />
          </div>
        </div>
      )}
    </section>
  );
}
