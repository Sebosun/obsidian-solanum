import { CROPS } from "@/lib/crops/catalog";
import { dayKey } from "@/lib/harvest/model";
import { sessionStatus } from "@/lib/harvest/status";
import type { Revision } from "@/lib/timer/types";

export const DAY_NOTE_START = "<!-- solanum:start -->";
export const DAY_NOTE_END = "<!-- solanum:end -->";

export interface DayNoteEntry {
  session: Revision;
  /** Focused minutes that fall on this day. */
  minutes: number;
}

export type FrontmatterValue = string | number;

export interface DayNote {
  /** Keys the plugin owns in the note's frontmatter. */
  frontmatter: Record<string, FrontmatterValue>;
  /** The managed block, markers included. */
  block: string;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (value: number) => String(value).padStart(2, "0");
const clock = (at: number) => {
  const date = new Date(at);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const dayStart = (at: number) => {
  const date = new Date(at);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};
const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;
const minutesLabel = (minutes: number) => `${Math.round(minutes)} min`;
const tagText = (tag: string) => `#${tag.replace(/\s+/g, "-")}`;
const noteLink = (path: string) => `[[${path.replace(/\.md$/, "")}]]`;

function heading(day: Date): string {
  return `${WEEKDAYS[day.getDay()]}, ${day.getDate()} ${MONTHS[day.getMonth()]} ${day.getFullYear()}`;
}

function cropSummary(entries: DayNoteEntry[]): string {
  const counts = new Map<string, number>();
  for (const { session } of entries) counts.set(session.crop, (counts.get(session.crop) ?? 0) + 1);
  return [...counts]
    .map(([crop, count]) => {
      const emoji = CROPS[crop as keyof typeof CROPS].emoji;
      return count > 1 ? `${emoji} ×${count}` : emoji;
    })
    .join(" ");
}

/** The end of focus: when it finished, when it stopped, or "now" while it is still running. */
function focusEnd(session: Revision): number | null {
  if (session.focusEndedAt !== null) return session.focusEndedAt;
  const last = session.intervals[session.intervals.length - 1];
  return last.end;
}

function timeRange(session: Revision, day: Date): string {
  const today = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const startedEarlier = dayStart(session.startedAt) < today;
  let range = `${clock(session.startedAt)}${startedEarlier ? " (previous day)" : ""} – `;
  const end = focusEnd(session);
  if (end === null) return `${range}now`;
  range += clock(end);
  if (dayStart(end) > today) range += " (next day)";
  return range;
}

function sessionSection({ session, minutes }: DayNoteEntry, day: Date): string[] {
  const crop = CROPS[session.crop];
  const lines = [
    `### ${clock(session.startedAt)} · ${crop.emoji} ${crop.name}`,
    `- **Focus:** ${minutesLabel(minutes)} of ${Math.round(session.durationMs / 60_000)} planned`,
    `- **Status:** ${sessionStatus(session)}`,
    `- **Time:** ${timeRange(session, day)}`,
    `- **Break:** ${minutesLabel(session.breakMs / 60_000)}`,
  ];
  const pauses = session.intervals.length - 1;
  if (pauses > 0) lines.push(`- **Pauses:** ${pauses}`);
  if (session.tags.length > 0) lines.push(`- **Tags:** ${session.tags.map(tagText).join(" ")}`);
  if (session.notePath) lines.push(`- **Note:** ${noteLink(session.notePath)}`);
  return lines;
}

function tableRow({ session, minutes }: DayNoteEntry): string {
  const crop = CROPS[session.crop];
  const cells = [
    clock(session.startedAt),
    `${crop.emoji} ${crop.name}`,
    minutesLabel(minutes),
    sessionStatus(session),
    session.tags.map(tagText).join(" "),
    session.notePath ? noteLink(session.notePath) : "",
  ];
  return `| ${cells.join(" | ")} |`;
}

/** What the plugin writes for one day; null when nothing was focused that day. */
export function buildDayNote(day: Date, entries: DayNoteEntry[]): DayNote | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort(
    (a, b) => a.session.startedAt - b.session.startedAt || a.session.id.localeCompare(b.session.id),
  );
  const total = sorted.reduce((sum, entry) => sum + entry.minutes, 0);
  const block = [
    DAY_NOTE_START,
    `# ${heading(day)}`,
    "",
    `**${minutesLabel(total)} focused** · ${plural(sorted.length, "session")} · ${cropSummary(sorted)}`,
    "",
    "| Time | Crop | Focus | Status | Tags | Note |",
    "| --- | --- | --- | --- | --- | --- |",
    ...sorted.map(tableRow),
    "",
    "## Sessions",
    ...sorted.flatMap((entry) => ["", ...sessionSection(entry, day)]),
    DAY_NOTE_END,
  ].join("\n");
  return {
    frontmatter: {
      solanum: "day",
      date: dayKey(day),
      focus_minutes: Math.round(total),
      sessions: sorted.length,
    },
    block,
  };
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function frontmatterLines(values: Record<string, FrontmatterValue>): string[] {
  return Object.entries(values).map(([key, value]) => `${key}: ${value}`);
}

/**
 * Produces the file text for `note`. The frontmatter keys and the block between the markers
 * belong to the plugin; everything else in an existing file is left exactly as it was.
 */
export function composeDayNote(existing: string | null, note: DayNote): string {
  const owned = new Set(Object.keys(note.frontmatter));
  const ours = frontmatterLines(note.frontmatter);
  if (existing === null) return `---\n${ours.join("\n")}\n---\n${note.block}\n`;

  let body = existing;
  let others: string[] = [];
  const match = FRONTMATTER.exec(existing);
  if (match) {
    body = existing.slice(match[0].length);
    others = match[1].split(/\r?\n/).filter((line) => !owned.has(line.split(":")[0].trim()));
  }
  const start = body.indexOf(DAY_NOTE_START);
  const end = body.indexOf(DAY_NOTE_END);
  if (start >= 0 && end > start) {
    body = body.slice(0, start) + note.block + body.slice(end + DAY_NOTE_END.length);
  } else {
    body = `${body.trimEnd()}${body.trim() === "" ? "" : "\n\n"}${note.block}\n`;
  }
  return `---\n${[...ours, ...others].join("\n")}\n---\n${body}`;
}
