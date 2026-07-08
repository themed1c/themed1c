import React from 'react';
import { FONT_LABEL, FONT_NUM } from '../lib/theme';

/* Shared primitives matching the design tokens. Keep visual values inline so
 * each module reads like the prototype markup. */

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 22,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Uppercase tracked card label, 11px (10px for tighter chips). */
export function CardLabel({
  children,
  color = 'var(--muted)',
  size = 11,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: FONT_LABEL,
        fontWeight: 500,
        fontSize: size,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PageTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h1
      style={{
        margin: '0 0 6px',
        fontSize: 26,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        fontFamily: FONT_LABEL,
        ...style,
      }}
    >
      {children}
    </h1>
  );
}

export function PageSub({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, ...style }}>{children}</div>;
}

/** Oswald numeral span (scores, %, streaks, times, list numbers). */
export function Num({
  children,
  size = 13,
  color = 'var(--muted)',
  style,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span style={{ fontFamily: FONT_NUM, fontWeight: 500, fontSize: size, color, ...style }}>
      {children}
    </span>
  );
}

export function GhostButton({
  children,
  onClick,
  style,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <button
      className="ghost-btn"
      onClick={onClick}
      disabled={disabled}
      style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, ...style }}
    >
      {children}
    </button>
  );
}

export function AccentButton({
  children,
  onClick,
  style,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <button
      className="accent-btn"
      onClick={onClick}
      disabled={disabled}
      style={{ borderRadius: 8, padding: '9px 20px', fontSize: 13.5, ...style }}
    >
      {children}
    </button>
  );
}

/** 18px rounded checkbox square with accent fill + ✓ when checked. */
export function CheckSquare({ checked, size = 18 }: { checked: boolean; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 5,
        border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--box)'}`,
        background: checked ? 'var(--accent)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--on-accent)',
        fontSize: size <= 17 ? 11 : 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {checked ? '✓' : ''}
    </span>
  );
}

/** Rounded progress track. Fill can be a color or gradient. */
export function Track({
  pct,
  height = 5,
  fill = 'var(--accent)',
  style,
}: {
  pct: number;
  height?: number;
  fill?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        height,
        background: 'var(--track)',
        borderRadius: height / 2,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: fill,
          borderRadius: height / 2,
        }}
      />
    </div>
  );
}

/** Uppercase area/type pill. */
export function Chip({
  children,
  color = 'var(--faint)',
  borderColor = 'var(--border)',
  style,
}: {
  children: React.ReactNode;
  color?: string;
  borderColor?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        fontWeight: 500,
        fontSize: 10.5,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color,
        border: `1px solid ${borderColor}`,
        padding: '2px 8px',
        borderRadius: 20,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        background: 'var(--err-bg)',
        border: '1px solid var(--err-border)',
        color: 'var(--err-text)',
        fontSize: 13,
        padding: '12px 18px',
        borderRadius: 10,
        zIndex: 100,
      }}
    >
      {message}
    </div>
  );
}
