export type SrsState = {
  ease: number;
  interval_days: number;
  repetitions: number;
  due_at: number;
  lapses: number;
  last_reviewed_at: number | null;
};

// Applies a lightweight SM-2 update and returns a new SRS state.
export function applySm2(state: SrsState, grade: 0 | 3 | 5): SrsState {
  const now = Date.now();

  let ease = state.ease ?? 2.5;
  let interval = state.interval_days ?? 0;
  let reps = state.repetitions ?? 0;
  let lapses = state.lapses ?? 0;

  if (grade < 3) {
    reps = 0;
    interval = 1;
    lapses += 1;
    ease = Math.max(1.3, ease - 0.2);
    return {
      ease,
      interval_days: interval,
      repetitions: reps,
      due_at: now + interval * 24 * 60 * 60 * 1000,
      lapses,
      last_reviewed_at: now,
    };
  }

  // grade >= 3
  reps += 1;

  if (reps === 1) interval = 1;
  else if (reps === 2) interval = 6;
  else interval = Math.round(interval * ease);

  // SM-2 ease update with grade 3/5
  const g = grade;
  ease = ease + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02));
  ease = Math.max(1.3, ease);

  return {
    ease,
    interval_days: interval,
    repetitions: reps,
    due_at: now + interval * 24 * 60 * 60 * 1000,
    lapses,
    last_reviewed_at: now,
  };
}
