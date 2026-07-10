/** Goal/task areas are user-defined labels; the list lives in settings.areas. */
export type Area = string;

/** Default areas for the sample data and for anyone who never customizes. */
export const DEFAULT_AREAS: Area[] = ['Music', 'School', 'Work', 'Fitness'];

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
  /** When set (yyyy-mm-dd), the block applies to that day only and is removed
   *  on the next day's first load. Unset means it repeats daily. */
  once?: string;
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

export type FinanceKind = 'income' | 'expense' | 'saving';

/** One money movement, entered by hand. Amounts are positive numbers; the
 *  kind carries the direction. */
export interface FinanceEntry {
  id: string;
  date: string; // yyyy-mm-dd, local
  label: string;
  amount: number;
  kind: FinanceKind;
}

/** One day of lived activity: what actually got done. The ledger the engine
 *  mines so months of use make it genuinely smarter about the person. */
export interface HistoryDay {
  date: string; // yyyy-mm-dd, local
  focus: number;
  tasksDone: string[]; // texts of completed top tasks
  tasksTotal: number;
  habitsDone: string[]; // names of habits completed
  habitsTotal: number;
  captured: number; // brain-dump items captured that day
  reflected: boolean;
}

export type SocialPlatform = 'instagram' | 'tiktok';

/** What one public-profile read returns from the main process. */
export interface SocialFetchResult {
  displayName: string;
  bio: string;
  /** Profile picture as a data URL; empty when unavailable. */
  avatar: string;
  followers: number;
  following: number | null;
  posts: number;
  /** Total likes (TikTok hearts); null where the platform has no such count. */
  likes: number | null;
}

/** The one connected account. Read-only by design: the app never signs in,
 *  never posts, and reads the public profile at most a few times a day. */
export interface SocialProfile extends SocialFetchResult {
  platform: SocialPlatform;
  handle: string;
  fetchedAt: number; // epoch ms of the last successful read
}

/** One day's numbers, kept so growth is visible over months. */
export interface SocialSnapshot {
  date: string; // yyyy-mm-dd, local
  followers: number;
  posts: number;
  likes: number | null;
}

export type ProviderKind = 'stub' | 'anthropic' | 'openai';

export interface Settings {
  dark: boolean;
  topCount: number; // 1-5
  provider: ProviderKind;
  apiKey: string;
  model: string;
  openaiApiKey: string;
  openaiModel: string;
  /** The user's own description of who they are and what their life looks
   *  like; prefixed to every engine call in place of any canned persona. */
  aboutMe: string;
  /** First-run setup finished (questions answered or sample data kept). */
  onboarded: boolean;
  /** Day of week (0 = Sunday) the weekly review unlocks. */
  weeklyDay: number;
  /** Installed desktop app: keep running in the tray when the window closes. */
  runInBackground: boolean;
  /** Local date the weekly-review notification last fired (once per day). */
  lastWeeklyNotice: string;
  /** User-defined goal/task areas, in cycle order. */
  areas: Area[];
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
  /** Local date the morning actions were generated for; stale ones are
   *  dropped rather than passed off as today's advice. */
  morningDate: string;
  eveningText: string;
  /** Local date the evening debrief was generated for. */
  eveningDate: string;
  /** Durable preferences the engine learns quietly from reflections and coach
   *  chats, newest understanding as one flat list. Fed into every prompt. */
  memory: string[];
  /** Daily ledger, ascending by date, one entry per day used. */
  history: HistoryDay[];
  /** Money movements, newest first. */
  finance: FinanceEntry[];
  /** Latest engine read on the money picture. */
  financeRead: string;
  /** The connected social account, or null when none is connected. */
  social: SocialProfile | null;
  /** Daily snapshots of the connected account's numbers, ascending by date. */
  socialHistory: SocialSnapshot[];
  /** Running condensation of coach messages older than the live window. */
  chatSummary: string;
  /** How many messages at the start of `chat` the summary already covers. */
  chatSummarized: number;
  settings: Settings;
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/** The prototype's window.claude.complete() accepted either a plain prompt
 *  string or {system, messages}. AIProvider keeps that contract. */
export type CompletionRequest = string | { system: string; messages: ChatTurn[] };

export interface AIProvider {
  complete(request: CompletionRequest): Promise<string>;
}
