import { Fragment, useState } from 'react';
import { useMealPlan } from './useMealPlan';
import { MEAL_PLAN_DAYS, MEAL_PLAN_DAY_LABELS, MEAL_PLAN_MEALS, MEAL_PLAN_MEAL_LABELS, MEAL_UNITS } from './mealPlanUtils';
import { useAuth } from '../../context/AuthContext';
import { theme, headingFont, inputStyle, primaryButtonStyle, secondaryButtonStyle } from '../../theme';

let ingredientIdCounter = 0;
const newIngredientId = () => `ing-${Date.now()}-${ingredientIdCounter++}`;

// The week grid (Mon→Sun rows, meal types as columns — see the
// restyle-pass note in mealPlanUtils.js) plus a per-cell edit modal,
// matching the friends-demo's Meal Plan tab. Renders inside App.jsx's
// themed card.
export default function MealPlan() {
  const { plan, loading, saveCell, clearCell, syncAllToShoppingList } = useMealPlan();
  const { demoMode } = useAuth();
  const [editing, setEditing] = useState(null); // { day, meal } | null
  const [dish, setDish] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [sync, setSync] = useState(false);
  const [syncedFlash, setSyncedFlash] = useState(false);

  function openCell(day, meal) {
    const cell = plan[day]?.[meal] || { dish: '', ingredients: [], sync_to_shopping_list: false };
    setDish(cell.dish);
    setIngredients(cell.ingredients.map((ing) => ({ ...ing })));
    setSync(cell.sync_to_shopping_list);
    setEditing({ day, meal });
  }

  function closeModal() {
    setEditing(null);
  }

  function addIngredientRow() {
    setIngredients((rows) => [...rows, { id: newIngredientId(), name: '', amount: '', unit: MEAL_UNITS[0] }]);
  }

  function updateIngredient(id, field, value) {
    setIngredients((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function removeIngredient(id) {
    setIngredients((rows) => rows.filter((r) => r.id !== id));
  }

  async function handleSave() {
    const cleaned = ingredients.filter((i) => i.name.trim()).map((i) => ({ id: i.id, name: i.name.trim(), amount: i.amount || '', unit: i.unit || MEAL_UNITS[0] }));
    await saveCell(editing.day, editing.meal, { dish: dish.trim(), ingredients: cleaned, sync_to_shopping_list: sync });
    closeModal();
  }

  async function handleClear() {
    await clearCell(editing.day, editing.meal);
    closeModal();
  }

  async function handleSyncAll() {
    await syncAllToShoppingList();
    setSyncedFlash(true);
    setTimeout(() => setSyncedFlash(false), 1500);
  }

  return (
    <section>
      <style>{`
        .lh-meal-cell:hover { border-color: ${theme.pine} !important; }
        .lh-meal-input:focus, .lh-meal-select:focus { outline: none; border-color: ${theme.pine} !important; box-shadow: 0 0 0 3px rgba(62, 98, 89, 0.15); }
        .lh-meal-save:hover { background: ${theme.pineDark} !important; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, color: theme.pineDark, margin: '0 0 4px' }}>
            🍽️ Meal Plan
          </h2>
          <p style={{ color: theme.inkSoft, marginTop: 0, fontSize: 14 }}>Tap a cell to plan a meal and its ingredients.</p>
        </div>
        <button onClick={handleSyncAll} style={{ ...secondaryButtonStyle, padding: '9px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
          {syncedFlash ? '✓ Synced' : '🛒 Sync All to Shopping List'}
        </button>
      </div>

      {loading ? (
        <p style={{ color: theme.inkSoft, marginTop: 18 }}>Loading…</p>
      ) : (
        <div
          style={{
            marginTop: 18,
            display: 'grid',
            gridTemplateColumns: '60px repeat(4, 1fr)',
            gap: 4,
            overflowX: 'auto',
          }}
        >
          <div />
          {MEAL_PLAN_MEAL_LABELS.map((label) => (
            <div key={label} style={{ fontSize: 11, fontWeight: 700, color: theme.inkSoft, textAlign: 'center', padding: '4px 2px' }}>
              {label}
            </div>
          ))}

          {MEAL_PLAN_DAYS.map((day, i) => (
            <Fragment key={day}>
              <div
                style={{ fontSize: 12, fontWeight: 700, color: theme.pineDark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {MEAL_PLAN_DAY_LABELS[i]}
              </div>
              {MEAL_PLAN_MEALS.map((meal) => {
                const cell = plan[day]?.[meal] || { dish: '', ingredients: [] };
                return (
                  <div
                    key={`${day}-${meal}`}
                    className="lh-meal-cell"
                    onClick={() => openCell(day, meal)}
                    style={{
                      minHeight: 56,
                      padding: '6px 8px',
                      borderRadius: 8,
                      border: `1px solid ${theme.line}`,
                      background: theme.surface,
                      cursor: 'pointer',
                      fontSize: 12,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {cell.dish ? (
                      <div style={{ color: theme.ink, fontWeight: 600 }}>{cell.dish}</div>
                    ) : (
                      <div style={{ color: theme.inkFaint }}>➕ Add</div>
                    )}
                    {cell.ingredients?.length > 0 && (
                      <div style={{ color: theme.inkSoft, fontSize: 10, marginTop: 2 }}>
                        {cell.ingredients.length} ingredient{cell.ingredients.length === 1 ? '' : 's'}
                      </div>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      )}

      {demoMode && (
        <p style={{ marginTop: 18, fontSize: 12, color: theme.inkSoft }}>
          🔧 Demo mode — meal plan changes shown here are just for show; nothing is saved, and shopping-list sync is disabled.
        </p>
      )}

      {editing && (
        <div
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          style={{ position: 'fixed', inset: 0, background: 'rgba(38, 49, 43, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
        >
          <div
            style={{
              background: theme.surface,
              borderRadius: 16,
              padding: 22,
              width: '100%',
              maxWidth: 420,
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <h3 style={{ fontFamily: headingFont, margin: 0, fontSize: 17, color: theme.ink }}>
              {MEAL_PLAN_MEAL_LABELS[MEAL_PLAN_MEALS.indexOf(editing.meal)]} — {MEAL_PLAN_DAY_LABELS[MEAL_PLAN_DAYS.indexOf(editing.day)]}
            </h3>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.inkSoft }}>
              <input
                type="checkbox"
                checked={sync}
                onChange={(e) => setSync(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: theme.pine }}
              />
              🛒 Sync ingredients to Shopping List
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: theme.inkSoft }}>
              Dish
              <input
                className="lh-meal-input"
                type="text"
                placeholder="e.g. Spaghetti Bolognese"
                value={dish}
                onChange={(e) => setDish(e.target.value)}
                style={inputStyle}
              />
            </label>

            <div style={{ fontSize: 12, fontWeight: 700, color: theme.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Ingredients
            </div>
            {ingredients.length === 0 && <p style={{ color: theme.inkSoft, fontSize: 13, margin: 0 }}>No ingredients yet.</p>}
            {ingredients.map((ing) => (
              <div key={ing.id} style={{ display: 'flex', gap: 6 }}>
                <input
                  className="lh-meal-input"
                  type="text"
                  placeholder="Ingredient"
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                  style={{ ...inputStyle, flex: '2 1 auto', padding: '8px 10px', fontSize: 13 }}
                />
                <input
                  className="lh-meal-input"
                  type="text"
                  placeholder="Amt"
                  value={ing.amount}
                  onChange={(e) => updateIngredient(ing.id, 'amount', e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 60px', padding: '8px 10px', fontSize: 13 }}
                />
                <select
                  className="lh-meal-select"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 70px', padding: '8px 6px', fontSize: 13 }}
                >
                  {MEAL_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeIngredient(ing.id)}
                  title="Remove"
                  style={{ background: 'none', border: 'none', color: theme.inkFaint, cursor: 'pointer', fontSize: 15 }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addIngredientRow} style={{ ...secondaryButtonStyle, alignSelf: 'flex-start', padding: '7px 12px', fontSize: 12 }}>
              + Add Ingredient
            </button>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
              <button type="button" onClick={handleClear} style={{ background: 'none', border: 'none', color: theme.danger, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginRight: 'auto' }}>
                Clear
              </button>
              <button type="button" onClick={closeModal} style={{ ...secondaryButtonStyle, padding: '9px 16px', fontSize: 13, marginRight: 8 }}>
                Cancel
              </button>
              <button className="lh-meal-save" type="button" onClick={handleSave} style={{ ...primaryButtonStyle, padding: '9px 16px', fontSize: 13 }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
