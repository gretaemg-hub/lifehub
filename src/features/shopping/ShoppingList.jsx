import { useState } from 'react';
import { useShoppingItems } from './useShoppingItems';
import { theme, headingFont, inputStyle, primaryButtonStyle, secondaryButtonStyle } from '../../theme';

// Deliberately near-identical markup/behaviour to the prototype's
// Shopping view — this is the reference implementation for how every
// other feature (Homework, Meal Plan, ...) should be migrated next,
// per Phase 3 of the roadmap. Renders inside the themed card App.jsx
// already wraps every tab in, so styling here only needs to handle
// its own content, not the page chrome.
export default function ShoppingList() {
  const { items, loading, addItem, toggleItem, deleteItem, clearChecked } = useShoppingItems();
  const [text, setText] = useState('');
  const [repeating, setRepeating] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    await addItem(text, repeating);
    setText('');
    setRepeating(false);
  }

  const uncheckedCount = items.filter((i) => !i.checked).length;

  return (
    <section>
      <style>{`
        .lh-shop-input:focus {
          outline: none;
          border-color: ${theme.pine} !important;
          box-shadow: 0 0 0 3px rgba(62, 98, 89, 0.15);
        }
        .lh-shop-add:not(:disabled):hover { background: ${theme.pineDark} !important; }
        .lh-shop-clear:hover { border-color: ${theme.pine} !important; color: ${theme.pineDark} !important; }
        .lh-shop-remove:hover { color: ${theme.danger} !important; }
      `}</style>

      <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, color: theme.pineDark, margin: '0 0 4px' }}>
        🛒 Shopping List
      </h2>
      <p style={{ color: theme.inkSoft, marginTop: 0, fontSize: 14 }}>
        Shared with everyone in the household. Anyone can add or tick things off.
      </p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, margin: '18px 0', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="lh-shop-input"
          type="text"
          placeholder="Add an item… (e.g. Milk)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 200px' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: theme.inkSoft }}>
          <input
            type="checkbox"
            checked={repeating}
            onChange={(e) => setRepeating(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: theme.pine }}
          />
          Repeats every week
        </label>
        <button className="lh-shop-add" type="submit" style={primaryButtonStyle}>
          Add
        </button>
      </form>

      {loading ? (
        <p style={{ color: theme.inkSoft }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: theme.inkSoft }}>Your list is empty. Add something above 👆</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 4px', borderBottom: `1px solid ${theme.line}` }}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(item.id, item.checked)}
                style={{ width: 18, height: 18, accentColor: theme.pine, flexShrink: 0 }}
              />
              <span style={{ flex: 1, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? theme.inkFaint : theme.ink }}>
                {item.text}
              </span>
              {item.repeating && (
                <span style={{ fontSize: 11, color: theme.inkSoft, background: theme.surfaceMuted, borderRadius: 6, padding: '2px 6px' }}>
                  ↻ weekly
                </span>
              )}
              <button
                className="lh-shop-remove"
                onClick={() => deleteItem(item.id)}
                title="Remove"
                style={{ background: 'none', border: 'none', color: theme.inkFaint, cursor: 'pointer', fontSize: 15, padding: 4 }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: theme.inkSoft }}>
        <span>{uncheckedCount} item{uncheckedCount === 1 ? '' : 's'} left to get</span>
        <button className="lh-shop-clear" onClick={clearChecked} style={{ ...secondaryButtonStyle, padding: '8px 14px', fontSize: 12 }}>
          Clear checked items
        </button>
      </div>
    </section>
  );
}
