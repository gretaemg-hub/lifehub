import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

// Notes are personal, never shared — same one-row-per-note shape as
// the friends-demo's note objects (title / blocks / strokes), just
// keyed by auth user_id instead of a local memberId. `blocks` holds
// the typed content (heading/subheading/body), `strokes` holds the
// pen/eraser drawing data — see NoteCanvas.jsx for how those get
// drawn.
function newBlock(type = 'body', text = '') {
  return { id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, text };
}

let demoIdCounter = 0;
function seedDemoNotes() {
  return [
    {
      id: `demo-note-${demoIdCounter++}`,
      title: 'Welcome',
      blocks: [newBlock('body', 'This is a demo note — try the Pen tool above to draw something.')],
      strokes: [],
      updated_at: new Date().toISOString(),
    },
  ];
}

export function useNotes() {
  const { user, demoMode } = useAuth();
  const isDemo = demoMode || !isSupabaseConfigured;

  const demoNotesRef = useRef(null);
  if (isDemo && demoNotesRef.current === null) demoNotesRef.current = seedDemoNotes();

  const [notes, setNotes] = useState(isDemo ? demoNotesRef.current : []);
  const [loading, setLoading] = useState(!isDemo);

  const load = useCallback(async () => {
    if (isDemo) {
      setNotes([...demoNotesRef.current].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('id, title, blocks, strokes, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) console.error('Could not load notes:', error);
    setNotes(data ?? []);
    setLoading(false);
  }, [isDemo, user]);

  useEffect(() => {
    load();
  }, [load]);

  async function createNote() {
    const fresh = { title: '', blocks: [newBlock()], strokes: [] };
    if (isDemo) {
      const saved = { id: `demo-note-${demoIdCounter++}`, ...fresh, updated_at: new Date().toISOString() };
      demoNotesRef.current = [saved, ...demoNotesRef.current];
      load();
      return saved;
    }
    if (!user) return null;
    const { data, error } = await supabase.from('notes').insert({ user_id: user.id, ...fresh }).select().single();
    if (error) {
      console.error('Could not create note:', error);
      return null;
    }
    load();
    return data;
  }

  async function saveNote(id, fields) {
    const patch = { ...fields, updated_at: new Date().toISOString() };
    if (isDemo) {
      demoNotesRef.current = demoNotesRef.current.map((n) => (n.id === id ? { ...n, ...patch } : n));
      load();
      return;
    }
    await supabase.from('notes').update(patch).eq('id', id);
    load();
  }

  async function deleteNote(id) {
    if (isDemo) {
      demoNotesRef.current = demoNotesRef.current.filter((n) => n.id !== id);
      load();
      return;
    }
    await supabase.from('notes').delete().eq('id', id);
    load();
  }

  return { notes, loading, createNote, saveNote, deleteNote };
}
