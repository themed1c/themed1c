import { useState } from 'react';
import { useApp, type OnboardingAnswers } from '../lib/store';
import { AccentButton, Card, CardLabel, GhostButton } from '../components/ui';
import { DEFAULT_AREAS } from '../lib/types';

/* First-run setup: shown until settings.onboarded. Either answers a short set
 * of questions and starts clean, or keeps whatever data is already present.
 * Ends with a brief factual tutorial either way. */

const field: React.CSSProperties = {
  width: '100%',
  background: 'var(--raised)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  outline: 'none',
  color: 'var(--text)',
  fontSize: 14,
  lineHeight: 1.6,
  padding: '11px 13px',
};

const TUTORIAL: [string, string][] = [
  ['Brain Dump', 'Type anything. It is split, classified, and filed automatically.'],
  ['Dashboard', 'The day: tasks, schedule, habits. Click to check off; click text to edit.'],
  ['Goal Center and Roadmaps', 'Goals cascade from vision to today. Projects track phases. Everything is editable in place.'],
  ['Reflection and Weekly Review', 'Answer plainly at day’s end; the review compiles on the day you choose.'],
  ['Settings', 'Connect an engine with an API key, save backups, and keep a live data file so nothing is ever lost.'],
];

export default function Onboarding() {
  const app = useApp();
  const [step, setStep] = useState<'choice' | 'about' | 'areas' | 'goal' | 'tutorial'>('choice');
  const [aboutMe, setAboutMe] = useState('');
  const [areasText, setAreasText] = useState(DEFAULT_AREAS.join(', '));
  const [goalTitle, setGoalTitle] = useState('');
  const [goalArea, setGoalArea] = useState('');
  const [habitsText, setHabitsText] = useState('');
  const [fresh, setFresh] = useState(false);
  const [empty, setEmpty] = useState(false);

  const parsedAreas = areasText.split(',').map((a) => a.trim()).filter(Boolean).slice(0, 6);

  const finish = () => {
    if (empty) {
      app.completeOnboarding('empty');
      return;
    }
    if (!fresh) {
      app.completeOnboarding(null);
      return;
    }
    const answers: OnboardingAnswers = {
      aboutMe,
      areas: parsedAreas,
      goalTitle,
      goalArea: goalArea || parsedAreas[0] || '',
      habits: habitsText.split(',').map((h) => h.trim()).filter(Boolean).slice(0, 5),
    };
    app.completeOnboarding(answers);
  };

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        overflowY: 'auto',
      }}
    >
      <Card className="fade-up" style={{ maxWidth: 540, width: '100%', padding: 28 }}>
        {step === 'choice' && (
          <>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Life Organization</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
              One system for goals, days, habits, money, and review. Set it up for yourself, or
              start empty and fill it in as you go.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <AccentButton
                onClick={() => {
                  setEmpty(false);
                  setFresh(true);
                  setStep('about');
                }}
              >
                Set up for me
              </AccentButton>
              <GhostButton
                onClick={() => {
                  setFresh(false);
                  setEmpty(true);
                  setStep('tutorial');
                }}
                style={{ padding: '9px 20px', fontSize: 13.5 }}
              >
                Start Empty
              </GhostButton>
            </div>
          </>
        )}

        {step === 'about' && (
          <>
            <CardLabel style={{ marginBottom: 10 }}>1 of 3: who are you</CardLabel>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
              A few sentences: your work, your people, what your days look like, what you are
              building toward. The engine reads this with every request.
            </div>
            <textarea
              autoFocus
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              style={{ ...field, minHeight: 96, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <AccentButton onClick={() => setStep('areas')}>Next</AccentButton>
            </div>
          </>
        )}

        {step === 'areas' && (
          <>
            <CardLabel style={{ marginBottom: 10 }}>2 of 3: your life areas</CardLabel>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
              The categories your goals and tasks sort into. Comma separated, up to six. Editable
              later in Settings.
            </div>
            <input
              autoFocus
              value={areasText}
              onChange={(e) => setAreasText(e.target.value)}
              style={field}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <GhostButton onClick={() => setStep('about')} style={{ padding: '8px 16px' }}>
                Back
              </GhostButton>
              <AccentButton onClick={() => setStep('goal')}>Next</AccentButton>
            </div>
          </>
        )}

        {step === 'goal' && (
          <>
            <CardLabel style={{ marginBottom: 10 }}>3 of 3: first goal and habits</CardLabel>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
              One goal to start (optional). The engine builds its roadmap once you open Goal
              Center.
            </div>
            <input
              autoFocus
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="The goal, in one line"
              style={field}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 16px' }}>
              {parsedAreas.map((a) => (
                <button
                  key={a}
                  className={goalArea === a ? undefined : 'ghost-btn'}
                  onClick={() => setGoalArea(a)}
                  style={{
                    borderRadius: 20,
                    padding: '5px 13px',
                    fontSize: 12,
                    background: 'transparent',
                    cursor: 'pointer',
                    ...(goalArea === a
                      ? { border: '1px solid var(--accent)', color: 'var(--accent)' }
                      : {}),
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 8 }}>
              Daily habits to track (optional, comma separated, up to five).
            </div>
            <input
              value={habitsText}
              onChange={(e) => setHabitsText(e.target.value)}
              placeholder="Train, read 20 pages, sleep by 11 PM"
              style={field}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <GhostButton onClick={() => setStep('areas')} style={{ padding: '8px 16px' }}>
                Back
              </GhostButton>
              <AccentButton onClick={() => setStep('tutorial')}>Next</AccentButton>
            </div>
          </>
        )}

        {step === 'tutorial' && (
          <>
            <CardLabel style={{ marginBottom: 14 }}>How it works</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {TUTORIAL.map(([h, body]) => (
                <div key={h}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{h}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>{body}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <AccentButton onClick={finish}>Finish</AccentButton>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
