import { useApp } from '../lib/store';
import { GhostButton, Num, PageSub, PageTitle } from '../components/ui';

export default function Patterns() {
  const app = useApp();

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
          <PageTitle>Patterns</PageTitle>
          <PageSub style={{ marginBottom: 0 }}>
            Things you do that you haven{'’'}t noticed. Drawn from everything you{'’'}ve
            logged.
          </PageSub>
        </div>
        <GhostButton onClick={() => void app.genPatterns()}>
          {app.busy.patterns ? 'Looking…' : 'Look again'}
        </GhostButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {app.patterns.map((text, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 18,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '20px 22px',
            }}
          >
            <Num size={13} color="var(--accent)" style={{ flexShrink: 0 }}>
              {String(i + 1).padStart(2, '0')}
            </Num>
            <span style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text2)' }}>{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
