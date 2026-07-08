/** Writing rule: never show an em dash. Mirrors the prototype's clean(). */
export function clean<T>(v: T): T {
  if (typeof v === 'string') {
    return v
      .replace(/\s*—\s*/g, ', ')
      .replace(/(\d)–(\d)/g, '$1-$2')
      .replace(/\s*–\s*/g, '-') as unknown as T;
  }
  if (Array.isArray(v)) return v.map((x) => clean(x)) as unknown as T;
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>)) {
      o[k] = clean((v as Record<string, unknown>)[k]);
    }
    return o as unknown as T;
  }
  return v;
}

/** Lenient JSON extraction: strip code fences, find the first [ or {. */
export function parseJSON<T = unknown>(text: string): T {
  let t = String(text).replace(/```json|```/g, '').trim();
  const a = t.indexOf('[');
  const o = t.indexOf('{');
  const start = a === -1 ? o : o === -1 ? a : Math.min(a, o);
  if (start > 0) t = t.slice(start);
  const end = Math.max(t.lastIndexOf(']'), t.lastIndexOf('}'));
  if (end !== -1) t = t.slice(0, end + 1);
  return JSON.parse(t) as T;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
