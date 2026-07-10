import { useState } from 'react';
import { useApp } from '../lib/store';
import { CardLabel, GhostButton, Num, PageSub, PageTitle } from '../components/ui';
import { FONT_BODY, FONT_NUM } from '../lib/theme';

export default function Vault() {
  const app = useApp();
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const filtered = query
    ? app.vault.filter((v) => (v.title + ' ' + v.snippet + ' ' + v.tag).toLowerCase().includes(query))
    : app.vault;

  return (
    <section className="fade-up">
      <PageTitle>Knowledge Vault</PageTitle>
      <PageSub>Everything you have written, indexed and searchable.</PageSub>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          className="field"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ideas, journal, notes, plans…"
          style={{ flex: 1 }}
        />
        <GhostButton
          onClick={() => {
            if (!app.busy.connections) void app.findConnections();
          }}
          style={{ fontSize: 13, padding: '0 18px', borderRadius: 10 }}
        >
          {app.busy.connections ? 'Tracing…' : 'Surface connections'}
        </GhostButton>
      </div>

      {app.connections && (
        <div
          style={{
            marginBottom: 20,
            background: 'var(--raised)',
            border: '1px solid var(--accent-border)',
            borderRadius: 12,
            padding: '20px 22px',
          }}
        >
          <CardLabel color="var(--accent)" style={{ marginBottom: 10 }}>
            Threads you've forgotten
          </CardLabel>
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
            {app.connections}
          </div>
        </div>
      )}

      <div
        style={{
          fontFamily: FONT_NUM,
          fontWeight: 500,
          fontSize: 11,
          color: 'var(--faint)',
          marginBottom: 12,
        }}
      >
        {filtered.length} of {app.vault.length} entries
      </div>

      {app.vault.length === 0 && (
        <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 620 }}>
          Nothing yet. Everything you write in Brain Dump, and every reflection you save, is filed
          here automatically.
        </div>
      )}

      {app.vault.length > 0 && filtered.length === 0 && (
        <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.65 }}>
          No entry matches that search.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((v) => (
          <div
            key={v.id}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '15px 18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 5,
              }}
            >
              <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)' }}>{v.title}</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span
                  style={{
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    fontSize: 10,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  {v.tag}
                </span>
                <Num size={11} color="var(--faint)">
                  {v.date}
                </Num>
              </div>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>{v.snippet}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
