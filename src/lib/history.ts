import type { HistoryDay, PersistedState } from './types';
import { focusScore } from './scores';
import { todayISO } from './time';

/* The daily ledger: one HistoryDay per calendar day, updated in place as the
 * day is lived. Everything here is pure so the store can compute the entry
 * from the state it is about to commit. */

const MAX_DAYS = 1500; // roughly four years of daily use

export function historyEntryFor(s: PersistedState, date = todayISO()): HistoryDay {
  const [y, m, d] = date.split('-').map((n) => parseInt(n, 10));
  const dayStart = new Date(y, m - 1, d).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  return {
    date,
    focus: focusScore(s),
    tasksDone: s.topTasks.filter((t) => t.done).map((t) => t.text),
    tasksTotal: s.topTasks.length,
    habitsDone: s.habits.filter((h) => h.done).map((h) => h.name),
    habitsTotal: s.habits.length,
    captured: s.dumpItems.filter((i) => i.createdAt >= dayStart && i.createdAt < dayEnd).length,
    reflected: s.reflections.some((r) => r.date === date),
  };
}

export function upsertHistory(history: HistoryDay[], entry: HistoryDay): HistoryDay[] {
  const rest = history.filter((h) => h.date !== entry.date);
  return [...rest, entry].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-MAX_DAYS);
}

/** Serialized ledger for the engine: the last 14 days verbatim, then a
 *  month-by-month digest of everything older. Empty string when unused. */
export function historyContext(history: HistoryDay[]): string {
  if (!history.length) return '';
  const recent = history.slice(-14).reverse();
  const dayLines = recent.map((h) => {
    const tasks = h.tasksDone.length ? ` (${h.tasksDone.slice(0, 3).join('; ')})` : '';
    const habits = h.habitsDone.length ? ` (${h.habitsDone.join(', ')})` : '';
    const extras = [h.reflected ? 'reflected' : '', h.captured ? `captured ${h.captured}` : '']
      .filter(Boolean)
      .join(', ');
    return `- ${h.date}: focus ${h.focus}, tasks ${h.tasksDone.length}/${h.tasksTotal}${tasks}, habits ${h.habitsDone.length}/${h.habitsTotal}${habits}${extras ? `, ${extras}` : ''}`;
  });

  const older = history.slice(0, -14);
  const byMonth = new Map<
    string,
    { days: number; habit: number[]; task: number[]; focus: number[]; reflections: number }
  >();
  for (const h of older) {
    const key = h.date.slice(0, 7);
    const m = byMonth.get(key) ?? { days: 0, habit: [], task: [], focus: [], reflections: 0 };
    m.days += 1;
    if (h.habitsTotal) m.habit.push(h.habitsDone.length / h.habitsTotal);
    if (h.tasksTotal) m.task.push(h.tasksDone.length / h.tasksTotal);
    m.focus.push(h.focus);
    if (h.reflected) m.reflections += 1;
    byMonth.set(key, m);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const monthLines = [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12)
    .map(
      ([k, m]) =>
        `- ${k}: ${m.days} days tracked, habits ${Math.round(avg(m.habit) * 100)}%, tasks ${Math.round(avg(m.task) * 100)}%, average focus ${Math.round(avg(m.focus))}, ${m.reflections} reflections`,
    );

  return (
    `\n\nDAY BY DAY (their real activity, newest first):\n${dayLines.join('\n')}` +
    (monthLines.length ? `\n\nMONTH BY MONTH (older):\n${monthLines.join('\n')}` : '')
  );
}
