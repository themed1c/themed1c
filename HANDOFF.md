# HANDOFF — Life Organization

Context document for any developer or AI session picking up this project. Read this first, then `design/README.md` (the original design spec; canonical for visuals, superseded in places by the personalization work described below).

## ⚠️ NEXT SESSION (planned for Friday) — what still must be done

1. **Run the debug sweep.** Three major features (personalization/editing, daily history ledger, coach summarization) were implemented and pass all 30 automated checks, but the planned multi-agent adversarial review was cut short by end of session. The exact workflow script is saved at `scripts/debug-sweep.workflow.js` (5 review dimensions, 3 adversarial verifiers per finding). Re-run it (it reviews the repo in place), fix any CONFIRMED findings, then re-run `node scripts/verify.js` and keep all 30 checks green.
2. **Deliver the new build to the user.** The user's copy at home ("Life Organization.html", sent earlier on Jul 8) contains everything up to backup/restore + live data file, but NOT the three newest features. After the sweep passes: `npm run build:portable`, then send `dist-portable/index.html` renamed to "Life Organization.html" with plain-language notes (the user is non-technical).
3. Commit and push everything to `claude/handoff-push-pntrf4` (write access works; pushes go through).

**Explicitly declined by the user (do not build):** day-start/day-end nudges (auto-morning-strategist, evening reflection reminders).

**Backlog after that (user-approved direction: maximize what the engine takes in and understands):** packaged installers via `npm run dist` (must run on a normal machine, not a sandbox; Mac targets need macOS), phone-friendly layout, smarter area-score model, embeddings for Vault search, OS calendar integration.

## What this is

A single-user, local-first "Life OS" app: brain-dump capture with automatic classification, goal cascades (Vision → Today), project roadmaps, habits with streaks, daily reflection, weekly review, behavioral-pattern detection, a coach chat, quiet preference learning, and a per-day history ledger. An AI engine is woven invisibly through everything; the app is fully usable offline through a built-in stub engine. The user runs the **portable single-file build** at home by double-clicking one HTML file.

Stack: **Electron + React 18 + TypeScript + Vite**, SQLite via `node:sqlite` (Electron mode), pluggable AI provider (Anthropic, OpenAI, or offline stub).

## Current status

**All features implemented and verified: 30/30 end-to-end checks green** (`node scripts/verify.js`), typecheck clean, portable build clean. Everything is on branch `claude/handoff-push-pntrf4`.

Feature inventory beyond the original design:
- **Preference learning** (`memory: string[]`): after every reflection and coach exchange, `learnQuietly()` rewrites a ≤12-item list of durable preferences (background, silent). Shown/editable in Settings ("What the engine has learned"). Stub branch trigger: "Maintain their private preference list".
- **Daily history ledger** (`history: HistoryDay[]`, `src/lib/history.ts`): every task/habit/capture/reflection action updates today's entry (via `updateWithHistory()` in the store) with tasks done, habits hit, focus score, captures, reflected flag. `historyContext()` feeds the last 14 days verbatim plus month-by-month aggregates into every prompt. Capped at 1500 days.
- **Full personalization**: add/edit/delete for goals (title, area, %, cascade lines), projects (name, stage, %, phases, current phase, detail fields), schedule blocks (auto-sorted by 12-hour time), habits (double-click renames; single click toggles), and top tasks (add, delete, cycle area). `InlineText` / `AddRow` in `src/components/ui.tsx` are the shared affordances. **`settings.aboutMe`** (Settings → About you) replaces the design prototype's hardcoded student persona in `buildContext`; with it empty the context says to infer the person from data only.
- **Coach summarization** (`chatSummary`, `chatSummarized`): once live chat exceeds 30 messages, `maybeSummarizeChat()` condenses everything but the last 10 into a running summary (background, silent); only the summary + live window are sent to providers. Stub trigger: "Condense the earlier part of this coaching conversation".
- **OpenAI + Anthropic engines**: Settings → Engine has three options; each vendor has its own key/model fields (`apiKey`/`model`, `openaiApiKey`/`openaiModel`). Requests are proxied by the Electron main process or fetched directly in browser mode. Anthropic path normalizes chat history (leading user turn, merged consecutive roles).
- **Backup/restore** (Settings → Your data): full-state JSON download / restore with confirm; `importData()` deep-merges over seed so old backups stay compatible.
- **Live data file** (browser mode, Chromium): File System Access API mirror of every save into a user-chosen on-disk JSON that browser-data wipes can't touch; handle remembered in IndexedDB `life-org-file`; per-session re-permission surfaces as a "Reconnect" banner; a wiped browser auto-recovers from the file when permission persists.
- **Local dates everywhere**: `todayISO()` (renderer) and `localISO()` (electron/db.ts) use local calendar dates. Never use `toISOString()` for a date.

## Commands

```bash
npm install                # if Electron's binary download 403s: ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install
npm run dev                # renderer only, browser mode at localhost:5173 (localStorage backend)
npm run dev:app            # Vite + Electron with live reload
npm start                  # production build + launch Electron (SQLite backend)
npm run typecheck          # tsc for renderer (tsconfig.json) and main (electron/tsconfig.json)
npm run build              # dist/ (renderer) + dist-electron/ (main)
npm run build:portable     # ONE self-contained HTML file at dist-portable/index.html
npm run dist               # electron-builder installers (untested in sandboxes)
node scripts/verify.js     # headless end-to-end: 30 checks + screenshots (needs npm run dev running,
                           # npm i playwright-core --no-save, CHROMIUM_PATH if not /opt/pw-browsers/chromium)
```

## Architecture

```
electron/main.ts        window, IPC (lifeos:load/save/ai), Anthropic + OpenAI proxies.
                        API keys never enter the renderer in Electron mode.
electron/db.ts          SQLite schema + PersistedState<->tables mapping (WAL, local dates).
                        Singletons (weekly, morning, memory, history, chatSummary,
                        chatSummarized, settings) live in the kv table.
src/lib/types.ts        every data shape; PersistedState is the whole persisted app;
                        AREAS constant for area cycling.
src/lib/store.tsx       THE app: one React context holding all state, mutations, AI
                        actions, busy flags, editing actions, updateWithHistory(),
                        learnQuietly(), maybeSummarizeChat(), backup/restore, live
                        data file state.
src/lib/backend.ts      Backend interface; ElectronBackend (IPC) or BrowserBackend
                        (localStorage 'life-org-v2' + direct API fetch) + withDefaults()
                        migration merge + the live data file machinery.
src/lib/ai/provider.ts  StubProvider (offline engine: heuristic brain-dump classifier,
                        canned-but-contract-correct everything else, 0.5-1s delay),
                        AnthropicProvider, OpenAIProvider.
src/lib/ai/prompts.ts   buildContext() (aboutMe + goals/tasks/habits/dumps/patterns +
                        learned memory + history ledger + latest reflection) + all
                        prompt contracts incl. learn() and summarizeChat().
src/lib/history.ts      historyEntryFor / upsertHistory / historyContext (pure).
src/lib/scores.ts       area-score model + focus score min(99, 42 + done*14 + habits*7).
src/lib/seed.ts         first-run sample data (the design's student persona) + PASTELS.
src/lib/clean.ts        clean() strips em/en dashes from ALL engine output; parseJSON().
src/lib/time.ts         local-date helpers + timeToMinutes() for schedule sorting.
src/global.css          all design tokens as CSS vars (:root light, :root.dark dark).
src/components/ui.tsx   Card, CardLabel, Num (Oswald numerals), GhostButton,
                        AccentButton, CheckSquare, Track, Chip, InlineText, AddRow, Toast.
src/modules/*.tsx       one file per screen; presentation only, everything via useApp().
src/App.tsx             sidebar shell + module registry + data-file Reconnect banner.
scripts/verify.js       the 30-check headless harness. Keep it green.
scripts/debug-sweep.workflow.js  the saved multi-agent review script for Friday.
```

Data flow: module → `useApp()` action → optimistic state update → `backend.save(partial)` (fire-and-forget; browser mode also mirrors to the live data file, debounced 800ms). AI actions: busy flag on → `provider().complete(prompt)` → `clean(parseJSON(...))` → state update + persist → busy off; any throw shows the standard toast ("Couldn't reach the engine, try again in a moment.") and leaves prior data untouched. `learnQuietly` and `maybeSummarizeChat` are the two deliberately invisible engine actions (no busy flag, silent failures).

**Loading old data:** `withDefaults()` merges stored snapshots over the seed, settings field-by-field, so adding fields stays backward-compatible. Keep it that way.

## Product rules (enforced, do not regress)

- **Never an em dash** in UI copy or engine output (`clean()` post-processes; UI copy hand-checked; verify asserts).
- **12-hour AM/PM times** everywhere. No emoji. **Never label anything "AI"** (Settings' engine vendor names are the allowed exception); the tone is a sharp, warm, plainspoken coach.
- All numerals render in **Oswald** (`<Num>` / `FONT_NUM`), including editable ones (schedule times, percent editors).
- Colors only via CSS variables; check new UI in dark mode (`scripts/shots/*-dark.png`).
- Every user-triggered engine action has a busy label ("Sorting…", "Replanning…", "Recalculating…", "Thinking…", "Compiling…", "Tracing…", "Reviewing…", "Looking…", "Reading…") and is a no-op while busy.
- The stub engine must keep the app fully usable with no key: any new AI feature needs a stub branch in `StubProvider` keyed off a distinctive prompt substring that cannot appear in `buildContext` output or user data.
- Default models: `claude-opus-4-8` (Anthropic) and `gpt-5.1` (OpenAI), user-editable.
- All "today" dates are LOCAL calendar dates.
- Editing affordances: single click edits static text; **double-click renames inside rows whose single click toggles** (habits); clearing an editable line deletes it where deletion is safe (cascade lines, project phases with ≥2 remaining).

## Verification

`scripts/verify.js` (30 checks): screenshots every module both themes into `scripts/shots/`; asserts task/habit toggles move the focus score, brain-dump capture classifies + clears, cascade regen, coach reply, reflection output, weekly rebuild, vault filter + connections, patterns, strategist both cards, hand-adding tasks/habits/schedule blocks/goals/projects, goal delete, daily history ledger recording, About-you + tone + dump persistence across reload, OpenAI option offered, learned preferences accumulate, backup download + restore round trip, live data file connect-and-mirror (stubbed picker), coach summarization after seeding a 34-message chat, no em dashes, no empty modules.

## Artifacts the user has at home

- "Life Organization.html" (sent Jul 8, file_uuid 62b536de…): includes engines, learning, backup/restore, live data file. **Missing the three newest features — replace it after Friday's sweep.**
- Possibly older copies from the same day (backup-only and original); the newest attachment supersedes them.

The user is non-technical: explain changes in plain language, prefer regenerated artifacts over instructions that require tooling, and never require the command line for their normal use.
