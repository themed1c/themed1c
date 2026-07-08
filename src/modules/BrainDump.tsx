import { useState } from 'react';
import { useApp } from '../lib/store';
import { Card, CardLabel, PageTitle, PageSub, AccentButton, Num } from '../components/ui';
import { FONT_BODY } from '../lib/theme';
import { relativeWhen } from '../lib/time';
import type { DumpType } from '../lib/types';

const TAG_COLORS: Record<DumpType, string> = {
  Task: 'var(--accent)',
  Project: 'var(--tag-project)',
  Goal: 'var(--accent)',
  Person: 'var(--mid)',
  Deadline: 'var(--tag-deadline)',
  Habit: 'var(--good)',
  Problem: 'var(--bad)',
  Opportunity: 'var(--tag-idea)',
  Decision: 'var(--tag-decision)',
  Idea: 'var(--tag-idea)',
  Note: 'var(--tag-note)',
};

export default function BrainDump() {
  const app = useApp();
  const [text, setText] = useState('');
  const busy = app.busy.dump;

  const capture = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const ok = await app.captureDump(trimmed);
    if (ok) setText('');
  };

  return (
    <section className="fade-up">
      <PageTitle>Brain Dump</PageTitle>
      <PageSub>Write anything. It sorts itself.</PageSub>

      <Card style={{ padding: 8 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ideas, worries, plans, things to remember, half-formed thoughts…"
          style={{
            width: '100%',
            minHeight: 150,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            color: 'var(--text)',
            fontSize: 15,
            lineHeight: 1.6,
            padding: 16,
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 12px 10px',
          }}
        >
          <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>
            {busy
              ? 'Reading, splitting, filing…'
              : 'Tasks, people, deadlines, ideas, all filed automatically.'}
          </span>
          <AccentButton onClick={capture}>{busy ? 'Sorting…' : 'Capture'}</AccentButton>
        </div>
      </Card>

      <CardLabel style={{ margin: '30px 0 12px' }}>Recently captured</CardLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {app.dumpItems.slice(0, 20).map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 9,
              padding: '12px 16px',
            }}
          >
            <span
              style={{
                fontFamily: FONT_BODY,
                fontWeight: 600,
                fontSize: 10,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: TAG_COLORS[item.type] || 'var(--tag-note)',
                border: '1px solid var(--chip)',
                padding: '3px 9px',
                borderRadius: 20,
                width: 88,
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
              {item.type}
            </span>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text2)' }}>{item.text}</span>
            <Num size={11} color="var(--faint)" style={{ flexShrink: 0 }}>
              {relativeWhen(item.createdAt)}
            </Num>
          </div>
        ))}
      </div>
    </section>
  );
}
