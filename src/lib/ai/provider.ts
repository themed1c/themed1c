import type { AIProvider, CompletionRequest, ChatTurn, DumpType, Settings } from '../types';
import type { Backend } from '../backend';

function toPayload(request: CompletionRequest): { system: string; messages: ChatTurn[] } {
  return typeof request === 'string'
    ? { system: '', messages: [{ role: 'user' as const, content: request }] }
    : { system: request.system, messages: request.messages };
}

/** The Anthropic Messages API requires the history to start with a user turn
 *  and alternate roles: drop the seeded assistant greeting and merge any
 *  consecutive same-role turns (a failed send can leave two user turns). */
function normalizeForAnthropic(messages: ChatTurn[]): ChatTurn[] {
  const out: ChatTurn[] = [];
  for (const m of messages) {
    if (!out.length && m.role === 'assistant') continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) {
      out[out.length - 1] = { ...prev, content: prev.content + '\n\n' + m.content };
    } else {
      out.push(m);
    }
  }
  return out;
}

/** Calls the Anthropic Messages API through the backend (main process in
 *  Electron, direct fetch in the browser). */
export class AnthropicProvider implements AIProvider {
  constructor(
    private backend: Backend,
    private getSettings: () => Settings,
  ) {}

  async complete(request: CompletionRequest): Promise<string> {
    const settings = this.getSettings();
    if (!settings.apiKey) throw new Error('missing API key');
    const payload = toPayload(request);
    return this.backend.aiComplete({
      provider: 'anthropic',
      system: payload.system,
      messages: normalizeForAnthropic(payload.messages),
      apiKey: settings.apiKey,
      model: settings.model || 'claude-opus-4-8',
    });
  }
}

/** Calls the OpenAI Chat Completions API through the backend, same shape as
 *  the Anthropic path; lets the engine run on a ChatGPT-maker (OpenAI) key. */
export class OpenAIProvider implements AIProvider {
  constructor(
    private backend: Backend,
    private getSettings: () => Settings,
  ) {}

  async complete(request: CompletionRequest): Promise<string> {
    const settings = this.getSettings();
    if (!settings.openaiApiKey) throw new Error('missing API key');
    const payload = toPayload(request);
    return this.backend.aiComplete({
      provider: 'openai',
      ...payload,
      apiKey: settings.openaiApiKey,
      model: settings.openaiModel || 'gpt-5.1',
    });
  }
}

/** Offline engine: contract-appropriate canned responses so every feature
 *  works before an API key is added. Brain-dump classification is a real
 *  local heuristic; the rest are plausible fixed outputs. */
export class StubProvider implements AIProvider {
  async complete(request: CompletionRequest): Promise<string> {
    await sleep(500 + Math.random() * 500);
    if (typeof request !== 'string') return coachReply(request.messages);

    const p = request;
    if (p.includes('Maintain their private preference list')) return learnedPrefs(p);
    if (p.includes('Condense the earlier part of this coaching conversation')) return chatSummaryStub(p);
    if (p.includes('Assess their money picture')) return FINANCE_TEXT;
    if (p.includes('Split this brain dump')) return classifyDump(p);
    if (p.includes('highest-impact tasks for today')) return REPLAN_JSON;
    if (p.includes('Rebuild the roadmap for the goal')) return cascadeFor(p);
    if (p.includes('Surface 4 behavioral patterns')) return PATTERNS_JSON;
    if (p.includes('Tonight’s reflection')) return REFLECTION_TEXT;
    if (p.includes('Write this week’s review')) return WEEKLY_JSON;
    if (p.includes('threads the person has forgotten')) return CONNECTIONS_TEXT;
    if (p.includes('You are the strategist')) return MORNING_JSON;
    if (p.includes('Evening debrief')) return EVENING_TEXT;
    return 'Noted. Keep going: the next right thing is usually the smallest one on the list.';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------- preference learning: keep what's known, add what the material
 * clearly supports. Offline stand-in for the real learn prompt. ---------- */

function learnedPrefs(prompt: string): string {
  const existing: string[] = [];
  const m = prompt.match(/KNOWN PREFERENCES:\n([\s\S]*?)\n\nNEW MATERIAL/);
  if (m) {
    for (const line of m[1].split('\n')) {
      const t = line.replace(/^-\s*/, '').trim();
      if (t && t !== '(none yet)') existing.push(t);
    }
  }
  const material = prompt.slice(prompt.indexOf('NEW MATERIAL'));
  const has = (s: string) => existing.some((e) => e.toLowerCase().includes(s));
  const additions: string[] = [];
  if (/\b(morning|before 11|early)\b/i.test(material) && !has('morning'))
    additions.push('Does their best focused work in the morning; protect the first 90 minutes.');
  if (/\b(late|past 1|midnight|sleep)\b/i.test(material) && !has('late'))
    additions.push('Late nights cost the next morning; an earlier stop beats a longer push.');
  if (/\b(gym|run|train|workout)\b/i.test(material) && !has('training'))
    additions.push('Training days lift mood and focus; the workout slot is worth guarding.');
  if (!existing.length && !additions.length)
    additions.push('Responds better to one clear next step than a long list.');
  return JSON.stringify([...existing, ...additions].slice(0, 12));
}

const FINANCE_TEXT =
  'Position: income covers spending with a thin margin, and savings grow only in the months you automate the transfer. The numbers say consistency, not income, is the constraint.\n\nBiggest lever: fix the transfer on payday before discretionary spending starts. Recurring small purchases are the bulk of the leak; cap them with a weekly figure and stop tracking every line.\n\nWorth researching: a broad index fund (S&P 500 or total market) as the default for long-horizon money; a high-yield savings account for the emergency floor; one sector you actually understand from your own work, studied before any position. These are directions to research, not financial advice.';

/* ---------- coach summary: offline stand-in for the rolling condensation */

function chatSummaryStub(prompt: string): string {
  const m = prompt.match(/CURRENT SUMMARY:\n([\s\S]*?)\n\nNEW EXCHANGES:/);
  const prev = m && m[1].trim() !== '(none yet)' ? m[1].trim() : '';
  const canned =
    'They check in most about what to do next and how to handle overwhelm; recurring threads are protecting morning focus, finishing nearly done work, and keeping evenings from dissolving. The coach keeps pointing them back to one concrete next step.';
  if (prev.includes('one concrete next step')) return prev;
  return (prev ? prev + ' ' : '') + canned;
}

/* ---------- brain dump: local heuristic classification ---------- */

function classifyDump(prompt: string): string {
  const marker = 'Brain dump:\n';
  const text = prompt.slice(prompt.indexOf(marker) + marker.length);
  const pieces = text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim().replace(/^[-*•]\s*/, ''))
    .filter((s) => s.length > 2);
  const items = pieces.map((t) => ({ type: guessType(t), text: t.slice(0, 120) }));
  return JSON.stringify(items.length ? items : [{ type: 'Note', text: text.trim().slice(0, 120) }]);
}

function guessType(t: string): DumpType {
  const s = t.toLowerCase();
  if (/\b(due|deadline|by (mon|tues|wednes|thurs|fri|satur|sun)day|by \d|before \d)/.test(s)) return 'Deadline';
  if (/\b(decide|choose|vs\.?|or should i|whether)\b/.test(s)) return 'Decision';
  if (/\b(every (day|morning|night|week)|stop |start |quit |daily|routine)\b/.test(s)) return 'Habit';
  if (/\b(problem|stuck|broken|killing|can't|cannot|struggling|behind on)\b/.test(s)) return 'Problem';
  if (/\b(opportunity|offered|asked if|could lead|might open)\b/.test(s)) return 'Opportunity';
  if (/\b(idea|what if|maybe try|concept|sample)\b/.test(s)) return 'Idea';
  if (/\b(project)\b/.test(s)) return 'Project';
  if (/\b(goal|by december|by june|this year)\b/.test(s)) return 'Goal';
  if (/\b(owes|follow up with|ask|text|meet|call)\b.*\b[A-Z][a-z]+/.test(t) || /^[A-Z][a-z]+ (owes|wants|asked|said)/.test(t)) return 'Person';
  if (/^(email|call|finish|send|buy|fix|book|schedule|write|submit|clean|pay|update|practice|review)\b/.test(s)) return 'Task';
  if (/\b(need to|have to|should|must|remember to|don't forget)\b/.test(s)) return 'Task';
  return 'Note';
}

/* ---------- canned contract outputs ---------- */

const REPLAN_JSON = JSON.stringify([
  { text: 'Problem set 6, questions 3-5, before 11:30 AM', area: 'School' },
  { text: 'Send Maya one clear ask: comps by Thursday', area: 'Music' },
  { text: 'Pull day at 6:30 PM, protect it', area: 'Fitness' },
  { text: 'Set up the automatic $200 transfer', area: 'Work' },
  { text: '20 min: annotate one lit-review source', area: 'School' },
]);

function cascadeFor(prompt: string): string {
  const m = prompt.match(/Rebuild the roadmap for the goal "([^"]+)"/);
  const title = m ? m[1] : 'this goal';
  return JSON.stringify({
    vision: `Steady, visible progress until ${title.toLowerCase()} is simply done.`,
    year: ['Hit the headline number', 'Build the routine that makes it automatic'],
    quarter: ['Clear the current bottleneck', 'Lock the weekly rhythm that moves this'],
    month: ['Finish the piece that is 80% done', 'Remove one recurring blocker'],
    week: ['Two focused blocks on the hardest part', 'One small win to keep momentum'],
    today: ['One 45-minute block on the next concrete step'],
  });
}

const PATTERNS_JSON = JSON.stringify([
  'You’ve written about the mixing side-hustle 11 times in six weeks, but it has never once appeared as a scheduled task.',
  'Your best study blocks are Tuesday and Thursday before 11 AM. Afternoon blocks finish at roughly half that completion rate.',
  'In every week you skipped the gym twice or more, your reflections mentioned stress about three times as often.',
  'Deep work reliably stops when your 2 PM shift starts. The studio only ever gets your leftover energy.',
]);

const REFLECTION_TEXT =
  'Honest read: the day went to whatever shouted loudest, and the thesis stayed quiet. Protect tomorrow’s first 90 minutes, phone in the other room, problem set open before anything else. Drop the late-night mix tweaking: it costs the morning and the mix will still be there Thursday.';

const WEEKLY_JSON = JSON.stringify({
  wins: ['Problem set 5 back: 94%, best score this term', 'Two full studio sessions; Night Drive verse is locked', 'Gym 4 of 4 planned days, squat up to 235 lb'],
  fails: ['Lit review untouched for the second week running', 'Slept past 1 AM three nights, all after closing shifts', 'The $200 transfer still isn’t automated'],
  habits: ['Gym: 4/4 · Practice: 5/7 · Reading: 2/7 · Phone-free study: 6/7'],
  time: ['School 19h · Work 16h · Music 7h · Training 5h · Untracked evenings: ~9h'],
  progress: ['EP 34% to 38% · GPA track: steady · Savings 39% to 41% · Squat +10 lb'],
  changes: ['Move lit review to Tue/Thu mornings, your proven deep-work slots', 'Swap one closing shift; late closes cost you the next morning', 'Automate the transfer Friday, then stop thinking about money daily'],
});

const CONNECTIONS_TEXT =
  '• Your thesis direction (pitch-correction artifacts) and the EP are the same project wearing two jackets: every mixing note you file is quietly literature review.\n• The Deep Work chapter and your "after the gym" note agree: your calendar already knows your best hours, you just haven’t moved the thesis into them.\n• The money rules note solves the interface debate you keep reopening: DJ-night income is the answer you already wrote down.';

const MORNING_JSON = JSON.stringify([
  { action: 'Problem set 6 before 11 AM, your proven window', why: 'It’s due Friday and gates the GPA goal. Morning-you finishes these in half the time.' },
  { action: 'Send Maya one specific ask: comps by Thursday', why: 'Track 2 is the EP’s critical path. One clear message unblocks two weeks of drift.' },
  { action: 'Automate the $200 transfer: 10 minutes, then never again', why: 'It’s been on the list 9 days. Recurring guilt costs more attention than the task.' },
]);

const EVENING_TEXT =
  'Today moved the needle where it counted: the problem set is closer and the gym streak held, and both feed goals you actually care about. What slowed you down was the shift bleeding into the evening, again. Tomorrow, put the hardest 90 minutes before anything social or scrollable, and give the studio a real slot instead of leftovers. Same plan, better order.';

/* ---------- coach ---------- */

function coachReply(messages: ChatTurn[]): string {
  const last = [...messages].reverse().find((m) => m.role === 'user')?.content.toLowerCase() ?? '';
  if (last.includes('overwhelmed'))
    return 'Overwhelm is usually five tasks pretending to be fifty. Write the five down, pick the one due soonest, set a timer for 25 minutes, and start. The rest can wait their turn.';
  if (last.includes('next'))
    return 'Problem set 6 is due Friday and it gates the GPA goal, so that is the next block. After the shift, give the studio 45 focused minutes on the bridge. Everything else is optional today.';
  if (last.includes('avoiding'))
    return 'The lit review. It has been two weeks, and it never appears before 9 PM, which means it never really appears. Put it in the Tuesday 9 AM slot where your good work actually happens.';
  if (last.includes('wasting'))
    return 'Not wasting, leaking. The gym and the problem sets are on track. The leak is the hour after closing shifts: no plan, so it becomes the phone. Decide tonight what that hour is for.';
  return 'Say more. What does the next hour look like if it goes well, and what usually gets in the way?';
}
