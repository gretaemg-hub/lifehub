import { useState } from 'react';
import { useShoppingItems } from './useShoppingItems';

// Deliberately near-identical markup/behaviour to the prototype's
// Shopping view — this is the reference implementation for how every
// other feature (Calendar, Homework, Meal Plan, ...) should be
// migrated next, per Phase 3 of the roadmap.
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
      <h2>🛒 Shopping List</h2>
      <p style={{ color: '#5B6960' }}>Shared with everyone in the household. Anyone can add or tick things off.</p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Add an item… (e.g. Milk)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <input type="checkbox" checked={repeating} onChange={(e) => setRepeating(e.target.checked)} />
          Repeats every week
        </label>
        <button type="submit">Add</button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#5B6960' }}>Your list is empty. Add something above 👆</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map((item) => (
            <li key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #DDE3D6' }}>
              <input type="checkbox" checked={item.checked} onChange={() => toggleItem(item.id, item.checked)} />
              <span style={{ flex: 1, textDecoration: item.checked ? 'line-through' : 'none' }}>{item.text}</span>
              {item.repeating && <span style={{ fontSize: 11 }}>↻ weekly</span>}
              <button onClick={() => deleteItem(item.id)} title="Remove">✕</button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, color: '#5B6960' }}>
        <span>{uncheckedCount} item{uncheckedCount === 1 ? '' : 's'} left to get</span>
        <button onClick={clearChecked}>Clear checked items</button>
      </div>
    </section>
  );
}
