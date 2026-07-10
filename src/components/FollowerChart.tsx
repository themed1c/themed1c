import { useEffect, useRef, useState } from 'react';
import { animate, svg as animeSvg } from 'animejs';
import { reducedMotion } from '../lib/anim';
import type { SocialSnapshot } from '../lib/types';
import { FONT_NUM } from '../lib/theme';

/* Follower count over time: one line, drawn from the daily snapshots the app
 * records on each profile read. Inline SVG on theme variables, so it follows
 * light and dark mode like everything else. Hovering reads out one day. */

const W = 640;
const H = 200;
const PAD = { top: 14, right: 16, bottom: 26, left: 46 };

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}

/** yyyy-mm-dd -> local Date (never via the ISO parser, which assumes UTC). */
function parseDay(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function shortDate(date: string): string {
  return parseDay(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Round tick values so the axis reads clean (1,240 -> 1.2K, not 1,237). */
function niceTicks(min: number, max: number): number[] {
  if (min === max) return [min];
  const mid = min + (max - min) / 2;
  return [min, mid, max];
}

export default function FollowerChart({ history }: { history: SocialSnapshot[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  // Entrance: the line draws itself left to right while a dot rides its tip
  // along the exact same motion path, settling on the newest reading.
  useEffect(() => {
    const line = lineRef.current;
    const dot = dotRef.current;
    if (!line || !dot) return;
    if (reducedMotion()) {
      dot.style.opacity = '1';
      const { translateX, translateY } = animeSvg.createMotionPath(line);
      animate(dot, { translateX, translateY, duration: 1 });
      return;
    }
    const timing = { duration: 1100, ease: 'inOutQuart' } as const;
    const draw = animate(animeSvg.createDrawable(line), { draw: ['0 0', '0 1'], ...timing });
    dot.style.opacity = '1';
    const { translateX, translateY } = animeSvg.createMotionPath(line);
    const glide = animate(dot, { translateX, translateY, ...timing });
    return () => {
      draw.cancel();
      glide.cancel();
    };
    // Mount-only: the module remounts on every visit, and hover re-renders
    // must not restart the entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (history.length < 2) return null;

  const t0 = parseDay(history[0].date).getTime();
  const t1 = parseDay(history[history.length - 1].date).getTime();
  const span = Math.max(1, t1 - t0);

  let lo = Math.min(...history.map((s) => s.followers));
  let hi = Math.max(...history.map((s) => s.followers));
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  // Breathing room so the line never sits on the frame.
  const range = hi - lo;
  lo -= range * 0.08;
  hi += range * 0.08;

  const x = (s: SocialSnapshot) =>
    PAD.left + ((parseDay(s.date).getTime() - t0) / span) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  const path = history
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${x(s).toFixed(1)},${y(s.followers).toFixed(1)}`)
    .join(' ');

  const ticks = niceTicks(
    Math.min(...history.map((s) => s.followers)),
    Math.max(...history.map((s) => s.followers)),
  );

  // Date labels: first, last, and the middle when there is room between them.
  const xLabels: { at: number; text: string }[] = [
    { at: x(history[0]), text: shortDate(history[0].date) },
    { at: x(history[history.length - 1]), text: shortDate(history[history.length - 1].date) },
  ];
  if (history.length > 2) {
    const mid = history[Math.floor(history.length / 2)];
    const midX = x(mid);
    if (midX - xLabels[0].at > 90 && xLabels[1].at - midX > 90) {
      xLabels.splice(1, 0, { at: midX, text: shortDate(mid.date) });
    }
  }

  /** Nearest snapshot to the pointer, in chart coordinates. */
  const locate = (clientX: number): number | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return null;
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    history.forEach((s, i) => {
      const d = Math.abs(x(s) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  };

  const h = hover !== null ? history[hover] : null;
  const hx = h ? x(h) : 0;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={(e) => setHover(locate(e.clientX))}
        onMouseLeave={() => setHover(null)}
      >
        {/* recessive grid: one line per y tick */}
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(v) + 3.5}
              textAnchor="end"
              fontSize={10.5}
              fill="var(--faint)"
              fontFamily={FONT_NUM}
            >
              {compact(v)}
            </text>
          </g>
        ))}

        {xLabels.map((l, i) => (
          <text
            key={i}
            x={l.at}
            y={H - 8}
            textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
            fontSize={10.5}
            fill="var(--faint)"
            fontFamily={FONT_NUM}
          >
            {l.text}
          </text>
        ))}

        <path
          ref={lineRef}
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* rides the tip of the line while it draws, then marks the newest day */}
        <circle ref={dotRef} r={3.5} fill="var(--accent)" style={{ opacity: 0 }} />

        {/* hover: crosshair plus the day's point, ringed in surface color */}
        {h && (
          <g>
            <line
              x1={hx}
              x2={hx}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <circle cx={hx} cy={y(h.followers)} r={6} fill="var(--card)" />
            <circle cx={hx} cy={y(h.followers)} r={4} fill="var(--accent)" />
          </g>
        )}
      </svg>

      {h && (
        <div
          style={{
            position: 'absolute',
            left: `${(hx / W) * 100}%`,
            top: 0,
            transform: hx > W * 0.72 ? 'translate(-100%, 0)' : 'translate(10px, 0)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '7px 11px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              fontFamily: FONT_NUM,
              fontWeight: 500,
              fontSize: 10,
              color: 'var(--faint)',
              letterSpacing: '0.06em',
            }}
          >
            {shortDate(h.date)}
          </div>
          <div style={{ fontFamily: FONT_NUM, fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>
            {h.followers.toLocaleString('en-US')}
            <span style={{ fontSize: 10.5, color: 'var(--muted)', marginLeft: 5 }}>followers</span>
          </div>
        </div>
      )}
    </div>
  );
}
