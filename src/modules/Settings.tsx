import { useRef, useState, type CSSProperties } from 'react';
import { useApp } from '../lib/store';
import { AddRow, Card, CardLabel, GhostButton, InlineText, PageTitle, PageSub } from '../components/ui';
import { FONT_BODY, FONT_NUM } from '../lib/theme';
import { dayName, todayISO } from '../lib/time';
import type { ProviderKind } from '../lib/types';

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

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export default function Settings() {
  const app = useApp();
  const s = app.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [dataMsg, setDataMsg] = useState<string | null>(null);

  const saveBackup = () => {
    const blob = new Blob([JSON.stringify(app.exportData(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-organization-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDataMsg('Backup saved to your downloads.');
  };

  const restoreBackup = async (file: File) => {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      /* handled below */
    }
    if (!parsed || typeof parsed !== 'object') {
      setDataMsg('That file does not look like a Life Organization backup.');
      return;
    }
    if (!window.confirm('Restoring replaces everything currently in the app with the backup. Continue?')) {
      setDataMsg(null);
      return;
    }
    setDataMsg(
      app.importData(parsed)
        ? 'Backup restored.'
        : 'That file does not look like a Life Organization backup.',
    );
  };

  return (
    <section className="fade-up" style={{ maxWidth: 720 }}>
      <PageTitle>Settings</PageTitle>
      <PageSub>How the engine behaves. Everything stays on this machine.</PageSub>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* -------- About you -------- */}
        <Card>
          <CardLabel style={{ marginBottom: 12 }}>About you</CardLabel>
          <textarea
            value={s.aboutMe}
            onChange={(e) => app.updateSettings({ aboutMe: e.target.value })}
            onBlur={(e) => app.updateSettings({ aboutMe: e.target.value })}
            placeholder="A few sentences about who you are: your work, your people, what your days look like, what you are building toward."
            style={{
              width: '100%',
              minHeight: 84,
              background: 'var(--raised)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              outline: 'none',
              resize: 'vertical',
              color: 'var(--text)',
              fontSize: 14,
              lineHeight: 1.6,
              padding: '12px 14px',
            }}
          />
          <div style={caption}>
            The engine reads this with everything else it knows, so plans, reviews, and coaching
            fit your actual life. Yours to change anytime; stays on this machine.
          </div>
        </Card>

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

        {/* -------- Your data -------- */}
        <Card>
          <CardLabel style={{ marginBottom: 14 }}>Your data</CardLabel>

          {app.dataFileStatus !== 'unsupported' && (
            <div style={{ marginBottom: 16 }}>
              {app.dataFileStatus === 'on' ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, color: 'var(--text2)' }}>
                    Live data file is on
                    {app.dataFileName ? `: saving to ${app.dataFileName}` : ''}
                  </span>
                  <GhostButton
                    onClick={() => void app.disconnectFile()}
                    style={{ fontSize: 12, padding: '5px 12px' }}
                  >
                    Turn off
                  </GhostButton>
                </div>
              ) : app.dataFileStatus === 'reconnect' ? (
                <GhostButton
                  onClick={() => void app.reconnectFile()}
                  style={{ fontSize: 12.5, padding: '7px 16px' }}
                >
                  Reconnect your data file
                </GhostButton>
              ) : (
                <GhostButton
                  onClick={() => void app.connectFile()}
                  style={{ fontSize: 12.5, padding: '7px 16px' }}
                >
                  Keep a live data file
                </GhostButton>
              )}
              <div style={caption}>
                Recommended. The app keeps a copy of everything in a real file you choose (your
                Documents folder is a good home). It updates itself as you use the app, and
                cleanup tools that clear cookies or browser data cannot touch it. If the browser
                is ever wiped, the app reads the file and everything comes back.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <GhostButton onClick={saveBackup} style={{ fontSize: 12.5, padding: '7px 16px' }}>
              Save a backup
            </GhostButton>
            <GhostButton
              onClick={() => fileRef.current?.click()}
              style={{ fontSize: 12.5, padding: '7px 16px' }}
            >
              Restore from backup
            </GhostButton>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void restoreBackup(f);
              }}
            />
          </div>
          {dataMsg && (
            <div style={{ fontSize: 13, color: 'var(--accent)', marginTop: 12 }}>{dataMsg}</div>
          )}
          <div style={caption}>
            Everything lives on this machine, inside the browser you use for the app. Save a
            backup file every so often and keep it somewhere safe; restoring one brings back
            everything exactly as it was, on this computer or a new one.
          </div>
        </Card>

        {/* -------- Life areas -------- */}
        <Card>
          <CardLabel style={{ marginBottom: 14 }}>Goal and task areas</CardLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {s.areas.map((a) => (
              <span
                key={a}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: '5px 6px 5px 13px',
                  fontSize: 12.5,
                  color: 'var(--text2)',
                }}
              >
                <InlineText value={a} onCommit={(next) => next && app.renameArea(a, next)} />
                <button
                  className="row-x"
                  title="Remove area"
                  onClick={() => app.deleteArea(a)}
                  style={{ fontSize: 12, padding: '0 4px' }}
                >
                  ×
                </button>
              </span>
            ))}
            <AddRow label="+ Add" placeholder="Area name. Enter to add." onAdd={app.addArea} />
          </div>
          <div style={caption}>
            The categories goals and tasks sort into. Renaming an area updates everything filed
            under it; removing one moves its items to the first area.
          </div>
        </Card>

        {/* -------- Weekly review day -------- */}
        <Card>
          <CardLabel style={{ marginBottom: 14 }}>Weekly review day</CardLabel>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {WEEKDAYS.map((d) => {
              const sel = s.weeklyDay === d;
              return (
                <button
                  key={d}
                  className={sel ? undefined : 'ghost-btn'}
                  onClick={() => app.updateSettings({ weeklyDay: d })}
                  title={dayName(d)}
                  style={{
                    borderRadius: 8,
                    padding: '7px 12px',
                    fontSize: 12,
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: FONT_BODY,
                    ...(sel ? { border: '1px solid var(--accent)', color: 'var(--accent)' } : {}),
                  }}
                >
                  {dayName(d).slice(0, 3)}
                </button>
              );
            })}
          </div>
          <div style={{ ...caption, marginTop: 12 }}>
            The weekly review compiles only on this day. Pick the day you actually sit down to
            review.
          </div>
        </Card>

        {/* -------- Desktop -------- */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14.5, color: 'var(--text)' }}>
              Keep running in the background
            </div>
            <button
              className="theme-toggle"
              onClick={() => app.updateSettings({ runInBackground: !s.runInBackground })}
            >
              <span
                style={{
                  width: 24,
                  height: 13,
                  borderRadius: 7,
                  background: s.runInBackground ? 'var(--accent)' : 'var(--box)',
                  position: 'relative',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: s.runInBackground ? 13 : 2,
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: 'var(--card)',
                    transition: 'left 0.15s ease',
                  }}
                />
              </span>
              {s.runInBackground ? 'On' : 'Off'}
            </button>
          </div>
          <div style={caption}>
            Applies to the installed desktop app: closing the window keeps it in the system tray
            instead of quitting. The browser version ignores this.
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
