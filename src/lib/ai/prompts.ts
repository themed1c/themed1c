import type {
  ChatTurn, CoachTone, Goal, Habit, DumpItem, HistoryDay, Reflection, Settings,
  TopTask, PersistedState, VaultNote,
} from '../types';
import { historyContext } from '../history';

/** Serialized snapshot of the user's data, prefixed to every AI call. Derived
 *  from the design prototype's context, extended with the person's own "about
 *  me" (replacing the prototype's canned persona), the daily history ledger,
 *  and their most recent reflection so the engine sees the whole person. */
export function buildContext(s: {
  goals: Goal[];
  topTasks: TopTask[];
  habits: Habit[];
  dumpItems: DumpItem[];
  patterns: string[];
  memory: string[];
  history: HistoryDay[];
  reflections: Reflection[];
  settings: Settings;
}): string {
  const about = s.settings.aboutMe.trim()
    ? `Who they are, in their own words: ${s.settings.aboutMe.trim()}`
    : 'Learn who they are from their data below; never assume a life they have not described.';
  const g = s.goals
    .map((g) => `- [${g.area}] ${g.title} (${g.progress}% done). This week: ${g.week.join('; ')}`)
    .join('\n');
  const t = s.topTasks.map((t) => `- ${t.text}${t.done ? ' (done)' : ''}`).join('\n');
  const h = s.habits
    .map((h) => `- ${h.name}: ${h.streak}-day streak, ${h.done ? 'done today' : 'not done today'}`)
    .join('\n');
  const d = s.dumpItems.slice(0, 15).map((d) => `- (${d.type}) ${d.text}`).join('\n');
  const p = s.patterns.map((p) => `- ${p}`).join('\n');
  const mem = s.memory.length
    ? `\n\nWHAT YOU HAVE LEARNED ABOUT THEM OVER TIME (quietly fold this into every answer):\n${s.memory.map((m) => `- ${m}`).join('\n')}`
    : '';
  const last = s.reflections[0];
  const lastAnswers = last ? last.answers.filter(Boolean).join(' · ') : '';
  const refl =
    last && (lastAnswers || last.output)
      ? `\n\nTHEIR MOST RECENT REFLECTION (${last.date}):\n${lastAnswers.slice(0, 400)}${
          last.output ? `\nThe read they got back: ${last.output.slice(0, 300)}` : ''
        }`
      : '';
  return `You are the quiet engine inside a personal life-organization system. ${about} Never mention being an AI; speak like a sharp, warm, plainspoken coach. Be concrete and reference their real data.\n\nGOALS:\n${g}\n\nTODAY'S TOP TASKS:\n${t}\n\nHABITS:\n${h}\n\nRECENT BRAIN DUMP:\n${d}\n\nOBSERVED PATTERNS:\n${p}${mem}${historyContext(s.history)}${refl}\n\nNever use an em dash in any response; use commas, colons, or periods instead.`;
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

  coachSystem(context: string, tone: string, chatSummary?: string): string {
    const summary = chatSummary?.trim()
      ? `\n\nEARLIER IN THIS ONGOING CONVERSATION (condensed; the recent messages follow live): ${chatSummary.trim()}`
      : '';
    return context + summary + '\n' + tone + ' Keep replies under 120 words.';
  },

  /** Rolls messages older than the live window into a running summary so long
   *  coach histories stay cheap and sharp. Background action, never surfaced. */
  summarizeChat(prevSummary: string, turns: ChatTurn[]): string {
    const lines = turns
      .map((t) => `${t.role === 'user' ? 'Them' : 'Coach'}: ${t.content}`)
      .join('\n');
    return (
      'Condense the earlier part of this coaching conversation into a running summary the coach can rely on later. Keep durable facts, open threads, commitments made, and how they were feeling; drop greetings and filler. Under 180 words, plain text, no em dashes, no headers.\n\nCURRENT SUMMARY:\n' +
      (prevSummary.trim() || '(none yet)') +
      '\n\nNEW EXCHANGES:\n' +
      lines
    );
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
