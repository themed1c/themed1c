import type { AreaScore, PersistedState } from './types';

const clamp = (n: number) => Math.max(0, Math.min(99, Math.round(n)));

const POSITIVE = /\b(good|great|well|proud|won|finished|focused|energized|calm|progress|best)\b/i;
const NEGATIVE = /\b(bad|tired|stressed|anxious|failed|behind|distracted|wasted|slipped|late)\b/i;

/** Whether the person has logged anything the score model can read. With
 *  nothing to read, the UI shows a dash: a number here would be an invention
 *  dressed up as a measurement. */
export function hasActivity(
  s: Pick<PersistedState, 'habits' | 'topTasks' | 'reflections'>,
): boolean {
  return s.habits.length > 0 || s.topTasks.length > 0 || s.reflections.length > 0;
}

/** Area scores = persisted 30-day baselines nudged by live signals: today's
 *  habit adherence, task completion, streak strength, and the sentiment of
 *  recent reflections. Simple by design; the baselines live in the DB so a
 *  smarter model can replace this without touching the UI. */
export function computeAreaScores(
  s: Pick<PersistedState, 'areaScores' | 'habits' | 'topTasks' | 'reflections'>,
): AreaScore[] {
  // No signal, no nudge: leave the baselines untouched rather than drifting
  // them to numbers that look like findings.
  if (!hasActivity(s)) return s.areaScores;
  const habitRatio = s.habits.length ? s.habits.filter((h) => h.done).length / s.habits.length : 0;
  const taskRatio = s.topTasks.length ? s.topTasks.filter((t) => t.done).length / s.topTasks.length : 0;
  const bestStreak = s.habits.reduce((m, h) => Math.max(m, h.streak), 0);

  let sentiment = 0;
  for (const r of s.reflections.slice(0, 3)) {
    const text = r.answers.join(' ');
    if (POSITIVE.test(text)) sentiment += 1;
    if (NEGATIVE.test(text)) sentiment -= 1;
  }

  return s.areaScores.map((a) => {
    let delta = 0;
    switch (a.name) {
      case 'Habits':
        delta = (habitRatio - 0.5) * 8;
        break;
      case 'Health':
        delta = (habitRatio - 0.5) * 4 + Math.min(bestStreak, 10) * 0.3;
        break;
      case 'Projects':
      case 'Learning':
        delta = (taskRatio - 0.5) * 6;
        break;
      case 'Mental clarity':
      case 'Energy':
        delta = sentiment * 2 + (habitRatio - 0.5) * 3;
        break;
      case 'Stress':
        delta = -sentiment * 2 - (taskRatio - 0.5) * 3;
        break;
      default:
        delta = (taskRatio + habitRatio - 1) * 2;
    }
    return { ...a, score: clamp(a.score + delta) };
  });
}

/** Prototype formula, kept intentionally. */
export function focusScore(s: Pick<PersistedState, 'habits' | 'topTasks'>): number {
  const doneTasks = s.topTasks.filter((t) => t.done).length;
  const habitsDone = s.habits.filter((h) => h.done).length;
  return Math.min(99, Math.round(42 + doneTasks * 14 + habitsDone * 7));
}
