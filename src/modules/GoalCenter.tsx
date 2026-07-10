import { useState } from 'react';
import { useApp, type CascadeLevel as Level } from '../lib/store';
import {
  Card, CardLabel, GhostButton, InlineText, Num, PageSub, PageTitle, Track,
} from '../components/ui';
import { confirmDialog } from '../components/dialog';
import { FONT_BODY, FONT_NUM } from '../lib/theme';
import type { Goal } from '../lib/types';

interface CascadeRow {
  key: Level;
  label: string;
  items: string[];
  color: string;
}

export default function GoalCenter() {
  const app = useApp();
  const [editing, setEditing] = useState<{ level: Level; index: number } | null>(null);
  const [draft, setDraft] = useState('');

  const sel: Goal | undefined = app.goals.find((g) => g.id === app.selGoal) ?? app.goals[0];

  const levels: CascadeRow[] = sel
    ? [
        { key: 'vision', label: 'Vision', items: [sel.vision], color: 'var(--text)' },
        { key: 'year', label: '1-Year', items: sel.year, color: 'var(--text2)' },
        { key: 'quarter', label: 'Quarterly', items: sel.quarter, color: 'var(--text2)' },
        { key: 'month', label: 'Monthly', items: sel.month, color: 'var(--text2)' },
        { key: 'week', label: 'This week', items: sel.week, color: 'var(--text2)' },
        { key: 'today', label: 'Today', items: sel.today, color: 'var(--accent)' },
      ]
    : [];

  const startEdit = (level: Level, index: number, text: string) => {
    setEditing({ level, index });
    setDraft(text);
  };

  const commitEdit = () => {
    if (!editing || !sel) {
      setEditing(null);
      return;
    }
    const text = draft.trim();
    if (text) {
      app.updateGoalItem(sel.id, editing.level, editing.index, text);
    } else if (editing.level !== 'vision') {
      // Clearing a line removes it; the vision line always stays.
      app.removeGoalItem(sel.id, editing.level, editing.index);
    }
    setEditing(null);
  };

  return (
    <section className="fade-up">
      <PageTitle>Goal Center</PageTitle>
      <PageSub>Each goal cascades from vision to today. Everything is editable in place.</PageSub>

      <div className="goal-grid">
        {/* Goal selector cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {app.goals.map((g) => {
            const selected = sel !== undefined && g.id === sel.id;
            return (
              <button
                key={g.id}
                className="goal-card"
                onClick={() => {
                  setEditing(null);
                  app.selectGoal(g.id);
                }}
                style={{
                  textAlign: 'left',
                  background: selected ? 'var(--raised)' : 'var(--card)',
                  border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--line)'}`,
                  borderRadius: 11,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  fontFamily: FONT_BODY,
                }}
              >
                <CardLabel size={10} style={{ letterSpacing: '0.1em', marginBottom: 6 }}>
                  {g.area}
                </CardLabel>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>
                  {g.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <Track pct={g.progress} height={4} style={{ flex: 1 }} />
                  <Num size={11}>{g.progress}%</Num>
                </div>
              </button>
            );
          })}
          <GhostButton onClick={app.addGoal} style={{ padding: '10px 14px', fontSize: 12.5 }}>
            + Add a goal
          </GhostButton>
        </div>

        {!sel && (
          <Card style={{ padding: 26 }}>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.65 }}>
              No goals yet. Add one and it gets a cascade: the vision, then the year, the quarter,
              the month, this week, and today. Every line is yours to edit.
            </div>
          </Card>
        )}

        {/* Cascade panel */}
        {sel && (
          <Card style={{ padding: 26 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 20,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <button
                  title="Change area"
                  onClick={() => {
                    const areas = app.settings.areas;
                    if (!areas.length) return;
                    app.updateGoalMeta(sel.id, {
                      area: areas[(areas.indexOf(sel.area) + 1) % areas.length],
                    });
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <CardLabel size={10} style={{ letterSpacing: '0.1em' }}>
                    {sel.area}
                  </CardLabel>
                </button>
                <div style={{ fontSize: 19, fontWeight: 600, marginTop: 4 }}>
                  <InlineText
                    value={sel.title}
                    onCommit={(title) => title && app.updateGoalMeta(sel.id, { title })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
                  <InlineText
                    value={String(sel.progress)}
                    title="Click to edit percent complete"
                    onCommit={(v) => {
                      const n = parseInt(v, 10);
                      if (!Number.isNaN(n)) {
                        app.updateGoalMeta(sel.id, { progress: Math.max(0, Math.min(100, n)) });
                      }
                    }}
                    style={{
                      fontFamily: FONT_NUM,
                      fontWeight: 500,
                      fontSize: 12,
                      color: 'var(--muted)',
                      // Hug the digits: a fixed box strands "% complete" far to
                      // the right of a one-digit value like a new goal's 0.
                      width: `${String(sel.progress).length + 1}ch`,
                      minWidth: '2ch',
                      display: 'inline-block',
                    }}
                  />
                  <Num size={12} color="var(--muted)">
                    % complete
                  </Num>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  className="danger-btn"
                  onClick={() => {
                    void confirmDialog({
                      title: `Remove the goal "${sel.title}"?`,
                      body: 'Its whole cascade, from vision to today, goes with it. This cannot be undone.',
                      confirmLabel: 'Remove goal',
                      danger: true,
                    }).then((yes) => {
                      if (yes) app.deleteGoal(sel.id);
                    });
                  }}
                  style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7 }}
                >
                  Remove goal
                </button>
                <GhostButton
                  onClick={() => {
                    if (!app.busy.cascade) void app.regenCascade();
                  }}
                >
                  {app.busy.cascade ? 'Recalculating…' : 'Recalculate roadmap'}
                </GhostButton>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {levels.map((lvl, i) => {
                const last = i === levels.length - 1;
                const dot = i === 0 || last ? 'var(--accent)' : 'var(--dot-idle)';
                return (
                  <div key={lvl.key} style={{ display: 'flex', gap: 18 }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: 12,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: dot,
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      {!last && <span style={{ flex: 1, width: 1, background: 'var(--border)' }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 22 }}>
                      <CardLabel size={10} color="var(--faint)" style={{ marginBottom: 6 }}>
                        {lvl.label}
                      </CardLabel>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {lvl.items.map((item, idx) => {
                          const isEditing =
                            editing !== null && editing.level === lvl.key && editing.index === idx;
                          if (isEditing) {
                            return (
                              <input
                                key={idx}
                                autoFocus
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                    e.currentTarget.blur();
                                  }
                                  if (e.key === 'Escape') setEditing(null); // cancel, no commit
                                }}
                                style={{
                                  fontSize: 14,
                                  color: lvl.color,
                                  lineHeight: 1.5,
                                  fontFamily: FONT_BODY,
                                  background: 'transparent',
                                  border: 'none',
                                  outline: 'none',
                                  padding: 0,
                                  margin: 0,
                                  width: '100%',
                                }}
                              />
                            );
                          }
                          return (
                            <div
                              key={idx}
                              onClick={() => startEdit(lvl.key, idx, item)}
                              style={{ fontSize: 14, color: lvl.color, lineHeight: 1.5, cursor: 'text' }}
                            >
                              {item}
                            </div>
                          );
                        })}
                        {lvl.key !== 'vision' && (
                          <button
                            className="row-x"
                            title="Add a line to this level"
                            onClick={() => app.addGoalItem(sel.id, lvl.key as Exclude<Level, 'vision'>)}
                            style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--faint)' }}
                          >
                            + add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
