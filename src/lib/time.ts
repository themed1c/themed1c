const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Full weekday name for a 0-6 index (0 = Sunday). */
export function dayName(i: number): string {
  return DAYS[((i % 7) + 7) % 7];
}

/** "JUL 8 · 2026" for the sidebar. */
export function dateShort(d = new Date()): string {
  return `${MONTHS[d.getMonth()].slice(0, 3).toUpperCase()} ${d.getDate()} · ${d.getFullYear()}`;
}

/** "Tuesday, July 8" for the dashboard header. */
export function dateLong(d = new Date()): string {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Jul 6 to Jul 12" for the weekly review header (Monday-based week). */
export function weekRange(d = new Date()): string {
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (x: Date) => `${MONTHS[x.getMonth()].slice(0, 3)} ${x.getDate()}`;
  return `${fmt(monday)} to ${fmt(sunday)}`;
}

export function greeting(d = new Date()): string {
  const hr = d.getHours();
  return hr < 12 ? 'Good morning.' : hr < 18 ? 'Good afternoon.' : 'Good evening.';
}

/** "Jul 8" for vault note dates. */
export function monthDay(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/** Relative label for brain-dump rows: Just now / Today / Yesterday / nd ago. */
export function relativeWhen(ts: number, now = Date.now()): string {
  const mins = Math.floor((now - ts) / 60000);
  if (mins < 5) return 'Just now';
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (ts >= startOfToday) return 'Today';
  if (ts >= startOfToday - 86400000) return 'Yesterday';
  const days = Math.floor((startOfToday - ts) / 86400000) + 1;
  return `${days}d ago`;
}

/** Minutes since midnight for a 12-hour time like "6:30 PM"; unparsable
 *  strings sort to the end so hand-typed schedule rows never vanish. */
export function timeToMinutes(t: string): number {
  const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + (m[2] ? parseInt(m[2], 10) : 0);
}

/** Local calendar date (yyyy-mm-dd). Never UTC: an evening reflection after
 *  7 PM in the Americas must not land on tomorrow's date. */
export function todayISO(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
