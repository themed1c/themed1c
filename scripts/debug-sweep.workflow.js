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
Recent changes (all uncommitted-plus-recent-commits on this session) added: per-day history ledger (src/lib/history.ts, PersistedState.history), full editing UI (Dashboard/GoalCenter/Roadmaps + InlineText/AddRow in src/components/ui.tsx), aboutMe setting fed into src/lib/ai/prompts.ts buildContext, coach chat summarization (store.tsx maybeSummarizeChat, prompts.summarizeChat, chatSummary/chatSummarized fields), preference learning (memory), OpenAI+Anthropic providers (src/lib/ai/provider.ts, src/lib/backend.ts, electron/main.ts), live data file mirror (backend.ts File System Access API), backup/restore (Settings.tsx exportData/importData in store.tsx), local-date handling (src/lib/time.ts todayISO, electron/db.ts localISO).
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
DIMENSION: React/state correctness. Focus on src/lib/store.tsx, src/App.tsx, src/modules/*.tsx, src/components/ui.tsx. Hunt: stale dataRef.current reads inside the same event tick after an update() (dataRef refreshes only on re-render), updateWithHistory correctness, deletion edge cases (deleting the selected goal, deleting ALL goals/tasks/habits/projects/phases, current-phase index after phase removal), event propagation bugs with nested clickable elements inside clickable rows (task-row, quiet-row, milestone dots, row-x buttons), InlineText/AddRow commit/cancel/blur double-fire, chat summarization pointer math (chatSummarized) incl. after backup restore with a different-length chat, races between learnQuietly / maybeSummarizeChat / user actions, busy-flag gaps.`,
  },
  {
    key: 'persistence',
    prompt: `${COMMON}
DIMENSION: persistence integrity. Focus on src/lib/backend.ts, src/lib/store.tsx (exportData/importData, hydration), electron/db.ts, electron/main.ts, src/lib/seed.ts. Verify EVERY PersistedState field (incl. new history, chatSummary, chatSummarized, memory, settings.aboutMe/openai*) round-trips through: (1) BrowserBackend localStorage partial saves, (2) the live data file mirror incl. wipe-recovery ordering in load(), (3) backup save + importData validation and merge, (4) ElectronBackend + db.ts SQLite mapping (kv keys, tables, load defaults). Hunt: fields saved but never loaded or vice versa, withDefaults gaps for older stored data, hadLocalData semantics, IndexedDB handle failure paths, debounced file write losing the final write on page close, chatSummarized inconsistency after restoring an older backup.`,
  },
  {
    key: 'product-rules',
    prompt: `${COMMON}
DIMENSION: product rules, copy, and theming. Rules that must hold: (1) NO em dash (U+2014) in any UI copy or stub-engine output; (2) all times 12-hour AM/PM; (3) all numerals (scores, %, streaks, times, counts) render in the Oswald font via the Num component or FONT_NUM; (4) colors ONLY via CSS variables so dark mode works, check every new inline style in Dashboard/GoalCenter/Roadmaps/Settings/App/ui components; (5) every user-triggered engine action shows a busy label and is a no-op while busy; (6) nothing in the UI is ever labeled AI/model/GPT/Claude (Settings engine names are the allowed exception); (7) no emoji anywhere. Also check the stub engine covers every prompt contract in src/lib/ai/prompts.ts (each distinctive trigger string matches exactly one StubProvider branch and no trigger string can accidentally appear inside buildContext output or user data... note buildContext IS prefixed to most prompts). Read src/global.css for the variable set.`,
  },
  {
    key: 'engine-contracts',
    prompt: `${COMMON}
DIMENSION: AI plumbing and prompt contracts. Focus on src/lib/ai/prompts.ts, src/lib/ai/provider.ts, src/lib/backend.ts (anthropicComplete/openaiComplete), electron/main.ts, src/lib/history.ts, and the engine call sites in store.tsx. Hunt: buildContext bugs (history slicing/aggregation math, reflections order assumption, undefined fields for legacy data such as settings.aboutMe undefined crashing .trim(), token bloat), summarizeChat/coachSystem stacking, the live-window slice sent to providers (can it start with an assistant turn or be empty; Anthropic requires first message user and non-empty messages; check normalizeForAnthropic), OpenAI request/response handling (refusal field, empty choices), parseJSON robustness for each expected engine reply shape, clean() coverage, chatSummarized clamping, learn/summarize stub determinism.`,
  },
  {
    key: 'ui-edges',
    prompt: `${COMMON}
DIMENSION: UI edge cases a real user hits. Walk each module file as a skeptical user: What happens with ZERO goals (Goal Center panel + Dashboard progress card + cascade regen + strategist), zero habits/tasks (focusScore, replan slice), zero projects, zero schedule rows? Deleting a phase while current points past it; setting progress via text like "abc" or "150"; InlineText inside uppercase-transform contexts; the schedule sort with unparsable times; AddRow committing on blur after Enter (double add?); habit rename vs toggle interplay (single vs double click); window.confirm flows; the reconnect banner overlapping content; Coach input while busy; extremely long text in tasks/goals/about-me overflowing cards. Only report things that actually misbehave based on the code, with the concrete scenario.`,
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