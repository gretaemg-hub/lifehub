import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { MEAL_PLAN_DAYS, MEAL_PLAN_MEALS, emptyMealCell, emptyMealPlan } from './mealPlanUtils';

function seedDemoPlan() {
  const plan = emptyMealPlan();
  plan.monday.dinner = {
    dish: 'Spaghetti Bolognese',
    ingredients: [{ id: 'demo-ing-1', name: 'Spaghetti', amount: '500', unit: 'g' }, { id: 'demo-ing-2', name: 'Minced beef', amount: '400', unit: 'g' }],
    sync_to_shopping_list: false,
  };
  return plan;
}

// One row per (household, day, meal) in meal_plan_cells — 28 rows
// covers the whole week's grid. Loaded flat and reshaped into the
// same { [day]: { [meal]: cell } } object the friends-demo keeps in
// memory, so MealPlan.jsx's grid-building code reads identically.
export function useMealPlan() {
  const { activeHouseholdId } = useHousehold();
  const { demoMode } = useAuth();
  const isDemo = demoMode || !isSupabaseConfigured;

  const demoPlanRef = useRef(null);
  if (isDemo && demoPlanRef.current === null) demoPlanRef.current = seedDemoPlan();

  const [plan, setPlan] = useState(isDemo ? demoPlanRef.current : emptyMealPlan());
  const [loading, setLoading] = useState(!isDemo);

  const load = useCallback(async () => {
    if (isDemo) {
      setPlan({ ...demoPlanRef.current });
      setLoading(false);
      return;
    }
    if (!activeHouseholdId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('meal_plan_cells')
      .select('day, meal, dish, ingredients, sync_to_shopping_list')
      .eq('household_id', activeHouseholdId);
    if (error) console.error('Could not load meal plan:', error);
    const next = emptyMealPlan();
    (data ?? []).forEach((row) => {
      if (next[row.day] && next[row.day][row.meal] !== undefined) {
        next[row.day][row.meal] = { dish: row.dish, ingredients: row.ingredients || [], sync_to_shopping_list: row.sync_to_shopping_list };
      }
    });
    setPlan(next);
    setLoading(false);
  }, [isDemo, activeHouseholdId]);

  useEffect(() => {
    load();
    if (isDemo || !activeHouseholdId) return;
    const channel = supabase
      .channel(`meal_plan_cells:${activeHouseholdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_plan_cells', filter: `household_id=eq.${activeHouseholdId}` }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isDemo, activeHouseholdId, load]);

  // Additive-only, de-duped by case-insensitive ingredient name against
  // whatever's already on the shopping list — same rule (and the same
  // "never removes anything" limitation) as the demo's
  // syncIngredientsToShoppingList(). Amount/unit are dropped; only the
  // name goes onto the shopping list, exactly as the demo does.
  async function syncIngredientsToShoppingList(ingredients) {
    if (ingredients.length === 0) return;
    if (isDemo) return; // no shared shopping-list state to sync into in demo mode
    if (!activeHouseholdId) return;
    const { data: existing } = await supabase.from('shopping_items').select('text').eq('household_id', activeHouseholdId);
    const existingKeys = new Set((existing ?? []).map((i) => i.text.trim().toLowerCase()));
    const { data: userData } = await supabase.auth.getUser();
    const toInsert = [];
    ingredients.forEach((ing) => {
      const key = (ing.name || '').trim().toLowerCase();
      if (!key || existingKeys.has(key)) return;
      toInsert.push({ household_id: activeHouseholdId, text: ing.name.trim(), repeating: false, added_by: userData.user?.id });
      existingKeys.add(key);
    });
    if (toInsert.length > 0) await supabase.from('shopping_items').insert(toInsert);
  }

  async function saveCell(day, meal, cell) {
    if (isDemo) {
      demoPlanRef.current = { ...demoPlanRef.current, [day]: { ...demoPlanRef.current[day], [meal]: cell } };
      load();
      if (cell.sync_to_shopping_list) await syncIngredientsToShoppingList(cell.ingredients);
      return;
    }
    if (!activeHouseholdId) return;
    await supabase
      .from('meal_plan_cells')
      .upsert(
        { household_id: activeHouseholdId, day, meal, dish: cell.dish, ingredients: cell.ingredients, sync_to_shopping_list: cell.sync_to_shopping_list },
        { onConflict: 'household_id,day,meal' }
      );
    if (cell.sync_to_shopping_list) await syncIngredientsToShoppingList(cell.ingredients);
    load();
  }

  async function clearCell(day, meal) {
    await saveCell(day, meal, emptyMealCell());
  }

  async function syncAllToShoppingList() {
    const allIngredients = [];
    MEAL_PLAN_DAYS.forEach((day) => MEAL_PLAN_MEALS.forEach((meal) => allIngredients.push(...(plan[day]?.[meal]?.ingredients || []))));
    await syncIngredientsToShoppingList(allIngredients);
  }

  return { plan, loading, saveCell, clearCell, syncAllToShoppingList };
}
