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

/** Thrown when a feature needs the live engine and no API key is connected.
 *  The UI turns it into plain copy instead of ever showing invented output. */
export const NO_ENGINE = 'NO_ENGINE';

export function isNoEngine(e: unknown): boolean {
  return e instanceof Error && e.message === NO_ENGINE;
}

/** Offline fallback. The one thing it does for real is brain-dump
 *  classification, a local heuristic over the person's own words. Everything
 *  else, strategist advice, patterns, reviews, reads, and the coach, is an
 *  observation about a life, and observations must come from the live engine
 *  reading real data. Rather than invent a plausible answer, this refuses. */
export class StubProvider implements AIProvider {
  async complete(request: CompletionRequest): Promise<string> {
    if (typeof request === 'string' && request.includes('Split this brain dump')) {
      await sleep(300 + Math.random() * 300);
      return classifyDump(request);
    }
    throw new Error(NO_ENGINE);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
