import type { PersistedState } from './types';
import { DEFAULT_AREAS } from './types';

/* The app ships with nothing invented. No sample goals, notes, habits, or
 * streaks, and above all no canned engine output: patterns, weekly reviews,
 * area-score readings, and strategist advice must be written by the engine
 * from the person's real data, never shipped as decoration. Anything that
 * looks like a finding has to be one.
 *
 * The only defaults here are empty scaffolds: the life-area rows the dashboard
 * needs (all reading "No data yet"), and one line in the coach thread telling
 * the person how to start. */

/** A clean slate. Settings are layered on by the caller. */
export function seedFresh(): Omit<PersistedState, 'settings'> {
  return {
    dumpItems: [],
    goals: [],
    topTasks: [],
    schedule: [],
    habits: [],
    projects: [],
    // Neutral baselines, not measurements. The note says so plainly, and the
    // score model nudges these once real activity exists.
    areaScores: [
      { name: 'Career', score: 50, trend: 0, note: 'No data yet' },
      { name: 'Money', score: 50, trend: 0, note: 'No data yet' },
      { name: 'Health', score: 50, trend: 0, note: 'No data yet' },
      { name: 'Learning', score: 50, trend: 0, note: 'No data yet' },
      { name: 'Relationships', score: 50, trend: 0, note: 'No data yet' },
      { name: 'Focus', score: 50, trend: 0, note: 'No data yet' },
    ],
    vault: [],
    chat: [
      {
        role: 'assistant',
        content:
          'State what you are working on, or ask for the day’s priorities. Replies are grounded in your data.',
      },
    ],
    patterns: [],
    weekly: { wins: [], fails: [], habits: [], time: [], progress: [], changes: [] },
    reflections: [],
    morning: [],
    morningDate: '',
    eveningText: '',
    eveningDate: '',
    memory: [],
    history: [],
    finance: [],
    financeRead: '',
    social: null,
    socialHistory: [],
    chatSummary: '',
    chatSummarized: 0,
  };
}

/** First-run state: the clean slate plus default settings. */
export function seedState(): PersistedState {
  return {
    ...seedFresh(),
    settings: {
      dark: false,
      topCount: 3,
      provider: 'stub',
      apiKey: '',
      model: 'claude-opus-4-8',
      openaiApiKey: '',
      openaiModel: 'gpt-5.1',
      aboutMe: '',
      onboarded: false,
      weeklyDay: new Date().getDay(),
      runInBackground: true,
      lastWeeklyNotice: '',
      areas: DEFAULT_AREAS,
    },
  };
}

/** Pastel palette for life areas and roadmap milestone maps (fill start, fill end). */
export const PASTELS: [string, string][] = [
  ['#AFC4E0', '#C9D8EC'], // powder blue
  ['#B4D6BC', '#CDE5D3'], // pastel green
  ['#F0BFB0', '#F7D6CB'], // peach
  ['#CDBFE6', '#DFD5F0'], // lavender
  ['#EFC3D3', '#F6D8E3'], // blush
  ['#EFD9A8', '#F6E6C3'], // butter
  ['#B2DCD3', '#CBE9E2'], // mint
  ['#C9D6A8', '#DBE4C2'], // pistachio
  ['#F0CFA6', '#F6DFC1'], // apricot
  ['#CFC5D2', '#DFD8E1'], // grey-lilac
];
