import { useState } from 'react';
import { useApp } from '../lib/store';
import { Card, CardLabel, GhostButton, Num, PageSub, PageTitle } from '../components/ui';
import { todayISO } from '../lib/time';
import type { FinanceKind } from '../lib/types';

const KIND_COLOR: Record<FinanceKind, string> = {
  income: 'var(--good)',
  expense: 'var(--bad)',
  saving: 'var(--accent)',
};

export default function Finances() {
  const app = useApp();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<FinanceKind>('expense');

  const month = todayISO().slice(0, 7);
  const inMonth = app.finance.filter((e) => e.date.slice(0, 7) === month);
  const sum = (k: FinanceKind) =>
    inMonth.filter((e) => e.kind === k).reduce((a, e) => a + e.amount, 0);
  const savedAll = app.finance
    .filter((e) => e.kind === 'saving')
    .reduce((a, e) => a + e.amount, 0);
  const money = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const add = () => {
    const n = parseFloat(amount);
    if (!label.trim() || Number.isNaN(n) || n <= 0) return;
    app.addFinanceEntry(label, n, kind);
    setLabel('');
    setAmount('');
  };

  const TILES: [string, number, string][] = [
    ['Income this month', sum('income'), 'var(--good)'],
    ['Spending this month', sum('expense'), 'var(--bad)'],
    ['Saved this month', sum('saving'), 'var(--accent)'],
    ['Total recorded savings', savedAll, 'var(--text)'],
  ];

  return (
    <section className="fade-up">
      <PageTitle>Finances</PageTitle>
      <PageSub>Log money in, money out, and money saved. The engine reads the numbers.</PageSub>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardLabel style={{ marginBottom: 16 }}>Position</CardLabel>
          <div className="areas-grid">
            {TILES.map(([t, n, color]) => (
              <div key={t}>
                <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 3 }}>{t}</div>
                <Num size={22} color={color}>
                  ${money(n)}
                </Num>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <CardLabel>The read</CardLabel>
            <GhostButton
              onClick={() => {
                if (!app.busy.finance) void app.reviewFinances();
              }}
              style={{ padding: '5px 12px' }}
            >
              {app.busy.finance ? 'Reviewing…' : 'Review finances'}
            </GhostButton>
          </div>
          <div
            style={{
              fontSize: 13.5,
              lineHeight: 1.65,
              color: 'var(--text2)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {app.financeRead ||
              'Run the review once entries exist: current position, the biggest savings lever, and investment directions to research.'}
          </div>
        </Card>
      </div>

      <Card>
        <CardLabel style={{ marginBottom: 14 }}>Ledger</CardLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            className="field"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What was it"
            style={{ flex: 2, minWidth: 160, padding: '9px 12px', fontSize: 13.5 }}
          />
          <input
            className="field"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="Amount"
            inputMode="decimal"
            style={{ width: 110, padding: '9px 12px', fontSize: 13.5 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) add();
            }}
          />
          <button
            className="ghost-btn"
            onClick={() => {
              const order: FinanceKind[] = ['expense', 'income', 'saving'];
              setKind(order[(order.indexOf(kind) + 1) % order.length]);
            }}
            title="Click to switch type"
            style={{
              padding: '8px 14px',
              fontSize: 12,
              borderRadius: 7,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: KIND_COLOR[kind],
            }}
          >
            {kind}
          </button>
          <GhostButton onClick={add} style={{ padding: '8px 16px', fontSize: 13 }}>
            Add
          </GhostButton>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {app.finance.length === 0 && (
            <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
              No entries yet. Log income, spending, and transfers to savings as they happen; a few
              a week is enough for a useful read.
            </div>
          )}
          {app.finance.slice(0, 60).map((e) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                padding: '9px 2px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <Num size={11} color="var(--faint)" style={{ width: 78, flexShrink: 0 }}>
                {e.date}
              </Num>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--text2)' }}>{e.label}</span>
              <button
                onClick={() => app.cycleFinanceKind(e.id)}
                title="Click to switch type"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: KIND_COLOR[e.kind],
                  padding: 0,
                  width: 66,
                  textAlign: 'right',
                }}
              >
                {e.kind}
              </button>
              <Num
                size={13}
                color={e.kind === 'expense' ? 'var(--bad)' : 'var(--good)'}
                style={{ width: 90, textAlign: 'right' }}
              >
                {e.kind === 'expense' ? '-' : '+'}${money(e.amount)}
              </Num>
              <button className="row-x" title="Remove entry" onClick={() => app.deleteFinanceEntry(e.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
