import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

/* Local-first storage. The renderer exchanges one PersistedState object over
 * IPC; this module maps it onto relational tables (schema per the design
 * handoff README) so future features can query real rows. */

type Row = Record<string, unknown>;

/** Local calendar date (yyyy-mm-dd), matching the renderer's todayISO. UTC
 *  would file evening activity under tomorrow for anyone west of Greenwich. */
function localISO(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function mondayISO(): string {
  const d = new Date();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localISO(monday);
}

export interface DBHandle {
  load(): Row | null;
  save(patch: Row): void;
}

export function openDatabase(userDataDir: string): DBHandle {
  fs.mkdirSync(userDataDir, { recursive: true });
  const db = new DatabaseSync(path.join(userDataDir, 'life-org.db'));
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, text TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY, area TEXT NOT NULL, title TEXT NOT NULL,
      progress INTEGER NOT NULL, vision TEXT NOT NULL, position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS goal_levels (
      goal_id TEXT NOT NULL, level TEXT NOT NULL, position INTEGER NOT NULL, text TEXT NOT NULL,
      PRIMARY KEY (goal_id, level, position)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, text TEXT NOT NULL, area TEXT NOT NULL,
      done INTEGER NOT NULL, position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS schedule (
      id TEXT PRIMARY KEY, time TEXT NOT NULL, label TEXT NOT NULL,
      tag TEXT NOT NULL, position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, streak INTEGER NOT NULL,
      done INTEGER NOT NULL, last_done TEXT, position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS habit_logs (
      habit_id TEXT NOT NULL, date TEXT NOT NULL, done INTEGER NOT NULL,
      PRIMARY KEY (habit_id, date)
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, stage TEXT NOT NULL, pct INTEGER NOT NULL,
      color TEXT NOT NULL, current INTEGER NOT NULL, fields_json TEXT NOT NULL, position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS milestones (
      project_id TEXT NOT NULL, position INTEGER NOT NULL, label TEXT NOT NULL,
      PRIMARY KEY (project_id, position)
    );
    CREATE TABLE IF NOT EXISTS area_scores (
      name TEXT PRIMARY KEY, score INTEGER NOT NULL, trend INTEGER NOT NULL,
      note TEXT NOT NULL, position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vault_notes (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, tag TEXT NOT NULL, date TEXT NOT NULL,
      snippet TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      position INTEGER PRIMARY KEY, role TEXT NOT NULL, content TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS patterns (
      position INTEGER PRIMARY KEY, text TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS weekly_reviews (
      week_start TEXT PRIMARY KEY, sections_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reflections (
      date TEXT PRIMARY KEY, answers_json TEXT NOT NULL, output TEXT
    );
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY, value_json TEXT NOT NULL
    );
  `);

  const hasData = () => {
    const row = db.prepare('SELECT COUNT(*) AS n FROM kv').get() as { n: number };
    return row.n > 0;
  };

  const getKV = <T>(key: string): T | undefined => {
    const row = db.prepare('SELECT value_json FROM kv WHERE key = ?').get(key) as
      | { value_json: string }
      | undefined;
    return row ? (JSON.parse(row.value_json) as T) : undefined;
  };

  const setKV = (key: string, value: unknown) => {
    db.prepare(
      'INSERT INTO kv (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json',
    ).run(key, JSON.stringify(value));
  };

  const replaceAll = (table: string, columns: string[], rows: unknown[][]) => {
    db.prepare(`DELETE FROM ${table}`).run();
    if (!rows.length) return;
    const placeholders = columns.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
    for (const row of rows) stmt.run(...(row as (string | number | null)[]));
  };

  const LEVELS = ['year', 'quarter', 'month', 'week', 'today'] as const;

  function load(): Row | null {
    if (!hasData()) return null;
    const goals = (db.prepare('SELECT * FROM goals ORDER BY position').all() as Row[]).map((g) => {
      const levels: Record<string, string[]> = {};
      for (const level of LEVELS) {
        levels[level] = (
          db
            .prepare('SELECT text FROM goal_levels WHERE goal_id = ? AND level = ? ORDER BY position')
            .all(g.id as string, level) as { text: string }[]
        ).map((r) => r.text);
      }
      return {
        id: g.id, area: g.area, title: g.title,
        progress: g.progress, vision: g.vision, ...levels,
      };
    });

    const projects = (db.prepare('SELECT * FROM projects ORDER BY position').all() as Row[]).map((p) => ({
      id: p.id, name: p.name, stage: p.stage, pct: p.pct, color: p.color, current: p.current,
      phases: (
        db.prepare('SELECT label FROM milestones WHERE project_id = ? ORDER BY position').all(p.id as string) as {
          label: string;
        }[]
      ).map((r) => r.label),
      fields: JSON.parse(p.fields_json as string),
    }));

    return {
      dumpItems: (db.prepare('SELECT * FROM entries ORDER BY created_at DESC').all() as Row[]).map((r) => ({
        id: r.id, type: r.type, text: r.text, createdAt: r.created_at,
      })),
      goals,
      topTasks: (db.prepare('SELECT * FROM tasks ORDER BY position').all() as Row[]).map((r) => ({
        id: r.id, text: r.text, area: r.area, done: !!r.done,
      })),
      schedule: (db.prepare('SELECT * FROM schedule ORDER BY position').all() as Row[]).map((r) => ({
        id: r.id, time: r.time, label: r.label, tag: r.tag,
      })),
      habits: (db.prepare('SELECT * FROM habits ORDER BY position').all() as Row[]).map((r) => ({
        id: r.id, name: r.name, streak: r.streak, done: !!r.done, lastDone: r.last_done,
      })),
      projects,
      areaScores: (db.prepare('SELECT * FROM area_scores ORDER BY position').all() as Row[]).map((r) => ({
        name: r.name, score: r.score, trend: r.trend, note: r.note,
      })),
      vault: (db.prepare('SELECT * FROM vault_notes ORDER BY created_at DESC').all() as Row[]).map((r) => ({
        id: r.id, title: r.title, tag: r.tag, date: r.date, snippet: r.snippet, createdAt: r.created_at,
      })),
      chat: (db.prepare('SELECT * FROM chat_messages ORDER BY position').all() as Row[]).map((r) => ({
        role: r.role, content: r.content,
      })),
      patterns: (db.prepare('SELECT * FROM patterns ORDER BY position').all() as Row[]).map(
        (r) => r.text,
      ),
      weekly: getKV('weekly') ?? currentWeekly(),
      reflections: (db.prepare('SELECT * FROM reflections ORDER BY date DESC').all() as Row[]).map((r) => ({
        date: r.date, answers: JSON.parse(r.answers_json as string), output: r.output,
      })),
      morning: getKV('morning') ?? [],
      eveningText: getKV('eveningText') ?? '',
      memory: getKV('memory') ?? [],
      history: getKV('history') ?? [],
      finance: getKV('finance') ?? [],
      financeRead: getKV('financeRead') ?? '',
      chatSummary: getKV('chatSummary') ?? '',
      chatSummarized: getKV('chatSummarized') ?? 0,
      settings: getKV('settings') ?? {},
    };
  }

  function currentWeekly(): unknown {
    const row = db
      .prepare('SELECT sections_json FROM weekly_reviews WHERE week_start = ?')
      .get(mondayISO()) as { sections_json: string } | undefined;
    return row ? JSON.parse(row.sections_json) : undefined;
  }

  function save(patch: Row): void {
    db.exec('BEGIN');
    try {
      if (patch.dumpItems) {
        replaceAll(
          'entries',
          ['id', 'type', 'text', 'created_at'],
          (patch.dumpItems as Row[]).map((r) => [r.id, r.type, r.text, r.createdAt] as unknown[]),
        );
      }
      if (patch.goals) {
        const goals = patch.goals as Row[];
        replaceAll(
          'goals',
          ['id', 'area', 'title', 'progress', 'vision', 'position'],
          goals.map((g, i) => [g.id, g.area, g.title, g.progress, g.vision, i]),
        );
        db.prepare('DELETE FROM goal_levels').run();
        const stmt = db.prepare(
          'INSERT INTO goal_levels (goal_id, level, position, text) VALUES (?, ?, ?, ?)',
        );
        for (const g of goals) {
          for (const level of LEVELS) {
            (g[level] as string[]).forEach((text, i) => stmt.run(g.id as string, level, i, text));
          }
        }
      }
      if (patch.topTasks) {
        replaceAll(
          'tasks',
          ['id', 'text', 'area', 'done', 'position'],
          (patch.topTasks as Row[]).map((t, i) => [t.id, t.text, t.area, t.done ? 1 : 0, i]),
        );
      }
      if (patch.schedule) {
        replaceAll(
          'schedule',
          ['id', 'time', 'label', 'tag', 'position'],
          (patch.schedule as Row[]).map((s, i) => [s.id, s.time, s.label, s.tag, i]),
        );
      }
      if (patch.habits) {
        const habits = patch.habits as Row[];
        replaceAll(
          'habits',
          ['id', 'name', 'streak', 'done', 'last_done', 'position'],
          habits.map((h, i) => [h.id, h.name, h.streak, h.done ? 1 : 0, h.lastDone ?? null, i]),
        );
        // Activity history for future scoring models.
        const today = localISO();
        const log = db.prepare(
          'INSERT INTO habit_logs (habit_id, date, done) VALUES (?, ?, ?) ON CONFLICT(habit_id, date) DO UPDATE SET done = excluded.done',
        );
        for (const h of habits) log.run(h.id as string, today, h.done ? 1 : 0);
      }
      if (patch.projects) {
        const projects = patch.projects as Row[];
        replaceAll(
          'projects',
          ['id', 'name', 'stage', 'pct', 'color', 'current', 'fields_json', 'position'],
          projects.map((p, i) => [
            p.id, p.name, p.stage, p.pct, p.color, p.current, JSON.stringify(p.fields), i,
          ]),
        );
        db.prepare('DELETE FROM milestones').run();
        const stmt = db.prepare('INSERT INTO milestones (project_id, position, label) VALUES (?, ?, ?)');
        for (const p of projects) {
          (p.phases as string[]).forEach((label, i) => stmt.run(p.id as string, i, label));
        }
      }
      if (patch.areaScores) {
        replaceAll(
          'area_scores',
          ['name', 'score', 'trend', 'note', 'position'],
          (patch.areaScores as Row[]).map((a, i) => [a.name, a.score, a.trend, a.note, i]),
        );
      }
      if (patch.vault) {
        replaceAll(
          'vault_notes',
          ['id', 'title', 'tag', 'date', 'snippet', 'created_at'],
          (patch.vault as Row[]).map((v) => [v.id, v.title, v.tag, v.date, v.snippet, v.createdAt]),
        );
      }
      if (patch.chat) {
        replaceAll(
          'chat_messages',
          ['position', 'role', 'content'],
          (patch.chat as Row[]).map((m, i) => [i, m.role, m.content]),
        );
      }
      if (patch.patterns) {
        replaceAll(
          'patterns',
          ['position', 'text'],
          (patch.patterns as string[]).map((t, i) => [i, t]),
        );
      }
      if (patch.weekly) {
        setKV('weekly', patch.weekly);
        db.prepare(
          'INSERT INTO weekly_reviews (week_start, sections_json) VALUES (?, ?) ON CONFLICT(week_start) DO UPDATE SET sections_json = excluded.sections_json',
        ).run(mondayISO(), JSON.stringify(patch.weekly));
      }
      if (patch.reflections) {
        const stmt = db.prepare(
          'INSERT INTO reflections (date, answers_json, output) VALUES (?, ?, ?) ON CONFLICT(date) DO UPDATE SET answers_json = excluded.answers_json, output = excluded.output',
        );
        for (const r of patch.reflections as Row[]) {
          stmt.run(r.date as string, JSON.stringify(r.answers), (r.output as string) ?? null);
        }
      }
      if (patch.morning) setKV('morning', patch.morning);
      if (patch.eveningText !== undefined) setKV('eveningText', patch.eveningText);
      if (patch.memory) setKV('memory', patch.memory);
      if (patch.history) setKV('history', patch.history);
      if (patch.finance) setKV('finance', patch.finance);
      if (patch.financeRead !== undefined) setKV('financeRead', patch.financeRead);
      if (patch.chatSummary !== undefined) setKV('chatSummary', patch.chatSummary);
      if (patch.chatSummarized !== undefined) setKV('chatSummarized', patch.chatSummarized);
      if (patch.settings) setKV('settings', patch.settings);
      setKV('initialized', true);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }

  return { load, save };
}
