const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

export function todayISO(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
