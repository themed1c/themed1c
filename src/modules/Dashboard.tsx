import { useApp } from '../lib/store';
import {
  AddRow, Card, CardLabel, CheckSquare, Chip, GhostButton, InlineText, Num, Track,
} from '../components/ui';
import { FONT_LABEL, FONT_NUM } from '../lib/theme';
import { dateLong, greeting } from '../lib/time';
import { computeAreaScores, focusScore } from '../lib/scores';
import { PASTELS } from '../lib/seed';

export default function Dashboard() {
  const app = useApp();

  const areas = computeAreaScores(app);
  const score = focusScore(app);
  const habitsDone = app.habits.filter((h) => h.done).length;

  return (
    <section className="fade-up">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 26,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              fontFamily: FONT_LABEL,
            }}
          >
            {greeting()}
          </h1>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 5 }}>{dateLong()}</div>
        </div>
        <div style={{ display: 'flex', gap: 28, textAlign: 'right' }}>
          <div>
            <CardLabel size={10} color="var(--faint)">
              Focus score
            </CardLabel>
            <div style={{ marginTop: 2 }}>
              <Num size={26} color="var(--accent)">
                {score}
              </Num>
            </div>
          </div>
          <div>
            <CardLabel size={10} color="var(--faint)">
              Habits
            </CardLabel>
            <div style={{ marginTop: 2 }}>
              <Num size={26} color="var(--text)">
                {habitsDone}/{app.habits.length}
              </Num>
            </div>
          </div>
        </div>
      </div>

      {/* Life areas */}
      <Card style={{ marginBottom: 16 }}>
        <CardLabel style={{ marginBottom: 18 }}>Life areas, last 30 days</CardLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 28px' }}>
          {areas.map((a, i) => {
            const pastel = PASTELS[i % 10];
            return (
              <div
                key={a.name}
                style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {a.name}
                  </span>
                  <span
                    style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}
                  >
                    <Num size={13} color="var(--text2)">
                      {a.score}
                    </Num>
                    <Num
                      size={10.5}
                      color={
                        a.trend > 0
                          ? 'var(--trend-up)'
                          : a.trend < 0
                            ? 'var(--trend-down)'
                            : 'var(--faint)'
                      }
                    >
                      {a.trend > 0 ? `+${a.trend}` : String(a.trend)}
                    </Num>
                  </span>
                </div>
                <Track
                  pct={a.score}
                  height={10}
                  fill={`linear-gradient(to right, ${pastel[0]}, ${pastel[1]})`}
                />
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--faint)',
                    lineHeight: 1.45,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {a.note}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.7fr 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <CardLabel>{app.settings.topCount} things that matter today</CardLabel>
              <GhostButton
                onClick={() => {
                  if (!app.busy.replan) void app.replanTop();
                }}
                style={{ padding: '5px 12px' }}
              >
                {app.busy.replan ? 'Replanning…' : 'Replan'}
              </GhostButton>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {app.topTasks.map((t, i) => (
                <div key={t.id} className="task-row" onClick={() => app.toggleTask(t.id)}>
                  <Num size={13} color="var(--accent)" style={{ width: 16 }}>
                    {i + 1}
                  </Num>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14.5,
                      color: t.done ? 'var(--faint)' : 'var(--text)',
                      textDecoration: t.done ? 'line-through' : 'none',
                    }}
                  >
                    {t.text}
                  </span>
                  <span
                    title="Change area"
                    style={{ cursor: 'pointer', flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      app.cycleTaskArea(t.id);
                    }}
                  >
                    <Chip>{t.area}</Chip>
                  </span>
                  <CheckSquare checked={t.done} size={18} />
                  <button
                    className="row-x"
                    title="Remove task"
                    onClick={(e) => {
                      e.stopPropagation();
                      app.deleteTask(t.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <AddRow
                label="+ Add a task"
                placeholder="What needs doing? Enter to add."
                onAdd={app.addTask}
              />
            </div>
          </Card>

          <Card>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <CardLabel>Today's schedule</CardLabel>
              <GhostButton onClick={app.addScheduleItem} style={{ padding: '4px 10px', fontSize: 11.5 }}>
                + Add a block
              </GhostButton>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {app.schedule.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'center',
                    padding: '10px 2px',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <InlineText
                    value={s.time}
                    onCommit={(time) => time && app.updateScheduleItem(s.id, { time })}
                    title="Click to edit, like 6:30 PM"
                    style={{
                      width: 66,
                      flexShrink: 0,
                      fontFamily: FONT_NUM,
                      fontWeight: 500,
                      fontSize: 12,
                      color: 'var(--faint)',
                    }}
                  />
                  <InlineText
                    value={s.label}
                    onCommit={(label) => label && app.updateScheduleItem(s.id, { label })}
                    style={{ flex: 1, fontSize: 14, color: 'var(--text2)' }}
                  />
                  <InlineText
                    value={s.tag}
                    onCommit={(tag) => tag && app.updateScheduleItem(s.id, { tag })}
                    style={{
                      fontWeight: 500,
                      fontSize: 10.5,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      minWidth: 40,
                      textAlign: 'right',
                    }}
                  />
                  <button
                    className="row-x"
                    title="Remove block"
                    onClick={() => app.deleteScheduleItem(s.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardLabel style={{ marginBottom: 14 }}>Progress toward goals</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {app.goals.map((g) => (
                <div key={g.id}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: 'var(--text2)' }}>{g.title}</span>
                    <Num size={12} color="var(--muted)">
                      {g.progress}%
                    </Num>
                  </div>
                  <Track pct={g.progress} height={5} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardLabel style={{ marginBottom: 12 }}>Habits</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {app.habits.map((h) => (
                <div key={h.id} className="quiet-row" onClick={() => app.toggleHabit(h.id)}>
                  <CheckSquare checked={h.done} size={17} />
                  <InlineText
                    value={h.name}
                    editOn="dblclick"
                    onCommit={(name) => name && app.renameHabit(h.id, name)}
                    style={{
                      flex: 1,
                      fontSize: 13.5,
                      color: h.done ? 'var(--faint)' : 'var(--text2)',
                    }}
                  />
                  <Num size={11} color="var(--faint)">
                    {h.streak}d
                  </Num>
                  <button
                    className="row-x"
                    title="Remove habit"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Remove "${h.name}"? Its streak goes with it.`)) {
                        app.deleteHabit(h.id);
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <AddRow
                label="+ Add a habit"
                placeholder="A habit to track daily. Enter to add."
                onAdd={app.addHabit}
              />
            </div>
          </Card>

          <Card>
            <CardLabel style={{ marginBottom: 12 }}>Active projects</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {app.projects.map((p) => (
                <div key={p.id}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      marginBottom: 5,
                    }}
                  >
                    <span style={{ color: 'var(--text2)' }}>{p.name}</span>
                    <Num size={11} color="var(--faint)">
                      {p.stage}
                    </Num>
                  </div>
                  <Track pct={p.pct} height={4} fill="var(--bar2)" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
