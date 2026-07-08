import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { AccentButton, GhostButton, PageSub, PageTitle } from '../components/ui';

const CHIPS = [
  'I’m overwhelmed.',
  'What should I work on next?',
  'What have I been avoiding?',
  'Am I wasting time?',
];

export default function Coach() {
  const app = useApp();
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [app.chat, app.busy.chat]);

  const send = (text: string) => {
    void app.sendChat(text);
  };

  const submit = () => {
    const text = input;
    setInput('');
    send(text);
  };

  return (
    <section
      className="fade-up"
      style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}
    >
      <PageTitle style={{ margin: '0 0 6px' }}>Coach</PageTitle>
      <PageSub style={{ marginBottom: 20 }}>
        Knows everything you've written. Ask it anything.
      </PageSub>

      <div
        ref={listRef}
        style={{
          flex: 1,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 22,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {app.chat.map((m, i) => {
          const user = m.role === 'user';
          return (
            <div
              key={i}
              style={{
                alignSelf: user ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
                background: user ? 'var(--bubble-tint)' : 'var(--raised)',
                border: `1px solid ${user ? 'var(--accent-border)' : 'var(--border)'}`,
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 14.5,
                lineHeight: 1.6,
                color: user ? 'var(--text)' : 'var(--text2)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
          );
        })}
        {app.busy.chat && (
          <div
            className="blink"
            style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--faint)' }}
          >
            thinking…
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0 10px', flexWrap: 'wrap' }}>
        {CHIPS.map((c) => (
          <GhostButton
            key={c}
            onClick={() => send(c)}
            style={{ fontSize: 12.5, padding: '6px 13px', borderRadius: 20 }}
          >
            {c}
          </GhostButton>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          className="field"
          style={{ flex: 1 }}
          placeholder="Talk it through…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit();
          }}
        />
        <AccentButton
          onClick={submit}
          style={{ borderRadius: 10, padding: '0 22px', height: 'auto' }}
        >
          Send
        </AccentButton>
      </div>
    </section>
  );
}
