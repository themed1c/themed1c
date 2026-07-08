import type { CSSProperties } from 'react';
import { useApp } from '../lib/store';
import { Card, CardLabel, PageTitle, PageSub } from '../components/ui';
import { FONT_BODY, FONT_NUM } from '../lib/theme';
import type { CoachTone, ProviderKind } from '../lib/types';

const caption: CSSProperties = {
  fontSize: 12.5,
  color: 'var(--faint)',
  marginTop: 7,
  lineHeight: 1.5,
};

const PROVIDERS: { key: ProviderKind; name: string; sub: string }[] = [
  { key: 'stub', name: 'Built-in (offline)', sub: 'Canned coaching, no key needed.' },
  { key: 'anthropic', name: 'Anthropic API', sub: 'Live engine, needs an API key.' },
  { key: 'openai', name: 'OpenAI API', sub: 'Live engine from ChatGPT’s maker, needs an API key.' },
];

const TONES: { key: CoachTone; label: string }[] = [
  { key: 'direct', label: 'Direct' },
  { key: 'supportive', label: 'Supportive' },
  { key: 'analytical', label: 'Analytical' },
];

export default function Settings() {
  const app = useApp();
  const s = app.settings;

  return (
    <section className="fade-up" style={{ maxWidth: 720 }}>
      <PageTitle>Settings</PageTitle>
      <PageSub>How the engine behaves. Everything stays on this machine.</PageSub>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* -------- Engine -------- */}
        <Card>
          <CardLabel style={{ marginBottom: 14 }}>Engine</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {PROVIDERS.map((p) => {
              const sel = s.provider === p.key;
              return (
                <button
                  key={p.key}
                  className="goal-card"
                  onClick={() => app.updateSettings({ provider: p.key })}
                  style={{
                    textAlign: 'left',
                    background: sel ? 'var(--raised)' : 'var(--card)',
                    border: `1px solid ${sel ? 'var(--accent-border)' : 'var(--line)'}`,
                    borderRadius: 11,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    fontFamily: FONT_BODY,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{p.sub}</div>
                </button>
              );
            })}
          </div>

          {s.provider === 'anthropic' && (
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <CardLabel size={10} style={{ marginBottom: 7 }}>
                  API key
                </CardLabel>
                <input
                  className="field"
                  type="password"
                  value={s.apiKey}
                  placeholder="sk-ant-…"
                  onChange={(e) => app.updateSettings({ apiKey: e.target.value })}
                  onBlur={(e) => app.updateSettings({ apiKey: e.target.value })}
                  style={{ width: '100%' }}
                />
                <div style={caption}>Stored locally, only ever sent to the API host.</div>
              </div>
              <div>
                <CardLabel size={10} style={{ marginBottom: 7 }}>
                  Model
                </CardLabel>
                <input
                  className="field"
                  type="text"
                  value={s.model}
                  placeholder="claude-opus-4-8"
                  onChange={(e) => app.updateSettings({ model: e.target.value })}
                  onBlur={(e) => app.updateSettings({ model: e.target.value })}
                  style={{ width: '100%' }}
                />
                <div style={caption}>The model name sent with every request.</div>
              </div>
            </div>
          )}

          {s.provider === 'openai' && (
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <CardLabel size={10} style={{ marginBottom: 7 }}>
                  API key
                </CardLabel>
                <input
                  className="field"
                  type="password"
                  value={s.openaiApiKey}
                  placeholder="sk-…"
                  onChange={(e) => app.updateSettings({ openaiApiKey: e.target.value })}
                  onBlur={(e) => app.updateSettings({ openaiApiKey: e.target.value })}
                  style={{ width: '100%' }}
                />
                <div style={caption}>
                  A developer key from platform.openai.com. Stored locally, only ever sent to the
                  API host. Note: a ChatGPT Plus login does not work here; it has to be an API key.
                </div>
              </div>
              <div>
                <CardLabel size={10} style={{ marginBottom: 7 }}>
                  Model
                </CardLabel>
                <input
                  className="field"
                  type="text"
                  value={s.openaiModel}
                  placeholder="gpt-5.1"
                  onChange={(e) => app.updateSettings({ openaiModel: e.target.value })}
                  onBlur={(e) => app.updateSettings({ openaiModel: e.target.value })}
                  style={{ width: '100%' }}
                />
                <div style={caption}>The model name sent with every request.</div>
              </div>
            </div>
          )}
        </Card>

        {/* -------- Learned preferences -------- */}
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <CardLabel>What the engine has learned</CardLabel>
            {app.memory.length > 0 && (
              <button
                className="ghost-btn"
                onClick={app.clearMemory}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, cursor: 'pointer' }}
              >
                Forget everything
              </button>
            )}
          </div>
          {app.memory.length === 0 ? (
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>
              Nothing yet. It picks things up quietly from your reflections and coach
              conversations, then uses them to sharpen every plan, review, and reply.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {app.memory.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: 'var(--text2)',
                  }}
                >
                  <span style={{ flex: 1 }}>{m}</span>
                  <button
                    className="ghost-btn"
                    onClick={() => app.forgetMemory(i)}
                    title="Forget this"
                    style={{
                      fontSize: 11,
                      padding: '2px 9px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Forget
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={caption}>
            Learned over time, kept on this machine, and folded into everything the engine writes
            for you. Forget anything that stops being true.
          </div>
        </Card>

        {/* -------- Coach tone -------- */}
        <Card>
          <CardLabel style={{ marginBottom: 14 }}>Coach tone</CardLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {TONES.map((t) => {
              const sel = s.coachTone === t.key;
              return (
                <button
                  key={t.key}
                  className={sel ? undefined : 'ghost-btn'}
                  onClick={() => app.updateSettings({ coachTone: t.key })}
                  style={{
                    borderRadius: 20,
                    padding: '7px 16px',
                    fontSize: 12.5,
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: FONT_BODY,
                    ...(sel ? { border: '1px solid var(--accent)', color: 'var(--accent)' } : {}),
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div style={{ ...caption, marginTop: 12 }}>
            Sets the voice for the coach, reflections, and the evening debrief.
          </div>
        </Card>

        {/* -------- Planning -------- */}
        <Card>
          <CardLabel style={{ marginBottom: 14 }}>Planning</CardLabel>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <div style={{ fontSize: 14.5, color: 'var(--text)' }}>Tasks that matter today</div>
            <div style={{ display: 'flex', gap: 7 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const sel = s.topCount === n;
                return (
                  <button
                    key={n}
                    className={sel ? undefined : 'ghost-btn'}
                    onClick={() => app.updateSettings({ topCount: n })}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      padding: 0,
                      fontFamily: FONT_NUM,
                      fontWeight: 500,
                      fontSize: 13,
                      background: 'transparent',
                      cursor: 'pointer',
                      ...(sel
                        ? { border: '1px solid var(--accent)', color: 'var(--accent)' }
                        : {}),
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ ...caption, marginTop: 12 }}>
            How many tasks the replan picks each morning.
          </div>
        </Card>

        {/* -------- Appearance -------- */}
        <Card>
          <CardLabel style={{ marginBottom: 14 }}>Appearance</CardLabel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14.5, color: 'var(--text)' }}>Theme</div>
            <button className="theme-toggle" onClick={app.toggleTheme}>
              <span
                style={{
                  width: 24,
                  height: 13,
                  borderRadius: 7,
                  background: s.dark ? 'var(--accent)' : 'var(--box)',
                  position: 'relative',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: s.dark ? 13 : 2,
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: 'var(--card)',
                    transition: 'left 0.15s ease',
                  }}
                />
              </span>
              {s.dark ? 'Dark mode' : 'Light mode'}
            </button>
          </div>
        </Card>
      </div>
    </section>
  );
}
