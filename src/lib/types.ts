export type Area = 'Music' | 'School' | 'Work' | 'Fitness';

export type DumpType =
  | 'Task'
  | 'Project'
  | 'Goal'
  | 'Person'
  | 'Deadline'
  | 'Habit'
  | 'Problem'
  | 'Opportunity'
  | 'Decision'
  | 'Idea'
  | 'Note';

export interface DumpItem {
  id: string;
  type: DumpType;
  text: string;
  createdAt: number; // epoch ms
}

export interface Goal {
  id: string;
  area: Area;
  title: string;
  progress: number; // 0-100
  vision: string;
  year: string[];
  quarter: string[];
  month: string[];
  week: string[];
  today: string[];
}

export interface TopTask {
  id: string;
  text: string;
  area: Area;
  done: boolean;
}

export interface ScheduleItem {
  id: string;
  time: string; // 12-hour, e.g. "9:00 AM"
  label: string;
  tag: string;
}

export interface Habit {
  id: string;
  name: string;
  streak: number;
  done: boolean;
  lastDone: string | null; // ISO date (yyyy-mm-dd) of last completion
}

export interface ProjectField {
  k: string;
  v: string;
}

export interface Project {
  id: string;
  name: string;
  stage: string;
  pct: number; // 0-100
  phases: string[]; // milestone labels, in order
  current: number; // index of current phase
  color: string; // pastel hex, synced to life-area palette
  fields: ProjectField[];
}

export interface AreaScore {
  name: string;
  score: number; // 0-100
  trend: number; // signed delta over 30 days
  note: string;
}

export interface VaultNote {
  id: string;
  title: string;
  tag: string;
  date: string; // display date, e.g. "Jun 02"
  snippet: string;
  createdAt: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WeeklyReview {
  wins: string[];
  fails: string[];
  habits: string[];
  time: string[];
  progress: string[];
  changes: string[];
}

export interface Reflection {
  date: string; // ISO date
  answers: [string, string, string, string, string];
  output: string | null;
}

export interface MorningAction {
  action: string;
  why: string;
}

export type CoachTone = 'direct' | 'supportive' | 'analytical';
export type ProviderKind = 'stub' | 'anthropic';

export interface Settings {
  dark: boolean;
  coachTone: CoachTone;
  topCount: number; // 1-5
  provider: ProviderKind;
  apiKey: string;
  model: string;
}

/** Everything the app persists, as one object. The Electron backend maps
 *  this onto proper SQLite tables; the browser backend stores it whole. */
export interface PersistedState {
  dumpItems: DumpItem[];
  goals: Goal[];
  topTasks: TopTask[];
  schedule: ScheduleItem[];
  habits: Habit[];
  projects: Project[];
  areaScores: AreaScore[];
  vault: VaultNote[];
  chat: ChatMessage[];
  patterns: string[];
  weekly: WeeklyReview;
  /** Reflections stored by date, newest first. */
  reflections: Reflection[];
  morning: MorningAction[];
  eveningText: string;
  settings: Settings;
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/** The prototype's window.claude.complete() accepted either a plain prompt
 *  string or {system, messages}. AIProvider keeps that contract. */
export type CompletionRequest = string | { system: string; messages: ChatTurn[] };

export interface AIProvider {
  complete(request: CompletionRequest): Promise<string>;
}
