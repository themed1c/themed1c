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
  hint: string;
  items: string[];
  accent: boolean;
}

export default function GoalCenter() {
  const app = useApp();
  const [editing, setEditing] = useState<{ level: Level; index: number } | null>(null);
  const [draft, setDraft] = useState('');

  const sel: Goal | undefined = app.goals.find((g) => g.id === app.selGoal) ?? app.goals[0];

  const levels: CascadeRow[] = sel
    ? [
        { key: 'vision', label: 'Vision', hint: 'what done looks like', items: [sel.vision], accent: true },
        { key: 'year', label: '1-Year', hint: 'the milestones', items: sel.year, accent: false },
        { key: 'quarter', label: 'Quarterly', hint: 'this quarter', items: sel.quarter, accent: false },
        { key: 'month', label: 'Monthly', hint: 'this month', items: sel.month, accent: false },
        { key: 'week', label: 'This week', hint: 'the next 7 days', items: sel.week, accent: false },
        { key: 'today', label: 'Today', hint: 'the next concrete step', items: sel.today, accent: true },
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

  const setProgressFromClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sel) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const raw = ((e.clientX - rect.left) / rect.width) * 100;
    // Snap to fives: this is a felt estimate, not a measurement.
    const pct = Math.max(0, Math.min(100, Math.round(raw / 5) * 5));
    app.updateGoalMeta(sel.id, { progress: pct });
  };

  return (
    <section className="fade-up">
      <PageTitle>Goal Center</PageTitle>
      <PageSub>Each goal cascades from vision to today. Every line is editable in place.</PageSub>

      <div className="goal-grid">
        {/* Goal selector rail */}
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
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header: area + actions, then title, then progress */}
            <div style={{ padding: '22px 26px 20px', borderBottom: '1px solid var(--line)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <button
                  title="Click to change area"
                  onClick={() => {
                    const areas = app.settings.areas;
                    if (!areas.length) return;
                    app.updateGoalMeta(sel.id, {
                      area: areas[(areas.indexOf(sel.area) + 1) % areas.length],
                    });
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    padding: '4px 13px',
                    cursor: 'pointer',
                  }}
                >
                  <CardLabel size={10} style={{ letterSpacing: '0.1em' }}>
                    {sel.area}
                  </CardLabel>
                </button>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <GhostButton
                    onClick={() => {
                      if (!app.busy.cascade) void app.regenCascade();
                    }}
                  >
                    {app.busy.cascade ? 'Recalculating…' : 'Recalculate roadmap'}
                  </GhostButton>
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
                    Remove
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 21, fontWeight: 600, lineHeight: 1.35 }}>
                <InlineText
                  title="Click to rename"
                  value={sel.title}
                  onCommit={(title) => title && app.updateGoalMeta(sel.id, { title })}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
                <div
                  title="Click to set how far along this goal feels"
                  onClick={setProgressFromClick}
                  style={{ flex: 1, cursor: 'pointer', padding: '5px 0' }}
                >
                  <Track pct={sel.progress} height={6} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, flexShrink: 0 }}>
                  <InlineText
                    value={String(sel.progress)}
                    title="Click to type a percent"
                    onCommit={(v) => {
                      const n = parseInt(v, 10);
                      if (!Number.isNaN(n)) {
                        app.updateGoalMeta(sel.id, { progress: Math.max(0, Math.min(100, n)) });
                      }
                    }}
                    style={{
                      fontFamily: FONT_NUM,
                      fontWeight: 500,
                      fontSize: 13,
                      color: 'var(--text)',
                      width: `${String(sel.progress).length + 1}ch`,
                      minWidth: '2ch',
                      display: 'inline-block',
                      textAlign: 'right',
                    }}
                  />
                  <Num size={13} color="var(--text)">
                    %
                  </Num>
                </div>
              </div>
            </div>

            {/* Cascade levels */}
            <div style={{ padding: '10px 26px 22px' }}>
              {levels.map((lvl) => (
                <div
                  key={lvl.key}
                  className="cascade-level"
                  style={{
                    borderLeft: `3px solid ${lvl.accent ? 'var(--accent)' : 'var(--border)'}`,
                    padding: '2px 0 6px 18px',
                    margin: '14px 0 0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                    <CardLabel size={10} color={lvl.accent ? 'var(--accent)' : 'var(--faint)'}>
                      {lvl.label}
                    </CardLabel>
                    <span style={{ fontSize: 11, color: 'var(--faint)' }}>{lvl.hint}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {lvl.items.map((item, idx) => {
                      const isEditing =
                        editing !== null && editing.level === lvl.key && editing.index === idx;
                      if (isEditing) {
                        return (
                          <input
                            key={idx}
                            autoFocus
                            value={draft}
                            placeholder="Type the step, Enter to keep it"
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
                              color: 'var(--text)',
                              lineHeight: 1.5,
                              fontFamily: FONT_BODY,
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px solid var(--accent-border)',
                              outline: 'none',
                              padding: '5px 8px',
                              margin: '0 0 0 -8px',
                              width: '100%',
                            }}
                          />
                        );
                      }
                      return (
                        <div key={idx} className="cascade-row">
                          <div
                            onClick={() => startEdit(lvl.key, idx, item)}
                            title="Click to edit"
                            style={{
                              flex: 1,
                              fontSize: 14,
                              color: lvl.key === 'vision' ? 'var(--text)' : 'var(--text2)',
                              lineHeight: 1.5,
                              cursor: 'text',
                            }}
                          >
                            {item}
                          </div>
                          {lvl.key !== 'vision' && (
                            <button
                              className="row-x"
                              title="Remove this step"
                              onClick={() =>
                                app.removeGoalItem(sel.id, lvl.key as Exclude<Level, 'vision'>, idx)
                              }
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {lvl.key !== 'vision' && (
                      <button
                        className="row-x"
                        title="Add a step to this level"
                        onClick={() => {
                          const index = lvl.items.length;
                          app.addGoalItem(sel.id, lvl.key as Exclude<Level, 'vision'>);
                          // Open the new line empty: type and press Enter to
                          // keep it, or click away and it removes itself.
                          startEdit(lvl.key, index, '');
                        }}
                        style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--faint)', padding: '3px 8px', marginLeft: -8 }}
                      >
                        + add step
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
