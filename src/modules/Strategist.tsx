import { useApp } from '../lib/store';
import { Card, CardLabel, GhostButton, Num, PageSub, PageTitle } from '../components/ui';

export default function Strategist() {
  const app = useApp();

  return (
    <section className="fade-up" style={{ maxWidth: 760 }}>
      <PageTitle>Strategist</PageTitle>
      <PageSub>The view from the top: given who you&rsquo;re trying to become, what actually matters.</PageSub>

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
            {app.busy.morning ? 'Thinking…' : 'Refresh'}
          </GhostButton>
        </div>
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
            {app.busy.evening ? 'Reviewing…' : 'Run the debrief'}
          </GhostButton>
        </div>
        <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
          {app.eveningText}
        </div>
      </Card>
    </section>
  );
}
