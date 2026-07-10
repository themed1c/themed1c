import { useApp } from '../lib/store';
import { Card, CardLabel, GhostButton, PageSub, PageTitle } from '../components/ui';
import { dayName, weekRange } from '../lib/time';

export default function WeeklyReview() {
  const app = useApp();
  const today = new Date().getDay();
  const openToday = today === app.settings.weeklyDay;

  const sections: { h: string; items: string[]; hColor: string }[] = [
    { h: 'Biggest wins', items: app.weekly.wins, hColor: 'var(--good)' },
    { h: 'Biggest failures', items: app.weekly.fails, hColor: 'var(--bad)' },
    { h: 'Habits', items: app.weekly.habits, hColor: 'var(--muted)' },
    { h: 'Time spent', items: app.weekly.time, hColor: 'var(--muted)' },
    { h: 'Progress', items: app.weekly.progress, hColor: 'var(--muted)' },
    { h: 'Recommended changes', items: app.weekly.changes, hColor: 'var(--accent)' },
  ];
  const hasReview = sections.some((s) => s.items.length > 0);

  return (
    <section className="fade-up">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 24,
        }}
      >
        <div>
          <PageTitle>Weekly Review</PageTitle>
          <PageSub style={{ marginBottom: 0 }}>{weekRange()}</PageSub>
        </div>
        {openToday && (
          <GhostButton onClick={app.genWeekly} disabled={app.busy.weekly}>
            {app.busy.weekly ? 'Compiling…' : 'Rebuild from this week’s data'}
          </GhostButton>
        )}
      </div>
      {!openToday && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
            The review compiles on {dayName(app.settings.weeklyDay)}.
            {hasReview ? ' Below is the last one.' : ' Nothing has been compiled yet.'} Change the
            day in Settings.
          </div>
        </Card>
      )}
      {openToday && !hasReview && !app.busy.weekly && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.65 }}>
            Nothing compiled yet. It reads this week&rsquo;s tasks, habits, reflections, and
            progress, then writes the review from them.
          </div>
        </Card>
      )}
      {hasReview && (
      <div className="grid-2">
        {sections.map((w) => (
          <Card key={w.h}>
            <CardLabel size={11} color={w.hColor} style={{ marginBottom: 12 }}>
              {w.h}
            </CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {w.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: 'var(--text2)',
                  }}
                >
                  <span style={{ color: 'var(--faint)' }}>{'–'}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      )}
    </section>
  );
}
