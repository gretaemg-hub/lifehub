import { theme, headingFont } from '../../theme';
import { useShoppingItems } from '../shopping/useShoppingItems';
import { useBirthdays } from '../birthdays/useBirthdays';
import { useHomeworkItems } from '../homework/useHomeworkItems';
import { useMealPlan } from '../mealplan/useMealPlan';
import { useNotes } from '../notes/useNotes';
import { useFitnessLog } from '../fitness/useFitnessLog';
import { useCalendarEvents } from '../calendar/useCalendarEvents';
import { todayKey, formatDateChip, toDateKey, nextBirthdayOccurrence } from '../calendar/calendarUtils';

// The home dashboard — a straight port of the friends-demo's "Home"
// view (lifehub.html: #view-home), right down to the index-card-pinned-
// to-a-noticeboard look (see the .lh-card/.lh-card::before rules in
// App.jsx's <style> block) and the Personal/Family section split. The
// only structural difference from the demo is that every card here
// reads from the real Supabase-backed hooks instead of localStorage, so
// "what's happening across the house today" is genuinely live.
const MEAL_LABELS = { breakfast: '🍳 Breakfast', snack: '🍎 Snack', lunch: '🥗 Lunch', dinner: '🍽️ Dinner' };
const DAY_KEY_BY_JS_DAY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function shoppingPreview(items) {
  if (items.length === 0) return 'List is empty';
  const unchecked = items.filter((i) => !i.checked);
  if (unchecked.length === 0) return 'Everything is ticked off ✓';
  const preview = unchecked.slice(0, 3).map((i) => i.text).join(', ');
  return `${unchecked.length} to get: ${preview}${unchecked.length > 3 ? '…' : ''}`;
}

function notesPreview(notes) {
  if (notes.length === 0) return null;
  return `${notes.length} note${notes.length === 1 ? '' : 's'}`;
}

function fitnessPreview(f) {
  if (!f.viewedWeekWorkouts || f.viewedWeekWorkouts.length === 0) return null;
  return `${f.viewedWeekWorkouts.length} workout${f.viewedWeekWorkouts.length === 1 ? '' : 's'} · ${f.viewedWeekMinutes} min this week`;
}

function calendarPreview(events, today) {
  const upcoming = events
    .filter((ev) => ev.end_date >= today)
    .sort((a, b) => (a.start_date + (a.start_time || '')).localeCompare(b.start_date + (b.start_time || '')))
    .slice(0, 3);
  if (upcoming.length === 0) return null;
  return upcoming.map((ev) => `${ev.start_date === today ? 'Today' : formatDateChip(ev.start_date)}: ${ev.title}`).join(' • ');
}

function birthdaysPreview(birthdays) {
  if (birthdays.length === 0) return null;
  const upcoming = [...birthdays]
    .sort((a, b) => nextBirthdayOccurrence(a.date).occurrence - nextBirthdayOccurrence(b.date).occurrence)
    .slice(0, 3);
  return upcoming.map((b) => `${b.name} (${formatDateChip(toDateKey(nextBirthdayOccurrence(b.date).occurrence))})`).join(' • ');
}

function homeworkPreview(items, today) {
  const active = items.filter((h) => !h.completed);
  if (active.length === 0) return null;
  const now = new Date();
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);

  let overdue = 0;
  let dueSoon = 0;
  active.forEach((h) => {
    const isOverdue = h.due_time
      ? h.due_date < today || (h.due_date === today && h.due_time < nowTimeStr)
      : h.due_date < today;
    if (isOverdue) {
      overdue += 1;
      return;
    }
    if (h.due_date === today || h.due_date === tomorrowKey) dueSoon += 1;
  });

  const parts = [`${active.length} due`];
  if (overdue > 0) parts.push(`${overdue} overdue`);
  if (dueSoon > 0) parts.push(`${dueSoon} due soon`);
  return parts.join(' · ');
}

function mealPlanPreview(plan) {
  const dayKey = DAY_KEY_BY_JS_DAY[new Date().getDay()];
  const todayMeals = plan?.[dayKey] || {};
  const planned = Object.entries(MEAL_LABELS)
    .map(([key, label]) => (todayMeals[key]?.dish ? `${label}: ${todayMeals[key].dish}` : null))
    .filter(Boolean);
  return planned.length ? planned.join(' • ') : null;
}

function DashCard({ icon, title, tapeColor, onClick, text, placeholder }) {
  const clickable = !!onClick;
  return (
    <div
      className={`lh-card${clickable ? ' lh-card-clickable' : ''}`}
      style={{ '--tape-color': tapeColor }}
      onClick={onClick}
    >
      <h3 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span>{icon}</span> {title}
      </h3>
      <div
        style={{
          fontSize: 13.5,
          color: theme.inkSoft,
          fontStyle: !text ? 'italic' : 'normal',
          opacity: !text ? 0.7 : 1,
        }}
      >
        {text || placeholder}
      </div>
    </div>
  );
}

export default function Home({ onNavigate }) {
  const today = todayKey();
  const shopping = useShoppingItems();
  const birthdaysData = useBirthdays();
  const homework = useHomeworkItems();
  const mealPlan = useMealPlan();
  const notes = useNotes();
  const fitness = useFitnessLog();
  const myCalendar = useCalendarEvents('personal');
  const familyCalendar = useCalendarEvents('family');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 26, color: theme.ink }}>Good to see you 👋</h2>
        <p style={{ color: theme.inkSoft, fontSize: 14, marginTop: 4 }}>Here's what's happening across the house today.</p>
      </div>

      {/* Pinned above everything else, per request — inviting someone
          is the one action a brand-new household needs before any of
          the cards below it have anything to show. */}
      <div className="lh-card-grid">
        <DashCard
          icon="👪"
          title="Add Family Members"
          tapeColor={theme.pine}
          onClick={() => onNavigate('household')}
          text="Generate an invite code, or share a family link"
        />
      </div>

      <h3 style={{ fontSize: 15, color: theme.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16, marginTop: 4 }}>
        🙋 Personal
      </h3>
      <div className="lh-card-grid">
        <DashCard
          icon="🏋️"
          title="Fitness Tracker"
          tapeColor="#4C7A94"
          onClick={() => onNavigate('fitness')}
          text={fitnessPreview(fitness)}
          placeholder="No workouts logged this week"
        />
        <DashCard
          icon="📝"
          title="Notes"
          tapeColor={theme.mustard}
          onClick={() => onNavigate('notes')}
          text={notesPreview(notes.notes)}
          placeholder="No notes yet"
        />
        <DashCard
          icon="🗓️"
          title="My Calendar"
          tapeColor="#8C4A63"
          onClick={() => onNavigate('my-calendar')}
          text={calendarPreview(myCalendar.events, today)}
          placeholder="Nothing scheduled"
        />
      </div>

      <h3 style={{ fontSize: 15, color: theme.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16, marginTop: 8 }}>
        🏡 Family
      </h3>
      <div className="lh-card-grid" style={{ marginBottom: 0 }}>
        <DashCard
          icon="🛒"
          title="Shopping List"
          tapeColor={theme.pine}
          onClick={() => onNavigate('shopping')}
          text={shopping.items.length ? shoppingPreview(shopping.items) : null}
          placeholder="List is empty"
        />
        <DashCard
          icon="🎂"
          title="Upcoming Birthdays"
          tapeColor="#8C4A63"
          onClick={() => onNavigate('birthdays')}
          text={birthdaysPreview(birthdaysData.birthdays)}
          placeholder="No birthdays added yet"
        />
        <DashCard
          icon="📅"
          title="Family Calendar"
          tapeColor="#4C7A94"
          onClick={() => onNavigate('family-calendar')}
          text={calendarPreview(familyCalendar.events, today)}
          placeholder="Nothing scheduled"
        />
        <DashCard
          icon="📚"
          title="School & Homeworks"
          tapeColor={theme.mustard}
          onClick={() => onNavigate('homework')}
          text={homeworkPreview(homework.items, today)}
          placeholder="Nothing due"
        />
        <DashCard icon="💸" title="Bills Due Soon" tapeColor="#8C4A63" text={null} placeholder="Not built yet — coming soon." />
        <DashCard icon="🧹" title="Household Tasks" tapeColor={theme.mustard} text={null} placeholder="Not built yet — coming soon." />
        <DashCard
          icon="🍽️"
          title="Meal Plan"
          tapeColor="#4C7A94"
          onClick={() => onNavigate('meal-plan')}
          text={mealPlanPreview(mealPlan.plan)}
          placeholder="Nothing planned for today"
        />
      </div>
    </div>
  );
}
