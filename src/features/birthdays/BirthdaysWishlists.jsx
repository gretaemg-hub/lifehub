import { useMemo, useState } from 'react';
import { useBirthdays } from './useBirthdays';
import { useWishlist } from './useWishlist';
import { useHouseholdMembers } from '../household/useHouseholdMembers';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../profile/ProfileSettings';
import { nextBirthdayOccurrence, formatDateChip } from '../calendar/calendarUtils';
import { theme, headingFont, inputStyle, primaryButtonStyle } from '../../theme';

// Birthdays + Family Wishlists, as one tab with a subtab row —
// exactly the friends-demo's pairing (Birthdays' own subtab strip:
// "Birthdays" / "🎁 Family Wishlists", demo/index.html ~line 2200).
// Birthdays here is read-only: the only way to add or remove one is
// ticking/unticking "This is a birthday" on a Family Calendar event
// (see CalendarView.jsx + useBirthdays.js) — this panel just lists
// whatever that syncing has produced, soonest-first.
export default function BirthdaysWishlists() {
  const [subtab, setSubtab] = useState('birthdays'); // 'birthdays' | 'wishlists'
  const { birthdays, loading: birthdaysLoading } = useBirthdays();
  const { members } = useHouseholdMembers();
  const { items, loading: wishlistLoading, error, currentUserId, addItem, deleteItem, reserveItem, unreserveItem } = useWishlist();
  const { demoMode } = useAuth();
  const [drafts, setDrafts] = useState({}); // memberId -> in-progress add-item text

  const sortedBirthdays = useMemo(
    () => [...birthdays].sort((a, b) => nextBirthdayOccurrence(a.date).occurrence - nextBirthdayOccurrence(b.date).occurrence),
    [birthdays]
  );

  const orderedMembers = useMemo(
    () => [...members].sort((a, b) => (a.user_id === currentUserId ? -1 : b.user_id === currentUserId ? 1 : 0)),
    [members, currentUserId]
  );

  async function handleAdd(memberId) {
    const text = (drafts[memberId] || '').trim();
    if (!text) return;
    await addItem(text);
    setDrafts((d) => ({ ...d, [memberId]: '' }));
  }

  return (
    <section>
      <style>{`
        .lh-subtab:hover { color: ${theme.pineDark} !important; }
        .lh-wish-input:focus { outline: none; border-color: ${theme.pine} !important; box-shadow: 0 0 0 3px rgba(62, 98, 89, 0.15); }
        .lh-wish-reserve:hover { background: ${theme.pineDark} !important; }
        .lh-wish-delete:hover { color: ${theme.danger} !important; }
      `}</style>

      <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, color: theme.pineDark, margin: '0 0 4px' }}>
        🎂 Birthdays &amp; Wishlists
      </h2>
      <p style={{ color: theme.inkSoft, marginTop: 0, marginBottom: 18, fontSize: 14 }}>
        Birthdays linked from the Family Calendar, and what everyone's hoping for.
      </p>

      <div style={{ display: 'flex', gap: 18, borderBottom: `1.5px solid ${theme.line}`, marginBottom: 18 }}>
        {[
          { key: 'birthdays', label: 'Birthdays' },
          { key: 'wishlists', label: '🎁 Family Wishlists' },
        ].map((t) => (
          <button
            key={t.key}
            className="lh-subtab"
            onClick={() => setSubtab(t.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: subtab === t.key ? `2px solid ${theme.pine}` : '2px solid transparent',
              marginBottom: -1.5,
              padding: '8px 2px',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: subtab === t.key ? 700 : 500,
              color: subtab === t.key ? theme.pineDark : theme.inkSoft,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subtab === 'birthdays' ? (
        birthdaysLoading ? (
          <p style={{ color: theme.inkSoft }}>Loading…</p>
        ) : sortedBirthdays.length === 0 ? (
          <p style={{ color: theme.inkSoft, fontSize: 13 }}>
            No birthdays yet. Add one from the Family Calendar by ticking "This is a birthday" on an event.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sortedBirthdays.map((b) => {
              const { occurrence, turningAge } = nextBirthdayOccurrence(b.date);
              const dateLabel = formatDateChip(
                `${occurrence.getFullYear()}-${String(occurrence.getMonth() + 1).padStart(2, '0')}-${String(occurrence.getDate()).padStart(2, '0')}`
              );
              return (
                <li
                  key={b.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${theme.line}` }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: theme.pineDark,
                      background: theme.surfaceMuted,
                      borderRadius: 8,
                      padding: '4px 10px',
                      flexShrink: 0,
                    }}
                  >
                    {dateLabel}
                  </span>
                  <span style={{ flex: 1 }}>
                    🎂 {b.name}
                    {turningAge > 0 && <span style={{ color: theme.inkSoft, fontSize: 12 }}> · turning {turningAge}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <>
          {error && (
            <p style={{ color: theme.danger, fontSize: 13, background: theme.dangerBg, borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
              {error}
            </p>
          )}
          {wishlistLoading ? (
            <p style={{ color: theme.inkSoft }}>Loading…</p>
          ) : orderedMembers.length === 0 ? (
            <p style={{ color: theme.inkSoft, fontSize: 13 }}>No family members yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {orderedMembers.map((member) => {
                const isOwner = member.user_id === currentUserId;
                const memberItems = items.filter((it) => it.owner_user_id === member.user_id);
                return (
                  <div
                    key={member.id}
                    style={{ background: theme.surface, border: `1px solid ${theme.line}`, borderRadius: 14, padding: 16 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Avatar name={member.display_name} color={member.avatar_color} url={member.avatar_url} size={26} fontSize={12} />
                      <strong style={{ fontFamily: headingFont, fontSize: 15, color: theme.ink }}>
                        🎁 {isOwner ? 'My Wishlist' : `${member.display_name}'s Wishlist`}
                      </strong>
                      {isOwner && (
                        <span
                          style={{
                            fontSize: 11,
                            color: theme.inkSoft,
                            background: theme.surfaceMuted,
                            borderRadius: 6,
                            padding: '2px 8px',
                            marginLeft: 4,
                          }}
                        >
                          Yours — reservations hidden from you
                        </span>
                      )}
                    </div>

                    {memberItems.length === 0 ? (
                      <p style={{ color: theme.inkSoft, fontSize: 13, margin: '0 0 10px' }}>
                        {isOwner ? "You haven't added anything yet." : `${member.display_name} hasn't added anything yet.`}
                      </p>
                    ) : (
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px' }}>
                        {memberItems.map((item) => (
                          <li
                            key={item.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${theme.line}` }}
                          >
                            <span style={{ flex: 1, fontSize: 14 }}>{item.text}</span>
                            {isOwner ? (
                              <button
                                className="lh-wish-delete"
                                onClick={() => deleteItem(item.id)}
                                title="Remove"
                                style={{ background: 'none', border: 'none', color: theme.inkFaint, cursor: 'pointer', fontSize: 14 }}
                              >
                                ✕
                              </button>
                            ) : !item.reserved_by ? (
                              <button
                                className="lh-wish-reserve"
                                onClick={() => reserveItem(item.id)}
                                style={{ ...primaryButtonStyle, padding: '6px 12px', fontSize: 12 }}
                              >
                                Reserve
                              </button>
                            ) : item.reserved_by === currentUserId ? (
                              <button
                                onClick={() => unreserveItem(item.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  borderRadius: 10,
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: theme.successBg,
                                  color: theme.pineDark,
                                }}
                              >
                                ✓ You're getting this
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, color: theme.inkSoft, fontStyle: 'italic' }}>
                                Reserved by {members.find((m) => m.user_id === item.reserved_by)?.display_name || 'Someone'}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {isOwner && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="lh-wish-input"
                          type="text"
                          placeholder="Add something you'd like…"
                          value={drafts[member.id] || ''}
                          onChange={(e) => setDrafts((d) => ({ ...d, [member.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAdd(member.id)}
                          style={{ ...inputStyle, flex: 1, padding: '9px 12px', fontSize: 13 }}
                        />
                        <button onClick={() => handleAdd(member.id)} style={{ ...primaryButtonStyle, padding: '9px 16px', fontSize: 13 }}>
                          {memberItems.length === 0 ? '🎁 Create My Wishlist' : 'Add'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {demoMode && (
            <p style={{ marginTop: 18, fontSize: 12, color: theme.inkSoft }}>
              🔧 Demo mode — wishlist items shown here are just for show; nothing is saved.
            </p>
          )}
        </>
      )}
    </section>
  );
}
