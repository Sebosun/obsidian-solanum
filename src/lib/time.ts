export const MS_PER_MINUTE = 60_000;
export const MS_PER_SECOND = 1000;

/** Two digits, as in clocks and calendar dates. */
export const pad2 = (value: number): string => String(value).padStart(2, "0");

/** Local midnight at the start of the day that contains `at`. */
export function startOfDay(at: number | Date): Date {
  const date = new Date(at);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Local midnight that ends `day`. Built from the calendar, since DST days are not 24 hours long. */
export function startOfNextDay(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
}

export function formatTime(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / MS_PER_SECOND);
  return `${pad2(Math.floor(seconds / 60))}:${pad2(seconds % 60)}`;
}

/** Focused time for people: "45 min", "2 h", "12 h 05 min". */
export function formatFocus(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${pad2(rest)} min`;
}
