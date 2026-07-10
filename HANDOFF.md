# HANDOFF — Life.Org (formerly Life Organization)

Context document for any developer or AI session picking up this project. Read this first, then `design/README.md` (the original design spec; canonical for visuals, superseded in places by the personalization work described below).

## Latest wave (Jul 10 2026): Life.Org rename, honest offline mode, Socials graph, Goal Center redesign

- **Renamed to Life.Org** everywhere a person can see it: `package.json` (`productName`, NSIS `shortcutName`), window title + tray tooltip, `index.html`, sidebar brand, custom title bar, onboarding, backup copy, data-file names, README. **`appId` stays `com.lifeorganization.app` on purpose** so Windows treats the new installer as an upgrade, not a second app. The rename moves Electron's `userData` folder, so `electron/main.ts` gained `migrateOldUserData()`: on first launch under the new name it copies `life-org.db` (+ WAL/SHM sidecars) across from the old `Life Organization` folder. Do not remove it while any old install might still upgrade.
- **The offline stub no longer invents anything.** `StubProvider` used to return canned student-persona output (Maya, problem sets, "Night Drive") for Strategist, Patterns, Weekly Review, the finance read, vault connections, the coach, preference learning, and chat summaries; that was the "default data" the user kept seeing. All of it is deleted. Offline, the only thing that still works is **brain-dump classification** (a real local heuristic over the person's own words). Everything else throws `NO_ENGINE` (see `isNoEngine`), and `aiAction` turns it into the toast "This needs the engine. Connect an API key in Settings, then run it again." A reflection still **saves** without a key; only its read-back needs the engine (`output` stays `null`).
- **A saved key now wins over a stale "Offline" selection**: `provider()` falls back to Anthropic/OpenAI whenever a key exists even if `settings.provider` is `'stub'`, so pasting a key connects everything (including the Finances "read", which shares the same provider path as the coach).
- **The Vault feeds the engine.** `buildContext()` now includes the 10 most recent vault notes, so the coach, strategist, patterns, and weekly review see what Brain Dump and reflections have filed.
- **Accounts → Socials**, plus a follower graph: `src/components/FollowerChart.tsx`, an inline SVG line chart over `socialHistory` (accent line, recessive grid, crosshair + tooltip on hover, first/middle/last date labels, theme-variable colors in both modes). Renders once two daily snapshots exist.
- **Goal Center redesigned**: header block (clickable area pill, large inline-editable title, full-width **click-to-set** progress bar snapping to fives, plus a typeable percent), then cascade levels as left-railed blocks (accent rail on Vision and Today), hover-reveal `×` per step, and "+ add step" that opens an empty inline editor (abandoning it removes the step). New `.cascade-row` styles in `global.css`.
- **Icon brightened to orange** `#E08A33` (was muted gold `#B07F2C`) in `scripts/make-icon.mjs` and the `index.html` favicon; `build/icon.png`/`.ico` regenerated. The center mark stays the cream ring: an open-book variant was tried and rejected by the user, so do not reintroduce it.
- **Next wave (user-driven): a large design-FUNCTION overhaul.** The user intends to connect extra resources (anime.js among them) for a more elaborate interface. Keep today's tone and palette; the overhaul is about function and motion, not a re-theme. Wait for their resources before starting.

## Previous wave (Jul 9 2026): motion, installer, and the Accounts tab

The project now builds a real Windows installer on the user's own PC. Node 24 + the toolchain are installed locally; `npm run dist -- --publish never` with `CSC_IDENTITY_AUTO_DISCOVERY=false` writes `release/Life Organization Setup 1.0.0.exe`. The first build must run **elevated** once (electron-builder's winCodeSign archive holds macOS symlinks that Windows will not extract without the symlink privilege); after that the cache is warm and normal builds work. Windows Developer Mode is enabled on the machine.

Shipped in this wave:
- **Motion** (`motion` v12, `motion/react`) is the animation workhorse. `AnimatedNum` in `src/components/ui.tsx` counts numerals up; `Track` glides its fill. Used on the Dashboard focus score, life-area scores, and goal percentages.
- **Start screen**: fades in, and "Keep the sample data" is now **"Start Empty"** (wipes to `seedFresh()`), routed through `completeOnboarding('empty')`. The sample data is no longer reachable from the UI, so `scripts/verify.js` seeds `{"settings":{"onboarded":true}}` into localStorage to exercise it.
- **Accounts module** (`src/modules/Social.tsx`): connect ONE public Instagram or TikTok account by handle, read-only, **no API key**. The main process does a single plain GET of the public profile (Instagram's `web_profile_info` endpoint, TikTok's embedded `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON), no sign-in, no cookies, no retries, no crawling. **Both platforms reject requests without ordinary browser headers**: Instagram answers `400 SecFetch Policy violation` unless `sec-fetch-site/mode/dest` and a `referer` are sent. Verified live against `@nasa` on both platforms. Failures are tagged `NOTFOUND:` or `BLOCKED:` so the renderer names the real problem instead of guessing. **Hard cooldowns** live in `SOCIAL_COOLDOWN` (Instagram 12h, TikTok 2h) and refuse early refreshes. Never post, like, or follow: that is the whole point of the feature and must not regress. The account's profile picture becomes the window/tray icon and shows in the sidebar. This is scraping, so it *can* break if either site changes; keep the failure copy honest.
- **Wipe all data** (Settings → Your data): erases everything and returns to the first-run screen. Two gates: a confirm, then typing `ERASE`. `store.wipeAllData()` resets to `seedFresh()` + default settings and calls `lifeOS.wipeData()`, which empties every SQLite table (`db.wipe()`).
- **In-theme dialogs** (`src/components/dialog.tsx`): `confirmDialog()` / `promptDialog()` replace every `window.confirm` and `window.prompt`, which ignored the palette and looked like another program. A module-level publisher lets the store open one too. `DialogHost` renders in `App.tsx`; styled by `.dialog-backdrop` / `.dialog-panel` with `--overlay` and `--dialog-shadow` tokens per theme. **Destructive dialogs focus Cancel, never the confirm button, and Enter will not fire them** (a stray Enter deleted a goal before this rule existed). Prompts support `requireText` (the wipe types `ERASE`), gating the confirm button. `scripts/verify.js` now clicks `[data-dialog-confirm]` instead of `page.on('dialog')`.
- **Weekly review notification**: a desktop notification on `settings.weeklyDay`, at most once per local day (`settings.lastWeeklyNotice`). Clicking it opens the Weekly Review. Requests permission lazily on that day only.
- **Custom title bar**: `titleBarStyle: 'hidden'` + `titleBarOverlay`, recolored per theme from `applyTheme()` through `lifeOS.setTitlebar`. The renderer draws `.titlebar` (36px, draggable) only when `window.lifeOS` exists.
- **App icon**: `scripts/make-icon.mjs` generates `build/icon.png` + `build/icon.ico` from code (no image deps). `npm run dist` regenerates them first. Used by the window, tray, installer, uninstaller, and shortcut.
- **Goal Center fix**: the percent editor was a fixed 34px box, stranding "% complete" far right of a one-digit value (a new goal's `0`). It now hugs its digits.

- **Strategist now starts empty.** `seed.ts` used to ship three hand-written morning actions and an evening line, so the module looked like the engine had already run when it never had. Both seeds are now `[]` / `''`. New `morningDate` / `eveningDate` fields stamp the local day each generation belongs to; stale output is dropped at hydration and at the midnight rollover, because yesterday's advice is not today's. Existing installs self-clear on first launch (no date stamp means stale).
- **The app invents nothing.** `seed.ts` no longer ships the student persona at all: `seedState()` is now just `seedFresh()` plus default settings. Gone are the sample goals, tasks, habits (with fake streaks), schedule, projects, vault notes, brain-dump items, and the canned `patterns`, `weekly`, and area-score readings. The persona moved into `scripts/verify.js` as a **test fixture**, which deliberately carries no engine output so the checks must make the engine produce it. Empty states were added to Dashboard (goals, projects), Goal Center, Roadmaps, Vault, Patterns, and Weekly Review.
  - `scores.ts` gained `hasActivity()`. With no habits, tasks, or reflections there is no signal, so the Dashboard renders the focus score and every area score as **a dash with an empty bar** instead of the formula's starting constants (which read as `42` and `47`-`48`, i.e. measurements of nothing). `computeAreaScores` also stops nudging baselines when there is no signal.
  - **Rule: never ship canned engine output, invented user history, or a number the data does not support.**

New persisted fields: `social`, `socialHistory`, `morningDate`, `eveningDate` (all in `PersistedState`, kv-backed in `electron/db.ts`) and `settings.lastWeeklyNotice`.

## ⚠️ DEBUGGING HANDOFF — exact state of the debug sweep and what remains

**The sweep is half done.** `scripts/debug-sweep.workflow.js` (5 review dimensions, then 3 adversarial verifiers per finding, run via the Workflow tool) was launched over the full codebase; the session ended after only the **persistence** and **state-react** reviewers finished. Their 20 findings were manually adjudicated and **the real ones are FIXED and verified** (see "Fixed from the sweep" below). Three dimensions **never ran** and are the next session's first job:

1. **product-rules** (em dashes, 12-hour times, Oswald numerals, CSS-vars/dark mode, busy labels, stub coverage, no "AI" labels, blunt tone consistency)
2. **engine-contracts** (buildContext with legacy/edge data, provider request/response handling, parseJSON per contract, financeContext math, stub branch triggers)
3. **ui-edges** (zero-data states everywhere, absurd inputs, drag-drop edges, compact-window layout, overflow)

Run the sweep again as-is (its dimension prompts already cover both feature waves); the two finished dimensions will mostly re-find fixed items, which the verifiers should now refute. Fix anything newly CONFIRMED, then `node scripts/verify.js` and keep **all 40 checks green**.

**Fixed from the sweep (commit "Debug sweep round 1"):**
- Upgrade/wipe safety: pre-onboarding data auto-marks `onboarded` at load (no wizard over real data); backup restore forces `onboarded: true`; the data-file Reconnect banner renders above the onboarding overlay.
- Live-file recovery now writes the recovered state back into localStorage (a following save no longer truncates both stores); saves fall back to an in-memory full-state cache when localStorage is unreadable; `reconnectFile` compares data richness and asks before overwriting a richer file.
- Day rollover: a minute-interval tick resets habit flags, expires one-off schedule blocks, and rolls `todayReflection` at midnight (the tray app can run for weeks without a relaunch).
- Electron: reflections table is now replace-not-upsert (fresh starts/restores no longer resurrect old reflections on relaunch); `schedule.once` column migration; corrupt kv values or an unreadable database no longer prevent launch.
- Background-task races: an epoch counter discards in-flight learn/summarize results after a restore or fresh start; `learnQuietly` also drops its result if the user edited the memory list mid-flight; `chatSummarized` clamped to chat length on restore and summarize-completion.
- `withDefaults` strips undefined values (an Electron DB with no weekly row could crash Weekly Review).
- Onboarding dedupes life areas; replan prompt uses the user's real `settings.areas` (was hardcoded) and validates returned areas; re-submitting a reflection replaces that day's Vault journal instead of duplicating; Coach keeps the draft instead of silently discarding input while a reply is in flight; Escape cancels the Goal Center cascade editor.

**Accepted minor behaviors (do not re-fix without a better design):** double-clicking a habit name to rename fires two state-neutral toggles first; clicking elsewhere in the habit row while the rename editor is open commits the rename and toggles the habit once.

**Also for next session:**
- Verify the latest "Build installers" Actions run is green and walk the user through downloading `installer-windows-latest` (they are non-technical).
- The user is now testing with a live API key; collect their feedback first, fix before building anything new.

**Explicitly declined by the user (do not build):** day-start/day-end nudges (auto-morning-strategist, evening reflection reminders).

**Proposed but not built (user asked for suggestions):** self-improvement agents once an API key is connected: a nightly "auditor" (data hygiene), a weekly "prompt tuner" (adjusts stored prompt phrasing from which outputs the user edits/ignores), a monthly "feature scout" (reads the history ledger, drafts a prioritized improvement list a future Claude session implements). Self-modifying code ruled out; the loop is: app collects evidence, agents draft, a Claude session applies.

**Backlog:** phone-friendly layout, smarter area-score model, embeddings for Vault search, OS calendar integration.

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
