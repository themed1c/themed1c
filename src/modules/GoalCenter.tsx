import { useState } from 'react';
import { useApp, type CascadeLevel as Level } from '../lib/store';
import { Card, CardLabel, GhostButton, Num, PageSub, PageTitle, Track } from '../components/ui';
import { FONT_BODY } from '../lib/theme';
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
    if (text) app.updateGoalItem(sel.id, editing.level, editing.index, text);
    setEditing(null);
  };

  return (
    <section className="fade-up">
      <PageTitle>Goal Center</PageTitle>
      <PageSub>Every goal is a workspace. The roadmap rewrites itself as you make progress.</PageSub>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
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
        </div>

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
              <div>
                <CardLabel size={10} style={{ letterSpacing: '0.1em' }}>
                  {sel.area}
                </CardLabel>
                <div style={{ fontSize: 19, fontWeight: 600, marginTop: 4 }}>{sel.title}</div>
              </div>
              <GhostButton
                onClick={() => {
                  if (!app.busy.cascade) void app.regenCascade();
                }}
                style={{ flexShrink: 0 }}
              >
                {app.busy.cascade ? 'Recalculating…' : 'Recalculate roadmap'}
              </GhostButton>
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
                                  if (e.key === 'Enter') e.currentTarget.blur();
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
