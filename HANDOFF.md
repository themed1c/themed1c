# HANDOFF — Life Organization

Context document for any developer or AI session picking up this project. Read this first, then `design/README.md` (the canonical product spec).

## What this is

A single-user, local-first "Life OS" desktop app: brain-dump capture with automatic classification, goal cascades (Vision → Today), project roadmaps, habits with streaks, daily reflection, weekly review, behavioral-pattern detection, and a coach chat. An AI engine is woven invisibly through everything but the app is fully usable offline through a built-in stub engine.

Stack: **Electron + React 18 + TypeScript + Vite**, SQLite via Node's built-in `node:sqlite` (zero native dependencies), pluggable AI provider (Anthropic Messages API or offline stub).

It was implemented from a design handoff produced in Claude's design tool; that bundle lives in `design/` (spec: `design/README.md`, behavioral prototype: `design/Life Organization.dc.html`, visual ground truth: `design/screenshots/*.png`). **When in doubt about any visual or behavioral question, `design/README.md` wins, and the prototype's `Component` class (bottom of the .dc.html file) contains the exact AI prompt strings and seed data.**

## Current status

**Complete and verified.** All 11 screens plus Settings are implemented, typecheck clean, build clean, and verified:

- 16/16 end-to-end behavior checks (see Verification below)
- SQLite layer round-trip tested (fresh load → seed, save/load equality, partial saves, habit logs)
- Every screen visually compared against `design/screenshots/` in light AND dark themes; no discrepancies

**Unfinished business:**

1. **No packaged installers yet.** `npm run dist` (electron-builder) is configured but unproven: sandboxed build environments may 403 the Electron/NSIS binary downloads from GitHub releases. Run it on a normal machine. Mac targets must be built on macOS.
2. The user (non-technical) primarily uses the **portable single-file build** (`npm run build:portable` → `dist-portable/index.html`), which runs from a double-click via `file://` with localStorage persistence.

(Resolved 2026-07-08: git push was previously blocked by 403; the owner installed the Claude GitHub App with write access and the full source is pushed to `themed1c/themed1c` on branch `claude/handoff-push-pntrf4`.)

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
node scripts/verify.js     # headless end-to-end check + screenshots (see Verification)
```

## Architecture

```
electron/main.ts        window, IPC handlers (lifeos:load/save/ai), Anthropic proxy.
                        The API key never enters the renderer in Electron mode.
electron/db.ts          SQLite schema + PersistedState<->tables mapping. Tables:
                        entries, goals, goal_levels, tasks, schedule, habits,
                        habit_logs, projects, milestones, area_scores, vault_notes,
                        chat_messages, patterns, weekly_reviews, reflections, kv.
                        DB file: <userData>/life-org.db (WAL mode).
electron/preload.ts     contextBridge -> window.lifeOS { load, save, aiComplete }.
src/lib/types.ts        every data shape; PersistedState is the whole persisted app.
src/lib/store.tsx       THE app: one React context (AppContextValue) holding all
                        state, all mutations, all AI actions, busy flags, the error
                        toast. Modules never fetch or persist directly.
src/lib/backend.ts      Backend interface; ElectronBackend (IPC) or BrowserBackend
                        (localStorage key 'life-org-v2' + direct API fetch with the
                        anthropic-dangerous-direct-browser-access header).
src/lib/ai/provider.ts  AIProvider { complete(promptOrChat) }. StubProvider = offline
                        engine (real heuristic classifier for brain dumps, canned but
                        contract-correct output for everything else, 0.5-1s delay so
                        busy states show). AnthropicProvider = Messages API via backend.
src/lib/ai/prompts.ts   buildContext() (serialized user-data snapshot prefixed to every
                        call) + the ten prompt contracts, verbatim from the prototype.
src/lib/scores.ts       area-score model (persisted baselines nudged by live signals)
                        and the focus-score formula min(99, 42 + done*14 + habits*7).
src/lib/seed.ts         first-run data (matches the design screenshots) + PASTELS.
src/lib/clean.ts        clean() strips em/en dashes from ALL AI output; parseJSON()
                        is the lenient fence-stripping JSON extractor; uid().
src/global.css          all design tokens as CSS vars (:root light, :root.dark dark)
                        + hover classes. Tokens mirror design/README.md exactly.
src/components/ui.tsx   Card, CardLabel, PageTitle, PageSub, Num (Oswald numerals),
                        GhostButton, AccentButton, CheckSquare, Track, Chip, Toast.
src/modules/*.tsx       one file per screen; presentation only, everything via useApp().
src/App.tsx             sidebar shell + module registry.
```

Data flow: module → `useApp()` action → optimistic state update → `backend.save(partial)` (fire-and-forget). AI actions: busy flag on → `provider().complete(prompt)` → `clean(parseJSON(...))` → state update + persist → busy off; any throw shows the standard toast ("Couldn't reach the engine, try again in a moment.") and leaves prior data untouched.

## Product rules (enforced, do not regress)

- **Never an em dash** in UI copy or engine output (`clean()` post-processes; UI copy is hand-checked).
- **12-hour AM/PM times** everywhere. No emoji. **Never label anything "AI"** — results just appear; the tone is a sharp, warm, plainspoken coach.
- All numerals (scores, %, streaks, times, dates, list numbers) render in **Oswald** (`<Num>` / `FONT_NUM`).
- Colors only via CSS variables so both themes work; new UI must be checked in dark mode.
- Every engine action has a busy label ("Sorting…", "Replanning…", "Recalculating…", "Thinking…", "Compiling…", "Tracing…", "Reviewing…", "Looking…", "Reading…") and is a no-op while busy.
- The stub engine must keep the app fully usable with no key: any new AI feature needs a stub branch in `StubProvider` keyed off a distinctive prompt substring.
- Default model for the Anthropic provider: `claude-opus-4-8` (user-editable in Settings).

## Verification

`scripts/verify.js` drives the app headlessly (needs `npm run dev` running, plus `npm i playwright-core` and a Chromium; set `CHROMIUM_PATH` if not at the default). It screenshots every module in both themes into `scripts/shots/` and asserts: task/habit toggles update the focus score, brain-dump capture classifies and clears, cascade regenerates, coach replies, reflection produces "Tonight's read", weekly rebuilds, vault filters live and surfaces connections, patterns regenerate, strategist refreshes both cards, settings and data persist across reload, no em dashes rendered, no empty modules. Keep it green.

## Sensible next steps (from the design spec's open items)

- Schedule editing UI (schedule is DB-backed but read-only in the dashboard); later, OS calendar integration.
- Smarter area-score model (`src/lib/scores.ts` is deliberately simple; `habit_logs` already accumulates history).
- Embeddings/semantic search for the Vault (search interface is pluggable; currently substring).
- OS notifications (evening reflection prompt, morning strategist).
- Packaged installers per platform (`npm run dist`), and auto-generating the morning strategist on first open of the day.
- Coach history summarization once chats get long (full history is sent every turn today).

## Artifacts the user already has

- `life-organization.zip` — full source (git archive of this repo).
- `Life Organization.html` — the portable single-file build they run at home.

If you are an AI session: work on your session's designated branch (the pushed baseline lives on `claude/handoff-push-pntrf4`), commit with clear messages, and push. The user is non-technical; explain changes in plain language and prefer giving them regenerated artifacts (zip / portable HTML) over instructions that require tooling.
