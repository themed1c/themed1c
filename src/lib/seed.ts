import type { PersistedState } from './types';
import { uid } from './clean';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

/** First-run data, taken verbatim from the design prototype so the app
 *  launches looking like the screenshots. */
export function seedState(): PersistedState {
  return {
    dumpItems: [
      { id: uid(), type: 'Task', text: 'Email Prof. Okafor about extending the thesis lit-review deadline', createdAt: now - 2 * 60 * 60 * 1000 },
      { id: uid(), type: 'Idea', text: 'Sample the tape hiss from dad’s old cassettes for the EP intro', createdAt: now - 5 * 60 * 60 * 1000 },
      { id: uid(), type: 'Deadline', text: 'Signals & Systems problem set 6 due Friday 5pm', createdAt: now - 1 * DAY },
      { id: uid(), type: 'Person', text: 'Maya owes me vocal comps for track 2, follow up gently', createdAt: now - 1 * DAY - 3 * 60 * 60 * 1000 },
      { id: uid(), type: 'Habit', text: 'Stop checking my phone during study blocks', createdAt: now - 2 * DAY },
      { id: uid(), type: 'Problem', text: 'Closing shifts are killing next-morning workouts', createdAt: now - 3 * DAY },
      { id: uid(), type: 'Opportunity', text: 'Record store owner asked if I’d DJ the vinyl night monthly', createdAt: now - 4 * DAY },
      { id: uid(), type: 'Decision', text: 'Mix the EP myself vs. hire an engineer (~$600)', createdAt: now - 5 * DAY },
      { id: uid(), type: 'Note', text: 'Deep work feels effortless right after the gym; schedule around it', createdAt: now - 6 * DAY },
    ],
    goals: [
      {
        id: 'g1', area: 'Music', title: 'Release a 5-track EP by December', progress: 38,
        vision: 'Music is a real second career: my songs are out in the world and people show up to hear them live.',
        year: ['EP released on all platforms', '3 live sets played, one paid'],
        quarter: ['Finish production on all 5 tracks', 'Decide: self-mix or hire engineer'],
        month: ['Lock arrangement for “Night Drive”', 'Record final vocals for track 2 with Maya'],
        week: ['Comp Maya’s vocal takes', 'Sound-design pass on the Night Drive bridge'],
        today: ['45 min tonight: arrange the Night Drive bridge'],
      },
      {
        id: 'g2', area: 'School', title: 'Graduate with a 3.7+ GPA', progress: 64,
        vision: 'Leave school with deep signal-processing skills I actually use, in audio, not just on transcripts.',
        year: ['3.7+ cumulative GPA at graduation', 'Thesis accepted with distinction'],
        quarter: ['A− or better in Signals & Systems', 'Thesis lit review approved'],
        month: ['Problem sets 5-8 submitted on time', '20 sources annotated for lit review'],
        week: ['Finish problem set 6', 'Annotate 5 sources'],
        today: ['90 min: problem set 6, questions 3-5'],
      },
      {
        id: 'g3', area: 'Work', title: 'Save $8,000 by June', progress: 41,
        vision: 'Enough saved that the first year after graduation is a choice, not a scramble.',
        year: ['$8,000 in the high-yield account'],
        quarter: ['$2,400 saved this quarter', 'Ask for the $1.50/hr raise'],
        month: ['Save $800 this month', 'Pick up 2 extra weekend shifts'],
        week: ['Transfer $200 on payday', 'Confirm Saturday shift swap'],
        today: ['Set up the automatic $200 transfer'],
      },
      {
        id: 'g4', area: 'Fitness', title: 'Squat 275 lb and run a sub-25 5K', progress: 52,
        vision: 'Strong and durable: training is the anchor that keeps everything else steady.',
        year: ['275 lb squat', 'Sub-25:00 5K race'],
        quarter: ['245 lb squat', '26:30 5K time trial'],
        month: ['Squat 3×/week without missing', 'Two tempo runs per week'],
        week: ['Push, pull, legs + 1 tempo run', 'Sleep 7+ hrs before leg day'],
        today: ['6:30 PM: pull day, don’t skip'],
      },
    ],
    topTasks: [
      { id: uid(), text: 'Finish problem set 6, questions 3-5', area: 'School', done: false },
      { id: uid(), text: 'Comp Maya’s vocal takes before studio time', area: 'Music', done: false },
      { id: uid(), text: 'Pull day at 6:30 PM, protect it', area: 'Fitness', done: false },
    ],
    schedule: [
      { id: uid(), time: '9:00 AM', label: 'Lecture: Signals & Systems', tag: 'School' },
      { id: uid(), time: '11:30 AM', label: 'Study block: problem set 6', tag: 'School' },
      { id: uid(), time: '2:00 PM', label: 'Shift: record store', tag: 'Work' },
      { id: uid(), time: '6:30 PM', label: 'Gym: pull day', tag: 'Fitness' },
      { id: uid(), time: '8:30 PM', label: 'Studio: Night Drive bridge', tag: 'Music' },
    ],
    habits: [
      { id: uid(), name: 'Gym: push / pull / legs', streak: 9, done: false, lastDone: null },
      { id: uid(), name: '30 min instrument practice', streak: 4, done: true, lastDone: null },
      { id: uid(), name: 'Read 20 pages', streak: 2, done: false, lastDone: null },
      { id: uid(), name: 'Phone out of reach during study', streak: 6, done: true, lastDone: null },
    ],
    projects: [
      {
        id: uid(), name: 'EP: Night Drive', stage: 'Production', pct: 38,
        phases: ['Writing', 'Production', 'Mixing', 'Master', 'Release'], current: 1, color: '#AFC4E0',
        fields: [
          { k: 'Next milestone', v: 'All stems locked' }, { k: 'Est. completion', v: 'Dec 5' },
          { k: 'Dependencies', v: 'Vocal comps from Maya' }, { k: 'Risks', v: 'Sound-design scope creep' },
          { k: 'Skills needed', v: 'Mixing low-end, vocal tuning' }, { k: 'Resources', v: 'Studio Tue/Thu, reference tracks' },
        ],
      },
      {
        id: uid(), name: 'Senior thesis', stage: 'Research', pct: 22,
        phases: ['Topic', 'Research', 'Lit review', 'Draft', 'Defend'], current: 1, color: '#B4D6BC',
        fields: [
          { k: 'Next milestone', v: 'Lit review draft' }, { k: 'Est. completion', v: 'Apr 20' },
          { k: 'Dependencies', v: 'Okafor sign-off on scope' }, { k: 'Risks', v: 'Competing with EP deadline in Nov' },
          { k: 'Skills needed', v: 'Academic writing, DSP math' }, { k: 'Resources', v: 'Library access, Zotero' },
        ],
      },
      {
        id: uid(), name: '5K training block', stage: 'Week 4 of 8', pct: 50,
        phases: ['Base', 'Build', 'Peak', 'Taper', 'Race'], current: 1, color: '#F0BFB0',
        fields: [
          { k: 'Next milestone', v: '26:30 time trial' }, { k: 'Est. completion', v: 'Aug 30' },
          { k: 'Dependencies', v: 'None' }, { k: 'Risks', v: 'Closing shifts, skipped mornings' },
          { k: 'Skills needed', v: 'Pacing discipline' }, { k: 'Resources', v: 'Track on Tuesdays, watch' },
        ],
      },
      {
        id: uid(), name: 'Home studio upgrade', stage: 'Saving', pct: 61,
        phases: ['Research', 'Saving', 'Purchase', 'Setup'], current: 1, color: '#CDBFE6',
        fields: [
          { k: 'Next milestone', v: 'Buy audio interface' }, { k: 'Est. completion', v: 'Sep 15' },
          { k: 'Dependencies', v: 'DJ-night income only (money rule)' }, { k: 'Risks', v: 'Impulse-buying before the EP ships' },
          { k: 'Skills needed', v: 'None' }, { k: 'Resources', v: '$430 of $700 saved' },
        ],
      },
    ],
    areaScores: [
      { name: 'Career', score: 61, trend: 4, note: 'DJ-night offer opens a door' },
      { name: 'Money', score: 54, trend: 2, note: '41% to the $8k target' },
      { name: 'Health', score: 71, trend: 5, note: '9-day gym streak, best yet' },
      { name: 'Learning', score: 78, trend: 3, note: 'PS5 at 94%; thesis lagging' },
      { name: 'Relationships', score: 60, trend: -2, note: 'Two cancelled hangouts running' },
      { name: 'Projects', score: 66, trend: 4, note: 'EP moving; thesis stalled' },
      { name: 'Habits', score: 74, trend: 6, note: 'Phone-free study is sticking' },
      { name: 'Mental clarity', score: 58, trend: 1, note: 'Better on gym days' },
      { name: 'Energy', score: 65, trend: 0, note: 'Dips hard after closing shifts' },
      { name: 'Stress', score: 47, trend: -3, note: 'Rises when training slips' },
    ],
    vault: [
      { id: uid(), title: 'EP concept: “Night Drive”', tag: 'Idea', date: 'Jun 02', snippet: 'Five tracks that map one late drive home: leaving, tunnel, coast, gas station, arrival. Tape hiss as connective tissue.', createdAt: now - 36 * DAY },
      { id: uid(), title: 'Journal: after the open mic', tag: 'Journal', date: 'Jun 14', snippet: 'Played two songs. Hands shook for the first thirty seconds and then it was the best I’ve felt in months. More of this.', createdAt: now - 24 * DAY },
      { id: uid(), title: 'Mixing notes: low-end masterclass', tag: 'Notes', date: 'Jun 20', snippet: 'High-pass everything except kick and bass. Mono below 120Hz. Reference on three systems before trusting a mix.', createdAt: now - 18 * DAY },
      { id: uid(), title: 'Thesis direction: audio DSP', tag: 'Research', date: 'Jun 25', snippet: 'Real-time pitch correction artifacts as the thesis angle; overlaps School and Music. Okafor seemed into it.', createdAt: now - 13 * DAY },
      { id: uid(), title: 'Money rules', tag: 'Plan', date: 'Jul 01', snippet: '$200/paycheck automatic. Gear purchases only from DJ/gig income, never from savings. The interface can wait.', createdAt: now - 7 * DAY },
      { id: uid(), title: 'Book: Deep Work, ch. 3', tag: 'Notes', date: 'Jul 03', snippet: 'Schedule every minute of the workday; treat the schedule as a hypothesis, revise without guilt.', createdAt: now - 5 * DAY },
    ],
    chat: [
      { role: 'assistant', content: 'Evening. You’ve got studio time at 8:30 and problem set 6 is still open. What’s on your mind?' },
    ],
    patterns: [
      'You’ve written about the mixing side-hustle 11 times in six weeks, but it has never once appeared as a scheduled task.',
      'Your best study blocks are Tuesday and Thursday before 11 AM. Afternoon blocks finish at roughly half that completion rate.',
      'In every week you skipped the gym twice or more, your reflections mentioned stress about three times as often.',
      'Deep work reliably stops when your 2 PM shift starts. The studio only ever gets your leftover energy, and Night Drive has slipped twice because of it.',
    ],
    weekly: {
      wins: ['Problem set 5 back: 94%, best score this term', 'Two full studio sessions; Night Drive verse is locked', 'Gym 4 of 4 planned days, squat up to 235 lb'],
      fails: ['Lit review untouched for the second week running', 'Slept past 1 AM three nights, all after closing shifts', 'The $200 transfer still isn’t automated'],
      habits: ['Gym: 4/4 · Practice: 5/7 · Reading: 2/7 · Phone-free study: 6/7'],
      time: ['School 19h · Work 16h · Music 7h · Training 5h · Untracked evenings: ~9h'],
      progress: ['EP 34% → 38% · GPA track: steady · Savings 39% → 41% · Squat +10 lb'],
      changes: ['Move lit review to Tue/Thu mornings, your proven deep-work slots', 'Swap one closing shift; late closes cost you the next morning', 'Automate the transfer Friday, then stop thinking about money daily'],
    },
    reflections: [],
    morning: [
      { action: 'Problem set 6 before 11 AM, your proven window', why: 'It’s due Friday and gates the GPA goal. Morning-you finishes these in half the time.' },
      { action: 'Send Maya one specific ask: comps by Thursday', why: 'Track 2 is the EP’s critical path. One clear message unblocks two weeks of drift.' },
      { action: 'Automate the $200 transfer: 10 minutes, then never again', why: 'It’s been on the list 9 days. Recurring guilt costs more attention than the task.' },
    ],
    eveningText: 'Run the debrief tonight: it reads today’s tasks, habits, and reflection, then reshapes tomorrow.',
    settings: {
      dark: false,
      coachTone: 'direct',
      topCount: 3,
      provider: 'stub',
      apiKey: '',
      model: 'claude-opus-4-8',
    },
  };
}

/** Pastel palette for life areas and roadmap milestone maps (fill start, fill end). */
export const PASTELS: [string, string][] = [
  ['#AFC4E0', '#C9D8EC'], // powder blue
  ['#B4D6BC', '#CDE5D3'], // pastel green
  ['#F0BFB0', '#F7D6CB'], // peach
  ['#CDBFE6', '#DFD5F0'], // lavender
  ['#EFC3D3', '#F6D8E3'], // blush
  ['#EFD9A8', '#F6E6C3'], // butter
  ['#B2DCD3', '#CBE9E2'], // mint
  ['#C9D6A8', '#DBE4C2'], // pistachio
  ['#F0CFA6', '#F6DFC1'], // apricot
  ['#CFC5D2', '#DFD8E1'], // grey-lilac
];
