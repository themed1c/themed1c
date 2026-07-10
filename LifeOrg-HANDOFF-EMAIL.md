# Life Organization (to be renamed **Life.Org**) — Full Handoff

**Date:** 2026-07-09
**For:** the next Claude Code session (or any developer) picking this up.
**Read this whole file first.** Then read `HANDOFF.md` and `README.md` in the repo.

---

## 0. The 60-second version

A single-user, local-first "Life OS" desktop app. Electron + React 18 + TypeScript + Vite,
SQLite via `node:sqlite`, pluggable AI engine (Anthropic / OpenAI / built-in offline stub).
It builds to a real Windows installer. The user is **non-technical**: explain in plain
language, never require the command line, always hand back a rebuilt `.exe`.

- **Source:** `C:\Users\Sammy\Desktop\LifeOrg`
- **GitHub:** `https://github.com/themed1c/themed1c` (public), default branch
  `claude/handoff-push-pntrf4`
- **Installer output:** `release\Life Organization Setup 1.0.0.exe` (~91 MB, NSIS, unsigned)
- **Nothing is committed or pushed yet.** The working tree has all the work described below.

---

## 1. Environment: already set up on this machine

| Thing | Status |
|---|---|
| Node.js | 24.18.0 installed via winget (`C:\Program Files\nodejs`) |
| npm | 11.16.0 |
| Windows Developer Mode | Enabled (registry `AllowDevelopmentWithoutDevLicense=1`) |
| electron-builder cache | Warm (winCodeSign already extracted) |
| `gh` CLI | NOT installed |

Fresh PowerShell sessions may need `$env:Path += ";C:\Program Files\nodejs"`.

### Build the installer

```powershell
$env:Path += ";C:\Program Files\nodejs"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
cd C:\Users\Sammy\Desktop\LifeOrg
npm run dist -- --publish never
```

Output lands in `release\`. Copy to Desktop as `Life Organization Setup.exe` for the user.

**Gotcha (already solved, do not re-suffer):** electron-builder's `winCodeSign` archive
contains macOS symlinks that Windows refuses to extract without symlink privilege. The
**first** build had to run elevated (admin) to populate the cache. It is populated now, so
normal non-elevated builds work. If the cache is ever corrupted, delete
`%LOCALAPPDATA%\electron-builder\Cache\winCodeSign` and run one build as administrator.

### Other commands

```bash
npm run dev          # browser mode at localhost:5173 (localStorage backend)
npm run dev:app      # Vite + Electron with live reload
npm run typecheck    # tsc for renderer + main. Keep clean.
npm run icon         # regenerates build/icon.png + build/icon.ico from code
npm run build:portable   # single self-contained HTML at dist-portable/index.html
node scripts/verify.js   # headless end-to-end harness (needs `npm run dev` running,
                         # `npm i playwright-core --no-save`, and CHROMIUM_PATH)
```

---

## 2. Architecture

```
electron/main.ts        window, tray, IPC, custom title bar, Anthropic + OpenAI proxies,
                        social profile reads, db.wipe(). API keys never enter the renderer.
electron/db.ts          SQLite schema + PersistedState<->tables (WAL, local dates).
                        Singletons live in the `kv` table. Has wipe().
electron/preload.ts     the window.lifeOS bridge.
src/lib/types.ts        every data shape. PersistedState is the whole persisted app.
src/lib/store.tsx       THE app: one React context, all state, mutations, AI actions,
                        busy flags, updateWithHistory(), learnQuietly(),
                        maybeSummarizeChat(), backup/restore, wipeAllData(), social.
src/lib/backend.ts      Backend interface: ElectronBackend (IPC) or BrowserBackend
                        (localStorage 'life-org-v2') + withDefaults() migration merge
                        + the live data file machinery.
src/lib/ai/provider.ts  StubProvider (offline), AnthropicProvider, OpenAIProvider.
src/lib/ai/prompts.ts   buildContext() + every prompt contract.
src/lib/scores.ts       hasActivity(), computeAreaScores(), focusScore().
src/lib/seed.ts         EMPTY first-run state + PASTELS palette. Invents nothing.
src/lib/history.ts      daily ledger (pure).
src/lib/clean.ts        clean() strips em/en dashes from ALL engine output; parseJSON().
src/lib/time.ts         local-date helpers, timeToMinutes(), stamp().
src/global.css          all design tokens as CSS vars (:root light, :root.dark dark).
src/components/ui.tsx   Card, CardLabel, Num, AnimatedNum, GhostButton, AccentButton,
                        CheckSquare, Track, Chip, InlineText, AddRow, Toast.
src/components/dialog.tsx  confirmDialog() / promptDialog() + DialogHost. In-theme.
src/modules/*.tsx       one file per screen. Presentation only; everything via useApp().
src/App.tsx             title bar + sidebar shell + module registry + DialogHost.
scripts/verify.js       headless harness. Contains the TEST FIXTURE (sample persona).
scripts/make-icon.mjs   generates build/icon.png + build/icon.ico from code, no deps.
```

**Data flow:** module → `useApp()` action → optimistic state update → `backend.save(partial)`
(fire-and-forget). AI actions: busy flag on → `provider().complete(prompt)` →
`clean(parseJSON(...))` → state update + persist → busy off. Any throw shows the standard
toast and leaves prior data untouched.

---

## 3. ⚠️ THE MOST IMPORTANT THING TO UNDERSTAND

The user reports **"Strategist / Weekly Review / Patterns are still outputting default data."**

I already removed all canned data from `src/lib/seed.ts` (the app now ships completely
empty). **That is not the remaining cause.** The remaining cause is:

### `StubProvider` in `src/lib/ai/provider.ts` returns hardcoded constants.

When no API key is connected, the app falls back to the offline stub engine, which
pattern-matches the prompt and returns pre-written strings:

```
if (p.includes('Surface 4 behavioral patterns'))  return PATTERNS_JSON;   // canned
if (p.includes('Write this week’s review'))       return WEEKLY_JSON;     // canned
if (p.includes('You are the strategist'))         return MORNING_JSON;    // canned
if (p.includes('Evening debrief'))                return EVENING_TEXT;    // canned
if (p.includes('highest-impact tasks for today')) return REPLAN_JSON;     // canned
if (p.includes('Assess their money picture'))     return FINANCE_TEXT;    // canned
if (p.includes('threads the person has forgotten')) return CONNECTIONS_TEXT; // canned
if (p.includes('Tonight’s reflection'))           return REFLECTION_TEXT; // canned
```

Worse, `coachReply()` in the same file contains hardcoded replies that reference the old
fictional persona — "Problem set 6 is due Friday and it gates the GPA goal", "The lit
review", "the hour after closing shifts". **These are the strings the user is seeing.**

So the Strategist button *does* call the engine. The engine just happens to be a liar when
there is no API key.

**What the next session must decide (ask the user):**

1. **Preferred:** when `provider === 'stub'`, the affected modules should refuse to
   fabricate. Either disable the generate buttons with copy like *"Connect an engine in
   Settings to read your data,"* or have the stub return an empty/refusal contract that the
   store treats as "nothing to show." The stub's *only* legitimate uses are the brain-dump
   heuristic classifier (which really does classify text) and cheap deterministic helpers.
2. Alternatively, make the stub genuinely derive its output from `PersistedState` (count
   habits, compute completion rates) so it is honest arithmetic rather than fiction.

Either way: **the app must never present a hardcoded sentence as an insight about the user.**
That rule is now written into `HANDOFF.md`. Enforce it.

---

## 4. What was completed in this session (all verified, all in the working tree)

1. **Recovered the project.** Cloned from GitHub into `C:\Users\Sammy\Desktop\LifeOrg`.
   Installed Node + toolchain. Produced the first working Windows installer.
2. **Motion animations.** `motion` v12 (`motion/react`) added. `AnimatedNum` counts numerals
   up; `Track` glides its fill. Used on the Dashboard focus score, area scores, goal
   percentages.
3. **Start screen.** Fades in. "Keep the sample data" → **"Start Empty"** (routes through
   `completeOnboarding('empty')`).
4. **Accounts module** (`src/modules/Social.tsx`). Connect ONE public Instagram or TikTok
   account by handle. **No API key.** Read-only: never posts, likes, or follows.
   - Both platforms reject requests lacking ordinary browser headers. Instagram returns
     `400 SecFetch Policy violation` without `sec-fetch-site/mode/dest` + `referer`.
     **Verified live:** Instagram `@nasa` → 104,342,056 followers; TikTok `@nasa` → 695.
   - Hard cooldowns in `SOCIAL_COOLDOWN` (Instagram 12h, TikTok 2h).
   - Failures are tagged `NOTFOUND:` or `BLOCKED:` in the main process so the renderer can
     name the real problem. Verified both branches against live endpoints.
   - The account's profile picture becomes the window/tray icon and shows in the sidebar.
   - **This is scraping. It can break if either site changes.** Keep failure copy honest.
5. **Weekly review notification.** Fires on `settings.weeklyDay`, at most once per local day
   (`settings.lastWeeklyNotice`). Clicking opens Weekly Review.
6. **Custom title bar.** `titleBarStyle: 'hidden'` + `titleBarOverlay`, recolored per theme
   from `applyTheme()` via `lifeOS.setTitlebar`. `.titlebar` renders only when
   `window.lifeOS` exists.
7. **Real app icon.** `scripts/make-icon.mjs` generates `build/icon.png` + `build/icon.ico`
   from code (hand-rolled PNG encoder, no image deps). Used by window, tray, installer,
   uninstaller, shortcut.
8. **Goal Center bug fixed.** The percent editor was a fixed 34px box, stranding "% complete"
   far right of a one-digit value. Now hugs its digits (34px → 13px).
9. **Wipe all data** (Settings → Your data). Two gates: a confirm, then typing `ERASE`.
   `store.wipeAllData()` + `lifeOS.wipeData()` → `db.wipe()` empties every SQLite table.
10. **In-theme dialogs** (`src/components/dialog.tsx`). Replaced all 7 `window.confirm` /
    `window.prompt` calls. Themed for light and dark.
    - **Safety rule:** destructive dialogs focus **Cancel**, never the confirm button, and
      **Enter will not fire them.** (A stray Enter deleted a goal during testing before this
      rule existed.) Prompts support `requireText` gating.
11. **Strategist starts empty.** New `morningDate` / `eveningDate` stamp the local day each
    generation belongs to. Stale output is dropped at hydration and at midnight rollover.
12. **The app invents nothing.** `seed.ts` no longer ships the student persona: no sample
    goals, tasks, habits (with fake streaks), schedule, projects, vault notes, brain-dump
    items, and no canned `patterns` / `weekly` / area-score readings. The persona moved into
    `scripts/verify.js` as a **test fixture** which deliberately carries no engine output.
13. **Honest scores.** `scores.ts` gained `hasActivity()`. With no habits, tasks, or
    reflections, the Dashboard renders the focus score and every area score as **a dash with
    an empty bar**, instead of the formula's starting constants (`42`, `47`–`48`) which read
    as measurements of nothing. `computeAreaScores` stops nudging baselines with no signal.
14. **Empty states** added to Dashboard (goals, projects), Goal Center, Roadmaps, Vault,
    Patterns, Weekly Review.

---

## 5. Product rules (enforced — do not regress)

- **Never an em dash** in UI copy or engine output. `clean()` post-processes; verify asserts.
- **12-hour AM/PM times** everywhere. **No emoji.**
- **Never label anything "AI"** (Settings' engine vendor names are the allowed exception).
  Tone: a sharp, warm, plainspoken coach.
- All numerals render in **Oswald** (`<Num>` / `<AnimatedNum>` / `FONT_NUM`).
- Colors only via CSS variables. **Check every new UI in dark mode.**
- Every user-triggered engine action has a busy label ("Sorting…", "Replanning…",
  "Thinking…", "Reviewing…", "Looking…", "Reading…") and is a no-op while busy.
- All "today" dates are **LOCAL** calendar dates. Never `toISOString()` for a date.
- Editing: single click edits static text; **double-click renames inside rows whose single
  click toggles** (habits).
- Destructive dialogs focus Cancel; Enter never confirms them.
- **Never ship canned engine output, invented user history, or a number the data does not
  support.**
- Default models: `claude-opus-4-8` (Anthropic), `gpt-5.1` (OpenAI). User-editable.

---

## 6. THE BACKLOG — what the user wants next, in their words

### 6.1 Purge remaining default data (HIGH — see §3 for the real cause)
> "Strategist is still outputting a default data, need to go through entire software and
> purge / remove any 'filled in' or 'default' data that was put in when designing. Overhaul."
>
> "Weekly Review is also outputting a default data... Overhaul."
>
> "Patterns is also outputting a default data... Overhaul."

**The cause is `StubProvider`, not `seed.ts`.** See §3. Also purge the persona strings inside
`coachReply()`. This is the same bug three times; fix it once, at the provider layer.

### 6.2 Goal Center redesign (HIGH)
> "Goal center is still formatted poorly - needs redesigned."

The percent-editor gap is fixed, but the layout itself needs rethinking. `.goal-grid` is
`300px 1fr` and collapses to one column under 980px. The cascade timeline (Vision → Today)
is a flex column with a hairline connector. Redesign the whole screen.

### 6.3 "The read" should use the same system as the Coach (HIGH)
> "The read needs to use the same system as the coach, and connect when API key is being used."

The Finances "read" (`reviewFinances()` → `prompts.finance()`) is a one-shot completion.
The Coach uses `{system, messages}` with `coachSystem()`, chat summarization, and full
context. Make the finance read use the same path, and make sure it actually calls the live
provider when a key is present.

### 6.4 Rename the software to **Life.Org** (MEDIUM)
Touch points: `package.json` (`name`, `productName`, `build.appId`?), `index.html` `<title>`,
`electron/main.ts` (`BrowserWindow.title`, `Tray.setToolTip`, `app.setAppUserModelId`),
`src/App.tsx` (sidebar heading + `.titlebar` text), `README.md`, `HANDOFF.md`, NSIS
`shortcutName`. **Careful:** changing `appId` or `productName` changes the userData path
(`%APPDATA%/life-organization/life-org.db`) and will orphan the user's existing database.
Either keep the old `appId`/userData dir, or write a migration that copies the old DB.

### 6.5 Rename "Accounts" → "Socials", add a live follower graph (MEDIUM)
> "Rename Accounts section to Socials - then after an account is connected make a live graph
> of followers with a timeline."

`socialHistory: SocialSnapshot[]` already records `{ date, followers, posts, likes }` once per
day and is persisted. Everything needed for the graph exists. Build an inline SVG line chart
(no chart library needed; keep it theme-aware via CSS vars, numerals in Oswald).
Rename the nav label and `ModuleKey` `'social'` → keep the key, change the label.
`scripts/verify.js` NAV array must be updated too.

### 6.6 Knowledge Vault ↔ API ↔ Brain Dump / Coach (MEDIUM)
> "Make knowledge vault connect to API and work hand in hand with the Brain Dump / Coach."

Today the Vault is a dumb store: Brain Dump writes notes into it, and "Surface connections"
runs one prompt. Make the Vault a first-class retrieval layer that the Coach and Brain Dump
both read from and write to. (`buildContext()` in `src/lib/ai/prompts.ts` is where context is
assembled.) Backlog item from an earlier session: embeddings for Vault search.

### 6.7 Brighten the icon, make it more orange (LOW — easy)
Edit `scripts/make-icon.mjs`. The gold is `const GOLD = [0xb0, 0x7f, 0x2c]` (`#B07F2C`).
Brighten and warm it toward orange (e.g. `#C8862B` → `#D98A25`, try a few). Then
`npm run icon` and look at `build/icon.png`. **Note:** the same `#B07F2C` is the `--accent`
CSS var in `src/global.css` (dark mode uses `#E0A458`) — decide whether the app accent moves
with the icon or stays put. Ask the user.

### 6.8 THE BIG ONE: massive design/function overhaul (AFTER the above)
> "Once this is all done, prepare to keep the same tone vibe, but massively overhaul design
> FUNCTION. I will be connecting you to repos and resources like anime.js for a more
> elaborate interface."

Keep the tone: calm, warm, restrained, plainspoken. Overhaul the *function* of the interface.

---

## 7. Animation / UI resources (already cloned locally)

Six reference repos are cloned, shallow, at **`C:\Users\Sammy\Desktop\reference-repos\`**.
They are reference material, not dependencies.

| Repo | Local folder | GitHub | Install | Notes |
|---|---|---|---|---|
| Motion (Framer Motion) | `motion` | https://github.com/motiondivision/motion | `npm install motion` | **Already installed** (v12.42.2). Import from `motion/react`. Layout animations, `AnimatePresence`, drag gestures. |
| Anime.js | `anime` | https://github.com/juliangarnier/anime | `npm install animejs` | v4.5.0. SVG path morphing, `createDraggable`, `onScroll`, `createTimeline`. |
| GSAP | `gsap` | https://github.com/greensock/GSAP | `npm install gsap` | v3.15.0. `ScrollTrigger`, complex timelines, SVG/text stagger. |
| Animate UI | `animate-ui` | https://github.com/imskyleen/animate-ui | shadcn registry | Sliding numbers, animated tabs/accordions/dialogs, ripple. |
| React Bits | `react-bits` | https://github.com/DavidHDev/react-bits | shadcn registry | BlurText / SplitText reveals, Aurora backgrounds, ClickSpark, magnetic hover. |
| Magic UI | `magicui` | https://github.com/magicuidesign/magicui | shadcn registry | Marquee, globe, and more. |

### ⚠️ Critical compatibility note

This app uses **plain CSS with custom properties** in `src/global.css`. It does **NOT** use
Tailwind or shadcn.

- **Motion, Anime.js, GSAP** → true drop-ins. `npm install` and use directly.
- **Animate UI, React Bits, Magic UI** → their `npx shadcn@latest add ...` commands **will
  not work** in this project. To use one of their effects you must **hand-port it** from the
  cloned source into the app's own CSS. The clones exist precisely so you can read them.

### Project links

- **Repo:** https://github.com/themed1c/themed1c (branch `claude/handoff-push-pntrf4`)
- **CI:** `.github/workflows/build-installers.yml` builds unsigned installers for Windows
  (.exe), macOS (.dmg), Linux (.AppImage) on push. Download from the run's Artifacts.
- **Anthropic API keys:** https://platform.claude.com
- **OpenAI API keys:** https://platform.openai.com
  (Both are *developer API keys*. A ChatGPT Plus or Claude subscription login will not work.)
- **Electron:** https://www.electronjs.org/docs/latest
- **electron-builder:** https://www.electron.build
- **Motion docs:** https://motion.dev/docs/react

---

## 8. Where the user's data lives

- **Windows (installed app):** `%APPDATA%/life-organization/life-org.db` (SQLite)
- **Browser / portable build:** `localStorage` key `life-org-v2`, plus an optional
  **live data file** (File System Access API) the user picks, mirrored on every save and
  immune to browser-data wipes. Handle remembered in IndexedDB `life-org-file`.

`withDefaults()` in `src/lib/backend.ts` merges stored snapshots over the seed, settings
field-by-field, so **adding fields stays backward-compatible. Keep it that way.**

Backup / restore is in Settings → Your data.

---

## 9. Verification

`scripts/verify.js` is the headless end-to-end harness. **Keep it green.**

It now: screenshots every module in both themes into `scripts/shots/`; asserts the shipped
app stores **no canned engine output**; asserts Strategist, Patterns, and Weekly Review all
**start empty**; drives task/habit toggles, brain-dump classification, cascade regen, coach
reply, reflection, weekly rebuild, vault filter + connections, strategist, hand-adding
tasks/habits/schedule/goals/projects, goal delete (via `[data-dialog-confirm]`, not native
dialogs), the daily history ledger, About-you persistence, the OpenAI option, learned
preferences, backup round-trip, live data file, coach summarization, no em dashes, and no
empty modules.

The sample persona lives here as `FIXTURE`, and deliberately contains **no engine output**.

Run it with `npm run dev` in another shell, plus `npm i playwright-core --no-save` and
`CHROMIUM_PATH` set if Chromium is not at `/opt/pw-browsers/chromium`.

Also always: `npm run typecheck` (renderer + main), and actually launch the packaged
`release\win-unpacked\Life Organization.exe` before shipping.

---

## 10. Things the user has explicitly DECLINED — do not build

- Day-start / day-end nudges (auto morning-strategist, evening reflection reminders).
- Self-modifying code. The agreed loop is: the app collects evidence, agents draft
  suggestions, and a Claude session reviews and applies them.

## 11. Older backlog (still open, lower priority)

- Phone-friendly layout.
- Smarter area-score model (the current one is deliberately simple; baselines live in the DB
  so a better model can replace it without touching the UI).
- Embeddings for Vault search.
- OS calendar integration.
- Self-improvement agents once an API key is connected: a nightly "auditor" (data hygiene),
  a weekly "prompt tuner", a monthly "feature scout".
- The debug sweep (`scripts/debug-sweep.workflow.js`) never finished three dimensions:
  **product-rules**, **engine-contracts**, **ui-edges**.

---

## 12. How to work with this user

- They are **non-technical**. Explain changes in plain language. Never require the command
  line for their normal use.
- The workflow is: **they describe what they want → you edit the source → you rebuild →
  you hand them a fresh `Life Organization Setup.exe` on the Desktop.**
- Installing: close the app (**check the system tray**, it hides there), double-click the
  installer, and click **More info → Run anyway** at the SmartScreen warning (the app is
  unsigned). Their data carries over.
- Be honest about what does not work. They explicitly asked: *"If this feature is not
  possible to be vibe coded be reasonable and honest."* Test claims before making them.
