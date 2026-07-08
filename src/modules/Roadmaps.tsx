import { useApp } from '../lib/store';
import { Card, CardLabel, Num, PageSub, PageTitle } from '../components/ui';
import { FONT_LABEL } from '../lib/theme';
import type { Project } from '../lib/types';

function MilestoneMap({ project }: { project: Project }) {
  const { phases, current, color } = project;
  return (
    <div style={{ display: 'flex', margin: '20px 0 22px' }}>
      {phases.map((label, i) => (
        <div
          key={label + i}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            minWidth: 0,
          }}
        >
          {i > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: '50%',
                width: '100%',
                height: 2,
                background: i <= current ? color : 'var(--track)',
              }}
            />
          )}
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: i < current ? color : i === current ? 'var(--card)' : 'var(--track)',
              border: `2px solid ${i <= current ? color : 'var(--box)'}`,
              position: 'relative',
              zIndex: 1,
            }}
          />
          <span
            style={{
              fontFamily: FONT_LABEL,
              fontSize: 10.5,
              fontWeight: i === current ? 600 : 400,
              color: i === current ? 'var(--text)' : i < current ? 'var(--muted)' : 'var(--faint)',
              marginTop: 8,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%',
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Roadmaps() {
  const app = useApp();

  return (
    <section className="fade-up">
      <PageTitle>Roadmaps</PageTitle>
      <PageSub>Where every project stands, and what's in its way.</PageSub>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {app.projects.map((p) => (
          <Card key={p.id}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Num size={12}>{p.pct}%</Num>
                <span
                  style={{
                    fontFamily: FONT_LABEL,
                    fontWeight: 500,
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.stage}
                </span>
              </div>
            </div>
            <MilestoneMap project={p} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 18px' }}>
              {p.fields.map((f) => (
                <div key={f.k}>
                  <CardLabel
                    size={10}
                    color="var(--faint)"
                    style={{ letterSpacing: '0.1em', marginBottom: 3 }}
                  >
                    {f.k}
                  </CardLabel>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{f.v}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
