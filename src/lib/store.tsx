import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AIProvider, DumpItem, DumpType, Goal, MorningAction, PersistedState, Project,
  Reflection, ScheduleItem, Settings, TopTask, WeeklyReview,
} from './types';
import { AREAS } from './types';
import { historyEntryFor, upsertHistory } from './history';
import { clean, parseJSON, uid } from './clean';
import {
  connectDataFile, createBackend, dataFileSupported, disconnectDataFile,
  getDataFileState, hadStoredLocalData, pushDataFile, reconnectDataFile,
} from './backend';
import { PASTELS, seedState } from './seed';
import { AnthropicProvider, OpenAIProvider, StubProvider } from './ai/provider';
import { buildContext, prompts, scheduleSummary, toneInstruction } from './ai/prompts';
import { applyTheme } from './theme';
import { monthDay, timeToMinutes, todayISO } from './time';

export type ModuleKey =
  | 'dashboard' | 'dump' | 'vault' | 'goals' | 'roadmaps' | 'strategist'
  | 'coach' | 'reflect' | 'weekly' | 'patterns' | 'settings';

export type BusyKey =
  | 'dump' | 'replan' | 'cascade' | 'patterns' | 'reflect' | 'weekly'
  | 'connections' | 'morning' | 'evening' | 'chat';

export type CascadeLevel = 'vision' | 'year' | 'quarter' | 'month' | 'week' | 'today';

export interface AppContextValue extends PersistedState {
  hydrated: boolean;
  module: ModuleKey;
  selGoal: string;
  busy: Record<BusyKey, boolean>;
  err: string | null;
  /** Ephemeral "threads you've forgotten" output for the Vault. */
  connections: string | null;
  /** Today's reflection (blank if none saved yet). */
  todayReflection: Reflection;

  setModule(key: ModuleKey): void;
  selectGoal(id: string): void;
  toggleTheme(): void;
  toggleTask(id: string): void;
  toggleHabit(id: string): void;
  updateGoalItem(goalId: string, level: CascadeLevel, index: number, text: string): void;
  updateSettings(patch: Partial<Settings>): void;

  /* Everything below makes the app the user's own: full add/edit/delete for
   * goals, tasks, habits, schedule, and projects. */
  addGoal(): void;
  deleteGoal(id: string): void;
  updateGoalMeta(id: string, patch: Partial<Pick<Goal, 'title' | 'area' | 'progress'>>): void;
  addGoalItem(goalId: string, level: Exclude<CascadeLevel, 'vision'>): void;
  removeGoalItem(goalId: string, level: Exclude<CascadeLevel, 'vision'>, index: number): void;
  addTask(text: string): void;
  deleteTask(id: string): void;
  cycleTaskArea(id: string): void;
  addHabit(name: string): void;
  renameHabit(id: string, name: string): void;
  deleteHabit(id: string): void;
  addScheduleItem(): void;
  updateScheduleItem(id: string, patch: Partial<Omit<ScheduleItem, 'id'>>): void;
  deleteScheduleItem(id: string): void;
  addProject(): void;
  updateProject(id: string, patch: Partial<Omit<Project, 'id'>>): void;
  deleteProject(id: string): void;
  /** Drop one learned preference (Settings) or wipe the whole list. */
  forgetMemory(index: number): void;
  clearMemory(): void;
  /** Snapshot of everything persisted, for the backup file. */
  exportData(): PersistedState;
  /** Replace all data from a backup file's contents. False if it isn't one. */
  importData(raw: unknown): boolean;

  /** Live data file: a real on-disk mirror that browser cleanups can't wipe. */
  dataFileStatus: 'unsupported' | 'off' | 'on' | 'reconnect';
  dataFileName: string | null;
  connectFile(): Promise<boolean>;
  reconnectFile(): Promise<boolean>;
  disconnectFile(): Promise<void>;

  /** AI actions resolve true on success, false after a failure toast. */
  captureDump(text: string): Promise<boolean>;
  replanTop(): Promise<boolean>;
  regenCascade(): Promise<boolean>;
  genPatterns(): Promise<boolean>;
  submitReflection(answers: [string, string, string, string, string]): Promise<boolean>;
  genWeekly(): Promise<boolean>;
  findConnections(): Promise<void>;
  genMorning(): Promise<boolean>;
  genEvening(): Promise<boolean>;
  sendChat(text: string): Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const backend = createBackend();
const stub = new StubProvider();

const BLANK_REFLECTION = (): Reflection => ({
  date: todayISO(),
  answers: ['', '', '', '', ''],
  output: null,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PersistedState>(() => seedState());
  const [hydrated, setHydrated] = useState(false);
  const [module, setModule] = useState<ModuleKey>('dashboard');
  const [selGoal, setSelGoal] = useState('g1');
  const [busy, setBusy] = useState<Record<BusyKey, boolean>>({
    dump: false, replan: false, cascade: false, patterns: false, reflect: false,
    weekly: false, connections: false, morning: false, evening: false, chat: false,
  });
  const [err, setErr] = useState<string | null>(null);
  const [connections, setConnections] = useState<string | null>(null);
  const [dataFileStatus, setDataFileStatus] = useState<'unsupported' | 'off' | 'on' | 'reconnect'>(
    'unsupported',
  );
  const [dataFileName, setDataFileName] = useState<string | null>(null);
  const errTimer = useRef<ReturnType<typeof setTimeout>>();
  const dataRef = useRef(data);
  dataRef.current = data;

  /* ---------- hydration ---------- */
  useEffect(() => {
    let cancelled = false;
    backend.load().then((loaded) => {
      if (cancelled) return;
      const today = todayISO();
      // New day: habit "done" flags describe today only.
      const habits = loaded.habits.map((h) =>
        h.lastDone && h.lastDone !== today && h.done ? { ...h, done: false } : h,
      );
      setData({ ...loaded, habits });
      applyTheme(loaded.settings.dark);
      if (loaded.goals.length && !loaded.goals.some((g) => g.id === 'g1')) {
        setSelGoal(loaded.goals[0].id);
      }
      if (dataFileSupported()) {
        const fs = getDataFileState();
        setDataFileStatus(fs.status);
        setDataFileName(fs.name);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- plumbing ---------- */
  const persist = useCallback((patch: Partial<PersistedState>) => {
    backend.save(patch).catch(() => {
      /* persistence failure should never crash the UI */
    });
  }, []);

  const update = useCallback(
    (patch: Partial<PersistedState>) => {
      setData((d) => ({ ...d, ...patch }));
      persist(patch);
    },
    [persist],
  );

  /** Like update(), but also refreshes today's entry in the daily ledger from
   *  the state being committed. Use for anything the ledger measures. */
  const updateWithHistory = useCallback(
    (patch: Partial<PersistedState>) => {
      const next = { ...dataRef.current, ...patch };
      const history = upsertHistory(next.history, historyEntryFor(next));
      update({ ...patch, history });
    },
    [update],
  );

  const fail = useCallback(() => {
    setErr('Couldn’t reach the engine, try again in a moment.');
    if (errTimer.current) clearTimeout(errTimer.current);
    errTimer.current = setTimeout(() => setErr(null), 4000);
  }, []);

  const setBusyFlag = useCallback((key: BusyKey, value: boolean) => {
    setBusy((b) => ({ ...b, [key]: value }));
  }, []);

  const provider = useCallback((): AIProvider => {
    const s = dataRef.current.settings;
    if (s.provider === 'anthropic' && s.apiKey) {
      return new AnthropicProvider(backend, () => dataRef.current.settings);
    }
    if (s.provider === 'openai' && s.openaiApiKey) {
      return new OpenAIProvider(backend, () => dataRef.current.settings);
    }
    return stub;
  }, []);

  const context = useCallback(() => buildContext(dataRef.current), []);
  const tone = useCallback(() => toneInstruction(dataRef.current.settings.coachTone), []);

  /** Wraps an AI action with its busy flag and the error toast. */
  const aiAction = useCallback(
    async (key: BusyKey, run: () => Promise<void>): Promise<boolean> => {
      if (busyRef.current[key]) return false;
      setBusyFlag(key, true);
      try {
        await run();
        return true;
      } catch {
        fail();
        return false;
      } finally {
        setBusyFlag(key, false);
      }
    },
    [fail, setBusyFlag],
  );
  const busyRef = useRef(busy);
  busyRef.current = busy;

  /** Quiet preference learning: fire-and-forget after reflections and coach
   *  exchanges. Invisible by design: no busy state, failures never toast. */
  const learnRef = useRef(false);
  const learnQuietly = useCallback(
    (source: string, material: string) => {
      const text = material.trim();
      if (!text || learnRef.current) return;
      learnRef.current = true;
      void (async () => {
        try {
          const out = await provider().complete(prompts.learn(dataRef.current.memory, source, text));
          const parsed = clean(parseJSON<unknown[]>(out))
            .filter((x): x is string => typeof x === 'string' && !!x.trim())
            .map((x) => x.trim().slice(0, 140))
            .slice(0, 12);
          if (parsed.length) update({ memory: parsed });
        } catch {
          /* learning is best-effort; the primary action already succeeded */
        } finally {
          learnRef.current = false;
        }
      })();
    },
    [provider, update],
  );

  const forgetMemory = useCallback(
    (index: number) => {
      update({ memory: dataRef.current.memory.filter((_, i) => i !== index) });
    },
    [update],
  );

  const clearMemory = useCallback(() => update({ memory: [] }), [update]);

  const exportData = useCallback((): PersistedState => dataRef.current, []);

  const syncFileState = useCallback(() => {
    const fs = getDataFileState();
    setDataFileStatus(fs.status);
    setDataFileName(fs.name);
  }, []);

  const connectFile = useCallback(async () => {
    const ok = await connectDataFile(dataRef.current);
    if (ok) syncFileState();
    return ok;
  }, [syncFileState]);

  const disconnectFile = useCallback(async () => {
    await disconnectDataFile();
    syncFileState();
  }, [syncFileState]);

  const importData = useCallback(
    (raw: unknown): boolean => {
      if (!raw || typeof raw !== 'object') return false;
      const candidate = raw as Partial<PersistedState>;
      if (!Array.isArray(candidate.goals) || !candidate.settings) return false;
      const seed = seedState();
      const next: PersistedState = {
        ...seed,
        ...candidate,
        settings: { ...seed.settings, ...candidate.settings },
      };
      setData(next);
      persist(next);
      applyTheme(next.settings.dark);
      return true;
    },
    [persist],
  );

  const reconnectFile = useCallback(async () => {
    const r = await reconnectDataFile();
    if (!r.granted) return false;
    if (hadStoredLocalData()) {
      // Browser data survived, so it is current: refresh the file from it.
      pushDataFile(dataRef.current);
    } else if (r.fileState) {
      // Browser data was wiped: recover everything from the file.
      importData(r.fileState);
    }
    syncFileState();
    return true;
  }, [importData, syncFileState]);

  /* ---------- instant actions ---------- */
  const toggleTheme = useCallback(() => {
    const settings = { ...dataRef.current.settings, dark: !dataRef.current.settings.dark };
    applyTheme(settings.dark);
    update({ settings });
  }, [update]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const settings = { ...dataRef.current.settings, ...patch };
      if (patch.dark !== undefined) applyTheme(settings.dark);
      update({ settings });
    },
    [update],
  );

  const toggleTask = useCallback(
    (id: string) => {
      updateWithHistory({
        topTasks: dataRef.current.topTasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      });
    },
    [updateWithHistory],
  );

  const toggleHabit = useCallback(
    (id: string) => {
      const today = todayISO();
      updateWithHistory({
        habits: dataRef.current.habits.map((h) => {
          if (h.id !== id) return h;
          return h.done
            ? { ...h, done: false, streak: Math.max(0, h.streak - 1), lastDone: null }
            : { ...h, done: true, streak: h.streak + 1, lastDone: today };
        }),
      });
    },
    [updateWithHistory],
  );

  /* ---------- editing: goals, tasks, habits, schedule, projects ---------- */

  const addGoal = useCallback(() => {
    const g: Goal = {
      id: uid(),
      area: 'School',
      title: 'New goal',
      progress: 0,
      vision: 'What does done look like, in one sentence?',
      year: ['First milestone this year'],
      quarter: ['First milestone this quarter'],
      month: ['First step this month'],
      week: ['First step this week'],
      today: ['One small step today'],
    };
    update({ goals: [...dataRef.current.goals, g] });
    setSelGoal(g.id);
  }, [update]);

  const deleteGoal = useCallback(
    (id: string) => {
      const goals = dataRef.current.goals.filter((g) => g.id !== id);
      update({ goals });
      if (selGoal === id) setSelGoal(goals[0]?.id ?? '');
    },
    [update, selGoal],
  );

  const updateGoalMeta = useCallback(
    (id: string, patch: Partial<Pick<Goal, 'title' | 'area' | 'progress'>>) => {
      update({
        goals: dataRef.current.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      });
    },
    [update],
  );

  const addGoalItem = useCallback(
    (goalId: string, level: Exclude<CascadeLevel, 'vision'>) => {
      update({
        goals: dataRef.current.goals.map((g) =>
          g.id === goalId ? { ...g, [level]: [...g[level], 'New step'] } : g,
        ),
      });
    },
    [update],
  );

  const removeGoalItem = useCallback(
    (goalId: string, level: Exclude<CascadeLevel, 'vision'>, index: number) => {
      update({
        goals: dataRef.current.goals.map((g) =>
          g.id === goalId ? { ...g, [level]: g[level].filter((_, i) => i !== index) } : g,
        ),
      });
    },
    [update],
  );

  const addTask = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      updateWithHistory({
        topTasks: [
          ...dataRef.current.topTasks,
          { id: uid(), text: trimmed, area: 'School', done: false },
        ],
      });
    },
    [updateWithHistory],
  );

  const deleteTask = useCallback(
    (id: string) => {
      updateWithHistory({ topTasks: dataRef.current.topTasks.filter((t) => t.id !== id) });
    },
    [updateWithHistory],
  );

  const cycleTaskArea = useCallback(
    (id: string) => {
      update({
        topTasks: dataRef.current.topTasks.map((t) =>
          t.id === id ? { ...t, area: AREAS[(AREAS.indexOf(t.area) + 1) % AREAS.length] } : t,
        ),
      });
    },
    [update],
  );

  const addHabit = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      updateWithHistory({
        habits: [
          ...dataRef.current.habits,
          { id: uid(), name: trimmed, streak: 0, done: false, lastDone: null },
        ],
      });
    },
    [updateWithHistory],
  );

  const renameHabit = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      updateWithHistory({
        habits: dataRef.current.habits.map((h) => (h.id === id ? { ...h, name: trimmed } : h)),
      });
    },
    [updateWithHistory],
  );

  const deleteHabit = useCallback(
    (id: string) => {
      updateWithHistory({ habits: dataRef.current.habits.filter((h) => h.id !== id) });
    },
    [updateWithHistory],
  );

  const sortSchedule = (items: ScheduleItem[]): ScheduleItem[] =>
    [...items].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  const addScheduleItem = useCallback(() => {
    update({
      schedule: [
        ...dataRef.current.schedule,
        { id: uid(), time: '9:00 AM', label: 'New block', tag: 'Plan' },
      ],
    });
  }, [update]);

  const updateScheduleItem = useCallback(
    (id: string, patch: Partial<Omit<ScheduleItem, 'id'>>) => {
      update({
        schedule: sortSchedule(
          dataRef.current.schedule.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        ),
      });
    },
    [update],
  );

  const deleteScheduleItem = useCallback(
    (id: string) => {
      update({ schedule: dataRef.current.schedule.filter((s) => s.id !== id) });
    },
    [update],
  );

  const addProject = useCallback(() => {
    const d = dataRef.current;
    const p: Project = {
      id: uid(),
      name: 'New project',
      stage: 'Planning',
      pct: 0,
      phases: ['Plan', 'Build', 'Finish'],
      current: 0,
      color: PASTELS[d.projects.length % PASTELS.length][0],
      fields: [
        { k: 'Next milestone', v: 'Click to edit' },
        { k: 'Est. completion', v: 'Click to edit' },
        { k: 'Dependencies', v: 'Click to edit' },
        { k: 'Risks', v: 'Click to edit' },
        { k: 'Skills needed', v: 'Click to edit' },
        { k: 'Resources', v: 'Click to edit' },
      ],
    };
    update({ projects: [...d.projects, p] });
  }, [update]);

  const updateProject = useCallback(
    (id: string, patch: Partial<Omit<Project, 'id'>>) => {
      update({
        projects: dataRef.current.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      });
    },
    [update],
  );

  const deleteProject = useCallback(
    (id: string) => {
      update({ projects: dataRef.current.projects.filter((p) => p.id !== id) });
    },
    [update],
  );

  const updateGoalItem = useCallback(
    (goalId: string, level: CascadeLevel, index: number, text: string) => {
      update({
        goals: dataRef.current.goals.map((g) => {
          if (g.id !== goalId) return g;
          if (level === 'vision') return { ...g, vision: text };
          const items = [...g[level]];
          items[index] = text;
          return { ...g, [level]: items };
        }),
      });
    },
    [update],
  );

  /* ---------- AI actions (prompt contracts from the design prototype) ---------- */

  const captureDump = useCallback(
    (text: string) =>
      aiAction('dump', async () => {
        const out = await provider().complete(prompts.brainDump(text));
        const parsed = clean(parseJSON<{ type?: string; text: string }[]>(out));
        const now = Date.now();
        const items: DumpItem[] = parsed
          .filter((i) => i.text)
          .map((i, idx) => ({
            id: uid(),
            type: (i.type as DumpType) || 'Note',
            text: i.text,
            createdAt: now - idx,
          }));
        if (!items.length) throw new Error('nothing captured');

        const d = dataRef.current;
        // Habit items propose new habit entries; everything is indexed in the vault.
        const newHabits = items
          .filter((i) => i.type === 'Habit')
          .map((i) => ({ id: uid(), name: i.text, streak: 0, done: false, lastDone: null }));
        const newNotes = items.map((i) => ({
          id: uid(),
          title: i.text.length > 46 ? i.text.slice(0, 43) + '…' : i.text,
          tag: i.type,
          date: monthDay(now),
          snippet: i.text,
          createdAt: now,
        }));
        updateWithHistory({
          dumpItems: [...items, ...d.dumpItems],
          habits: newHabits.length ? [...d.habits, ...newHabits] : d.habits,
          vault: [...newNotes, ...d.vault],
        });
      }),
    [aiAction, provider, updateWithHistory],
  );

  const replanTop = useCallback(
    () =>
      aiAction('replan', async () => {
        const d = dataRef.current;
        const n = d.settings.topCount;
        const out = await provider().complete(prompts.replanTop(context(), n, scheduleSummary(d)));
        const parsed = clean(parseJSON<{ text: string; area?: string }[]>(out));
        const topTasks: TopTask[] = parsed.slice(0, n).map((i) => ({
          id: uid(),
          text: i.text,
          area: (i.area as TopTask['area']) || 'School',
          done: false,
        }));
        if (!topTasks.length) throw new Error('empty replan');
        updateWithHistory({ topTasks });
      }),
    [aiAction, provider, context, updateWithHistory],
  );

  const regenCascade = useCallback(
    () =>
      aiAction('cascade', async () => {
        const d = dataRef.current;
        const g = d.goals.find((x) => x.id === selGoal) ?? d.goals[0];
        if (!g) return;
        const out = await provider().complete(prompts.goalCascade(context(), g.title, g.progress));
        const c = clean(parseJSON<Partial<Record<CascadeLevel, string | string[]>>>(out));
        const goals: Goal[] = d.goals.map((x) =>
          x.id === g.id
            ? {
                ...x,
                vision: typeof c.vision === 'string' ? c.vision : x.vision,
                year: Array.isArray(c.year) ? c.year : x.year,
                quarter: Array.isArray(c.quarter) ? c.quarter : x.quarter,
                month: Array.isArray(c.month) ? c.month : x.month,
                week: Array.isArray(c.week) ? c.week : x.week,
                today: Array.isArray(c.today) ? c.today : x.today,
              }
            : x,
        );
        update({ goals });
      }),
    [aiAction, provider, context, update, selGoal],
  );

  const genPatterns = useCallback(
    () =>
      aiAction('patterns', async () => {
        const out = await provider().complete(prompts.patterns(context()));
        const parsed = clean(parseJSON<string[]>(out)).slice(0, 5);
        if (!parsed.length) throw new Error('no patterns');
        update({ patterns: parsed });
      }),
    [aiAction, provider, context, update],
  );

  const submitReflection = useCallback(
    (answers: [string, string, string, string, string]) =>
      aiAction('reflect', async () => {
        const out = clean(await provider().complete(prompts.reflection(context(), tone(), answers)));
        const d = dataRef.current;
        const today = todayISO();
        const entry: Reflection = { date: today, answers, output: out };
        const reflections = [entry, ...d.reflections.filter((r) => r.date !== today)];
        // Reflections are indexed in the vault as journal entries.
        const journal = {
          id: uid(),
          title: `Journal: ${today}`,
          tag: 'Journal',
          date: monthDay(Date.now()),
          snippet: answers.filter(Boolean).join(' · ').slice(0, 140) || out.slice(0, 140),
          createdAt: Date.now(),
        };
        updateWithHistory({ reflections, vault: [journal, ...d.vault] });
        learnQuietly('tonight’s reflection', answers.filter(Boolean).join('\n'));
      }),
    [aiAction, provider, context, tone, updateWithHistory, learnQuietly],
  );

  const genWeekly = useCallback(
    () =>
      aiAction('weekly', async () => {
        const out = await provider().complete(prompts.weekly(context()));
        const parsed = clean(parseJSON<Partial<WeeklyReview>>(out));
        update({ weekly: { ...dataRef.current.weekly, ...parsed } });
      }),
    [aiAction, provider, context, update],
  );

  const findConnections = useCallback(async () => {
    await aiAction('connections', async () => {
      const out = clean(
        await provider().complete(prompts.vaultConnections(context(), dataRef.current.vault)),
      );
      setConnections(out);
    });
  }, [aiAction, provider, context]);

  const genMorning = useCallback(
    () =>
      aiAction('morning', async () => {
        const out = await provider().complete(prompts.strategistMorning(context()));
        const parsed = clean(parseJSON<MorningAction[]>(out)).slice(0, 3);
        if (!parsed.length) throw new Error('no actions');
        update({ morning: parsed });
      }),
    [aiAction, provider, context, update],
  );

  const genEvening = useCallback(
    () =>
      aiAction('evening', async () => {
        const done =
          dataRef.current.topTasks.filter((t) => t.done).map((t) => t.text).join('; ') ||
          'nothing marked done yet';
        const out = clean(await provider().complete(prompts.strategistEvening(context(), done, tone())));
        update({ eveningText: out });
      }),
    [aiAction, provider, context, tone, update],
  );

  /** Rolls chat messages beyond the live window into a running summary so the
   *  coach stays cheap and sharp over months. Invisible, best-effort. */
  const summarizeRef = useRef(false);
  const maybeSummarizeChat = useCallback(
    (chatNow: PersistedState['chat']) => {
      const TRIGGER = 30; // live messages before we condense
      const KEEP = 10; // recent messages always sent verbatim
      const d = dataRef.current;
      const covered = Math.max(0, Math.min(d.chatSummarized, chatNow.length));
      if (chatNow.length - covered < TRIGGER || summarizeRef.current) return;
      summarizeRef.current = true;
      const upTo = chatNow.length - KEEP;
      const turns = chatNow.slice(covered, upTo).map((m) => ({ role: m.role, content: m.content }));
      void (async () => {
        try {
          const out = clean(await provider().complete(prompts.summarizeChat(d.chatSummary, turns)));
          if (out.trim()) {
            update({ chatSummary: out.trim().slice(0, 2400), chatSummarized: upTo });
          }
        } catch {
          /* next long chat will try again */
        } finally {
          summarizeRef.current = false;
        }
      })();
    },
    [provider, update],
  );

  const sendChat = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current.chat) return;
      const chat = [...dataRef.current.chat, { role: 'user' as const, content: trimmed }];
      update({ chat });
      await aiAction('chat', async () => {
        const d = dataRef.current;
        // Send the summary plus only the messages it does not already cover.
        const covered = Math.max(0, Math.min(d.chatSummarized, chat.length - 1));
        const live = chat.slice(covered);
        const reply = clean(
          await provider().complete({
            system: prompts.coachSystem(context(), tone(), d.chatSummary),
            messages: live.map((m) => ({ role: m.role, content: m.content })),
          }),
        );
        const chatWithReply = [...dataRef.current.chat, { role: 'assistant' as const, content: reply }];
        update({ chat: chatWithReply });
        learnQuietly('a coach conversation', `Them: ${trimmed}\nCoach: ${reply}`);
        maybeSummarizeChat(chatWithReply);
      });
    },
    [aiAction, provider, context, tone, update, learnQuietly, maybeSummarizeChat],
  );

  /* ---------- derived ---------- */
  const todayReflection = useMemo(() => {
    return data.reflections.find((r) => r.date === todayISO()) ?? BLANK_REFLECTION();
  }, [data.reflections]);

  const value: AppContextValue = {
    ...data,
    hydrated,
    module,
    selGoal,
    busy,
    err,
    connections,
    todayReflection,
    setModule,
    selectGoal: setSelGoal,
    toggleTheme,
    toggleTask,
    toggleHabit,
    updateGoalItem,
    updateSettings,
    addGoal,
    deleteGoal,
    updateGoalMeta,
    addGoalItem,
    removeGoalItem,
    addTask,
    deleteTask,
    cycleTaskArea,
    addHabit,
    renameHabit,
    deleteHabit,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    addProject,
    updateProject,
    deleteProject,
    forgetMemory,
    clearMemory,
    exportData,
    importData,
    dataFileStatus,
    dataFileName,
    connectFile,
    reconnectFile,
    disconnectFile,
    captureDump,
    replanTop,
    regenCascade,
    genPatterns,
    submitReflection,
    genWeekly,
    findConnections,
    genMorning,
    genEvening,
    sendChat,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
