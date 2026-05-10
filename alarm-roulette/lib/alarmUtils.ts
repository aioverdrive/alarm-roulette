export const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, '0')
);
export const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, '0')
);
export const PERIODS = ['AM', 'PM'];

export const WEEKDAY_PRESETS = [
  { d: 0, short: 'Sun' },
  { d: 1, short: 'Mon' },
  { d: 2, short: 'Tue' },
  { d: 3, short: 'Wed' },
  { d: 4, short: 'Thu' },
  { d: 5, short: 'Fri' },
  { d: 6, short: 'Sat' },
] as const;

export function formatLocalParts(d: Date): {
  date: string;
  hour: string;
  minute: string;
  period: string;
} {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h24 = d.getHours();
  const period = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return {
    date: `${y}-${mo}-${day}`,
    hour: String(h12).padStart(2, '0'),
    minute: String(d.getMinutes()).padStart(2, '0'),
    period,
  };
}

export function scheduledLocalParts(iso: string) {
  return formatLocalParts(new Date(iso));
}

/** Converts 12-hour clock parts + date string into a local-time Date object. */
function parseLocalWallClock(
  dateStr: string,
  hour12: string,
  minute: string,
  period: string
): Date {
  let h = parseInt(hour12, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const [y, mo, d] = dateStr.split('-').map(Number);
  // Date constructor with parts uses LOCAL time — intentional
  return new Date(y, mo - 1, d, h, parseInt(minute, 10), 0, 0);
}

/**
 * Returns a proper UTC ISO string for a one-shot alarm, rolling forward
 * if the chosen time is already in the past.
 *
 * FIX: was using formatLocalScheduledISO (no-Z naive string) which Supabase
 * stored as UTC → showed wrong local time on read-back. Now uses .toISOString().
 */
export function ensureFutureOneShotISO(
  dateStr: string,
  hour: string,
  minute: string,
  period: string
): string {
  const grace = Date.now() + 2500;
  let cursor = parseLocalWallClock(dateStr, hour, minute, period);
  let guard = 0;
  while (cursor.getTime() <= grace && guard++ < 400) {
    const next = new Date(cursor);
    next.setDate(next.getDate() + 1);
    cursor = next;
  }
  return cursor.toISOString(); // ← was: formatLocalScheduledISO (the bug)
}

/** Returns a UTC ISO string for the first upcoming repeat occurrence. */
export function firstRepeatISO(
  hour: string,
  minute: string,
  period: string,
  weekdays: number[]
): string {
  const allow = new Set(weekdays.filter(w => w >= 0 && w <= 6));
  let h = parseInt(hour, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const mi = parseInt(minute, 10);
  const grace = Date.now() + 2500;

  const mid = new Date();
  mid.setHours(0, 0, 0, 0);

  for (let add = 0; add < 370; add++) {
    const cand = new Date(
      mid.getFullYear(), mid.getMonth(), mid.getDate() + add,
      h, mi, 0, 0
    );
    if (cand.getTime() <= grace) continue;
    if (allow.has(cand.getDay())) return cand.toISOString(); // ← fix
  }
  return new Date(grace + 60_000).toISOString(); // ← fix
}

/** Returns a UTC ISO string for the next repeat occurrence after a previous firing. */
export function computeNextRepeatISO(
  prevScheduledIso: string,
  weekdays: number[],
  strictlyAfterMs: number
): string {
  const anchor = new Date(prevScheduledIso);
  // getHours/getMinutes use LOCAL time — correct: keeps the alarm at the same local clock time
  const hour = anchor.getHours();
  const minute = anchor.getMinutes();
  const allow = new Set(weekdays.filter(w => w >= 0 && w <= 6));

  const mid = new Date(strictlyAfterMs);
  mid.setHours(0, 0, 0, 0);

  for (let add = 0; add < 370; add++) {
    const cand = new Date(
      mid.getFullYear(), mid.getMonth(), mid.getDate() + add,
      hour, minute, 0, 0
    );
    if (cand.getTime() <= strictlyAfterMs) continue;
    if (allow.has(cand.getDay())) return cand.toISOString(); // ← fix
  }
  return prevScheduledIso;
}

export function normalizeWeekdays(ws: unknown): number[] {
  if (!Array.isArray(ws)) return [];
  return [...new Set(ws.map(Number).filter(w => w >= 0 && w <= 6))].sort(
    (a, b) => a - b
  );
}

export function formatRepeatSummary(ws: unknown): string {
  const n = normalizeWeekdays(ws);
  if (!n.length) return '';
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `Repeats · ${n.map(d => labels[d]).join(', ')}`;
}
