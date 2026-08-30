import { useState } from 'react';
import { useNotes } from './useNotes';
import NoteEditor from './NoteEditor';
import { theme, headingFont, primaryButtonStyle } from '../../theme';

function noteSnippet(note) {
  const withText = (note.blocks || []).find((b) => b.text?.trim());
  return withText ? withText.text.trim() : 'No content yet';
}

// The Notes tab: a card grid of the signed-in user's own notes (never
// shared — see useNotes.js), or the full-screen editor for whichever
// note is currently open. Matches the friends-demo's list ↔ editor flow.
export default function Notes() {
  const { notes, loading, createNote, saveNote, deleteNote } = useNotes();
  const [openId, setOpenId] = useState(null);

  async function handleNew() {
    const saved = await createNote();
    if (saved) setOpenId(saved.id);
  }

  function handleDelete(id) {
    deleteNote(id);
    setOpenId(null);
  }

  const openNote = openId ? notes.find((n) => n.id === openId) : null;

  if (openNote) {
    return (
      <NoteEditor
        note={openNote}
        onSave={saveNote}
        onDelete={handleDelete}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, color: theme.pineDark, margin: '0 0 4px' }}>
            📝 Notes
          </h2>
          <p style={{ color: theme.inkSoft, marginTop: 0, fontSize: 14 }}>Write, sketch, and keep track of your own private notes.</p>
        </div>
        <button onClick={handleNew} style={{ ...primaryButtonStyle, padding: '9px 16px', fontSize: 13, whiteSpace: 'nowrap' }}>
          + New Note
        </button>
      </div>

      {loading ? (
        <p style={{ color: theme.inkSoft }}>Loading…</p>
      ) : notes.length === 0 ? (
        <p style={{ color: theme.inkSoft, fontSize: 14 }}>No notes yet — tap "+ New Note" to start your first page.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => setOpenId(note.id)}
              style={{
                textAlign: 'left',
                fontFamily: 'inherit',
                background: theme.surface,
                border: `1.5px solid ${theme.line}`,
                borderRadius: 12,
                padding: '14px 14px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                minHeight: 100,
              }}
            >
              <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 15, color: theme.ink }}>
                {note.title?.trim() || 'Untitled'}
              </div>
              <div style={{ fontSize: 12, color: theme.inkSoft, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {noteSnippet(note)}
              </div>
              <div style={{ fontSize: 11, color: theme.inkFaint }}>{new Date(note.updated_at).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
