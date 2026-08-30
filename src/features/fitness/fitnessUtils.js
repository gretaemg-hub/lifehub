// Date/week-math helpers for the Fitness Tracker, ported from the
// friends-demo's WEEK-OFFSET SLIDER section (demo/index.html). "This
// week" is never just new Date()'s week — it's the real current
// week's Sunday, shifted by a whole-week offset the user can slide
// back up to a year. See getViewedWeekStartKey/getViewedWeekEndKey.
import { toDateKey } from '../calendar/calendarUtils';

export const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const WORKOUT_PLAN_SECTIONS = [
  { key: 'warmup', label: 'Warm Up', icon: '🔥' },
  { key: 'main', label: 'Main Body', icon: '💪' },
  { key: 'cooldown', label: 'Cooldown', icon: '🧊' },
];

export const WEEK_OFFSET_MIN = -52;
export const WEEK_OFFSET_MAX = 0;

export function addDaysToDate(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Sunday of the given date's week (defaults to today).
export function getStartOfWeekKey(date = new Date()) {
  const dayOfWeek = date.getDay();
  return toDateKey(addDaysToDate(date, -dayOfWeek));
}

export function getViewedWeekStartKey(weekOffset) {
  const [y, m, d] = getStartOfWeekKey().split('-').map(Number);
  return toDateKey(addDaysToDate(new Date(y, m - 1, d), weekOffset * 7));
}

export function getViewedWeekEndKey(weekOffset) {
  const [y, m, d] = getViewedWeekStartKey(weekOffset).split('-').map(Number);
  return toDateKey(addDaysToDate(new Date(y, m - 1, d), 6));
}

export function formatWeekRangeLabel(weekOffset, formatDateChip) {
  if (weekOffset === 0) return 'This Week';
  if (weekOffset === -1) return 'Last Week';
  return `${formatDateChip(getViewedWeekStartKey(weekOffset))} – ${formatDateChip(getViewedWeekEndKey(weekOffset))}`;
}
