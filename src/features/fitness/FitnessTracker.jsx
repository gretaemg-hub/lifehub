import { useState } from 'react';
import { useFitnessLog } from './useFitnessLog';
import { useWorkoutPlan } from './useWorkoutPlan';
import AnnualChart from './AnnualChart';
import { WORKOUT_PLAN_SECTIONS, formatWeekRangeLabel, WEEK_OFFSET_MIN, WEEK_OFFSET_MAX } from './fitnessUtils';
import { todayKey, formatDateChip } from '../calendar/calendarUtils';
import { useAuth } from '../../context/AuthContext';
import { theme, headingFont, inputStyle, primaryButtonStyle, secondaryButtonStyle } from '../../theme';

// Personal fitness log + workout plan + annual progress chart — ported
// from the friends-demo's Fitness Tracker view. Unlike the demo (which
// keyed everything to a chosen "family member"), this is scoped to the
// signed-in user directly, since the real app already has real auth —
// see fitness_log / workout_plans RLS (owner-only) in
// supabase/migrations/0001_init.sql.
export default function FitnessTracker() {
  const {
    log, loading: logLoading, addWorkout, deleteWorkout,
    weekOffset, setWeekOffset, viewedWeekWorkouts, viewedWeekMinutes,
    minLogDate, maxLogDate,
  } = useFitnessLog();
  const { plan, loading: planLoading, setDuration, addExercise, deleteExercise, clearPlan } = useWorkoutPlan();
  const { demoMode } = useAuth();

  const [showChart, setShowChart] = useState(false);
  const [activity, setActivity] = useState('');
  const [duration, setDurationInput] = useState('');
  const [date, setDate] = useState(todayKey());
  const [exerciseDrafts, setExerciseDrafts] = useState({ warmup: {}, main: {}, cooldown: {} });

  async function handleLogWorkout() {
    await addWorkout(activity, duration, date);
    setActivity('');
    setDurationInput('');
  }

  function updateDraft(sectionKey, field, value) {
    setExerciseDrafts((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [field]: value } }));
  }

  async function handleAddExercise(sectionKey) {
    const draft = exerciseDrafts[sectionKey] || {};
    if (!draft.name?.trim() || !draft.sets || !draft.reps) return;
    await addExercise(sectionKey, draft.name, draft.sets, draft.reps);
    setExerciseDrafts((prev) => ({ ...prev, [sectionKey]: {} }));
  }

  const weekLabel = formatWeekRangeLabel(weekOffset, formatDateChip);

  return (
    <section>
      <style>{`
        .lh-fit-btn:hover { background: ${theme.surfaceMuted} !important; color: ${theme.ink} !important; }
        .lh-fit-log-btn:hover { background: ${theme.pineDark} !important; }
        .lh-fit-slider { accent-color: ${theme.pine}; }
        .lh-fit-delete:hover { background: ${theme.dangerBg} !important; color: ${theme.danger} !important; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 22, color: theme.pineDark, margin: '0 0 4px' }}>
            🏋️ Fitness Tracker
          </h2>
          <p style={{ color: theme.inkSoft, marginTop: 0, fontSize: 14 }}>Personal — only you can see this.</p>
        </div>
        <button className="lh-fit-btn" onClick={() => setShowChart((v) => !v)} style={{ ...secondaryButtonStyle, padding: '9px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
          {showChart ? '📊 Hide Annual Progress Chart' : '📊 Show My Annual Progress Chart'}
        </button>
      </div>

      {showChart && (
        <div style={{ marginTop: 18 }}>
          <AnnualChart log={log} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22 }}>
        <button
          className="lh-fit-btn"
          onClick={() => setWeekOffset(weekOffset - 1)}
          disabled={weekOffset <= WEEK_OFFSET_MIN}
          style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: theme.surfaceMuted, color: theme.inkSoft, fontSize: 16, cursor: weekOffset <= WEEK_OFFSET_MIN ? 'default' : 'pointer', opacity: weekOffset <= WEEK_OFFSET_MIN ? 0.35 : 1, flexShrink: 0 }}
        >
          ‹
        </button>
        <input
          className="lh-fit-slider"
          type="range"
          min={WEEK_OFFSET_MIN}
          max={WEEK_OFFSET_MAX}
          step={1}
          value={weekOffset}
          onChange={(e) => setWeekOffset(Number(e.target.value))}
          style={{ flex: 1, cursor: 'pointer' }}
        />
        <button
          className="lh-fit-btn"
          onClick={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset >= WEEK_OFFSET_MAX}
          style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: theme.surfaceMuted, color: theme.inkSoft, fontSize: 16, cursor: weekOffset >= WEEK_OFFSET_MAX ? 'default' : 'pointer', opacity: weekOffset >= WEEK_OFFSET_MAX ? 0.35 : 1, flexShrink: 0 }}
        >
          ›
        </button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: theme.inkSoft, margin: '4px 0 16px' }}>{weekLabel}</div>

      <div style={{ display: 'flex', gap: 24, background: theme.surface, borderRadius: 12, boxShadow: '0 2px 8px rgba(38, 49, 43, 0.08)', padding: '14px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: headingFont, fontSize: 24, color: theme.pine }}>{viewedWeekWorkouts.length}</span>
          <span style={{ fontSize: 11.5, color: theme.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4 }}>Workouts</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: headingFont, fontSize: 24, color: theme.pine }}>{viewedWeekMinutes}</span>
          <span style={{ fontSize: 11.5, color: theme.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4 }}>Minutes</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Activity… (e.g. Running)"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          style={{ ...inputStyle, flex: '2 1 160px' }}
        />
        <input
          type="number"
          placeholder="Minutes"
          min="1"
          value={duration}
          onChange={(e) => setDurationInput(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 90px', maxWidth: 110 }}
        />
        <input
          type="date"
          value={date}
          min={minLogDate}
          max={maxLogDate}
          onChange={(e) => setDate(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 140px' }}
        />
        <button className="lh-fit-log-btn" onClick={handleLogWorkout} style={{ ...primaryButtonStyle, whiteSpace: 'nowrap' }}>
          Log Workout
        </button>
      </div>

      {logLoading ? (
        <p style={{ color: theme.inkSoft }}>Loading…</p>
      ) : log.length === 0 ? (
        <p style={{ color: theme.inkSoft, fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No workouts logged yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, background: theme.surface, borderRadius: 12, boxShadow: '0 2px 8px rgba(38, 49, 43, 0.08)', overflow: 'hidden', marginBottom: 8 }}>
          {log.map((w) => (
            <li key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderBottom: `1px solid ${theme.line}` }}>
              <span style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, color: theme.ink }}>{w.activity}</div>
                <div style={{ fontSize: 12, color: theme.inkSoft }}>{w.date === todayKey() ? 'Today' : formatDateChip(w.date)} · {w.duration} min</div>
              </span>
              <button
                className="lh-fit-delete"
                onClick={() => deleteWorkout(w.id)}
                title="Remove"
                style={{ background: 'none', border: 'none', color: theme.inkSoft, fontSize: 18, padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginTop: 40 }}>
        <div>
          <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: 20, color: theme.pineDark, margin: '0 0 4px' }}>🏋️ Workout Plan</h2>
          <p style={{ color: theme.inkSoft, marginTop: 0, fontSize: 14 }}>Build your warm up, main workout, and cooldown — with sets and reps for each exercise.</p>
        </div>
        <button className="lh-fit-delete" onClick={clearPlan} style={{ background: 'none', border: 'none', color: theme.danger, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Clear Workout
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: theme.surface, borderRadius: 12, boxShadow: '0 2px 8px rgba(38, 49, 43, 0.08)', padding: '12px 16px', margin: '16px 0 20px' }}>
        <label style={{ fontSize: 13.5, fontWeight: 600, color: theme.inkSoft }}>Total time (minutes)</label>
        <input
          type="number"
          min="1"
          placeholder="e.g. 45"
          value={plan.duration_minutes}
          onChange={(e) => setDuration(e.target.value)}
          style={{ ...inputStyle, width: 90, padding: '8px 10px', fontSize: 14 }}
        />
      </div>

      {planLoading ? (
        <p style={{ color: theme.inkSoft }}>Loading…</p>
      ) : (
        WORKOUT_PLAN_SECTIONS.map((section) => {
          const exercises = plan[section.key] || [];
          const draft = exerciseDrafts[section.key] || {};
          return (
            <div key={section.key} style={{ background: theme.surface, borderRadius: 12, boxShadow: '0 2px 8px rgba(38, 49, 43, 0.08)', padding: 16, marginBottom: 16 }}>
              <h4 style={{ fontFamily: headingFont, fontSize: 15, margin: '0 0 10px', color: theme.ink }}>
                {section.icon} {section.label}
              </h4>
              {exercises.length === 0 ? (
                <p style={{ color: theme.inkSoft, fontSize: 13, margin: '0 0 10px' }}>No exercises added yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: '0 0 10px', padding: 0 }}>
                  {exercises.map((ex) => (
                    <li key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px', borderBottom: `1px solid ${theme.line}`, fontSize: 14 }}>
                      <span style={{ flex: 1, color: theme.ink }}>{ex.name}</span>
                      <span style={{ fontSize: 12.5, color: theme.inkSoft, whiteSpace: 'nowrap' }}>{ex.sets} sets × {ex.reps} reps</span>
                      <button
                        className="lh-fit-delete"
                        onClick={() => deleteExercise(section.key, ex.id)}
                        title="Remove"
                        style={{ background: 'none', border: 'none', color: theme.inkSoft, fontSize: 16, padding: '2px 6px', borderRadius: 6, cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Exercise name"
                  value={draft.name || ''}
                  onChange={(e) => updateDraft(section.key, 'name', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExercise(section.key)}
                  style={{ ...inputStyle, flex: '1 1 120px', minWidth: 120, padding: '8px 10px', fontSize: 13.5 }}
                />
                <input
                  type="number"
                  placeholder="Sets"
                  min="1"
                  value={draft.sets || ''}
                  onChange={(e) => updateDraft(section.key, 'sets', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExercise(section.key)}
                  style={{ ...inputStyle, width: 64, padding: '8px 8px', fontSize: 13.5 }}
                />
                <input
                  type="number"
                  placeholder="Reps"
                  min="1"
                  value={draft.reps || ''}
                  onChange={(e) => updateDraft(section.key, 'reps', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExercise(section.key)}
                  style={{ ...inputStyle, width: 64, padding: '8px 8px', fontSize: 13.5 }}
                />
                <button className="lh-fit-log-btn" onClick={() => handleAddExercise(section.key)} style={{ ...primaryButtonStyle, padding: '8px 16px', fontSize: 13 }}>
                  Add
                </button>
              </div>
            </div>
          );
        })
      )}

      {demoMode && (
        <p style={{ marginTop: 8, fontSize: 12, color: theme.inkSoft }}>
          🔧 Demo mode — fitness data shown here is just for show; nothing is saved.
        </p>
      )}
    </section>
  );
}
