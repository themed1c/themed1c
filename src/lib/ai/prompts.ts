import type { CoachTone, Goal, Habit, DumpItem, TopTask, PersistedState, VaultNote } from '../types';

/** Serialized snapshot of the user's data, prefixed to every AI call.
 *  Wording matches the design prototype exactly. */
export function buildContext(s: {
  goals: Goal[];
  topTasks: TopTask[];
  habits: Habit[];
  dumpItems: DumpItem[];
  patterns: string[];
  memory: string[];
}): string {
  const g = s.goals
    .map((g) => `- [${g.area}] ${g.title} (${g.progress}% done). This week: ${g.week.join('; ')}`)
    .join('\n');
  const t = s.topTasks.map((t) => `- ${t.text}${t.done ? ' (done)' : ''}`).join('\n');
  const h = s.habits
    .map((h) => `- ${h.name}: ${h.streak}-day streak, ${h.done ? 'done today' : 'not done today'}`)
    .join('\n');
  const d = s.dumpItems.slice(0, 10).map((d) => `- (${d.type}) ${d.text}`).join('\n');
  const p = s.patterns.map((p) => `- ${p}`).join('\n');
  const mem = s.memory.length
    ? `\n\nWHAT YOU HAVE LEARNED ABOUT THEM OVER TIME (quietly fold this into every answer):\n${s.memory.map((m) => `- ${m}`).join('\n')}`
    : '';
  return `You are the quiet engine inside a personal life-organization system. The user is a student who works part-time at a record store, is producing a 5-track EP ("Night Drive"), and trains (squat + 5K). Never mention being an AI; speak like a sharp, warm, plainspoken coach. Be concrete and reference their real data.\n\nGOALS:\n${g}\n\nTODAY'S TOP TASKS:\n${t}\n\nHABITS:\n${h}\n\nRECENT BRAIN DUMP:\n${d}\n\nOBSERVED PATTERNS:\n${p}${mem}\n\nNever use an em dash in any response; use commas, colons, or periods instead.`;
}

export function toneInstruction(tone: CoachTone): string {
  return {
    direct: 'Be direct and brief. No fluff.',
    supportive: 'Be warm and encouraging first, practical second.',
    analytical: 'Be analytical: reason from the data, cite specifics.',
  }[tone];
}

export const REFLECTION_QUESTIONS = [
  'What went well?',
  'What didn’t?',
  'What distracted you?',
  'Did today move you toward your goals?',
  'What should tomorrow focus on?',
];

export const prompts = {
  brainDump(text: string): string {
    return (
      'Split this brain dump into atomic items and classify each. Types: Task, Project, Goal, Person, Deadline, Habit, Problem, Opportunity, Decision, Idea, Note. Reply ONLY with a JSON array like [{"type":"Task","text":"..."}]. Keep each text under 120 chars, first person preserved. Never use em dashes.\n\nBrain dump:\n' +
      text
    );
  },

  replanTop(context: string, n: number, schedule: string): string {
    return (
      context +
      `\n\nPick the ${n} highest-impact tasks for today given the schedule (${schedule}). Always write times in 12-hour AM/PM format. Reply ONLY with JSON: [{"text":"...","area":"Music|School|Work|Fitness"}]. Each under 70 chars.`
    );
  },

  goalCascade(context: string, title: string, progress: number): string {
    return (
      context +
      `\n\nRebuild the roadmap for the goal "${title}" (currently ${progress}% complete), reflecting current progress. Reply ONLY with JSON: {"vision":"one sentence","year":["1-2 items"],"quarter":["2 items"],"month":["2 items"],"week":["2 items"],"today":["1 item"]}. Each item under 90 chars, concrete and specific to this person.`
    );
  },

  patterns(context: string): string {
    return (
      context +
      '\n\nAct as an objective observer. Surface 4 behavioral patterns this person likely hasn’t noticed, drawn from the data above. Each one specific, slightly uncomfortable, evidence-flavored (counts, days, times). Reply ONLY with a JSON array of 4 strings, each under 180 chars.'
    );
  },

  reflection(context: string, tone: string, answers: string[]): string {
    const qa = REFLECTION_QUESTIONS.map((q, i) => q + '\n' + (answers[i] || '(skipped)')).join('\n\n');
    return (
      context +
      '\n' +
      tone +
      '\n\nTonight’s reflection:\n' +
      qa +
      '\n\nRespond in under 100 words: one honest observation, one thing to protect tomorrow, one thing to drop. Plain text, no headers.'
    );
  },

  weekly(context: string): string {
    return (
      context +
      '\n\nWrite this week’s review. Reply ONLY with JSON: {"wins":["3 items"],"fails":["3 items"],"habits":["1 summary line"],"time":["1 summary line"],"progress":["1 summary line"],"changes":["3 recommended changes"]}. Concrete, specific to this person, each item under 110 chars.'
    );
  },

  vaultConnections(context: string, vault: VaultNote[]): string {
    const notes = vault.map((v) => `- ${v.title} (${v.tag}, ${v.date}): ${v.snippet}`).join('\n');
    return (
      context +
      '\n\nVAULT:\n' +
      notes +
      '\n\nFind 2-3 non-obvious connections between these notes and the goals: threads the person has forgotten. Under 90 words total, plain text, one connection per line starting with •.'
    );
  },

  strategistMorning(context: string): string {
    return (
      context +
      '\n\nYou are the strategist. If this person wants to become who they described in their visions, what are the 3 highest-impact actions today? Reply ONLY with JSON: [{"action":"under 70 chars","why":"under 120 chars"}].'
    );
  },

  strategistEvening(context: string, done: string, tone: string): string {
    return (
      context +
      `\n\nCompleted today: ${done}.\n\nEvening debrief in under 110 words, plain text: what moved them closer to their goals, what slowed them down, and how tomorrow’s plan should change. ` +
      tone
    );
  },

  coachSystem(context: string, tone: string): string {
    return context + '\n' + tone + ' Keep replies under 120 words.';
  },

  /** Background learning pass: runs quietly after reflections and coach
   *  exchanges. No buildContext prefix on purpose (keeps it cheap and keeps
   *  its stub trigger phrase out of every other prompt). */
  learn(memory: string[], source: string, material: string): string {
    const known = memory.length ? memory.map((m) => `- ${m}`).join('\n') : '- (none yet)';
    return (
      'You quietly observe how one person uses their life-organization system. Maintain their private preference list: durable preferences, rhythms, and tendencies, never to-dos.\n\nKNOWN PREFERENCES:\n' +
      known +
      '\n\nNEW MATERIAL (' +
      source +
      '):\n' +
      material +
      '\n\nRewrite the full list: keep items that still hold, sharpen or drop anything the new material contradicts, add at most 2 new items ONLY if clearly supported. Each item one plain sentence under 110 chars, written about "them". Never use em dashes. Reply ONLY with a JSON array of strings, at most 12 items.'
    );
  },
};

export function scheduleSummary(s: Pick<PersistedState, 'schedule'>): string {
  return s.schedule.map((x) => `${x.label.toLowerCase()} ${x.time}`).join(', ');
}
