import { useApp } from '../lib/store';
import { Card, CardLabel, GhostButton, InlineText, Num, PageSub, PageTitle } from '../components/ui';
import { confirmDialog } from '../components/dialog';
import { FONT_LABEL, FONT_NUM } from '../lib/theme';
import type { Project } from '../lib/types';

function MilestoneMap({
  project,
  onSetCurrent,
  onRenamePhase,
}: {
  project: Project;
  onSetCurrent(index: number): void;
  onRenamePhase(index: number, label: string): void;
}) {
  const { phases, current, color } = project;
  return (
    <div style={{ display: 'flex', margin: '20px 0 22px' }}>
      {phases.map((label, i) => (
        <div
          key={i}
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
            title="Click to make this the current phase"
            onClick={() => onSetCurrent(i)}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: i < current ? color : i === current ? 'var(--card)' : 'var(--track)',
              border: `2px solid ${i <= current ? color : 'var(--box)'}`,
              position: 'relative',
              zIndex: 1,
              cursor: 'pointer',
            }}
          />
          <InlineText
            value={label}
            onCommit={(next) => onRenamePhase(i, next)}
            title="Click to rename; clear to remove"
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
          />
        </div>
      ))}
    </div>
  );
}

export default function Roadmaps() {
  const app = useApp();

  const setCurrent = (p: Project, index: number) => app.updateProject(p.id, { current: index });

  const renamePhase = (p: Project, index: number, label: string) => {
    if (label) {
      app.updateProject(p.id, {
        phases: p.phases.map((ph, i) => (i === index ? label : ph)),
      });
      return;
    }
    if (p.phases.length <= 2) return; // a roadmap needs at least two phases
    const phases = p.phases.filter((_, i) => i !== index);
    app.updateProject(p.id, {
      phases,
      current: Math.min(p.current > index ? p.current - 1 : p.current, phases.length - 1),
    });
  };

  return (
    <section className="fade-up">
      <PageTitle>Roadmaps</PageTitle>
      <PageSub>
        Where every project stands, and what's in its way. Click any detail to change it.
      </PageSub>
      {app.projects.length === 0 && (
        <div
          style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 16, maxWidth: 620 }}
        >
          No projects yet. Add one and it gets a milestone map, a current phase, and the details
          you fill in.
        </div>
      )}
      <div className="grid-2">
        {app.projects.map((p) => (
          <Card key={p.id}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
                gap: 10,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, flex: 1, minWidth: 0 }}>
                <InlineText
                  value={p.name}
                  onCommit={(name) => name && app.updateProject(p.id, { name })}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                  <InlineText
                    value={String(p.pct)}
                    title="Click to edit percent complete"
                    onCommit={(v) => {
                      const n = parseInt(v, 10);
                      if (!Number.isNaN(n)) {
                        app.updateProject(p.id, { pct: Math.max(0, Math.min(100, n)) });
                      }
                    }}
                    style={{
                      fontFamily: FONT_NUM,
                      fontWeight: 500,
                      fontSize: 12,
                      color: 'var(--muted)',
                      minWidth: 14,
                    }}
                  />
                  <Num size={12}>%</Num>
                </span>
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
                  <InlineText
                    value={p.stage}
                    onCommit={(stage) => stage && app.updateProject(p.id, { stage })}
                  />
                </span>
                <button
                  className="row-x"
                  title="Remove project"
                  onClick={() => {
                    void confirmDialog({
                      title: `Remove the project "${p.name}"?`,
                      body: 'Its phases and details go with it. This cannot be undone.',
                      confirmLabel: 'Remove project',
                      danger: true,
                    }).then((yes) => {
                      if (yes) app.deleteProject(p.id);
                    });
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <MilestoneMap
              project={p}
              onSetCurrent={(i) => setCurrent(p, i)}
              onRenamePhase={(i, label) => renamePhase(p, i, label)}
            />
            <div style={{ margin: '-14px 0 16px' }}>
              <button
                className="row-x"
                title="Add a phase at the end"
                onClick={() => app.updateProject(p.id, { phases: [...p.phases, 'New phase'] })}
                style={{ fontSize: 11, color: 'var(--faint)' }}
              >
                + phase
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 18px' }}>
              {p.fields.map((f, fi) => (
                <div key={f.k}>
                  <CardLabel
                    size={10}
                    color="var(--faint)"
                    style={{ letterSpacing: '0.1em', marginBottom: 3 }}
                  >
                    {f.k}
                  </CardLabel>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                    <InlineText
                      value={f.v}
                      onCommit={(v) =>
                        app.updateProject(p.id, {
                          fields: p.fields.map((x, i) => (i === fi ? { ...x, v: v || '-' } : x)),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
        <Card
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 180,
          }}
        >
          <GhostButton onClick={app.addProject} style={{ fontSize: 13, padding: '10px 20px' }}>
            + Add a project
          </GhostButton>
        </Card>
      </div>
    </section>
  );
}
