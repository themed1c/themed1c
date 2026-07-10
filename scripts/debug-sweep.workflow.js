export const meta = {
  name: 'life-org-debug-sweep',
  description: 'Multi-dimension review of the Life Organization app with adversarial verification of findings',
  phases: [
    { title: 'Review', detail: 'five parallel reviewers, one dimension each' },
    { title: 'Verify', detail: 'three adversarial verifiers per finding' },
  ],
}

const REPO = '/home/user/themed1c'

const COMMON = `You are reviewing a small local-first Electron+React+TypeScript app at ${REPO}.
Recent feature waves (all recent commits): (a) per-day history ledger (src/lib/history.ts, PersistedState.history), full in-place editing (Dashboard/GoalCenter/Roadmaps + InlineText/AddRow in src/components/ui.tsx), settings.aboutMe fed into src/lib/ai/prompts.ts buildContext, coach chat summarization (store.tsx maybeSummarizeChat, chatSummary/chatSummarized), preference learning (memory), Anthropic+OpenAI providers, live data file mirror (backend.ts File System Access API), backup/restore, local-date handling; and (b) first-run onboarding with fresh-start wipe (src/modules/Onboarding.tsx, store.completeOnboarding, seed.ts seedFresh), professional-blunt tone overhaul with coach tones deleted, Finances module (src/modules/Finances.tsx, finance/financeRead state, prompts.finance, MONEY context section), user-editable goal/task areas (settings.areas; renames remap) and dashboard life-area scorecard editing, schedule blocks with daily/once repeat (ScheduleItem.once, cleanup at hydration) and drag-handle reorder, weekly review gated to settings.weeklyDay, Electron tray/background mode (electron/main.ts runInBackground) with compact responsive window (global.css media queries), GitHub Actions installer workflow.
Read the actual files before claiming anything. Report REAL defects a user could hit, with a concrete failure scenario (inputs/state leading to wrong behavior). Report every issue you find, including ones you are uncertain about; a separate verification step will filter. Do NOT report style nits, hypothetical refactors, or missing features. Line numbers approximate is fine.`

const FINDINGS = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['file', 'title', 'detail', 'scenario', 'severity'],
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          title: { type: 'string' },
          detail: { type: 'string' },
          scenario: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
}

const VERDICT = {
  type: 'object',
  additionalProperties: false,
  required: ['real', 'reasoning'],
  properties: {
    real: { type: 'boolean' },
    reasoning: { type: 'string' },
  },
}

const DIMENSIONS = [
  {
    key: 'state-react',
    prompt: `${COMMON}
DIMENSION: React/state correctness. Focus on src/lib/store.tsx, src/App.tsx, src/modules/*.tsx (especially Onboarding, Finances, Dashboard), src/components/ui.tsx. Hunt: stale dataRef.current reads inside the same event tick after an update() (dataRef refreshes only on re-render), completeOnboarding replacing state while other callbacks hold references, updateWithHistory correctness, deletion edge cases (deleting the selected goal, deleting ALL goals/tasks/habits/projects/areas/phases, current-phase index after phase removal), drag-reorder state (dragFrom/dragOver) edge cases, event propagation with nested clickable elements inside clickable rows, InlineText/AddRow commit/cancel/blur double-fire, chat summarization pointer math (chatSummarized) incl. after backup restore, races between learnQuietly / maybeSummarizeChat / reviewFinances / user actions, busy-flag gaps, weekly gate day computation.`,
  },
  {
    key: 'persistence',
    prompt: `${COMMON}
DIMENSION: persistence integrity. Focus on src/lib/backend.ts, src/lib/store.tsx (exportData/importData, completeOnboarding persist, hydration incl. one-off schedule cleanup), electron/db.ts, electron/main.ts, src/lib/seed.ts. Verify EVERY PersistedState field (incl. finance, financeRead, history, chatSummary, chatSummarized, memory, schedule[].once, settings.aboutMe/areas/onboarded/weeklyDay/runInBackground/openai*) round-trips through: (1) BrowserBackend localStorage partial saves, (2) the live data file mirror incl. wipe-recovery ordering in load(), (3) backup save + importData validation and merge (old backups without new fields; new backups into old code), (4) ElectronBackend + db.ts SQLite mapping (kv keys, table columns incl. the schedule.once ALTER migration, load defaults). Also: main.ts runInBackground cache staying in sync with saves, settings written by onboarding for users upgrading from older stored data.`,
  },
  {
    key: 'product-rules',
    prompt: `${COMMON}
DIMENSION: product rules, copy, and theming. Rules that must hold: (1) NO em dash (U+2014) in any UI copy or stub-engine output; (2) all times 12-hour AM/PM; (3) numerals (scores, %, streaks, times, money, counts) render in the Oswald font via Num or FONT_NUM, including new Finances tiles/ledger and editable percent fields; (4) colors ONLY via CSS variables, check every new inline style incl. Onboarding and Finances in dark mode; (5) every user-triggered engine action shows a busy label and is a no-op while busy (incl. Review finances); (6) nothing labeled AI/model/GPT/Claude outside Settings engine names; (7) no emoji; (8) tone is professional and blunt everywhere, no leftover chatty copy or references to deleted coach tones. Also check the stub engine covers every prompt contract in src/lib/ai/prompts.ts and that no stub trigger substring can appear inside buildContext output or user data.`,
  },
  {
    key: 'engine-contracts',
    prompt: `${COMMON}
DIMENSION: AI plumbing and prompt contracts. Focus on src/lib/ai/prompts.ts (incl. financeContext, historyContext, coachSystem stacking), src/lib/ai/provider.ts, src/lib/backend.ts, electron/main.ts, src/lib/history.ts, engine call sites in store.tsx. Hunt: buildContext bugs (undefined legacy fields crashing .trim() or .map, aboutMe/areas from pre-upgrade data, finance math incl. the localMonth calculation, token bloat), the live chat window slice sent to providers (empty/assistant-first handling vs Anthropic requirements, normalizeForAnthropic), OpenAI request/response handling, parseJSON robustness per contract, clean() coverage of engine outputs incl. financeRead, chatSummarized clamping, stub determinism and stub finance/summarize/learn branch correctness.`,
  },
  {
    key: 'ui-edges',
    prompt: `${COMMON}
DIMENSION: UI edge cases a real user hits. Walk each module as a skeptical user: onboarding with empty answers, absurd inputs, or Escape/blur mid-flow; ZERO goals/tasks/habits/projects/areas/schedule rows/finance entries everywhere they render; deleting the last life area or last goal area; weekly gate when settings.weeklyDay is from a stale backup (out of range?); drag-reorder dropped outside rows; schedule Today block toggled on a later day; finance amounts like 0, negatives typed, huge numbers, '12.345'; percent editors given 'abc'/'150'/negative; InlineText inside uppercase transforms; the compact 680px window (media queries) for every module incl. Finances and the reconnect banner; extremely long text overflow. Only report things that actually misbehave based on the code, with the concrete scenario.`,
  },
]

phase('Review')
const results = await pipeline(
  DIMENSIONS,
  (d) => agent(d.prompt, { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS }),
  (review, d) =>
    parallel(
      (review?.findings ?? []).map((f) => () => {
        const lenses = ['correctness (does the code actually do what the finding claims?)', 'reproduction (walk the exact scenario step by step through the code)', 'impact (would a real user ever hit this, or is it unreachable/hypothetical?)']
        return parallel(
          lenses.map((lens, li) => () =>
            agent(
              `You are an adversarial verifier. Repo: ${REPO}. Read the relevant files yourself; do not trust the claim.
FINDING (from dimension ${d.key}): file=${f.file} line=${f.line ?? '?'} title=${f.title}
detail: ${f.detail}
scenario: ${f.scenario}
Your lens: ${lens}. Try hard to REFUTE the finding. real=true ONLY if the defect genuinely exists in the current code AND the scenario is reachable by a user. If uncertain, real=false.`,
              { label: `verify:${d.key}:${li}`, phase: 'Verify', schema: VERDICT },
            ),
          ),
        ).then((votes) => ({
          ...f,
          dimension: d.key,
          votes: (votes ?? []).filter(Boolean),
          confirmed: (votes ?? []).filter(Boolean).filter((v) => v.real).length >= 2,
        }))
      }),
    ),
)

const all = (results ?? []).filter(Boolean).flat().filter(Boolean)
const confirmed = all.filter((f) => f.confirmed)
log(`${all.length} raw findings, ${confirmed.length} confirmed`)
return {
  confirmed: confirmed.map(({ votes, ...f }) => ({ ...f, voteSummary: votes.map((v) => `${v.real}: ${v.reasoning.slice(0, 200)}`) })),
  rejectedCount: all.length - confirmed.length,
  rejectedTitles: all.filter((f) => !f.confirmed).map((f) => `${f.dimension}: ${f.title}`),
}