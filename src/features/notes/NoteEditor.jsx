import { useEffect, useRef, useState } from 'react';
import NoteCanvas from './NoteCanvas';
import { EVENT_COLORS } from '../calendar/calendarUtils';
import { theme, headingFont, secondaryButtonStyle } from '../../theme';

const PEN_COLORS = [theme.ink, ...EVENT_COLORS.map((c) => c.hex)];

const BLOCK_STYLES = {
  heading: { fontFamily: headingFont, fontWeight: 700, fontSize: 24, color: theme.ink },
  subheading: { fontFamily: headingFont, fontWeight: 600, fontSize: 18, color: theme.pineDark },
  body: { fontFamily: 'inherit', fontWeight: 400, fontSize: 15, color: theme.ink },
};

const BLOCK_TYPE_LABELS = { heading: 'H', subheading: 'h', body: 'T' };

function newBlock(type = 'body', text = '') {
  return { id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, text };
}

function cloneStrokes(strokes) {
  return strokes.map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) }));
}

// A note = a title, a stack of typed blocks (heading / subheading / body),
// and a pen-drawing layer overlaid on top of the blocks — matching the
// friends-demo's per-note editor. Autosaves on every meaningful change
// (debounced for typing, immediate for stroke commits) via useNotes'
// `saveNote`.
export default function NoteEditor({ note, onSave, onDelete, onBack }) {
  const [title, setTitle] = useState(note.title || '');
  const [blocks, setBlocks] = useState(note.blocks?.length ? note.blocks : [newBlock()]);
  const [strokes, setStrokes] = useState(note.strokes || []);
  const [tool, setTool] = useState('type'); // 'type' | 'pen' | 'eraser'
  const [eraserMode, setEraserMode] = useState('object'); // 'object' | 'pixel'
  const [color, setColor] = useState(PEN_COLORS[1]);

  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const [, forceRender] = useState(0);
  const blockRefs = useRef({});
  const saveTimerRef = useRef(null);

  // Reset local state + undo history whenever a different note is opened.
  useEffect(() => {
    setTitle(note.title || '');
    setBlocks(note.blocks?.length ? note.blocks : [newBlock()]);
    setStrokes(note.strokes || []);
    setTool('type');
    undoStackRef.current = [];
    redoStackRef.current = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  function saveNow(fields) {
    onSave(note.id, { title, blocks, strokes, ...fields });
  }

  function saveDebounced(fields) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNow(fields), 500);
  }

  function handleTitleChange(value) {
    setTitle(value);
    saveDebounced({ title: value });
  }

  function updateBlocks(next) {
    setBlocks(next);
    saveDebounced({ blocks: next });
  }

  function handleBlockText(index, text) {
    const next = blocks.map((b, i) => (i === index ? { ...b, text } : b));
    updateBlocks(next);
  }

  function handleBlockType(index, type) {
    const next = blocks.map((b, i) => (i === index ? { ...b, type } : b));
    updateBlocks(next);
  }

  function focusBlock(index) {
    requestAnimationFrame(() => {
      const el = blockRefs.current[index];
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    });
  }

  function handleBlockKeyDown(e, index) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const next = [...blocks];
      next.splice(index + 1, 0, newBlock('body'));
      updateBlocks(next);
      focusBlock(index + 1);
      return;
    }
    if (e.key === 'Backspace' && e.target.value === '' && blocks.length > 1) {
      e.preventDefault();
      const next = blocks.filter((_, i) => i !== index);
      updateBlocks(next);
      focusBlock(Math.max(0, index - 1));
    }
  }

  // Undo/redo operate on the strokes array only, snapshotting before
  // every mutation (stroke commit, object erase, clear-drawing) — same
  // scope as the friends-demo's drawing undo/redo.
  function pushUndoSnapshot() {
    undoStackRef.current = [...undoStackRef.current, cloneStrokes(strokes)];
    redoStackRef.current = [];
  }

  function commitStrokesChange(next) {
    setStrokes(next);
    onSave(note.id, { title, blocks, strokes: next });
    forceRender((n) => n + 1);
  }

  function handleCommitStroke(stroke) {
    pushUndoSnapshot();
    commitStrokesChange([...strokes, stroke]);
  }

  function handleEraseObject(strokeId) {
    pushUndoSnapshot();
    commitStrokesChange(strokes.filter((s) => s.id !== strokeId));
  }

  function handleClearDrawing() {
    if (strokes.length === 0) return;
    pushUndoSnapshot();
    commitStrokesChange([]);
  }

  function handleUndo() {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, cloneStrokes(strokes)];
    commitStrokesChange(prev);
  }

  function handleRedo() {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, cloneStrokes(strokes)];
    commitStrokesChange(next);
  }

  function handleDelete() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    onDelete(note.id);
  }

  const toolButtonStyle = (active) => ({
    fontFamily: 'inherit',
    padding: '7px 14px',
    borderRadius: 8,
    border: `1.5px solid ${active ? theme.pine : theme.line}`,
    background: active ? theme.pine : 'transparent',
    color: active ? 'white' : theme.inkSoft,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  });

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: theme.pine, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          ← Notes
        </button>
        <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: theme.danger, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          Delete Note
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button style={toolButtonStyle(tool === 'type')} onClick={() => setTool('type')}>✍️ Type</button>
        <button style={toolButtonStyle(tool === 'pen')} onClick={() => setTool('pen')}>🖊️ Pen</button>
        <button style={toolButtonStyle(tool === 'eraser')} onClick={() => setTool('eraser')}>🧹 Eraser</button>
        <div style={{ flex: 1 }} />
        <button style={{ ...secondaryButtonStyle, padding: '7px 12px', fontSize: 12 }} onClick={handleUndo}>↶ Undo</button>
        <button style={{ ...secondaryButtonStyle, padding: '7px 12px', fontSize: 12 }} onClick={handleRedo}>↷ Redo</button>
      </div>

      {tool === 'pen' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {PEN_COLORS.map((hex) => (
            <button
              key={hex}
              onClick={() => setColor(hex)}
              title={hex}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: hex,
                border: color === hex ? `2.5px solid ${theme.pineDark}` : '2.5px solid transparent',
                boxShadow: '0 0 0 1px rgba(38,49,43,0.15)',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
          <button style={{ ...secondaryButtonStyle, padding: '6px 12px', fontSize: 12, marginLeft: 8 }} onClick={handleClearDrawing}>
            Clear Drawing
          </button>
        </div>
      )}

      {tool === 'eraser' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button style={toolButtonStyle(eraserMode === 'object')} onClick={() => setEraserMode('object')}>Object Eraser</button>
          <button style={toolButtonStyle(eraserMode === 'pixel')} onClick={() => setEraserMode('pixel')}>Pixel Eraser</button>
          <button style={{ ...secondaryButtonStyle, padding: '6px 12px', fontSize: 12, marginLeft: 8 }} onClick={handleClearDrawing}>
            Clear Drawing
          </button>
        </div>
      )}

      <input
        type="text"
        placeholder="Untitled"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        style={{
          fontFamily: headingFont,
          fontWeight: 700,
          fontSize: 26,
          color: theme.ink,
          border: 'none',
          outline: 'none',
          width: '100%',
          background: 'transparent',
          marginBottom: 10,
        }}
      />

      <div style={{ position: 'relative', minHeight: 360, border: `1.5px solid ${theme.line}`, borderRadius: 12, background: theme.surface }}>
        <div style={{ position: 'relative', zIndex: 1, padding: 18, pointerEvents: tool === 'type' ? 'auto' : 'none' }}>
          {blocks.map((block, index) => (
            <div key={block.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                {['heading', 'subheading', 'body'].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleBlockType(index, t)}
                    title={t}
                    style={{
                      width: 18,
                      height: 18,
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: '18px',
                      textAlign: 'center',
                      padding: 0,
                      borderRadius: 4,
                      border: `1px solid ${theme.line}`,
                      background: block.type === t ? theme.bg : 'transparent',
                      color: theme.inkFaint,
                      cursor: 'pointer',
                    }}
                  >
                    {BLOCK_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <textarea
                ref={(el) => { blockRefs.current[index] = el; }}
                value={block.text}
                onChange={(e) => handleBlockText(index, e.target.value)}
                onKeyDown={(e) => handleBlockKeyDown(e, index)}
                placeholder={index === 0 ? 'Start writing…' : ''}
                rows={1}
                style={{
                  ...BLOCK_STYLES[block.type],
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  background: 'transparent',
                  padding: '4px 0',
                  overflow: 'hidden',
                  fontFamily: BLOCK_STYLES[block.type].fontFamily || 'inherit',
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
              />
            </div>
          ))}
        </div>
        <NoteCanvas
          strokes={strokes}
          tool={tool}
          eraserMode={eraserMode}
          color={color}
          onCommitStroke={handleCommitStroke}
          onEraseObject={handleEraseObject}
        />
      </div>
    </section>
  );
}
