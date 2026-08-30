// Shared helpers for both Family Calendar and My Calendar — ported
// directly from the prototype's CALENDAR — DATE HELPERS /
// CALENDAR — COLOR OPTIONS / CALENDAR — BUILDING A FULL MONTH OF WEEKS
// sections (lifehub.html) so the two apps agree on colors, formats,
// and the month-grid shape. Sunday-first, matching the original
// (only Meal Plan was asked to switch to Monday-first).

export const EVENT_COLORS = [
  { name: 'Red', hex: '#C0392B' },
  { name: 'Orange', hex: '#D97B3D' },
  { name: 'Yellow', hex: '#D9A441' },
  { name: 'Green', hex: '#3E6259' },
  { name: 'Blue', hex: '#4C7A94' },
  { name: 'Purple', hex: '#7A5C9E' },
  { name: 'Pink', hex: '#C97BA3' },
  { name: 'Grey', hex: '#7A8580' },
];

export const DEFAULT_EVENT_COLOR = EVENT_COLORS[3].hex;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function monthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function weekdayLabels() {
  return WEEKDAY_LABELS;
}

export function formatDateChip(dateKey) {
  const [, m, d] = dateKey.split('-').map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`;
}

export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  let [h, min] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(min).padStart(2, '0')} ${ampm}`;
}

export function formatEventTimeLabel(ev) {
  if (ev.all_day) return 'All day';
  if (ev.start_time && ev.end_time) return `${formatTime12h(ev.start_time)} – ${formatTime12h(ev.end_time)}`;
  if (ev.start_time) return formatTime12h(ev.start_time);
  return '';
}

// Builds a full 6-week (42-day) grid for the given month, padded with
// the tail end of the previous month and the start of the next —
// exactly the prototype's getMonthWeeks(), flattened to a single
// array of day cells rather than a weeks[][] (this component doesn't
// need the lane-packing math the prototype used for multi-day bars —
// events are shown as chips within each day cell instead).
export function getMonthCells(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const cursor = new Date(year, month, 1 - firstWeekday);
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    cells.push({
      dateKey: toDateKey(cursor),
      dayNumber: cursor.getDate(),
      inCurrentMonth: cursor.getMonth() === month,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

// A birthday's stored `date` keeps the original birth year (e.g. the
// year the calendar event was first created) — this finds the next
// upcoming occurrence (this year, or next year if it's already
// passed) and what age they'll be turning, for sorting/labeling the
// Birthdays list. Ported directly from the prototype's
// nextBirthdayOccurrence().
export function nextBirthdayOccurrence(dateKey) {
  const [birthYear, month, day] = dateKey.split('-').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let occurrence = new Date(today.getFullYear(), month - 1, day);
  if (occurrence < today) occurrence = new Date(today.getFullYear() + 1, month - 1, day);
  const turningAge = occurrence.getFullYear() - birthYear;
  return { occurrence, turningAge };
}

// An event "occurs on" a given day if the day falls within its
// [start_date, end_date] span (both inclusive) — multi-day events
// simply show up as the same chip on every day they cover.
export function eventsOnDay(events, dateKey) {
  return events
    .filter((ev) => ev.start_date <= dateKey && ev.end_date >= dateKey)
    .sort((a, b) => (a.start_date === b.start_date ? a.title.localeCompare(b.title) : a.start_date.localeCompare(b.start_date)));
}
