// Shared constants for the Meal Plan grid — Monday-first rows, meal
// types as columns (per this project's earlier axis-swap fix), ported
// from the friends-demo's MEAL_PLAN_DAYS/MEAL_PLAN_MEALS.
export const MEAL_PLAN_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const MEAL_PLAN_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MEAL_PLAN_MEALS = ['breakfast', 'snack', 'lunch', 'dinner'];
export const MEAL_PLAN_MEAL_LABELS = ['🍳 Breakfast', '🍎 Snack', '🥗 Lunch', '🍽️ Dinner'];
export const MEAL_UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pcs'];

export function emptyMealCell() {
  return { dish: '', ingredients: [], sync_to_shopping_list: false };
}

export function emptyMealPlan() {
  const plan = {};
  MEAL_PLAN_DAYS.forEach((day) => {
    plan[day] = {};
    MEAL_PLAN_MEALS.forEach((meal) => {
      plan[day][meal] = emptyMealCell();
    });
  });
  return plan;
}
