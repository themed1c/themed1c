import type { CSSProperties } from 'react';
import { useApp } from '../lib/store';
import { Card, CardLabel, GhostButton, Num, PageSub, PageTitle } from '../components/ui';

const empty: CSSProperties = {
  fontSize: 13.5,
  color: 'var(--muted)',
  lineHeight: 1.65,
};

export default function Strategist() {
  const app = useApp();
  const hasMorning = app.morning.length > 0;
  const hasEvening = app.eveningText.trim().length > 0;

  return (
    <section className="fade-up" style={{ maxWidth: 760 }}>
      <PageTitle>Strategist</PageTitle>
      <PageSub>Given your stated goals, the highest-impact actions. Nothing else.</PageSub>

      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <CardLabel color="var(--accent)">Morning: highest-impact actions</CardLabel>
          <GhostButton
            style={{ padding: '5px 12px' }}
            onClick={() => {
              if (!app.busy.morning) void app.genMorning();
            }}
          >
            {app.busy.morning ? 'Thinking…' : hasMorning ? 'Refresh' : 'Read my day'}
          </GhostButton>
        </div>
        {!hasMorning && !app.busy.morning && (
          <div style={empty}>
            Nothing yet for today. It reads your goals, tasks, habits, and history, then names the
            three actions that move you furthest.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {app.morning.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 16 }}>
              <Num size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }}>
                {'0' + (i + 1)}
              </Num>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{m.action}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, marginTop: 3 }}>
                  {m.why}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <CardLabel>Evening: the debrief</CardLabel>
          <GhostButton
            style={{ padding: '5px 12px' }}
            onClick={() => {
              if (!app.busy.evening) void app.genEvening();
            }}
          >
            {app.busy.evening ? 'Reviewing…' : hasEvening ? 'Run it again' : 'Run the debrief'}
          </GhostButton>
        </div>
        {hasEvening ? (
          <div
            style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}
          >
            {app.eveningText}
          </div>
        ) : (
          !app.busy.evening && (
            <div style={empty}>
              Nothing yet for today. Run it at day&rsquo;s end: it reads what you finished, what
              slipped, and reshapes tomorrow.
            </div>
          )
        )}
      </Card>
    </section>
  );
}
