# Life Organization — Project Knowledge

A reference doc for any Claude chat helping plan this project. Written 2026-07-09.

## What the app is
A single-user, local-first "Life OS" desktop app. Everything lives on the user's own machine (no cloud, no accounts). An engine is woven invisibly through it for classification, planning, coaching, pattern detection, and reviews — but the app is fully usable offline through a built-in stub engine.

**Modules (screens):**
- **Life Dashboard** — daily command center: focus score, life-area health, top tasks, schedule, goal progress, habits, active projects.
- **Brain Dump** — write anything; it gets split into typed items (tasks, deadlines, people, ideas, habits...).
- **Knowledge Vault** — everything ever written, searchable, with "threads you've forgotten" connections.
- **Goal Center** — each goal cascades Vision → 1-Year → Quarterly → Monthly → This week → Today; every line editable in place.
- **Roadmaps** — project cards with milestone maps, phases, and detail fields.
- **Strategist** — morning highest-impact actions and an evening debrief.
- **Finances** — hand-logged income/spending/savings with an engine read of the money picture.
- **Coach** — a chat that knows everything the user has written; persists across sessions.
- **Reflection** — five honest questions each evening; the engine reads them back.
- **Weekly Review** — wins, failures, habits, time, progress, recommended changes.
- **Patterns** — behavioral patterns drawn from the user's own data.
- **Settings** — engine provider + key, learned preferences, backup/restore, coach tone, theme, life areas.

## How it's delivered
- Ships as an **installable Windows app**: `Life Organization Setup.exe` (NSIS installer, unsigned, ~90 MB). Installing shows a "Windows protected your PC" warning because it's unsigned — click More info → Run anyway.
- Data is stored locally (SQLite in the installed app; browser localStorage in the portable/dev build). Data carries over between app versions.
- It learns durable preferences quietly over time and folds them into every plan/reply. Editable in Settings.

## Tech + where the code lives (for the Claude Code session, not this chat)
- **Stack:** Electron + React 18 + TypeScript + Vite; SQLite via node:sqlite; pluggable engine (Anthropic, OpenAI, or offline stub).
- **Source folder:** `C:\Users\Sammy\Desktop\LifeOrg`
- **GitHub:** `github.com/themed1c/themed1c`, branch `claude/handoff-push-pntrf4` (public).
- **Build the installer:** in the Claude Code session, set `CSC_IDENTITY_AUTO_DISCOVERY=false` then run `npm run dist -- --publish never`; the `.exe` lands in the `release\` folder. (First build had to run as admin once to unpack a signing helper; later builds don't.)
- **Key files:** `src/lib/types.ts` (data shapes), `src/lib/store.tsx` (all state + actions), `src/lib/ai/prompts.ts` (engine context + prompts), `src/modules/*.tsx` (one file per screen), `electron/` (desktop shell + SQLite).

## Current status
All core features implemented and previously verified. Node.js and the full build toolchain are now installed on the user's PC, and a working installer has been built and smoke-tested (2026-07-09).

## Product rules (do not violate when proposing features)
- No em dashes in app text; no emoji; 12-hour AM/PM times.
- Never label anything "AI" in the UI (vendor names in Settings are the only exception).
- Must stay fully usable offline (built-in stub engine); any new engine feature needs an offline fallback.
- Numbers in Oswald font; colors via theme variables; verify new UI in dark mode.
- All "today" dates are local calendar dates.

## Backlog / open threads
- **Live-testing feedback:** the user recently started testing with a real API key — collect and fix any rough edges before building new things.
- **App icon:** currently the default Electron icon; a custom icon would make it feel finished.
- Phone-friendly layout.
- Smarter life-area scoring model.
- Better Vault search (e.g. meaning-based search).
- OS calendar integration.
- "Self-improving" agents (once a key is connected): a nightly data-hygiene pass, a weekly prompt-tuner, a monthly feature-scout that drafts an improvement list. Rule the user set: the app gathers evidence and drafts suggestions; a Claude Code session reviews and applies them. No self-modifying code.

## Things the user has declined (don't propose)
- Day-start/day-end nudges (auto morning-strategist, evening reflection reminders).
