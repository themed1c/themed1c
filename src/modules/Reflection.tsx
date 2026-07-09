import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { AccentButton, CardLabel, PageSub, PageTitle } from '../components/ui';

const QUESTIONS = [
  'What went well today?',
  'What didn’t?',
  'What distracted you?',
  'Did today’s work move you toward your goals?',
  'What should tomorrow focus on?',
] as const;

type Answers = [string, string, string, string, string];

export default function Reflection() {
  const app = useApp();
  const [answers, setAnswers] = useState<Answers>(() => [...app.todayReflection.answers]);

  // Re-sync local drafts when the reflection rolls to a new day.
  const reflectionDate = app.todayReflection.date;
  const storedAnswers = app.todayReflection.answers;
  useEffect(() => {
    setAnswers([...storedAnswers]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reflectionDate]);

  const setAnswer = (index: number, text: string) => {
    setAnswers((prev) => {
      const next: Answers = [...prev];
      next[index] = text;
      return next;
    });
  };

  const allBlank = answers.every((a) => !a.trim());

  const submit = () => {
    if (app.busy.reflect || allBlank) return;
    void app.submitReflection(answers);
  };

  return (
    <section className="fade-up" style={{ maxWidth: 720 }}>
      <PageTitle>Evening Reflection</PageTitle>
      <PageSub>Answer plainly. The read back is only as good as the input.</PageSub>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {QUESTIONS.map((q, i) => (
          <div
            key={q}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 11,
              padding: '16px 18px',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>
              {q}
            </div>
            <textarea
              value={answers[i]}
              onChange={(e) => setAnswer(i, e.target.value)}
              placeholder="…"
              style={{
                width: '100%',
                minHeight: 52,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                color: 'var(--text2)',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            />
          </div>
        ))}
      </div>

      <AccentButton
        onClick={submit}
        style={{ marginTop: 18, borderRadius: 9, padding: '11px 24px', fontSize: 14 }}
      >
        {app.busy.reflect ? 'Reading…' : 'Close out the day'}
      </AccentButton>

      {app.todayReflection.output && (
        <div
          style={{
            marginTop: 22,
            background: 'var(--raised)',
            border: '1px solid var(--accent-border)',
            borderRadius: 12,
            padding: 22,
          }}
        >
          <CardLabel color="var(--accent)" style={{ marginBottom: 10 }}>
            Tonight’s read
          </CardLabel>
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
            {app.todayReflection.output}
          </div>
        </div>
      )}
    </section>
  );
}
