export const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const DAY_FULL = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function toDateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfWeekSaturday(date) {
  const d = toDateOnly(date);
  const dow = d.getDay();
  const diffToSat = (dow - 6 + 7) % 7;
  d.setDate(d.getDate() - diffToSat);
  return d;
}

export function addDays(date, n) {
  const d = toDateOnly(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function thisCycleStart() {
  return startOfWeekSaturday(new Date());
}

export function weekDates(weekStartIso) {
  const start = parseISO(weekStartIso);
  return DAYS.map((_, i) => addDays(start, i));
}

export function formatDayLabel(date) {
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

export function formatWeekRangeLabel(weekStartIso) {
  const start = parseISO(weekStartIso);
  const end = addDays(start, 6);
  const fmt = (d) => `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;
  return `${fmt(start)} – ${fmt(end)}`;
}
