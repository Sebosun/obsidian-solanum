import { CROPS } from "@/lib/crops/catalog";
import { dayKey } from "@/lib/harvest/model";
import { sessionStatus } from "@/lib/harvest/status";
import type { Revision } from "@/lib/timer/types";

/** Earlier versions fenced their block with these comments, which Live Preview shows as text. */
const LEGACY_START = "<!-- solanum:start -->";
const LEGACY_END = "<!-- solanum:end -->";
/** Sessions shorter than this are accidental starts and stay out of the note. */
const MIN_LISTED_MINUTES = 0.5;
const NOTES_HEADING = "## Notes";

export interface DayNoteEntry {
  session: Revision;
  /** Focused minutes that fall on this day. */
  minutes: number;
}

export type FrontmatterValue = string | number;

export interface DayNote {
  /** Keys the plugin owns in the note's frontmatter. */
  frontmatter: Record<string, FrontmatterValue>;
  /** The generated section, from the dated heading to the last session. */
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

interface Columns {
  tags: boolean;
  note: boolean;
}

function tableHeader({ tags, note }: Columns): string[] {
  const header = ["Time", "Crop", "Focus", "Status"];
  if (tags) header.push("Tags");
  if (note) header.push("Note");
  return [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`];
}

function tableRow({ session, minutes }: DayNoteEntry, { tags, note }: Columns): string {
  const crop = CROPS[session.crop];
  const cells = [
    clock(session.startedAt),
    `${crop.emoji} ${crop.name}`,
    minutesLabel(minutes),
    sessionStatus(session),
  ];
  if (tags) cells.push(session.tags.map(tagText).join(" "));
  if (note) cells.push(session.notePath ? noteLink(session.notePath) : "");
  return `| ${cells.join(" | ")} |`;
}

/** What the plugin writes for one day; null when nothing worth noting was focused that day. */
export function buildDayNote(day: Date, entries: DayNoteEntry[]): DayNote | null {
  const sorted = entries
    .filter((entry) => entry.minutes >= MIN_LISTED_MINUTES)
    .sort(
      (a, b) =>
        a.session.startedAt - b.session.startedAt || a.session.id.localeCompare(b.session.id),
    );
  if (sorted.length === 0) return null;
  const total = sorted.reduce((sum, entry) => sum + entry.minutes, 0);
  const columns: Columns = {
    tags: sorted.some((entry) => entry.session.tags.length > 0),
    note: sorted.some((entry) => entry.session.notePath !== null),
  };
  const block = [
    `# ${heading(day)}`,
    "",
    `**${minutesLabel(total)} focused** · ${plural(sorted.length, "session")} · ${cropSummary(sorted)}`,
    "",
    ...tableHeader(columns),
    ...sorted.map((entry) => tableRow(entry, columns)),
    "",
    "## Sessions",
    ...sorted.flatMap((entry) => ["", ...sessionSection(entry, day)]),
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

const DATED_HEADING = new RegExp(
  `^# (?:${WEEKDAYS.join("|")}), \\d{1,2} (?:${MONTHS.join("|")}) \\d{4}\\s*$`,
);
/** The generated section ends at the next level-2 heading that is not one of its own. */
const SECTION_END = /^## (?!Sessions\s*$)/;

function placeBlock(body: string, block: string): string {
  const legacyStart = body.indexOf(LEGACY_START);
  const legacyEnd = body.indexOf(LEGACY_END);
  if (legacyStart >= 0 && legacyEnd > legacyStart) {
    const after = body.slice(legacyEnd + LEGACY_END.length);
    const rest = after.trim() === "" ? `\n\n${NOTES_HEADING}\n` : after;
    return `${body.slice(0, legacyStart)}${block}${rest}`;
  }
  const lines = body.split("\n");
  const start = lines.findIndex((line) => DATED_HEADING.test(line));
  if (start >= 0) {
    const next = lines.findIndex((line, index) => index > start && SECTION_END.test(line));
    const tail = lines.slice(next < 0 ? lines.length : next);
    const head = start > 0 ? `${lines.slice(0, start).join("\n")}\n` : "";
    return `${head}${block}\n${tail.length > 0 ? `\n${tail.join("\n")}` : `\n${NOTES_HEADING}\n`}`;
  }
  const lead = body.trim() === "" ? "" : `${body.trimEnd()}\n\n`;
  return `${lead}${block}\n\n${NOTES_HEADING}\n`;
}

/**
 * Produces the file text for `note`. The plugin owns its frontmatter keys and the section from the
 * dated heading up to the next other `##` heading; everything else is kept exactly as written.
 */
export function composeDayNote(existing: string | null, note: DayNote): string {
  const owned = new Set(Object.keys(note.frontmatter));
  const ours = frontmatterLines(note.frontmatter);
  if (existing === null) return `---\n${ours.join("\n")}\n---\n${note.block}\n\n${NOTES_HEADING}\n`;

  let body = existing;
  let others: string[] = [];
  const match = FRONTMATTER.exec(existing);
  if (match) {
    body = existing.slice(match[0].length);
    others = match[1].split(/\r?\n/).filter((line) => !owned.has(line.split(":")[0].trim()));
  }
  return `---\n${[...ours, ...others].join("\n")}\n---\n${placeBlock(body, note.block)}`;
}
