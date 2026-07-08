import React from 'react';
import { AppProvider, useApp, type ModuleKey } from './lib/store';
import { Toast } from './components/ui';
import { FONT_LABEL, FONT_NUM } from './lib/theme';
import { dateShort } from './lib/time';
import Dashboard from './modules/Dashboard';
import BrainDump from './modules/BrainDump';
import GoalCenter from './modules/GoalCenter';
import Roadmaps from './modules/Roadmaps';
import Strategist from './modules/Strategist';
import Coach from './modules/Coach';
import Reflection from './modules/Reflection';
import WeeklyReview from './modules/WeeklyReview';
import Vault from './modules/Vault';
import Patterns from './modules/Patterns';
import SettingsModule from './modules/Settings';

const NAV_GROUPS: { label: string; items: { key: ModuleKey; label: string }[] }[] = [
  { label: 'Overview', items: [{ key: 'dashboard', label: 'Life Dashboard' }] },
  {
    label: 'Capture',
    items: [
      { key: 'dump', label: 'Brain Dump' },
      { key: 'vault', label: 'Knowledge Vault' },
    ],
  },
  {
    label: 'Plan',
    items: [
      { key: 'goals', label: 'Goal Center' },
      { key: 'roadmaps', label: 'Roadmaps' },
      { key: 'strategist', label: 'Strategist' },
    ],
  },
  {
    label: 'Review',
    items: [
      { key: 'coach', label: 'Coach' },
      { key: 'reflect', label: 'Reflection' },
      { key: 'weekly', label: 'Weekly Review' },
      { key: 'patterns', label: 'Patterns' },
    ],
  },
  { label: 'System', items: [{ key: 'settings', label: 'Settings' }] },
];

const MODULES: Record<ModuleKey, React.ComponentType> = {
  dashboard: Dashboard,
  dump: BrainDump,
  vault: Vault,
  goals: GoalCenter,
  roadmaps: Roadmaps,
  strategist: Strategist,
  coach: Coach,
  reflect: Reflection,
  weekly: WeeklyReview,
  patterns: Patterns,
  settings: SettingsModule,
};

function Sidebar() {
  const app = useApp();
  const dark = app.settings.dark;
  return (
    <nav
      style={{
        width: 228,
        flexShrink: 0,
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        gap: 18,
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '4px 12px 6px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.01em' }}>Life Organization</div>
        <div
          style={{
            fontFamily: FONT_NUM,
            fontWeight: 500,
            fontSize: 10,
            color: 'var(--faint)',
            marginTop: 3,
            letterSpacing: '0.08em',
          }}
        >
          {dateShort()}
        </div>
        <button className="theme-toggle" style={{ marginTop: 12 }} onClick={app.toggleTheme}>
          <span
            style={{
              width: 24,
              height: 13,
              borderRadius: 7,
              background: dark ? 'var(--accent)' : 'var(--box)',
              position: 'relative',
              display: 'inline-block',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: dark ? 13 : 2,
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: 'var(--card)',
                transition: 'left 0.15s ease',
              }}
            />
          </span>
          {dark ? 'Dark mode' : 'Light mode'}
        </button>
      </div>
      {NAV_GROUPS.map((grp) => (
        <div key={grp.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              fontFamily: FONT_LABEL,
              fontWeight: 500,
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--faint)',
              padding: '4px 12px 6px',
            }}
          >
            {grp.label}
          </div>
          {grp.items.map((it) => {
            const active = app.module === it.key;
            return (
              <button
                key={it.key}
                className={`nav-item${active ? ' active' : ''}`}
                onClick={() => app.setModule(it.key)}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: active ? 'var(--accent)' : 'transparent',
                  }}
                />
                {it.label}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Main() {
  const app = useApp();
  const Module = MODULES[app.module];
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', padding: '36px 44px 80px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', height: '100%' }}>
          {app.hydrated ? <Module key={app.module} /> : null}
        </div>
      </main>
      {app.hydrated && app.dataFileStatus === 'reconnect' && (
        <div
          style={{
            position: 'fixed',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 95,
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            background: 'var(--raised)',
            border: '1px solid var(--accent-border)',
            borderRadius: 11,
            padding: '10px 16px',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>
            Reconnect your data file so it stays up to date.
          </span>
          <button
            className="accent-btn"
            style={{ borderRadius: 7, padding: '6px 16px', fontSize: 12.5 }}
            onClick={() => void app.reconnectFile()}
          >
            Reconnect
          </button>
        </div>
      )}
      <Toast message={app.err} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
}
